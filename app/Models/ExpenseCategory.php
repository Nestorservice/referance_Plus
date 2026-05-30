<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class ExpenseCategory extends Model
{

    use HasFactory, BelongsToTenant;

    protected $fillable = [
        'user_id', 'description', 'name', 'created_at', 'updated_at',
            'tenant_id',
    ];

    protected $casts = [
        'user_id' => 'integer',
    ];

    public function expense()
    {
        return $this->belongsTo('App\Models\Expense');
    }

    public function user()
    {
        return $this->belongsTo('App\Models\User');
    }

}
