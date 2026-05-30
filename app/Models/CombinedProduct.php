<?php

namespace App\Models;

use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CombinedProduct extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'quantity',
            'tenant_id',
    ];

    protected $casts = [
        'product_id' => 'integer',
        'quantity' => 'double',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class, 'combined_product_id');
    }
}
