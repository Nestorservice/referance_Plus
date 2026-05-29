<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ulid', 'name', 'email', 'phone', 'plan', 'status',
        'installed_at', 'subscription_expires_at', 'warehouses_count',
        'monthly_amount', 'installation_paid', 'cinetpay_customer_id', 'notes',
    ];

    protected $casts = [
        'installed_at'             => 'datetime',
        'subscription_expires_at'  => 'datetime',
        'warehouses_count'         => 'integer',
        'monthly_amount'           => 'decimal:2',
        'installation_paid'        => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant) {
            if (empty($tenant->ulid)) {
                $tenant->ulid = (string) Str::ulid();
            }
        });
    }

    /** Calcule le montant mensuel selon le nombre d'entrepôts */
    public function computeMonthlyAmount(): float
    {
        $count = $this->warehouses_count;
        $total = 0;

        for ($i = 1; $i <= $count; $i++) {
            if ($i === 1) {
                $total += 10000;
            } elseif ($i <= 3) {
                $total += 5000;
            } else {
                $total += 3000;
            }
        }

        return $total;
    }

    /** Synchronise monthly_amount avec warehouses_count */
    public function syncMonthlyAmount(): void
    {
        $this->update(['monthly_amount' => $this->computeMonthlyAmount()]);
    }

    /** Vérifie si le tenant a un accès actif */
    public function isActive(): bool
    {
        if ($this->status === 'suspended') {
            return false;
        }

        if ($this->plan === 'one_time') {
            return true;
        }

        return $this->subscription_expires_at !== null
            && $this->subscription_expires_at->isFuture();
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
