<?php

namespace App\Models;

use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'account_num','account_name','initial_balance','balance','note','created_at', 'updated_at',
            'tenant_id',
    ];

    protected $casts = [
        'initial_balance' => 'double',
        'balance' => 'double',
    ];
}
