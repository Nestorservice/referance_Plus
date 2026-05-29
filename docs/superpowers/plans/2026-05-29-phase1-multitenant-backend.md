# Phase 1 — Multi-Tenant Backend Foundations

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer le backend Laravel existant en une plateforme multi-tenant : chaque client (tenant) a ses données isolées, rien n'est jamais supprimé, et les routes admin ont un accès God-Mode sur tout.

**Architecture:** Shared database avec colonne `tenant_id` sur toutes les tables. Un trait `BelongsToTenant` injecte un global scope automatique sur chaque modèle. `TenantMiddleware` résout le tenant actif depuis l'utilisateur authentifié. Les routes `/api/admin/*` sont exclues du filtre via `AdminMiddleware`.

**Tech Stack:** Laravel 10, PHP 8.1, Laravel Passport, PHPUnit 10, MySQL

---

## Fichiers créés / modifiés

| Action | Fichier | Rôle |
|---|---|---|
| Create | `app/Models/Tenant.php` | Modèle tenant SaaS |
| Create | `app/Traits/BelongsToTenant.php` | Global scope + SoftDeletes pour tous les modèles |
| Create | `app/Http/Middleware/TenantMiddleware.php` | Résout le tenant depuis l'utilisateur auth |
| Create | `app/Http/Middleware/AdminMiddleware.php` | Bypass tenant pour routes admin |
| Create | `app/Http/Middleware/CheckSubscription.php` | Bloque accès si abonnement expiré |
| Create | `app/Http/Controllers/TenantController.php` | Inscription nouveau tenant |
| Create | `database/migrations/2026_05_29_000001_create_tenants_table.php` | Table tenants |
| Create | `database/migrations/2026_05_29_000002_add_tenant_id_to_users_table.php` | tenant_id sur users |
| Create | `database/migrations/2026_05_29_000003_add_tenant_id_to_all_tables.php` | tenant_id sur toutes les tables de données |
| Create | `database/migrations/2026_05_29_000004_add_soft_deletes_to_all_tables.php` | deleted_at propre sur toutes les tables |
| Create | `tests/Feature/TenantIsolationTest.php` | Tests d'isolation multi-tenant |
| Create | `tests/Feature/SubscriptionCheckTest.php` | Tests blocage abonnement expiré |
| Modify | `app/Models/User.php` | + tenant_id, + belongsTo(Tenant) |
| Modify | `app/Http/Kernel.php` | Enregistrer les 3 nouveaux middlewares |
| Modify | `routes/api.php` | Groupes middleware tenant + admin |
| Modify | `app/Models/Sale.php` + 35 autres modèles | + BelongsToTenant trait |

---

## Task 1 — Migration : table `tenants`

**Files:**
- Create: `database/migrations/2026_05_29_000001_create_tenants_table.php`

- [ ] **1.1 Créer la migration**

```bash
php artisan make:migration create_tenants_table --create=tenants
```

- [ ] **1.2 Écrire le contenu de la migration**

Remplacer le contenu généré par :

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tenants', function (Blueprint $table) {
            $table->id();
            $table->string('ulid', 26)->unique(); // identifiant public unique
            $table->string('name');               // nom de la boutique
            $table->string('email')->unique();    // email du propriétaire
            $table->string('phone')->nullable();
            $table->enum('plan', ['one_time', 'subscription'])->default('subscription');
            $table->enum('status', ['active', 'suspended', 'expired'])->default('active');
            $table->timestamp('installed_at')->nullable();
            $table->timestamp('subscription_expires_at')->nullable();
            $table->integer('warehouses_count')->default(1);
            $table->decimal('monthly_amount', 10, 2)->default(10000);
            $table->boolean('installation_paid')->default(false);
            $table->string('cinetpay_customer_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenants');
    }
};
```

- [ ] **1.3 Exécuter la migration**

```bash
php artisan migrate --path=database/migrations/2026_05_29_000001_create_tenants_table.php
```

Résultat attendu : `Migrating: 2026_05_29_000001_create_tenants_table` puis `Migrated`.

- [ ] **1.4 Commit**

```bash
git add database/migrations/2026_05_29_000001_create_tenants_table.php
git commit -m "feat: create tenants table migration"
```

---

## Task 2 — Modèle Tenant

**Files:**
- Create: `app/Models/Tenant.php`

- [ ] **2.1 Écrire le test unitaire**

```php
// tests/Unit/TenantModelTest.php
<?php

namespace Tests\Unit;

