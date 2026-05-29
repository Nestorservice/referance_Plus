# Phase 2 — Panneau Admin SaaS + CinetPay

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer le panneau admin SaaS sur `admin.stocky.com` (Vue 3 + Vite) et intégrer CinetPay pour les paiements Orange Money / MTN Mobile Money.

**Architecture:** Nouveau projet Vue 3 + Vite + Pinia dans `/admin-panel/`. Consomme l'API Laravel via `/api/admin/*`. CinetPay est intégré côté Laravel comme service avec webhooks. Les emails automatiques utilisent les notifications Laravel existantes.

**Tech Stack:** Vue 3, Vite, Pinia, Vue Router 4, Axios, ECharts, Laravel Notifications, CinetPay PHP SDK, PHPUnit 10

**Prérequis:** Phase 1 complète (middleware admin, routes `/api/admin/*`, modèle Tenant)

---

## Fichiers créés / modifiés

| Action | Fichier | Rôle |
|---|---|---|
| Create | `admin-panel/` | Nouveau projet Vue 3 + Vite |
| Create | `admin-panel/src/views/Dashboard.vue` | Stats + graphiques |
| Create | `admin-panel/src/views/Clients.vue` | Liste des tenants |
| Create | `admin-panel/src/views/ClientDetail.vue` | Fiche client + données |
| Create | `admin-panel/src/views/Payments.vue` | Historique CinetPay |
| Create | `admin-panel/src/views/Analytics.vue` | MRR, churn, croissance |
| Create | `admin-panel/src/views/Settings.vue` | Tarifs, config CinetPay |
| Create | `admin-panel/src/stores/auth.js` | Pinia auth store |
| Create | `admin-panel/src/stores/tenants.js` | Pinia tenants store |
| Create | `app/Services/CinetPayService.php` | Wrapper API CinetPay |
| Create | `app/Http/Controllers/Admin/TenantAdminController.php` | CRUD tenants côté admin |
| Create | `app/Http/Controllers/Admin/StatsAdminController.php` | KPIs dashboard |
| Create | `app/Http/Controllers/Admin/PaymentAdminController.php` | Historique paiements |
| Create | `app/Http/Controllers/CinetPayController.php` | Initiation paiement + webhook |
| Create | `database/migrations/2026_05_29_000005_create_payments_table.php` | Historique paiements |
| Create | `app/Notifications/SubscriptionExpiringSoon.php` | Email J-7 avant expiration |
| Create | `app/Notifications/SubscriptionRenewed.php` | Email confirmation paiement |
| Create | `app/Console/Commands/CheckExpiringSubscriptions.php` | Commande cron quotidienne |
| Create | `tests/Feature/CinetPayWebhookTest.php` | Tests webhook paiement |
| Create | `tests/Feature/AdminApiTest.php` | Tests API admin |

---

## Task 1 — Initialiser le projet Vue 3 Admin Panel

- [ ] **1.1 Créer le projet Vite + Vue 3**

```bash
cd /c/xampp_fin/htdocs/stocky
npm create vite@latest admin-panel -- --template vue
cd admin-panel
npm install
```

- [ ] **1.2 Installer les dépendances**

```bash
npm install pinia vue-router@4 axios echarts vue-echarts @vueuse/core
```

- [ ] **1.3 Configurer `vite.config.js`**

```js
// admin-panel/vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: '../public/admin',
    emptyOutDir: true,
  },
})
```

- [ ] **1.4 Configurer le router Vue 4**

```js
// admin-panel/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  { path: '/login',     name: 'login',     component: () => import('@/views/Login.vue'),     meta: { public: true } },
  { path: '/',          redirect: '/dashboard' },
  { path: '/dashboard', name: 'dashboard', component: () => import('@/views/Dashboard.vue') },
  { path: '/clients',   name: 'clients',   component: () => import('@/views/Clients.vue') },
  { path: '/clients/:id', name: 'client-detail', component: () => import('@/views/ClientDetail.vue') },
  { path: '/payments',  name: 'payments',  component: () => import('@/views/Payments.vue') },
  { path: '/analytics', name: 'analytics', component: () => import('@/views/Analytics.vue') },
  { path: '/settings',  name: 'settings',  component: () => import('@/views/Settings.vue') },
]

const router = createRouter({
  history: createWebHistory('/admin/'),
  routes,
})

router.beforeEach((to) => {
  const auth = useAuthStore()
  if (!to.meta.public && !auth.token) {
    return { name: 'login' }
  }
})

export default router
```

