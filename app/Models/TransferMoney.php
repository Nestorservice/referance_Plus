<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class TransferMoney extends Model
{
    use HasFactory, BelongsToTenant;

    protected $table = 'transfer_money';

    protected $fillable = [
        'date','from_account_id', 'to_account_id','amount','created_at', 'updated_at',
            'tenant_id',
    ];

    protected $casts = [
        'from_account_id' => 'integer',
        'to_account_id'   => 'integer',
        'amount'          => 'double',

    ];


    public function from_account()
    {
        return $this->belongsTo('App\Models\Account', 'from_account_id');
    }

    public function to_account()
    {
        return $this->belongsTo('App\Models\Account', 'to_account_id');
    }

}