use App\Models\Tenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_monthly_amount_for_one_warehouse(): void
    {
        $tenant = Tenant::factory()->create(['warehouses_count' => 1]);
        $this->assertEquals(10000, $tenant->computeMonthlyAmount());
    }

    public function test_monthly_amount_for_three_warehouses(): void
    {
        $tenant = Tenant::factory()->create(['warehouses_count' => 3]);
        // 10000 + 5000 + 5000 = 20000
        $this->assertEquals(20000, $tenant->computeMonthlyAmount());
    }

    public function test_monthly_amount_for_five_warehouses(): void
    {
        $tenant = Tenant::factory()->create(['warehouses_count' => 5]);
        // 10000 + 5000 + 5000 + 3000 + 3000 = 26000
        $this->assertEquals(26000, $tenant->computeMonthlyAmount());
    }

    public function test_is_active_returns_true_for_active_status(): void
    {
        $tenant = Tenant::factory()->create([
            'status' => 'active',
            'subscription_expires_at' => now()->addDays(30),
        ]);
        $this->assertTrue($tenant->isActive());
    }

    public function test_is_active_returns_false_when_expired(): void
    {
        $tenant = Tenant::factory()->create([
            'status' => 'active',
            'subscription_expires_at' => now()->subDay(),
        ]);
        $this->assertFalse($tenant->isActive());
    }

    public function test_one_time_plan_is_always_active(): void
    {
        $tenant = Tenant::factory()->create([
            'plan' => 'one_time',
            'subscription_expires_at' => null,
        ]);
        $this->assertTrue($tenant->isActive());
    }
}
```

- [ ] **2.2 Lancer le test — doit échouer**

```bash
php artisan test --filter=TenantModelTest
```

Résultat attendu : `FAIL` — `App\Models\Tenant not found`.

- [ ] **2.3 Créer le modèle Tenant**

```php
// app/Models/Tenant.php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

class Tenant extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'ulid', 'name', 'email', 'phone', 'plan', 'status',
        'installed_at', 'subscription_expires_at', 'warehouses_count',
        'monthly_amount', 'installation_paid', 'cinetpay_customer_id', 'notes',
    ];

    protected $casts = [
        'installed_at'             => 'datetime',
        'subscription_expires_at'  => 'datetime',
        'warehouses_count'         => 'integer',
        'monthly_amount'           => 'decimal:2',
        'installation_paid'        => 'boolean',
    ];

    protected static function booted(): void
    {
        static::creating(function (Tenant $tenant) {
            $tenant->ulid = (string) Str::ulid();
        });
    }

    /** Calcule le montant mensuel selon le nombre d'entrepôts */
    public function computeMonthlyAmount(): float
    {
        $count = $this->warehouses_count;
        $total = 0;

        for ($i = 1; $i <= $count; $i++) {
            if ($i === 1) {
                $total += 10000;
            } elseif ($i <= 3) {
                $total += 5000;
            } else {
                $total += 3000;
            }
        }

        return $total;
    }

    /** Synchronise monthly_amount avec warehouses_count */
    public function syncMonthlyAmount(): void
    {
        $this->update(['monthly_amount' => $this->computeMonthlyAmount()]);
    }

    /** Vérifie si le tenant a un accès actif */
    public function isActive(): bool
    {
        if ($this->status === 'suspended') {
            return false;
        }

        if ($this->plan === 'one_time') {
            return true;
        }

        return $this->subscription_expires_at !== null
            && $this->subscription_expires_at->isFuture();
    }

    public function users()
    {
        return $this->hasMany(User::class);
    }
}
```

- [ ] **2.4 Créer la factory Tenant**

```php
// database/factories/TenantFactory.php
<?php

namespace Database\Factories;

