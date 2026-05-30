<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class Deposit extends Model
{

    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id','account_id','deposit_category_id','amount','date','deposit_ref','description',
        'created_at', 'updated_at',
            'tenant_id',
    ];

    protected $casts = [
        'user_id'  => 'integer',
        'account_id'  => 'integer',
        'deposit_category_id'  => 'integer',
        'amount' => 'double',
    ];


    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }
    
    public function account()
    {
        return $this->hasOne('App\Models\Account', 'id', 'account_id');
    }

    public function deposit_category()
    {
        return $this->hasOne('App\Models\DepositCategory', 'id', 'deposit_category_id');
    }
}