- [ ] **1.5 Configurer le store Pinia auth**

```js
// admin-panel/src/stores/auth.js
import { defineStore } from 'pinia'
import axios from 'axios'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('admin_token') || null,
    user: null,
  }),
  actions: {
    async login(email, password) {
      const { data } = await axios.post('/api/getAccessToken', { email, password })
      this.token = data.access_token
      localStorage.setItem('admin_token', this.token)
      axios.defaults.headers.common['Authorization'] = `Bearer ${this.token}`
    },
    logout() {
      this.token = null
      localStorage.removeItem('admin_token')
    },
  },
})
```

- [ ] **1.6 Commit**

```bash
cd ..
git add admin-panel/
git commit -m "feat: initialize Vue 3 + Vite admin panel project"
```

---

## Task 2 — Migration : table `payments`

- [ ] **2.1 Créer la migration**

```bash
php artisan make:migration create_payments_table --create=payments
```

- [ ] **2.2 Écrire le contenu**

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('tenant_id');
            $table->string('cinetpay_transaction_id')->nullable()->unique();
            $table->enum('type', ['installation', 'subscription'])->default('subscription');
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('XOF');
            $table->enum('status', ['pending', 'success', 'failed'])->default('pending');
            $table->string('payment_method')->nullable(); // orange_money, mtn_mobile_money, etc.
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('period_start')->nullable();
            $table->timestamp('period_end')->nullable();
            $table->json('cinetpay_response')->nullable();
            $table->timestamps();
            $table->foreign('tenant_id')->references('id')->on('tenants');
        });
    }
    public function down(): void { Schema::dropIfExists('payments'); }
};
```

- [ ] **2.3 Exécuter**

```bash
php artisan migrate --path=database/migrations/2026_05_29_000005_create_payments_table.php
```

- [ ] **2.4 Créer le modèle Payment**

```php
// app/Models/Payment.php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;

class Payment extends Model {
    protected $fillable = [
        'tenant_id', 'cinetpay_transaction_id', 'type', 'amount',
        'currency', 'status', 'payment_method', 'paid_at',
        'period_start', 'period_end', 'cinetpay_response',
    ];
    protected $casts = [
        'paid_at'       => 'datetime',
        'period_start'  => 'datetime',
        'period_end'    => 'datetime',
        'cinetpay_response' => 'array',
        'amount'        => 'decimal:2',
    ];
    public function tenant() { return $this->belongsTo(Tenant::class); }
}
```

- [ ] **2.5 Commit**

```bash
git add database/migrations/2026_05_29_000005_create_payments_table.php app/Models/Payment.php
git commit -m "feat: create payments table and model"
```

---

## Task 3 — Service CinetPay

- [ ] **3.1 Ajouter les variables d'environnement dans `.env.example`**

```bash
# Dans .env.example, ajouter :
CINETPAY_SITE_ID=
CINETPAY_API_KEY=
CINETPAY_BASE_URL=https://api-checkout.cinetpay.com/v2
CINETPAY_NOTIFY_URL=${APP_URL}/api/cinetpay/webhook
CINETPAY_RETURN_URL=${APP_URL}/payment/return
```

Copier dans `.env` et remplir avec les vraies clés CinetPay (depuis cinetpay.com → Mon compte → API).

- [ ] **3.2 Écrire le test**

```php
// tests/Feature/CinetPayWebhookTest.php
<?php
namespace Tests\Feature;