use App\Models\Tenant;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class TenantFactory extends Factory
{
    protected $model = Tenant::class;

    public function definition(): array
    {
        return [
            'ulid'                    => (string) Str::ulid(),
            'name'                    => $this->faker->company(),
            'email'                   => $this->faker->unique()->safeEmail(),
            'phone'                   => $this->faker->phoneNumber(),
            'plan'                    => 'subscription',
            'status'                  => 'active',
            'installed_at'            => now(),
            'subscription_expires_at' => now()->addMonth(),
            'warehouses_count'        => 1,
            'monthly_amount'          => 10000,
            'installation_paid'       => true,
        ];
    }

    public function oneTime(): static
    {
        return $this->state(['plan' => 'one_time', 'subscription_expires_at' => null]);
    }

    public function expired(): static
    {
        return $this->state(['subscription_expires_at' => now()->subDay()]);
    }

    public function suspended(): static
    {
        return $this->state(['status' => 'suspended']);
    }
}
```

- [ ] **2.5 Lancer le test — doit passer**

```bash
php artisan test --filter=TenantModelTest
```

Résultat attendu : `PASS  Tests\Unit\TenantModelTest` — 6 tests, 6 assertions.

- [ ] **2.6 Commit**

```bash
git add app/Models/Tenant.php database/factories/TenantFactory.php tests/Unit/TenantModelTest.php
git commit -m "feat: add Tenant model with subscription logic"
```

---

## Task 3 — Migration : ajouter `tenant_id` à la table `users`

**Files:**
- Create: `database/migrations/2026_05_29_000002_add_tenant_id_to_users_table.php`
- Modify: `app/Models/User.php`

- [ ] **3.1 Créer la migration**

```bash
php artisan make:migration add_tenant_id_to_users_table --table=users
```

- [ ] **3.2 Écrire le contenu**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('tenant_id')->nullable()->after('id');
            $table->boolean('is_admin')->default(false)->after('tenant_id'); // flag propriétaire SaaS
            $table->foreign('tenant_id')->references('id')->on('tenants')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['tenant_id']);
            $table->dropColumn(['tenant_id', 'is_admin']);
        });
    }
};
```

- [ ] **3.3 Mettre à jour le modèle User**

Remplacer `app/Models/User.php` par :

```php
<?php

namespace App\Models;

use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Passport\HasApiTokens;
use NotificationChannels\WebPush\HasPushSubscriptions;
use Illuminate\Database\Eloquent\SoftDeletes;

class User extends Authenticatable
{
    use HasApiTokens, Notifiable, HasPushSubscriptions, SoftDeletes;

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
```

- [ ] **3.4 Exécuter la migration**

```bash
php artisan migrate --path=database/migrations/2026_05_29_000002_add_tenant_id_to_users_table.php
```

- [ ] **3.5 Commit**

```bash
git add database/migrations/2026_05_29_000002_add_tenant_id_to_users_table.php app/Models/User.php
git commit -m "feat: add tenant_id and is_admin to users table"
```

---

## Task 4 — Migration : `tenant_id` sur toutes les tables de données

**Files:**
- Create: `database/migrations/2026_05_29_000003_add_tenant_id_to_all_tables.php`

- [ ] **4.1 Créer la migration**

```bash
php artisan make:migration add_tenant_id_to_all_tables
```

- [ ] **4.2 Écrire le contenu**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Tables qui reçoivent tenant_id */
    private array $tables = [
        'sales', 'sale_details', 'sale_returns', 'sale_return_details',
        'purchases', 'purchase_details', 'purchase_returns', 'purchase_return_details',
        'products', 'product_variants', 'warehouses',
        'clients', 'providers',
        'categories', 'brands', 'units',
        'adjustments', 'adjustment_details',
        'transfers', 'transfer_details', 'transfer_moneys',
        'quotations', 'quotation_details',
        'expenses', 'expense_categories',
        'deposits', 'deposit_categories',
        'employees', 'employee_accounts', 'employee_experiences',
        'employee_projects', 'employee_tasks',
        'attendances', 'payrolls', 'leaves', 'leave_types', 'holidays',
        'departments', 'designations', 'office_shifts',
        'accounts', 'settings', 'companies',
        'projects', 'tasks',
        'shipments', 'draft_sales', 'draft_sale_details',
        'count_stocks',
        'payment_sales', 'payment_purchases',
        'payment_sale_returns', 'payment_purchase_returns',
        'payment_with_credit_cards',
        'pos_settings', 'banners', 'roles',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table)) {
                continue;
            }
            if (Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->unsignedBigInteger('tenant_id')->nullable()->after('id');
                $blueprint->index('tenant_id');
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (!Schema::hasTable($table) || !Schema::hasColumn($table, 'tenant_id')) {
                continue;
            }
            Schema::table($table, function (Blueprint $blueprint) use ($table) {
                $blueprint->dropIndex([$table . '_tenant_id_index']);
                $blueprint->dropColumn('tenant_id');
            });
        }
    }
};
```

- [ ] **4.3 Exécuter la migration**

```bash
php artisan migrate --path=database/migrations/2026_05_29_000003_add_tenant_id_to_all_tables.php
```

- [ ] **4.4 Commit**

```bash
git add database/migrations/2026_05_29_000003_add_tenant_id_to_all_tables.php
git commit -m "feat: add tenant_id index to all data tables"
```

---

## Task 5 — Trait `BelongsToTenant`

**Files:**
- Create: `app/Traits/BelongsToTenant.php`

- [ ] **5.1 Écrire le test**

```php
// tests/Unit/BelongsToTenantTest.php
<?php

