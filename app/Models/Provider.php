<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class Provider extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'name', 'code', 'adresse', 'phone', 'country', 'email', 'city','tax_number',
            'tenant_id',
    ];

    protected $casts = [
        'code' => 'integer',
    ];

}
