<?php

namespace Tests\Unit;

use App\Models\Tenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_amount_for_one_warehouse(): void
    {
        $tenant = Tenant::factory()->create(['warehouses_count' => 1]);
        $this->assertEquals(10000, $tenant->computeMonthlyAmount());
    }

    public function test_monthly_amount_for_three_warehouses(): void
    {
        $tenant = Tenant::factory()->create(['warehouses_count' => 3]);
        // 10000 + 5000 + 5000 = 20000
        $this->assertEquals(20000, $tenant->computeMonthlyAmount());
    }

    public function test_monthly_amount_for_five_warehouses(): void
    {
        $tenant = Tenant::factory()->create(['warehouses_count' => 5]);
        // 10000 + 5000 + 5000 + 3000 + 3000 = 26000
        $this->assertEquals(26000, $tenant->computeMonthlyAmount());
    }

    public function test_is_active_returns_true_for_active_status(): void
    {
        $tenant = Tenant::factory()->create([
            'status'                  => 'active',
            'subscription_expires_at' => now()->addDays(30),
        ]);
        $this->assertTrue($tenant->isActive());
    }

    public function test_is_active_returns_false_when_expired(): void
    {
        $tenant = Tenant::factory()->create([
            'status'                  => 'active',
            'subscription_expires_at' => now()->subDay(),
        ]);
        $this->assertFalse($tenant->isActive());
    }

    public function test_one_time_plan_is_always_active(): void
    {
        $tenant = Tenant::factory()->create([
            'plan'                    => 'one_time',
            'subscription_expires_at' => null,
        ]);
        $this->assertTrue($tenant->isActive());
    }
}