namespace Tests\Unit;

use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class BelongsToTenantTest extends TestCase
{
    use RefreshDatabase;

    public function test_query_scoped_to_active_tenant(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        Sale::factory()->count(3)->create(['tenant_id' => $tenantA->id]);
        Sale::factory()->count(2)->create(['tenant_id' => $tenantB->id]);

        // Simuler TenantMiddleware qui bind le tenant dans le container
        app()->instance('current_tenant', $tenantA);

        $this->assertCount(3, Sale::all());
    }

    public function test_created_model_auto_gets_tenant_id(): void
    {
        $tenant = Tenant::factory()->create();
        app()->instance('current_tenant', $tenant);

        $sale = Sale::factory()->create();

        $this->assertEquals($tenant->id, $sale->fresh()->tenant_id);
    }

    public function test_soft_deleted_record_not_visible(): void
    {
        $tenant = Tenant::factory()->create();
        app()->instance('current_tenant', $tenant);

        $sale = Sale::factory()->create(['tenant_id' => $tenant->id]);
        $sale->delete();

        $this->assertCount(0, Sale::all());
        $this->assertCount(1, Sale::withTrashed()->get());
    }
}
```

- [ ] **5.2 Lancer le test — doit échouer**

```bash
php artisan test --filter=BelongsToTenantTest
```

Résultat attendu : `FAIL`.

- [ ] **5.3 Créer le trait**

```php
// app/Traits/BelongsToTenant.php
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
```

- [ ] **5.4 Lancer le test — doit passer**

```bash
php artisan test --filter=BelongsToTenantTest
```

Résultat attendu : `PASS` — 3 tests.

- [ ] **5.5 Commit**

```bash
git add app/Traits/BelongsToTenant.php tests/Unit/BelongsToTenantTest.php
git commit -m "feat: add BelongsToTenant trait with global scope and soft deletes"
```

---

## Task 6 — Appliquer le trait à tous les modèles existants

**Files à modifier :** Les 35 modèles de données listés ci-dessous.

- [ ] **6.1 Appliquer le trait à chaque modèle**

Pour **chaque modèle** dans la liste, effectuer les 3 modifications suivantes :

1. Ajouter `use App\Traits\BelongsToTenant;` dans les imports
2. Ajouter `use BelongsToTenant;` dans le corps de la classe
3. Supprimer `'deleted_at'` de `$fillable` et de `$dates` s'il y est (SoftDeletes le gère)
4. Ajouter `'tenant_id'` à `$fillable`

**Modèles à modifier** (appliquer le même pattern à chacun) :

```
app/Models/Sale.php
app/Models/SaleDetail.php
app/Models/SaleReturn.php
app/Models/SaleReturnDetails.php
app/Models/Purchase.php
app/Models/PurchaseDetail.php
app/Models/PurchaseReturn.php
app/Models/PurchaseReturnDetails.php
app/Models/Product.php
app/Models/ProductVariant.php
app/Models/Warehouse.php
app/Models/Client.php
app/Models/Provider.php
app/Models/Category.php
app/Models/Brand.php
app/Models/Unit.php
app/Models/Adjustment.php
app/Models/AdjustmentDetail.php
app/Models/Transfer.php
app/Models/TransferDetail.php
app/Models/TransferMoney.php
app/Models/Quotation.php
app/Models/QuotationDetail.php
app/Models/Expense.php
app/Models/ExpenseCategory.php
app/Models/Deposit.php
app/Models/DepositCategory.php
app/Models/Employee.php
app/Models/Attendance.php
app/Models/Payroll.php
app/Models/Department.php
app/Models/Project.php
app/Models/Task.php
app/Models/Account.php
app/Models/Setting.php
app/Models/Company.php
app/Models/Role.php
```

**Exemple — `app/Models/Sale.php` avant :**

```php
class Sale extends Model
{
    protected $dates = ['deleted_at'];
    protected $fillable = [
        'date', 'Ref', ..., 'deleted_at',
    ];
```

**Même fichier après :**

```php
use App\Traits\BelongsToTenant;

class Sale extends Model
{
    use BelongsToTenant;

