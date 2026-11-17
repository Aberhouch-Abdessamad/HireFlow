<?php

namespace App\Services\Offers;

use App\Enums\OfferStatus;
use App\Enums\StageType;
use App\Enums\SystemRole;
use App\Events\OfferAccepted;
use App\Events\OfferDeclined;
use App\Events\OfferSent;
use App\Events\OfferSubmittedForApproval;
use App\Exceptions\BusinessRuleException;
use App\Models\Application;
use App\Models\Offer;
use App\Models\RecruitmentStage;
use App\Models\User;
use App\Notifications\OfferSentNotification;
use App\Services\Applications\ApplicationService;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

/**
 * Offer workflow with an approval step. Accepting an offer is the only way an application
 * becomes Hired.
 */
final class OfferService
{
    private const ATTRIBUTES = ['salary_amount', 'currency', 'contract_type', 'start_date', 'expires_at', 'message', 'internal_notes'];

    public function __construct(
        private readonly AuditLogger $audit,
        private readonly ApplicationService $applications,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function create(Application $application, array $data, User $actor): Offer
    {
        if (! $application->status->isOpen()) {
            throw new BusinessRuleException('Offers can only be made on active applications.', 'APPLICATION_CLOSED', 409);
        }

        return DB::transaction(function () use ($application, $data, $actor): Offer {
            Application::query()->lockForUpdate()->findOrFail($application->id);

            $hasOpen = Offer::query()->where('application_id', $application->id)
                ->whereIn('status', array_map(fn ($s) => $s->value, array_filter(OfferStatus::cases(), fn ($s) => $s->isOpen())))
                ->exists();
            if ($hasOpen) {
                throw new BusinessRuleException('This application already has an open offer.', 'OFFER_EXISTS', 409);
            }

            $offer = new Offer(Arr::only($data, self::ATTRIBUTES));
            $offer->forceFill(['application_id' => $application->id, 'created_by' => $actor->id, 'status' => OfferStatus::Draft])->save();
            $this->audit->record('offer.created', $offer, null, ['application_id' => $application->id]);

            return $offer;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Offer $offer, array $data): Offer
    {
        $this->assertStatus($offer, [OfferStatus::Draft], 'Only draft offers can be edited.');

        $offer->fill(Arr::only($data, self::ATTRIBUTES));
        $changes = array_keys($offer->getDirty());
        $offer->save();
        $this->audit->record('offer.updated', $offer, null, ['fields' => $changes]);

        return $offer;
    }

    public function submitForApproval(Offer $offer): Offer
    {
        return $this->transition($offer, [OfferStatus::Draft], OfferStatus::PendingApproval, 'offer.submitted', function (Offer $o): void {
            $o->forceFill(['submitted_at' => now(), 'approval_comment' => null]);
        }, fn (Offer $o) => event(new OfferSubmittedForApproval($o)));
    }

    /**
     * Four-eyes rule: the approver must be someone other than the author, unless the approver
     * is a Company Admin (small teams).
     */
    public function approve(Offer $offer, User $approver, ?string $comment): Offer
    {
        if ((int) $offer->created_by === $approver->id && ! $approver->hasRole(SystemRole::CompanyAdmin->value) && ! $approver->isSuperAdmin()) {
            throw new BusinessRuleException('Offers must be approved by someone other than their author.', 'SELF_APPROVAL', 409);
        }

        return $this->transition($offer, [OfferStatus::PendingApproval], OfferStatus::Approved, 'offer.approved', function (Offer $o) use ($approver, $comment): void {
            $o->forceFill(['approved_by' => $approver->id, 'approved_at' => now(), 'approval_comment' => $comment]);
        });
    }

    public function returnToDraft(Offer $offer, string $comment): Offer
    {
        return $this->transition($offer, [OfferStatus::PendingApproval], OfferStatus::Draft, 'offer.returned', function (Offer $o) use ($comment): void {
            $o->forceFill(['approval_comment' => $comment, 'submitted_at' => null]);
        });
    }

    /**
     * Sends the approved offer to the candidate (email with a private response link) and moves
     * the application to the Offer stage if it isn't there yet.
     */
    public function send(Offer $offer, User $sender): Offer
    {
        if (! $offer->application->status->isOpen()) {
            throw new BusinessRuleException('The application is no longer active.', 'APPLICATION_CLOSED', 409);
        }
        if ($offer->expires_at->isPast()) {
            throw new BusinessRuleException('The offer expiration date has passed. Return it to draft and update it.', 'OFFER_EXPIRED', 422);
        }

        $token = Str::random(64);

        $sent = $this->transition($offer, [OfferStatus::Approved], OfferStatus::Sent, 'offer.sent', function (Offer $o) use ($sender, $token): void {
            $o->forceFill(['sent_by' => $sender->id, 'sent_at' => now(), 'response_token_hash' => Offer::hashToken($token)]);
        });

        $application = $sent->application()->with(['candidate', 'jobPosting', 'stage', 'company'])->firstOrFail();

        if ($application->stage->type !== StageType::Offer) {
            $offerStage = RecruitmentStage::query()->where('type', StageType::Offer->value)->orderBy('position')->first();
            if ($offerStage !== null) {
                $this->applications->moveToStage($application, $offerStage, 'Offer sent', $sender);
            }
        }

        Notification::route('mail', $application->candidate->email)->notify(new OfferSentNotification(
            $application->candidate->first_name,
            $application->company->name,
            $application->jobPosting->title,
            $sent->expires_at->toFormattedDayDateString(),
            $token,
        ));

        DB::afterCommit(fn () => event(new OfferSent($sent)));

        return $sent;
    }

    /**
     * Records the candidate's acceptance (from the response link, the candidate portal, or a
     * recruiter recording a verbal answer) and marks the application Hired.
     */
    public function accept(Offer $offer, ?User $actor, ?string $note, string $channel): Offer
    {
        $this->expireIfNeeded($offer);

        $accepted = DB::transaction(function () use ($offer, $actor, $note, $channel): Offer {
            $accepted = $this->transition($offer, [OfferStatus::Sent], OfferStatus::Accepted, 'offer.accepted', function (Offer $o) use ($note): void {
                $o->forceFill(['responded_at' => now(), 'response_note' => $note]);
            }, null, ['channel' => $channel]);

            $this->applications->markHired($accepted->application, $actor, 'Offer accepted');

            return $accepted;
        });

        DB::afterCommit(fn () => event(new OfferAccepted($accepted)));

        return $accepted;
    }

    public function decline(Offer $offer, ?string $note, string $channel): Offer
    {
        $this->expireIfNeeded($offer);

        return $this->transition($offer, [OfferStatus::Sent], OfferStatus::Rejected, 'offer.declined', function (Offer $o) use ($note): void {
            $o->forceFill(['responded_at' => now(), 'response_note' => $note]);
        }, fn (Offer $o) => event(new OfferDeclined($o)), ['channel' => $channel]);
    }

    public function withdraw(Offer $offer, ?string $reason): Offer
    {
        return $this->transition(
            $offer,
            [OfferStatus::Draft, OfferStatus::PendingApproval, OfferStatus::Approved, OfferStatus::Sent],
            OfferStatus::Withdrawn,
            'offer.withdrawn',
            function (Offer $o) use ($reason): void {
                $o->forceFill(['response_note' => $reason, 'response_token_hash' => null]);
            },
        );
    }

    /** Marks a sent offer as expired (scheduler or a late response). */
    public function expire(Offer $offer): Offer
    {
        return $this->transition($offer, [OfferStatus::Sent], OfferStatus::Expired, 'offer.expired', fn () => null);
    }

    private function expireIfNeeded(Offer $offer): void
    {
        if ($offer->status === OfferStatus::Sent && $offer->expires_at->isPast()) {
            $this->expire($offer);

            throw new BusinessRuleException('This offer has expired.', 'OFFER_EXPIRED', 409);
        }
    }

    /**
     * @param  list<OfferStatus>  $from
     * @param  callable(Offer): void  $mutate
     * @param  (callable(Offer): void)|null  $afterCommit
     * @param  array<string, mixed>  $extra
     */
    private function transition(Offer $offer, array $from, OfferStatus $to, string $event, callable $mutate, ?callable $afterCommit = null, array $extra = []): Offer
    {
        $updated = DB::transaction(function () use ($offer, $from, $to, $event, $mutate, $extra): Offer {
            /** @var Offer $locked */
            $locked = Offer::withoutGlobalScopes()->lockForUpdate()->findOrFail($offer->id);
            $this->assertStatus($locked, $from, "This offer is {$locked->status->label()} and cannot be moved to {$to->label()}.");

            $previous = $locked->status;
            $locked->status = $to;
            $mutate($locked);
            $locked->save();

            $this->audit->record($event, $locked, ['status' => $previous->value], ['status' => $to->value, ...$extra], $locked->company_id);

            return $locked;
        });

        if ($afterCommit !== null) {
            DB::afterCommit(fn () => $afterCommit($updated));
        }

        return $updated;
    }

    /**
     * @param  list<OfferStatus>  $allowed
     */
    private function assertStatus(Offer $offer, array $allowed, string $message): void
    {
        if (! in_array($offer->status, $allowed, true)) {
            throw new BusinessRuleException($message, 'INVALID_OFFER_TRANSITION', 409);
        }
    }
}
