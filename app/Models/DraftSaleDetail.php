<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class DraftSaleDetail extends Model
{

    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'id', 'date', 'draft_sale_id','sale_unit_id', 'quantity', 'product_id', 'total', 'product_variant_id',
        'price', 'TaxNet', 'discount', 'discount_method', 'tax_method',
            'tenant_id',
    ];

    protected $casts = [
        'id' => 'integer',
        'total' => 'double',
        'quantity' => 'double',
        'draft_sale_id' => 'integer',
        'sale_unit_id' => 'integer',
        'product_id' => 'integer',
        'product_variant_id' => 'integer',
        'price' => 'double',
        'TaxNet' => 'double',
        'discount' => 'double',
    ];

    public function draftsale()
    {
        return $this->belongsTo('App\Models\DraftSale');
    }

    public function product()
    {
        return $this->belongsTo('App\Models\Product');
    }

}