    protected $fillable = [
        'date', 'Ref', ..., 'tenant_id',
        // 'deleted_at' retiré — géré par SoftDeletes via BelongsToTenant
    ];
```

- [ ] **6.2 Vérifier qu'aucun modèle n'a été oublié**

```bash
grep -rL "BelongsToTenant" app/Models/ --include="*.php" | grep -v "Oauth\|Password\|Currency\|User\|Tenant\|Permission\|Server\|Sms\|Social\|Store\|Ecommerce\|Email\|Leave\|Holiday\|Designation\|OfficeShift\|EmployeeAccount\|EmployeeExperience\|EmployeeProject\|EmployeeTask\|PurchaseClient\|DraftSale\|CountStock\|Payment\|PosSetting\|Banner\|Shipment\|Combination\|UserWarehouse"
```

Résultat attendu : liste vide (tous les modèles concernés ont le trait).

- [ ] **6.3 Lancer les tests existants pour vérifier qu'on n'a rien cassé**

```bash
php artisan test
```

- [ ] **6.4 Commit**

```bash
git add app/Models/
git commit -m "feat: apply BelongsToTenant trait to all data models"
```

---

## Task 7 — TenantMiddleware

**Files:**
- Create: `app/Http/Middleware/TenantMiddleware.php`

- [ ] **7.1 Écrire le test feature**

```php
// tests/Feature/TenantMiddlewareTest.php
<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_has_tenant_bound(): void
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->create(['tenant_id' => $tenant->id]);

        $response = $this->actingAs($user, 'api')
                         ->getJson('/api/dashboard_data');

        $this->assertNotNull(app('current_tenant'));
        $this->assertEquals($tenant->id, app('current_tenant')->id);
    }

    public function test_request_without_auth_gets_401(): void
    {
        $response = $this->getJson('/api/dashboard_data');
        $response->assertStatus(401);
    }

    public function test_user_without_tenant_gets_403(): void
    {
        $user = User::factory()->create(['tenant_id' => null, 'is_admin' => false]);

        $response = $this->actingAs($user, 'api')
                         ->getJson('/api/dashboard_data');

        $response->assertStatus(403);
    }
}
```

- [ ] **7.2 Créer le middleware**

```php
// app/Http/Middleware/TenantMiddleware.php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TenantMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['message' => 'Unauthenticated.'], 401);
        }

        // Les admins SaaS (is_admin = true) n'ont pas de tenant
        if ($user->is_admin) {
            return $next($request);
        }

        $tenant = $user->tenant;

        if (!$tenant) {
            return response()->json([
                'message' => 'Aucun espace trouvé pour cet utilisateur.',
            ], 403);
        }

        // Bind le tenant actif dans le container IoC
        app()->instance('current_tenant', $tenant);

        return $next($request);
    }
}
```

- [ ] **7.3 Enregistrer dans Kernel**

Dans `app/Http/Kernel.php`, ajouter dans `$routeMiddleware` :

```php
'tenant'       => \App\Http\Middleware\TenantMiddleware::class,
'admin.only'   => \App\Http\Middleware\AdminMiddleware::class,
'subscription' => \App\Http\Middleware\CheckSubscription::class,
```

- [ ] **7.4 Lancer les tests**

```bash
php artisan test --filter=TenantMiddlewareTest
```

Résultat attendu : `PASS` — 3 tests.

- [ ] **7.5 Commit**

```bash
git add app/Http/Middleware/TenantMiddleware.php app/Http/Kernel.php tests/Feature/TenantMiddlewareTest.php
git commit -m "feat: add TenantMiddleware — binds active tenant from authenticated user"
```

---

## Task 8 — AdminMiddleware (God-Mode)

**Files:**
- Create: `app/Http/Middleware/AdminMiddleware.php`

- [ ] **8.1 Écrire le test**

```php
// tests/Feature/AdminMiddlewareTest.php
<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AdminMiddlewareTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_see_all_tenants_data(): void
    {
        $tenantA = Tenant::factory()->create();
        $tenantB = Tenant::factory()->create();

        Sale::factory()->create(['tenant_id' => $tenantA->id]);
        Sale::factory()->create(['tenant_id' => $tenantB->id]);

        $admin = User::factory()->create(['tenant_id' => null, 'is_admin' => true]);

        // L'admin voit les 2 ventes sans filtre tenant
        $this->actingAs($admin, 'api')
             ->getJson('/api/admin/sales')
             ->assertOk()
             ->assertJsonCount(2, 'data');
    }

    public function test_non_admin_cannot_access_admin_routes(): void
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->create(['tenant_id' => $tenant->id, 'is_admin' => false]);

        $this->actingAs($user, 'api')
             ->getJson('/api/admin/sales')
             ->assertStatus(403);
    }
}
```

- [ ] **8.2 Créer le middleware**

```php
// app/Http/Middleware/AdminMiddleware.php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class AdminMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user || !$user->is_admin) {
            return response()->json([
                'message' => 'Accès réservé aux administrateurs.',
            ], 403);
        }

        // Pas de binding tenant — accès God-Mode
        return $next($request);
    }
}
```

- [ ] **8.3 Commit**

```bash
git add app/Http/Middleware/AdminMiddleware.php tests/Feature/AdminMiddlewareTest.php
git commit -m "feat: add AdminMiddleware for god-mode access without tenant filter"
```

---

## Task 9 — CheckSubscription middleware

**Files:**
- Create: `app/Http/Middleware/CheckSubscription.php`

- [ ] **9.1 Écrire le test**

```php
// tests/Feature/SubscriptionCheckTest.php
<?php

