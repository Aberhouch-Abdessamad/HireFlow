<?php

namespace Tests\Feature\Tenancy;

use App\Exceptions\CrossTenantWriteException;
use App\Exceptions\TenantNotResolvedException;
use App\Models\Company;
use App\Models\Concerns\BelongsToCompany;
use App\Support\Tenancy\TenantContext;
use Illuminate\Database\Eloquent\MassAssignmentException;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

/** Test-only tenant-owned model. */
class TenantProbeRecord extends Model
{
    use BelongsToCompany;

    protected $table = 'tenant_probe_records';

    protected $fillable = ['name'];
}

class BelongsToCompanyTest extends TestCase
{
    use RefreshDatabase;

    private Company $companyA;

    private Company $companyB;

    private TenantContext $tenant;

    protected function setUp(): void
    {
        parent::setUp();

        Schema::create('tenant_probe_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained();
            $table->string('name');
            $table->timestamps();
        });

        $this->companyA = Company::factory()->create();
        $this->companyB = Company::factory()->create();
        $this->tenant = app(TenantContext::class);
    }

    public function test_company_id_is_filled_from_the_tenant_context(): void
    {
        $record = $this->tenant->runAs($this->companyA, fn () => TenantProbeRecord::create(['name' => 'A1']));

        $this->assertSame($this->companyA->id, $record->company_id);
    }

    public function test_company_id_cannot_be_mass_assigned(): void
    {
        // Strict mode turns a silently discarded attribute into an exception outside production.
        $this->expectException(MassAssignmentException::class);

        $this->tenant->runAs(
            $this->companyA,
            fn () => TenantProbeRecord::create(['name' => 'A1', 'company_id' => $this->companyB->id]),
        );
    }

    public function test_queries_only_return_the_active_companys_records(): void
    {
        $this->tenant->runAs($this->companyA, fn () => TenantProbeRecord::create(['name' => 'A1']));
        $this->tenant->runAs($this->companyB, fn () => TenantProbeRecord::create(['name' => 'B1']));

        $names = $this->tenant->runAs($this->companyA, fn () => TenantProbeRecord::pluck('name')->all());
        $this->assertSame(['A1'], $names);

        $foreignId = TenantProbeRecord::forCompany($this->companyB)->value('id');
        $found = $this->tenant->runAs($this->companyA, fn () => TenantProbeRecord::find($foreignId));
        $this->assertNull($found);
    }

    public function test_queries_fail_closed_without_a_tenant(): void
    {
        $this->tenant->runAs($this->companyA, fn () => TenantProbeRecord::create(['name' => 'A1']));

        $this->assertSame(0, TenantProbeRecord::count());
        $this->assertSame(1, TenantProbeRecord::forCompany($this->companyA)->count());
    }

    public function test_creating_without_a_tenant_is_rejected(): void
    {
        $this->expectException(TenantNotResolvedException::class);

        TenantProbeRecord::create(['name' => 'orphan']);
    }

    public function test_creating_for_another_tenant_is_rejected(): void
    {
        $this->expectException(CrossTenantWriteException::class);

        $this->tenant->runAs($this->companyA, function (): void {
            $record = new TenantProbeRecord(['name' => 'sneaky']);
            $record->company_id = $this->companyB->id;
            $record->save();
        });
    }

    public function test_moving_a_record_to_another_tenant_is_rejected(): void
    {
        $record = $this->tenant->runAs($this->companyA, fn () => TenantProbeRecord::create(['name' => 'A1']));

        $this->expectException(CrossTenantWriteException::class);

        $this->tenant->runAs($this->companyA, function () use ($record): void {
            $record->company_id = $this->companyB->id;
            $record->save();
        });
    }
}
