<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class PaymentSale extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'sale_id', 'date', 'montant', 'Ref','change', 'Reglement', 'user_id', 'notes','account_id',
            'tenant_id',
    ];

    protected $casts = [
        'montant' => 'double',
        'change'  => 'double',
        'sale_id' => 'integer',
        'user_id' => 'integer',
        'account_id' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

    public function account()
    {
        return $this->belongsTo('App\Models\Account');
    }

    public function sale()
    {
        return $this->belongsTo('App\Models\Sale');
    }

}
