<?php

namespace Tests\Unit;

use App\Models\Sale;
use App\Models\Tenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BelongsToTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_query_scoped_to_active_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        Sale::factory()->count(3)->create(['tenant_id' => $tenantA->id]);
        Sale::factory()->count(2)->create(['tenant_id' => $tenantB->id]);

        // Simuler TenantMiddleware qui bind le tenant dans le container
        app()->instance('current_tenant', $tenantA);

        $this->assertCount(3, Sale::all());
    }

    public function test_created_model_auto_gets_tenant_id(): void
    {
        $tenant = Tenant::factory()->create();
        app()->instance('current_tenant', $tenant);

        $sale = Sale::factory()->create();

        $this->assertEquals($tenant->id, $sale->fresh()->tenant_id);
    }

    public function test_soft_deleted_record_not_visible(): void
    {
        $tenant = Tenant::factory()->create();
        app()->instance('current_tenant', $tenant);

        $sale = Sale::factory()->create(['tenant_id' => $tenant->id]);
        $sale->delete();

        $this->assertCount(0, Sale::all());
        $this->assertCount(1, Sale::withTrashed()->get());
    }
}
