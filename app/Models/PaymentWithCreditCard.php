<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class PaymentWithCreditCard extends Model
{

    use HasFactory, BelongsToTenant;

    protected $table = 'payment_with_credit_card';

    protected $fillable = [
        'payment_id', 'customer_id', 'customer_stripe_id', 'charge_id',
            'tenant_id',
    ];

    protected $casts = [
        'payment_id' => 'integer',
        'customer_id' => 'integer',
    ];


}