use App\Models\Payment;
use App\Models\Tenant;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class CinetPayWebhookTest extends TestCase {
    use RefreshDatabase;

    public function test_successful_webhook_activates_subscription(): void {
        $tenant = Tenant::factory()->expired()->create();
        $payment = Payment::factory()->create([
            'tenant_id' => $tenant->id,
            'status'    => 'pending',
            'cinetpay_transaction_id' => 'TXN_TEST_001',
            'type'      => 'subscription',
        ]);

        $this->postJson('/api/cinetpay/webhook', [
            'cpm_trans_id'   => 'TXN_TEST_001',
            'cpm_result'     => '00', // 00 = succès chez CinetPay
            'cpm_amount'     => '10000',
            'cpm_currency'   => 'XOF',
            'payment_method' => 'ORANGE_MONEY',
        ])->assertOk();

        $this->assertEquals('success', $payment->fresh()->status);
        $this->assertTrue($tenant->fresh()->isActive());
    }

    public function test_failed_webhook_does_not_activate(): void {
        $tenant = Tenant::factory()->expired()->create();
        $payment = Payment::factory()->create([
            'tenant_id' => $tenant->id,
            'status'    => 'pending',
            'cinetpay_transaction_id' => 'TXN_FAIL_001',
        ]);

        $this->postJson('/api/cinetpay/webhook', [
            'cpm_trans_id' => 'TXN_FAIL_001',
            'cpm_result'   => '01', // Échec
        ])->assertOk();

        $this->assertEquals('failed', $payment->fresh()->status);
        $this->assertFalse($tenant->fresh()->isActive());
    }
}
```

- [ ] **3.3 Créer le service CinetPay**

```php
// app/Services/CinetPayService.php
<?php
namespace App\Services;

use App\Models\Payment;
use App\Models\Tenant;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;

class CinetPayService {
    private string $siteId;
    private string $apiKey;
    private string $baseUrl;

    public function __construct() {
        $this->siteId  = config('services.cinetpay.site_id');
        $this->apiKey  = config('services.cinetpay.api_key');
        $this->baseUrl = config('services.cinetpay.base_url');
    }

    /** Initier un paiement CinetPay — retourne l'URL de paiement */
    public function initiatePayment(Tenant $tenant, string $type = 'subscription'): array {
        $transactionId = 'STOCKY_' . strtoupper(Str::random(12));
        $amount = $type === 'installation' ? 45000 : $tenant->monthly_amount;

        // Créer le paiement en base (statut pending)
        $payment = Payment::create([
            'tenant_id'                => $tenant->id,
            'cinetpay_transaction_id'  => $transactionId,
            'type'                     => $type,
            'amount'                   => $amount,
            'currency'                 => 'XOF',
            'status'                   => 'pending',
            'period_start'             => now(),
            'period_end'               => now()->addMonth(),
        ]);

        // Appel API CinetPay
        $response = Http::post("{$this->baseUrl}/payment", [
            'apikey'             => $this->apiKey,
            'site_id'            => $this->siteId,
            'transaction_id'     => $transactionId,
            'amount'             => $amount,
            'currency'           => 'XOF',
            'description'        => "Stocky - {$type} - {$tenant->name}",
            'return_url'         => config('services.cinetpay.return_url'),
            'notify_url'         => config('services.cinetpay.notify_url'),
            'customer_id'        => $tenant->ulid,
            'customer_name'      => $tenant->name,
            'customer_email'     => $tenant->email,
            'channels'           => 'MOBILE_MONEY',
            'lang'               => 'fr',
        ]);

        return [
            'payment_url'    => $response->json('data.payment_url'),
            'transaction_id' => $transactionId,
            'payment_id'     => $payment->id,
        ];
    }

