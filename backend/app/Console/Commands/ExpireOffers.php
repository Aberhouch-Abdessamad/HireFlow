<?php

namespace App\Console\Commands;

use App\Enums\OfferStatus;
use App\Models\Company;
use App\Models\Offer;
use App\Services\Offers\OfferService;
use App\Support\Tenancy\TenantContext;
use Illuminate\Console\Command;

/** Marks sent offers whose response deadline has passed as expired (all companies). */
class ExpireOffers extends Command
{
    protected $signature = 'offers:expire';

    protected $description = 'Expire sent offers past their response deadline';

    public function handle(OfferService $offers, TenantContext $tenant): int
    {
        $count = 0;

        Offer::withoutGlobalScopes()
            ->where('status', OfferStatus::Sent->value)
            ->where('expires_at', '<=', now())
            ->chunkById(100, function ($batch) use ($offers, $tenant, &$count): void {
                foreach ($batch as $offer) {
                    $tenant->runAs(Company::query()->findOrFail($offer->company_id), fn () => $offers->expire($offer));
                    $count++;
                }
            });

        $this->info("Expired {$count} offer(s).");

        return self::SUCCESS;
    }
}
