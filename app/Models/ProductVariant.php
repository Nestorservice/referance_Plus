<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'product_variants';

    protected $fillable = [
        'product_id', 'name', 'qty','cost','price','code','image',
            'tenant_id',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'qty' => 'double',
        'cost' => 'double',
        'price' => 'double',
    ];

}