    /** Traiter le webhook CinetPay */
    public function handleWebhook(array $data): void {
        $payment = Payment::where('cinetpay_transaction_id', $data['cpm_trans_id'])->first();

        if (!$payment) return;

        $success = ($data['cpm_result'] ?? '') === '00';

        $payment->update([
            'status'           => $success ? 'success' : 'failed',
            'payment_method'   => $data['payment_method'] ?? null,
            'paid_at'          => $success ? now() : null,
            'cinetpay_response' => $data,
        ]);

        if ($success) {
            $tenant = $payment->tenant;
            $tenant->update([
                'status'                  => 'active',
                'subscription_expires_at' => now()->addMonth(),
                'installation_paid'       => $payment->type === 'installation' ? true : $tenant->installation_paid,
            ]);

            $tenant->notify(new \App\Notifications\SubscriptionRenewed($payment));
        }
    }
}
```

- [ ] **3.4 Enregistrer la config dans `config/services.php`**

Ajouter dans le tableau de `config/services.php` :

```php
'cinetpay' => [
    'site_id'    => env('CINETPAY_SITE_ID'),
    'api_key'    => env('CINETPAY_API_KEY'),
    'base_url'   => env('CINETPAY_BASE_URL', 'https://api-checkout.cinetpay.com/v2'),
    'notify_url' => env('CINETPAY_NOTIFY_URL'),
    'return_url' => env('CINETPAY_RETURN_URL'),
],
```

- [ ] **3.5 Créer le CinetPayController**

```php
// app/Http/Controllers/CinetPayController.php
<?php
namespace App\Http\Controllers;

use App\Services\CinetPayService;
use Illuminate\Http\Request;

class CinetPayController extends Controller {
    public function __construct(private CinetPayService $cinetPay) {}

    /** Initier un paiement (appelé depuis l'app client) */
    public function initiate(Request $request) {
        $tenant = app('current_tenant');
        $type   = $request->input('type', 'subscription');

        $result = $this->cinetPay->initiatePayment($tenant, $type);

        return response()->json($result);
    }

    /** Webhook CinetPay — ne nécessite pas d'auth */
    public function webhook(Request $request) {
        $this->cinetPay->handleWebhook($request->all());
        return response()->json(['status' => 'ok']);
    }
}
```

- [ ] **3.6 Ajouter les routes CinetPay dans `routes/api.php`**

```php
// Dans le groupe tenant+subscription :
Route::post('payments/initiate', 'CinetPayController@initiate');

// Route publique (webhook reçu de CinetPay — pas d'auth) :
Route::post('cinetpay/webhook', 'CinetPayController@webhook');
```

- [ ] **3.7 Lancer les tests**

```bash
php artisan test --filter=CinetPayWebhookTest
```

- [ ] **3.8 Commit**

```bash
git add app/Services/CinetPayService.php app/Http/Controllers/CinetPayController.php \
        config/services.php routes/api.php tests/Feature/CinetPayWebhookTest.php
git commit -m "feat: integrate CinetPay for Orange Money + MTN payments with webhook"
```

---

## Task 4 — API Admin Controllers

- [ ] **4.1 Créer le dossier Admin**

```bash
mkdir -p app/Http/Controllers/Admin
```

- [ ] **4.2 TenantAdminController**

```php
// app/Http/Controllers/Admin/TenantAdminController.php
<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Tenant;
use Illuminate\Http\Request;

class TenantAdminController extends Controller {
    public function index(Request $request) {
        $tenants = Tenant::withTrashed()
            ->withCount('users')
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->plan,   fn($q, $p) => $q->where('plan', $p))
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%$s%")
                                                       ->orWhere('email', 'like', "%$s%"))
            ->latest()
            ->paginate(20);

        return response()->json($tenants);
    }

    public function show(int $id) {
        $tenant = Tenant::withTrashed()->with('users')->findOrFail($id);
        $tenant->payments_history = $tenant->payments ?? [];
        return response()->json($tenant);
    }

    public function update(Request $request, int $id) {
        $tenant = Tenant::findOrFail($id);
        $tenant->update($request->only(['name', 'email', 'phone', 'plan', 'notes']));

        if ($request->has('warehouses_count')) {
            $tenant->warehouses_count = $request->warehouses_count;
            $tenant->syncMonthlyAmount();
        }

        return response()->json($tenant->fresh());
    }

    public function suspend(int $id) {
        Tenant::findOrFail($id)->update(['status' => 'suspended']);
        return response()->json(['message' => 'Tenant suspendu.']);
    }

    public function activate(int $id) {
        $tenant = Tenant::findOrFail($id);
        $tenant->update([
            'status' => 'active',
            'subscription_expires_at' => $tenant->plan === 'subscription'
                ? now()->addMonth()
                : null,
        ]);
        return response()->json(['message' => 'Tenant activé.']);
    }
}
```

- [ ] **4.3 StatsAdminController**

```php
// app/Http/Controllers/Admin/StatsAdminController.php
<?php
namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Payment;
use App\Models\Tenant;

