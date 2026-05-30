<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class PaymentPurchaseReturns extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'purchase_return_id', 'date', 'montant','change', 'Ref', 'Reglement', 'user_id', 'notes','account_id',
            'tenant_id',
    ];

    protected $casts = [
        'montant' => 'double',
        'change'  => 'double',
        'purchase_return_id' => 'integer',
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

    public function PurchaseReturn()
    {
        return $this->belongsTo('App\Models\PurchaseReturn');
    }

}
