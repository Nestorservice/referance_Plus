<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasPushSubscriptions, SoftDeletes, HasFactory;

    protected $fillable = [
        'firstname', 'lastname', 'username', 'email', 'password',
        'phone', 'statut', 'avatar', 'role_id', 'is_all_warehouses',
        'tenant_id', 'is_admin',
    ];

    protected $hidden = [
        'password', 'remember_token',
    ];

    protected $casts = [
        'email_verified_at'  => 'datetime',
        'role_id'            => 'integer',
        'statut'             => 'integer',
        'is_all_warehouses'  => 'integer',
        'tenant_id'          => 'integer',
        'is_admin'           => 'boolean',
    ];

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function oauthAccessToken()
    {
        return $this->hasMany('\App\Models\OauthAccessToken');
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }

    public function assignRole(Role $role)
    {
        return $this->roles()->save($role);
    }

    public function hasRole($role)
    {
        if (is_string($role)) {
            return $this->roles->contains('name', $role);
        }
        return !!$role->intersect($this->roles)->count();
    }

    public function assignedWarehouses()
    {
        return $this->belongsToMany('App\Models\Warehouse');
    }
}
