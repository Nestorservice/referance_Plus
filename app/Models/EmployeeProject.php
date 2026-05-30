<?php

namespace App\Models;

use App\Traits\BelongsToTenant;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeProject extends Model
{
    use HasFactory, BelongsToTenant;

   protected $table ="employee_project";

   protected $fillable = [
    'employee_id', 'project_id',
        'tenant_id',
    ];

protected $casts = [
    'employee_id' => 'integer',
    'project_id' => 'integer',
];

    public function assignedProjects()
    {
        return $this->hasMany('App\Models\Project', 'id', 'project_id');
    }
}
