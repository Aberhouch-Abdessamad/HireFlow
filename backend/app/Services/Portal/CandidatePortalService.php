<?php

namespace App\Services\Portal;

use App\Enums\SystemRole;
use App\Models\Application;
use App\Models\Candidate;
use App\Models\Offer;
use App\Models\Scopes\CompanyScope;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Candidate portal. A portal account is linked to the candidate records that share its
 * email address (one per company). Every query here works across companies but is
 * always restricted to records linked to the signed-in user.
 */
final class CandidatePortalService
{
    public function __construct(private readonly AuditLogger $audit) {}

    /**
     * @param  array{name: string, email: string, password: string}  $data
     */
    public function register(array $data): User
    {
        return DB::transaction(function () use ($data): User {
            $user = User::create([
                'name' => $data['name'],
                'email' => Str::lower($data['email']),
                'password' => Hash::make($data['password']),
            ]);
            $user->grantPlatformRole(SystemRole::Candidate);
            $this->linkProfiles($user);
            $this->audit->record('candidate_portal.registered', $user, null, null, null, $user->id);

            return $user;
        });
    }

    /** Links unclaimed candidate records with the user's email. */
    public function linkProfiles(User $user): int
    {
        if (! $user->isCandidate()) {
            return 0;
        }

        return Candidate::withoutGlobalScope(CompanyScope::class)
            ->where('email', Str::lower($user->email))
            ->whereNull('user_id')
            ->update(['user_id' => $user->id]);
    }

    /** @return Builder<Application> */
    public function applications(User $user): Builder
    {
        return Application::withoutGlobalScope(CompanyScope::class)
            ->whereHas('candidate', fn (Builder $q) => $q->withoutGlobalScope(CompanyScope::class)->where('user_id', $user->id))
            ->with([
                'company:id,name,slug,logo_path',
                'jobPosting' => fn ($q) => $q->withoutGlobalScope(CompanyScope::class)->select(['id', 'company_id', 'title', 'slug', 'location']),
                'stage' => fn ($q) => $q->withoutGlobalScope(CompanyScope::class),
            ]);
    }

    public function findApplication(User $user, int $id): Application
    {
        return $this->applications($user)->whereKey($id)->firstOrFail();
    }

    /** @return Builder<Offer> Offers the candidate can see (sent or later; never drafts). */
    public function offers(User $user): Builder
    {
        return Offer::withoutGlobalScope(CompanyScope::class)
            ->whereIn('status', ['sent', 'accepted', 'rejected', 'expired'])
            ->whereHas('application', fn (Builder $a) => $a->withoutGlobalScope(CompanyScope::class)
                ->whereHas('candidate', fn (Builder $c) => $c->withoutGlobalScope(CompanyScope::class)->where('user_id', $user->id)));
    }
}
