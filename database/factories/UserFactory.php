<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class UserFactory extends Factory
{
    protected $model = User::class;

    public function definition(): array
    {
        return [
            'firstname'          => $this->faker->firstName(),
            'lastname'           => $this->faker->lastName(),
            'username'           => $this->faker->unique()->userName(),
            'email'              => $this->faker->unique()->safeEmail(),
            'email_verified_at'  => now(),
            'password'           => bcrypt('password'),
            'phone'              => $this->faker->phoneNumber(),
            'statut'             => 1,
            'remember_token'     => Str::random(10),
        ];
    }

    public function unverified(): static
    {
        return $this->state(['email_verified_at' => null]);
    }
}