namespace Tests\Feature;

use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class SubscriptionCheckTest extends TestCase
{
    use RefreshDatabase;

    public function test_active_subscription_passes(): void
    {
        $tenant = Tenant::factory()->create([
            'status' => 'active',
            'subscription_expires_at' => now()->addMonth(),
        ]);
        $user = User::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($user, 'api')
             ->getJson('/api/dashboard_data')
             ->assertOk();
    }

    public function test_expired_subscription_returns_402(): void
    {
        $tenant = Tenant::factory()->expired()->create();
        $user   = User::factory()->create(['tenant_id' => $tenant->id]);

        $response = $this->actingAs($user, 'api')
                         ->getJson('/api/dashboard_data');

        $response->assertStatus(402);
        $response->assertJsonFragment(['expired' => true]);
    }

    public function test_suspended_tenant_returns_402(): void
    {
        $tenant = Tenant::factory()->suspended()->create();
        $user   = User::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($user, 'api')
             ->getJson('/api/dashboard_data')
             ->assertStatus(402);
    }

    public function test_one_time_plan_never_blocked(): void
    {
        $tenant = Tenant::factory()->oneTime()->create();
        $user   = User::factory()->create(['tenant_id' => $tenant->id]);

        $this->actingAs($user, 'api')
             ->getJson('/api/dashboard_data')
             ->assertOk();
    }
}
```

- [ ] **9.2 Créer le middleware**

```php
// app/Http/Middleware/CheckSubscription.php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSubscription
{
    public function handle(Request $request, Closure $next): Response
    {
        $tenant = app('current_tenant');

        if (!$tenant) {
            return $next($request);
        }

        if (!$tenant->isActive()) {
            return response()->json([
                'message' => 'Votre abonnement a expiré. Veuillez renouveler pour continuer.',
                'expired' => true,
                'plan'    => $tenant->plan,
                'status'  => $tenant->status,
                'expired_at' => $tenant->subscription_expires_at,
            ], 402);
        }

        return $next($request);
    }
}
```

- [ ] **9.3 Lancer les tests**

```bash
php artisan test --filter=SubscriptionCheckTest
```

Résultat attendu : `PASS` — 4 tests.

- [ ] **9.4 Commit**

```bash
git add app/Http/Middleware/CheckSubscription.php tests/Feature/SubscriptionCheckTest.php
git commit -m "feat: add CheckSubscription middleware — blocks expired/suspended tenants with 402"
```

---

## Task 10 — Mise à jour des routes API

**Files:**
- Modify: `routes/api.php`

- [ ] **10.1 Restructurer les routes**

Remplacer le groupe existant `Route::middleware(['auth:api', 'Is_Active'])->group(...)` par la structure suivante :

```php
// routes/api.php

// ─── Routes publiques (auth optionnelle) ────────────────────────────────────
Route::group(['prefix' => 'password'], function () {
    Route::post('create', 'PasswordResetController@create');
    Route::post('reset', 'PasswordResetController@reset');
});

Route::post('getAccessToken', 'AuthController@getAccessToken');

// ─── Inscription nouveau tenant (SaaS signup) ───────────────────────────────
Route::post('tenants/register', 'TenantController@register');

// ─── Routes clients (tenant isolé) ──────────────────────────────────────────
Route::middleware(['auth:api', 'Is_Active', 'tenant', 'subscription'])->group(function () {
    // Toutes les routes existantes restent ici, inchangées
    // ... (garder tout le contenu existant du groupe auth:api)
});

