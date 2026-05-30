<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class PosSetting extends Model
{

    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'note_customer', 'show_note', 'show_barcode', 'show_discount', 'show_customer',
         'show_email','show_phone','show_address','is_printable','show_Warehouse','products_per_page',
            'tenant_id',
    ];

    protected $casts = [
        'show_note' => 'integer',
        'show_barcode' => 'integer',
        'show_discount' => 'integer',
        'show_customer' => 'integer',
        'show_Warehouse' => 'integer',
        'show_email' => 'integer',
        'show_phone' => 'integer',
        'show_address' => 'integer',
        'is_printable' => 'integer',
        'products_per_page' => 'integer',
    ];


}
