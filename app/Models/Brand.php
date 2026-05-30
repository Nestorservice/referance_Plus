<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class Brand extends Model
{
    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'name', 'description', 'image',
            'tenant_id',
    ];

}