// ─── Routes admin SaaS (God-Mode, pas de filtre tenant) ─────────────────────
Route::prefix('admin')->middleware(['auth:api', 'admin.only'])->group(function () {
    Route::get('tenants',           'Admin\TenantAdminController@index');
    Route::get('tenants/{id}',      'Admin\TenantAdminController@show');
    Route::put('tenants/{id}',      'Admin\TenantAdminController@update');
    Route::post('tenants/{id}/suspend',  'Admin\TenantAdminController@suspend');
    Route::post('tenants/{id}/activate', 'Admin\TenantAdminController@activate');
    Route::get('stats',             'Admin\StatsAdminController@index');
    Route::get('sales',             'Admin\SalesAdminController@index');
});
```

- [ ] **10.2 Vérifier que les routes existantes sont bien dans le nouveau groupe**

```bash
php artisan route:list --path=api | head -30
```

Vérifier que les routes comme `api/dashboard_data`, `api/sales`, etc. apparaissent avec les middlewares `tenant` et `subscription`.

- [ ] **10.3 Commit**

```bash
git add routes/api.php
git commit -m "feat: restructure API routes with tenant, admin, and subscription middleware groups"
```

---

## Task 11 — TenantController (inscription nouveau client)

**Files:**
- Create: `app/Http/Controllers/TenantController.php`
- Create: `tests/Feature/TenantRegistrationTest.php`

- [ ] **11.1 Écrire le test**

```php
// tests/Feature/TenantRegistrationTest.php
<?php

namespace Tests\Feature;

use App\Models\Tenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_register_new_tenant(): void
    {
        $response = $this->postJson('/api/tenants/register', [
            'business_name' => 'Supermarché Ali',
            'email'         => 'ali@example.com',
            'password'      => 'password123',
            'phone'         => '+22507000000',
            'plan'          => 'subscription',
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure([
            'tenant' => ['id', 'ulid', 'name', 'email', 'plan', 'status'],
            'user'   => ['id', 'email'],
            'token',
        ]);

        $this->assertDatabaseHas('tenants', ['email' => 'ali@example.com']);
    }

    public function test_duplicate_email_returns_422(): void
    {
        Tenant::factory()->create(['email' => 'ali@example.com']);

        $this->postJson('/api/tenants/register', [
            'business_name' => 'Autre Boutique',
            'email'         => 'ali@example.com',
            'password'      => 'password123',
            'plan'          => 'subscription',
        ])->assertStatus(422);
    }

    public function test_monthly_amount_computed_on_registration(): void
    {
        $this->postJson('/api/tenants/register', [
            'business_name' => 'Boutique Test',
            'email'         => 'test@example.com',
            'password'      => 'password123',
            'plan'          => 'subscription',
        ]);

        $tenant = Tenant::where('email', 'test@example.com')->first();
        $this->assertEquals(10000, $tenant->monthly_amount); // 1 entrepôt par défaut
    }
}
```

- [ ] **11.2 Créer le controller**

```php
// app/Http/Controllers/TenantController.php
<?php

namespace App\Http\Controllers;

use App\Models\Tenant;
use App\Models\User;
use App\Models\Role;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class TenantController extends Controller
{
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'business_name' => 'required|string|max:255',
            'email'         => 'required|email|unique:tenants,email|unique:users,email',
            'password'      => 'required|string|min:8',
            'phone'         => 'nullable|string|max:30',
            'plan'          => 'required|in:one_time,subscription',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        return DB::transaction(function () use ($request) {
            // 1. Créer le tenant
            $tenant = Tenant::create([
                'name'           => $request->business_name,
                'email'          => $request->email,
                'phone'          => $request->phone,
                'plan'           => $request->plan,
                'status'         => 'active',
                'installed_at'   => now(),
                'subscription_expires_at' => $request->plan === 'subscription'
                    ? now()->addMonth()
                    : null,
                'warehouses_count' => 1,
                'monthly_amount'   => 10000,
            ]);

            // 2. Créer l'utilisateur propriétaire de la boutique
            $adminRole = Role::firstOrCreate(['name' => 'Admin', 'display_name' => 'Administrateur']);

            $user = User::create([
                'firstname'  => $request->business_name,
                'lastname'   => '',
                'username'   => $request->email,
                'email'      => $request->email,
                'password'   => Hash::make($request->password),
                'phone'      => $request->phone,
                'statut'     => 1,
                'role_id'    => $adminRole->id,
                'tenant_id'  => $tenant->id,
                'is_admin'   => false,
                'is_all_warehouses' => 1,
            ]);

            // 3. Générer le token API
            $token = $user->createToken('Stocky')->accessToken;

            return response()->json([
                'tenant' => $tenant,
                'user'   => $user->only('id', 'email', 'firstname'),
                'token'  => $token,
            ], 201);
        });
    }
}
```

- [ ] **11.3 Lancer les tests**

```bash
php artisan test --filter=TenantRegistrationTest
```

Résultat attendu : `PASS` — 3 tests.

- [ ] **11.4 Commit**

```bash
git add app/Http/Controllers/TenantController.php tests/Feature/TenantRegistrationTest.php
git commit -m "feat: add tenant registration endpoint — creates tenant + owner user + API token"
```

---

## Task 12 — Test d'isolation complet (end-to-end)

**Files:**
- Create: `tests/Feature/TenantIsolationTest.php`

- [ ] **12.1 Écrire le test d'isolation complet**

```php
// tests/Feature/TenantIsolationTest.php
<?php