class StatsAdminController extends Controller {
    public function index() {
        $activeCount     = Tenant::where('status', 'active')->count();
        $oneTimeCount    = Tenant::where('plan', 'one_time')->count();
        $expiringSoon    = Tenant::where('status', 'active')
                                 ->where('plan', 'subscription')
                                 ->whereBetween('subscription_expires_at', [now(), now()->addDays(7)])
                                 ->count();

        $monthRevenue = Payment::where('status', 'success')
                               ->whereMonth('paid_at', now()->month)
                               ->sum('amount');

        $mrr = Tenant::where('status', 'active')
                     ->where('plan', 'subscription')
                     ->sum('monthly_amount');

        // Revenu des 12 derniers mois
        $revenueChart = collect(range(11, 0))->map(function ($monthsAgo) {
            $date = now()->subMonths($monthsAgo);
            return [
                'month'   => $date->format('M Y'),
                'revenue' => Payment::where('status', 'success')
                                    ->whereYear('paid_at', $date->year)
                                    ->whereMonth('paid_at', $date->month)
                                    ->sum('amount'),
            ];
        });

        return response()->json([
            'active_clients'   => $activeCount,
            'one_time_clients' => $oneTimeCount,
            'expiring_soon'    => $expiringSoon,
            'month_revenue'    => $monthRevenue,
            'mrr'              => $mrr,
            'revenue_chart'    => $revenueChart,
        ]);
    }
}
```

- [ ] **4.4 Tester l'API admin**

```bash
php artisan test --filter=AdminApiTest
```

- [ ] **4.5 Commit**

```bash
git add app/Http/Controllers/Admin/
git commit -m "feat: add admin API controllers (tenants, stats, payments)"
```

---

## Task 5 — Vues Vue 3 du panneau admin

- [ ] **5.1 Dashboard.vue**

```vue
<!-- admin-panel/src/views/Dashboard.vue -->
<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-6">Dashboard</h1>

    <!-- Stats Cards -->
    <div class="grid grid-cols-4 gap-4 mb-8">
      <StatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
    </div>

    <!-- Revenue Chart -->
    <div class="bg-white rounded-xl shadow p-6 mb-8">
      <h2 class="text-lg font-semibold mb-4">Revenu mensuel (12 mois)</h2>
      <v-chart :option="revenueChartOptions" style="height: 300px" autoresize />
    </div>

    <!-- Expiring Clients Alert -->
    <div v-if="stats.expiringSoon > 0" class="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
      <p class="text-red-700 font-semibold">
        ⚠️ {{ stats.expiringSoon }} client(s) expirent dans les 7 prochains jours
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { VChart } from 'vue-echarts'
import { use } from 'echarts/core'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import axios from 'axios'
import StatCard from '@/components/StatCard.vue'

use([BarChart, GridComponent, TooltipComponent, CanvasRenderer])

const stats = ref({})
const revenueData = ref([])

const revenueChartOptions = computed(() => ({
  tooltip: { trigger: 'axis', formatter: (p) => `${p[0].name}: ${p[0].value.toLocaleString()} FCFA` },
  xAxis: { type: 'category', data: revenueData.value.map(d => d.month) },
  yAxis: { type: 'value' },
  series: [{
    type: 'bar', data: revenueData.value.map(d => d.revenue),
    itemStyle: { color: '#667eea', borderRadius: [4, 4, 0, 0] },
  }],
}))

