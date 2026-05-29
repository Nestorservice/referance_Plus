<?php

namespace Database\Factories;

use App\Models\Sale;
use Illuminate\Database\Eloquent\Factories\Factory;

class SaleFactory extends Factory
{
    protected $model = Sale::class;

    public function definition(): array
    {
        return [
            'date'            => $this->faker->date(),
            'Ref'             => 'SL-' . $this->faker->unique()->numerify('######'),
            'is_pos'          => 0,
            'client_id'       => 1,
            'GrandTotal'      => $this->faker->randomFloat(2, 100, 100000),
            'TaxNet'          => 0,
            'tax_rate'        => 0,
            'discount'        => 0,
            'shipping'        => 0,
            'warehouse_id'    => 1,
            'user_id'         => 1,
            'statut'          => 'completed',
            'paid_amount'     => 0,
            'payment_statut'  => 'unpaid',
        ];
    }
}