namespace Tests\Feature;

use App\Models\Sale;
use App\Models\Tenant;
use App\Models\User;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class TenantIsolationTest extends TestCase
{
    use RefreshDatabase;

    public function test_tenant_a_cannot_see_tenant_b_sales(): void
    {
        [$userA, $tenantA] = $this->createTenantWithUser();
        [$userB, $tenantB] = $this->createTenantWithUser();

        Sale::factory()->count(3)->create(['tenant_id' => $tenantA->id]);
        Sale::factory()->count(2)->create(['tenant_id' => $tenantB->id]);

        $response = $this->actingAs($userA, 'api')
                         ->getJson('/api/sales');

        $response->assertOk();
        // Les ventes retournées appartiennent toutes au tenant A
        collect($response->json('sales'))->each(function ($sale) use ($tenantA) {
            $this->assertEquals($tenantA->id, $sale['tenant_id']);
        });
    }

    public function test_new_sale_gets_correct_tenant_id(): void
    {
        [$user, $tenant] = $this->createTenantWithUser();

        $this->actingAs($user, 'api')
             ->postJson('/api/sales', $this->validSalePayload());

        $sale = Sale::withoutGlobalScope('tenant')->latest()->first();
        $this->assertEquals($tenant->id, $sale->tenant_id);
    }

    public function test_soft_deleted_sale_invisible_to_tenant_but_visible_to_admin(): void
    {
        [$user, $tenant] = $this->createTenantWithUser();
        $admin = User::factory()->create(['tenant_id' => null, 'is_admin' => true]);

        $sale = Sale::factory()->create(['tenant_id' => $tenant->id]);
        $sale->delete();

        // Le tenant ne la voit plus
        $this->actingAs($user, 'api')
             ->getJson('/api/sales')
             ->assertJsonMissing(['id' => $sale->id]);

        // L'admin la voit toujours
        $allSales = Sale::allTenantsWithTrashed()->get();
        $this->assertTrue($allSales->contains('id', $sale->id));
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    private function createTenantWithUser(): array
    {
        $tenant = Tenant::factory()->create();
        $user   = User::factory()->create(['tenant_id' => $tenant->id]);
        return [$user, $tenant];
    }

    private function validSalePayload(): array
    {
        return [
            'date'           => now()->toDateString(),
            'client_id'      => 1,
            'warehouse_id'   => 1,
            'GrandTotal'     => 5000,
            'statut'         => 'completed',
            'payment_statut' => 'paid',
            'details'        => [],
        ];
    }
}
```

- [ ] **12.2 Lancer tous les tests**

```bash
php artisan test
```

Résultat attendu : tous les tests passent (ou uniquement les anciens tests échouent pour des raisons non liées à ce plan).

- [ ] **12.3 Commit final Phase 1**

```bash
git add tests/Feature/TenantIsolationTest.php
git commit -m "test: add full tenant isolation integration test"
git tag v2.0.0-phase1
```

---

## Résumé Phase 1

À la fin de cette phase :

| Fonctionnalité | Statut |
|---|---|
| Table `tenants` avec plans et statuts | ✅ |
| `tenant_id` sur toutes les tables de données | ✅ |
| Trait `BelongsToTenant` — filtre auto + soft deletes | ✅ |
| Tous les modèles utilisent le trait | ✅ |
| `TenantMiddleware` — bind tenant depuis l'utilisateur | ✅ |
| `AdminMiddleware` — God-Mode sans filtre | ✅ |
| `CheckSubscription` — bloque accès expiré (HTTP 402) | ✅ |
| Routes restructurées (tenant + admin) | ✅ |
| Endpoint d'inscription nouveau client | ✅ |
| Tests d'isolation complets | ✅ |

**Phase suivante :** [Phase 2 — Panneau Admin SaaS + CinetPay](./2026-05-29-phase2-admin-panel-cinetpay.md)
