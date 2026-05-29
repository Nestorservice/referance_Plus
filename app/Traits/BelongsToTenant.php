<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;

trait BelongsToTenant
{
    use SoftDeletes;

    public static function bootBelongsToTenant(): void
    {
        // Scope global : filtre automatique par tenant actif
        static::addGlobalScope('tenant', function (Builder $builder) {
            if (!app()->bound('current_tenant')) {
                return;
            }
            $tenant = app('current_tenant');
            if ($tenant) {
                $builder->where(
                    (new static)->getTable() . '.tenant_id',
                    $tenant->id
                );
            }
        });

        // Auto-remplissage du tenant_id à la création
        static::creating(function ($model) {
            if (!app()->bound('current_tenant')) {
                return;
            }
            $tenant = app('current_tenant');
            if ($tenant && empty($model->tenant_id)) {
                $model->tenant_id = $tenant->id;
            }
        });
    }

    /** Accès sans filtre tenant (pour admin) */
    public static function allTenants(): Builder
    {
        return static::withoutGlobalScope('tenant');
    }

    /** Accès aux données supprimées (soft delete) sans filtre tenant */
    public static function allTenantsWithTrashed(): Builder
    {
        return static::allTenants()->withTrashed();
    }

    public function scopeForTenant(Builder $query, int $tenantId): Builder
    {
        return $query->withoutGlobalScope('tenant')->where('tenant_id', $tenantId);
    }
}
