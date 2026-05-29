<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        return [
            'ulid'                    => (string) Str::ulid(),
            'name'                    => $this->faker->company(),
            'email'                   => $this->faker->unique()->safeEmail(),
            'phone'                   => $this->faker->phoneNumber(),
            'plan'                    => 'subscription',
            'status'                  => 'active',
            'installed_at'            => now(),
            'subscription_expires_at' => now()->addMonth(),
            'warehouses_count'        => 1,
            'monthly_amount'          => 10000,
            'installation_paid'       => true,
        ];
    }

    public function oneTime(): static
    {
        return $this->state(['plan' => 'one_time', 'subscription_expires_at' => null]);
    }

    public function expired(): static
    {
        return $this->state(['subscription_expires_at' => now()->subDay()]);
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'suspended']);
    }
}
