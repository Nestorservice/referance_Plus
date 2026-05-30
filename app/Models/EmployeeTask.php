<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Model;

class EmployeeTask extends Model
{
    use HasFactory, BelongsToTenant;

   protected $table ="employee_task";

   protected $fillable = [
    'employee_id', 'task_id',
        'tenant_id',
    ];

protected $casts = [
    'employee_id' => 'integer',
    'task_id' => 'integer',
];

    public function assignedTasks()
    {
        return $this->hasMany('App\Models\Task', 'id', 'task_id');
    }
}