onMounted(async () => {
  const { data } = await axios.get('/api/admin/stats')
  stats.value = data
  revenueData.value = data.revenue_chart
})
</script>
```

- [ ] **5.2 StatCard component**

```vue
<!-- admin-panel/src/components/StatCard.vue -->
<template>
  <div class="bg-white rounded-xl shadow p-5">
    <div class="text-sm text-gray-500 mb-1">{{ label }}</div>
    <div class="text-3xl font-bold" :style="{ color }">{{ formattedValue }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  label: String,
  value: [Number, String],
  color: { type: String, default: '#667eea' },
  format: { type: String, default: 'number' }, // number | currency
})
const formattedValue = computed(() => {
  if (props.format === 'currency') return `${Number(props.value).toLocaleString()} FCFA`
  return props.value
})
</script>
```

- [ ] **5.3 Clients.vue (liste des tenants)**

```vue
<!-- admin-panel/src/views/Clients.vue -->
<template>
  <div class="p-6">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold">Clients</h1>
      <input v-model="search" placeholder="Rechercher..." class="border rounded-lg px-3 py-2 text-sm" />
    </div>

    <div class="bg-white rounded-xl shadow overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th class="px-4 py-3 text-left">Nom</th>
            <th class="px-4 py-3 text-left">Plan</th>
            <th class="px-4 py-3 text-center">Entrepôts</th>
            <th class="px-4 py-3 text-right">Mensualité</th>
            <th class="px-4 py-3 text-left">Expiration</th>
            <th class="px-4 py-3 text-center">Statut</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tenants.data" :key="t.id" class="border-t hover:bg-gray-50">
            <td class="px-4 py-3">
              <div class="font-medium">{{ t.name }}</div>
              <div class="text-gray-400 text-xs">{{ t.email }}</div>
            </td>
            <td class="px-4 py-3">
              <span :class="t.plan === 'one_time' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'"
                    class="px-2 py-0.5 rounded-full text-xs font-medium">
                {{ t.plan === 'one_time' ? 'Achat unique' : 'Abonnement' }}
              </span>
            </td>
            <td class="px-4 py-3 text-center">{{ t.warehouses_count }}</td>
            <td class="px-4 py-3 text-right font-mono">
              {{ t.plan === 'one_time' ? '—' : `${Number(t.monthly_amount).toLocaleString()} FCFA` }}
            </td>
            <td class="px-4 py-3 text-sm" :class="isExpiringSoon(t) ? 'text-red-600 font-semibold' : ''">
              {{ t.plan === 'one_time' ? '—' : formatDate(t.subscription_expires_at) }}
            </td>
            <td class="px-4 py-3 text-center">
              <StatusBadge :status="t.status" />
            </td>
            <td class="px-4 py-3">
              <router-link :to="`/clients/${t.id}`" class="text-indigo-600 text-xs hover:underline">Voir</router-link>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import axios from 'axios'
import StatusBadge from '@/components/StatusBadge.vue'
import { format, parseISO, differenceInDays } from 'date-fns'
import { fr } from 'date-fns/locale'

const tenants = ref({ data: [] })
const search = ref('')

async function load() {
  const { data } = await axios.get('/api/admin/tenants', { params: { search: search.value } })
  tenants.value = data
}

const formatDate = (d) => d ? format(parseISO(d), 'dd MMM yyyy', { locale: fr }) : '—'
const isExpiringSoon = (t) => t.subscription_expires_at &&
  differenceInDays(parseISO(t.subscription_expires_at), new Date()) <= 7

watch(search, load, { debounce: 300 })
onMounted(load)
</script>
```

- [ ] **5.4 Build de production**

```bash
cd admin-panel
npm run build
```

Vérifie que les fichiers sont dans `public/admin/`.

- [ ] **5.5 Commit**

```bash
cd ..
git add admin-panel/src/
git commit -m "feat: add admin panel Vue 3 views — dashboard, clients, stat cards"
```

---

## Task 6 — Notifications automatiques

- [ ] **6.1 Créer la notification d'expiration**

```php
// app/Notifications/SubscriptionExpiringSoon.php
<?php
namespace App\Notifications;

