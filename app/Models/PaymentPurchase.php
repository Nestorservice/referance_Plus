<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class PaymentPurchase extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'purchase_id', 'date', 'montant','change', 'Ref', 'Reglement', 'user_id', 'notes','account_id',
            'tenant_id',
    ];

    protected $casts = [
        'montant' => 'double',
        'change'  => 'double',
        'purchase_id' => 'integer',
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

    public function purchase()
    {
        return $this->belongsTo('App\Models\Purchase');
    }

}
