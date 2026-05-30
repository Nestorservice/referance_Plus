<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class SaleReturn extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'date', 'Ref', 'GrandTotal',
        'user_id', 'discount', 'shipping',
        'warehouse_id', 'client_id','sale_id', 'notes', 'TaxNet', 'tax_rate', 'statut',
        'paid_amount', 'payment_statut', 'created_at', 'updated_at',
            'tenant_id',
    ];

    protected $casts = [
        'GrandTotal' => 'double',
        'user_id' => 'integer',
        'client_id' => 'integer',
        'sale_id' => 'integer',
        'warehouse_id' => 'integer',
        'discount' => 'double',
        'shipping' => 'double',
        'TaxNet' => 'double',
        'tax_rate' => 'double',
        'paid_amount' => 'double',
    ];

    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

    public function details()
    {
        return $this->hasMany('App\Models\SaleReturnDetails');
    }

    public function product()
    {
        return $this->belongsTo('App\Models\Product');
    }

    public function client()
    {
        return $this->belongsTo('App\Models\Client');
    }

    public function warehouse()
    {
        return $this->belongsTo('App\Models\Warehouse');
    }

    public function sale()
    {
        return $this->belongsTo('App\Models\Sale');
    }

    public function facture()
    {
        return $this->hasMany('App\Models\PaymentSaleReturns');
    }

}