use App\Models\Tenant;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionExpiringSoon extends Notification {
    use Queueable;

    public function __construct(private Tenant $tenant) {}

    public function via($notifiable): array { return ['mail']; }

    public function toMail($notifiable): MailMessage {
        return (new MailMessage)
            ->subject("⚠️ Votre abonnement Stocky expire bientôt")
            ->greeting("Bonjour {$this->tenant->name},")
            ->line("Votre abonnement expire le **{$this->tenant->subscription_expires_at->format('d/m/Y')}**.")
            ->line("Montant à renouveler : **{$this->tenant->monthly_amount} FCFA**")
            ->action('Renouveler maintenant', url('/payment?type=subscription'))
            ->line('Sans renouvellement, votre accès sera suspendu automatiquement.');
    }
}
```

- [ ] **6.2 Créer la notification de renouvellement confirmé**

```php
// app/Notifications/SubscriptionRenewed.php
<?php
namespace App\Notifications;

use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class SubscriptionRenewed extends Notification {
    use Queueable;

    public function __construct(private Payment $payment) {}

    public function via($notifiable): array { return ['mail']; }

    public function toMail($notifiable): MailMessage {
        return (new MailMessage)
            ->subject("✅ Paiement confirmé — Stocky")
            ->greeting("Bonjour {$this->payment->tenant->name},")
            ->line("Votre paiement de **{$this->payment->amount} FCFA** a bien été reçu.")
            ->line("Votre accès est actif jusqu'au **{$this->payment->tenant->subscription_expires_at->format('d/m/Y')}**.")
            ->action('Accéder à Stocky', url('/'))
            ->line('Merci de votre confiance !');
    }
}
```

- [ ] **6.3 Créer la commande cron d'alerte J-7**

```php
// app/Console/Commands/CheckExpiringSubscriptions.php
<?php
namespace App\Console\Commands;

use App\Models\Tenant;
use App\Notifications\SubscriptionExpiringSoon;
use Illuminate\Console\Command;

class CheckExpiringSubscriptions extends Command {
    protected $signature   = 'subscriptions:check-expiring';
    protected $description = 'Envoie des alertes aux tenants qui expirent dans 7 jours';

    public function handle(): void {
        $expiring = Tenant::where('status', 'active')
                          ->where('plan', 'subscription')
                          ->whereBetween('subscription_expires_at', [now(), now()->addDays(7)])
                          ->get();

        foreach ($expiring as $tenant) {
            $owner = $tenant->users()->first();
            if ($owner) {
                $owner->notify(new SubscriptionExpiringSoon($tenant));
            }
        }

        $this->info("Alertes envoyées à {$expiring->count()} tenant(s).");
    }
}
```

- [ ] **6.4 Enregistrer la commande dans le scheduler**

Dans `app/Console/Kernel.php`, dans la méthode `schedule` :

```php
$schedule->command('subscriptions:check-expiring')->dailyAt('09:00');
```

- [ ] **6.5 Tester la commande**

```bash
php artisan subscriptions:check-expiring
```

Résultat attendu : `Alertes envoyées à X tenant(s).`

- [ ] **6.6 Commit**

```bash
git add app/Notifications/ app/Console/Commands/CheckExpiringSubscriptions.php app/Console/Kernel.php
git commit -m "feat: add subscription expiry notifications and daily cron check"
```

---

## Résumé Phase 2

| Fonctionnalité | Statut |
|---|---|
| Projet Vue 3 + Vite `admin-panel/` | ✅ |
| Dashboard avec stats et graphiques | ✅ |
| Liste et détail des clients (tenants) | ✅ |
| CinetPay service + webhook (Orange Money + MTN) | ✅ |
| Table payments + modèle | ✅ |
| API admin controllers (tenants, stats) | ✅ |
| Notification expiration J-7 | ✅ |
| Notification confirmation paiement | ✅ |
| Cron quotidien d'alertes | ✅ |

**Phase suivante :** [Phase 3 — Capacitor Mobile + Electron Desktop](./2026-05-29-phase3-capacitor-electron.md)
