# Phase 4 — Reports Polish + Offline Optimization

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Améliorer le design des rapports PDF existants, ajouter le partage WhatsApp, mettre à jour les thèmes ECharts, et optimiser la consommation réseau avec un delta-sync intelligent.

**Architecture:** Amélioration pure du code existant — pas de nouvelles librairies majeures. DomPDF templates sont redessinés. ECharts options sont centralisées dans un fichier de thème. Dexie.js sync est optimisé avec des timestamps.

**Tech Stack:** DomPDF (existant), ECharts (existant), Dexie.js (existant), jsPDF (existant), Maatwebsite Excel (existant)

**Prérequis:** Phases 1, 2, 3 complètes.

---

## Fichiers créés / modifiés

| Action | Fichier | Rôle |
|---|---|---|
| Create | `resources/views/pdf/invoice.blade.php` | Template facture PDF redessiné |
| Create | `resources/views/pdf/sales-report.blade.php` | Rapport ventes PDF redessiné |
| Create | `resources/views/pdf/stock-report.blade.php` | Rapport stock PDF redessiné |
| Create | `resources/src/plugins/echarts-theme.js` | Thème ECharts centralisé |
| Create | `resources/src/utils/whatsapp-share.js` | Partage WhatsApp factures |
| Modify | `resources/src/db/localDB.js` | Ajouter champs delta-sync |
| Modify | `resources/src/sync/syncManager.js` | Optimiser sync réseau (delta) |
| Modify | `app/Http/Controllers/ReportController.php` | Utiliser nouveaux templates PDF |

---

## Task 1 — Thème ECharts centralisé

- [ ] **1.1 Créer le fichier de thème**

```js
// resources/src/plugins/echarts-theme.js
/**
 * Thème ECharts unifié pour tous les graphiques Stocky.
 * Importer ce fichier et utiliser `chartTheme` dans les options ECharts.
 */

export const COLORS = {
  primary:   '#667eea',
  secondary: '#764ba2',
  success:   '#43e97b',
  warning:   '#fcb69f',
  danger:    '#f5576c',
  info:      '#4facfe',
  palette:   ['#667eea', '#f093fb', '#43e97b', '#ffecd2', '#4facfe', '#f5576c', '#a18cd1'],
};

/** Options de base pour graphique en barres */
export function barChartOptions({ title, categories, series, color = COLORS.primary }) {
  return {
    title: title ? { text: title, textStyle: { fontSize: 14, fontWeight: 600, color: '#1a202c' } } : undefined,
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(26, 32, 44, 0.9)',
      borderColor: 'transparent',
      textStyle: { color: '#fff', fontSize: 12 },
    },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: {
      type: 'category',
      data: categories,
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisTick: { show: false },
      axisLabel: { color: '#718096', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: '#718096', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f7fafc' } },
    },
    series: [{
      type: 'bar',
      data: series,
      barMaxWidth: 40,
      itemStyle: {
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color }, { offset: 1, color: color + '88' }] },
        borderRadius: [6, 6, 0, 0],
      },
    }],
  };
}

/** Options de base pour graphique en ligne */
export function lineChartOptions({ title, categories, series, color = COLORS.primary }) {
  return {
    title: title ? { text: title, textStyle: { fontSize: 14, fontWeight: 600 } } : undefined,
    tooltip: { trigger: 'axis' },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', data: categories, boundaryGap: false },
    yAxis: { type: 'value' },
    series: [{
      type: 'line', data: series, smooth: true,
      lineStyle: { color, width: 3 },
      itemStyle: { color },
      areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
        colorStops: [{ offset: 0, color: color + '44' }, { offset: 1, color: 'transparent' }] } },
    }],
  };
}

/** Options pour graphique en camembert */
export function pieChartOptions({ title, data }) {
  return {
    title: title ? { text: title, textStyle: { fontSize: 14, fontWeight: 600 } } : undefined,
    tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
    legend: { orient: 'vertical', left: 'left' },
    color: COLORS.palette,
    series: [{
      type: 'pie', radius: ['40%', '70%'],
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      data,
    }],
  };
}
```

- [ ] **1.2 Mettre à jour les composants de graphiques existants**

Chercher les fichiers qui utilisent ECharts :

```bash
grep -r "echarts\|v-chart\|VChart" resources/src --include="*.vue" -l
```

Pour chaque fichier trouvé, remplacer les options de graphique inline par les helpers du thème. Exemple :

**Avant :**
```js
chartOptions: {
    xAxis: { type: 'category', data: [...] },
    yAxis: { type: 'value' },
    series: [{ type: 'bar', data: [...] }]
}
```

**Après :**
```js
import { barChartOptions } from '@/plugins/echarts-theme';
// ...
chartOptions: barChartOptions({ categories: [...], series: [...] })
```

- [ ] **1.3 Rebuild et vérifier visuellement**

```bash
npm run production
```

Ouvrir l'app, aller dans les rapports et vérifier que les graphiques ont le nouveau style.

- [ ] **1.4 Commit**

```bash
git add resources/src/plugins/echarts-theme.js resources/src/
git commit -m "feat: add centralized ECharts theme with modern colors and gradients"
```

---

## Task 2 — Templates PDF redessinés

- [ ] **2.1 Template facture client**

```blade
{{-- resources/views/pdf/invoice.blade.php --}}
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DejaVu Sans', sans-serif; font-size: 12px; color: #1a202c; background: #fff; }

  .page { padding: 40px; }

  /* En-tête */
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid #667eea; }
  .logo { max-height: 60px; max-width: 160px; }
  .company-name { font-size: 22px; font-weight: bold; color: #667eea; }
  .company-info { font-size: 10px; color: #718096; line-height: 1.6; margin-top: 4px; }

  .invoice-meta { text-align: right; }
  .invoice-title { font-size: 28px; font-weight: bold; color: #2d3748; letter-spacing: -0.5px; }
  .invoice-number { font-size: 13px; color: #667eea; font-weight: 600; margin-top: 4px; }
  .invoice-date { font-size: 11px; color: #718096; margin-top: 2px; }

  /* Client */
  .bill-to { background: #f7fafc; border-radius: 8px; padding: 16px; margin-bottom: 32px; }
  .bill-to-label { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; color: #718096; margin-bottom: 6px; }
  .bill-to-name { font-size: 14px; font-weight: bold; color: #2d3748; }
  .bill-to-detail { font-size: 11px; color: #718096; line-height: 1.6; }

  /* Tableau produits */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  thead th { background: #667eea; color: #fff; padding: 10px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:first-child { border-radius: 6px 0 0 6px; }
  thead th:last-child { border-radius: 0 6px 6px 0; }
  tbody tr:nth-child(even) { background: #f7fafc; }
  tbody td { padding: 10px 12px; font-size: 11px; border-bottom: 1px solid #edf2f7; }
  .text-right { text-align: right; }
  .text-center { text-align: center; }

  /* Totaux */
  .totals { margin-left: auto; width: 260px; }
  .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 12px; border-bottom: 1px solid #edf2f7; }
  .total-row.grand { font-size: 15px; font-weight: bold; color: #667eea; border-bottom: none; padding-top: 10px; }

  /* Pied de page */
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #edf2f7; text-align: center; font-size: 10px; color: #a0aec0; }

  /* Badge statut */
  .badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; }
  .badge-paid { background: #c6f6d5; color: #276749; }
  .badge-partial { background: #fefcbf; color: #744210; }
  .badge-unpaid { background: #fed7d7; color: #742a2a; }
</style>
</head>
<body>
<div class="page">

  <!-- En-tête -->
  <div class="header">
    <div>
      @if($company->company_logo)
        <img src="{{ storage_path('app/public/' . $company->company_logo) }}" class="logo" alt="Logo">
      @else
        <div class="company-name">{{ $company->company_name }}</div>
      @endif
      <div class="company-info">
        {{ $company->company_email }}<br>
        {{ $company->company_phone }}<br>
        {{ $company->company_address }}
      </div>
    </div>
    <div class="invoice-meta">
      <div class="invoice-title">FACTURE</div>
      <div class="invoice-number">#{{ $sale->Ref }}</div>
      <div class="invoice-date">{{ \Carbon\Carbon::parse($sale->date)->format('d/m/Y') }}</div>
      <div style="margin-top:8px">
        <span class="badge {{ $sale->payment_statut === 'paid' ? 'badge-paid' : ($sale->payment_statut === 'partial' ? 'badge-partial' : 'badge-unpaid') }}">
          {{ $sale->payment_statut === 'paid' ? 'PAYÉ' : ($sale->payment_statut === 'partial' ? 'PARTIEL' : 'IMPAYÉ') }}
        </span>
      </div>
    </div>
  </div>

  <!-- Informations client -->
  <div class="bill-to">
    <div class="bill-to-label">Facturé à</div>
    <div class="bill-to-name">{{ $sale->client->name ?? 'Client comptoir' }}</div>
    <div class="bill-to-detail">
      @if($sale->client)
        {{ $sale->client->email }}<br>{{ $sale->client->phone }}
      @endif
    </div>
  </div>

  <!-- Tableau des produits -->
  <table>
    <thead>
      <tr>
        <th>Produit</th>
        <th class="text-center">Qté</th>
        <th class="text-right">Prix unit.</th>
        <th class="text-right">Remise</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      @foreach($sale->details as $detail)
      <tr>
        <td>{{ $detail->product->name ?? '—' }}</td>
        <td class="text-center">{{ $detail->quantity }}</td>
        <td class="text-right">{{ number_format($detail->price, 0, ',', ' ') }}</td>
        <td class="text-right">{{ $detail->discount_net ? number_format($detail->discount_net, 0, ',', ' ') : '—' }}</td>
        <td class="text-right" style="font-weight:600">{{ number_format($detail->total, 0, ',', ' ') }}</td>
      </tr>
      @endforeach
    </tbody>
  </table>

  <!-- Totaux -->
  <div class="totals">
    <div class="total-row"><span>Sous-total</span><span>{{ number_format($sale->GrandTotal - $sale->TaxNet, 0, ',', ' ') }} {{ $symbol }}</span></div>
    @if($sale->TaxNet > 0)
    <div class="total-row"><span>Taxes ({{ $sale->tax_rate }}%)</span><span>{{ number_format($sale->TaxNet, 0, ',', ' ') }} {{ $symbol }}</span></div>
    @endif
    @if($sale->discount > 0)
    <div class="total-row"><span>Remise</span><span>-{{ number_format($sale->discount, 0, ',', ' ') }} {{ $symbol }}</span></div>
    @endif
    @if($sale->shipping > 0)
    <div class="total-row"><span>Livraison</span><span>{{ number_format($sale->shipping, 0, ',', ' ') }} {{ $symbol }}</span></div>
    @endif
    <div class="total-row grand"><span>TOTAL</span><span>{{ number_format($sale->GrandTotal, 0, ',', ' ') }} {{ $symbol }}</span></div>
    <div class="total-row"><span>Montant payé</span><span>{{ number_format($sale->paid_amount, 0, ',', ' ') }} {{ $symbol }}</span></div>
    @if($sale->GrandTotal - $sale->paid_amount > 0)
    <div class="total-row" style="color:#f5576c; font-weight:600"><span>Reste à payer</span><span>{{ number_format($sale->GrandTotal - $sale->paid_amount, 0, ',', ' ') }} {{ $symbol }}</span></div>
    @endif
  </div>

  <!-- Pied de page -->
  <div class="footer">
    <p>Merci pour votre confiance — {{ $company->company_name }}</p>
    @if($company->company_website)<p>{{ $company->company_website }}</p>@endif
  </div>

</div>
</body>
</html>
```

- [ ] **2.2 Mettre à jour `ReportController` pour utiliser le nouveau template**

Dans `app/Http/Controllers/ReportController.php`, trouver la méthode qui génère le PDF facture et mettre à jour le nom du template :

```php
// Trouver le bloc PDF de la facture vente et remplacer :
$pdf = \PDF::loadView('pdf.invoice', [
    'sale'    => $sale->load('details.product', 'client'),
    'company' => \App\Models\Setting::first(),
    'symbol'  => $currency->symbol ?? 'FCFA',
]);
return $pdf->stream("facture-{$sale->Ref}.pdf");
```

- [ ] **2.3 Tester le PDF**

```bash
# Avec le serveur Laravel démarré :
# Aller dans une vente → cliquer "Télécharger PDF"
# Vérifier le design dans le navigateur
```

- [ ] **2.4 Commit**

```bash
git add resources/views/pdf/ app/Http/Controllers/ReportController.php
git commit -m "feat: redesign invoice PDF template with modern professional layout"
```

---

## Task 3 — Partage WhatsApp sur les factures

- [ ] **3.1 Créer le helper WhatsApp**

```js
// resources/src/utils/whatsapp-share.js

/**
 * Partage une facture PDF via WhatsApp.
 * Sur mobile (Capacitor) : partage natif via l'app WhatsApp.
 * Sur desktop/web : ouvre WhatsApp Web avec message pré-rempli.
 */

import { Capacitor } from '@capacitor/core';

export async function shareInvoiceViaWhatsApp({ saleRef, clientPhone, pdfUrl, companyName }) {
    const message = `Bonjour,\n\nVeuillez trouver ci-joint votre facture *${saleRef}* de ${companyName}.\n\n${pdfUrl}`;
    const encodedMessage = encodeURIComponent(message);

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
        // Mobile : ouvrir l'app WhatsApp directement
        const phone = clientPhone ? clientPhone.replace(/[^0-9]/g, '') : '';
        const url = phone
            ? `whatsapp://send?phone=${phone}&text=${encodedMessage}`
            : `whatsapp://send?text=${encodedMessage}`;
        window.open(url, '_system');
    } else {
        // Web/Desktop : ouvrir WhatsApp Web
        const phone = clientPhone ? clientPhone.replace(/[^0-9]/g, '') : '';
        const url = phone
            ? `https://wa.me/${phone}?text=${encodedMessage}`
            : `https://wa.me/?text=${encodedMessage}`;
        window.open(url, '_blank');
    }
}
```

- [ ] **3.2 Ajouter le bouton WhatsApp dans le composant de détail vente**

Chercher le composant de détail de vente :

```bash
grep -r "pdf\|print\|invoice" resources/src/views/app/pages/sales --include="*.vue" -l
```

Dans le composant trouvé, ajouter le bouton après le bouton PDF existant :

```vue
<button @click="shareWhatsApp" class="btn btn-success btn-sm">
  <i class="fa fa-whatsapp"></i> WhatsApp
</button>
```

```js
import { shareInvoiceViaWhatsApp } from '@/utils/whatsapp-share';

methods: {
    async shareWhatsApp() {
        await shareInvoiceViaWhatsApp({
            saleRef:    this.sale.Ref,
            clientPhone: this.sale.client?.phone,
            pdfUrl:     `${window.location.origin}/api/sales/${this.sale.id}/pdf`,
            companyName: this.$store.state.settings?.company_name || 'Stocky',
        });
    }
}
```

- [ ] **3.3 Commit**

```bash
git add resources/src/utils/whatsapp-share.js resources/src/views/app/pages/sales/
git commit -m "feat: add WhatsApp invoice sharing on sale detail view"
```

---

## Task 4 — Optimisation offline : delta-sync

- [ ] **4.1 Mettre à jour le schéma Dexie.js**

Dans `resources/src/db/localDB.js`, mettre à jour la version de DB pour ajouter le champ `last_synced_at` :

```js
// Remplacer db.version(1)... par :

db.version(1).stores({
    ventes:     '++id, synced, created_at',
    produits:   '++id, remote_id, nom, code, prix, category_id, updated_at',
    clients:    '++id, remote_id, synced',
    sync_queue: '++id, endpoint, method, created_at',
});

// Version 2 : ajouter métadonnées de sync
db.version(2).stores({
    ventes:     '++id, synced, created_at',
    produits:   '++id, remote_id, nom, code, prix, category_id, updated_at',
    clients:    '++id, remote_id, synced',
    sync_queue: '++id, endpoint, method, created_at',
    sync_meta:  '++id, key',  // ex: { key: 'products_last_sync', value: '2026-05-29T...' }
}).upgrade(tx => {
    // Migration transparente — les données existantes sont conservées
});

/** Lire la dernière date de sync d'une collection */
export async function getLastSyncDate(key) {
    const meta = await db.sync_meta.where('key').equals(key).first();
    return meta ? meta.value : null;
}

/** Sauvegarder la date de sync */
export async function setLastSyncDate(key, date) {
    const existing = await db.sync_meta.where('key').equals(key).first();
    if (existing) {
        await db.sync_meta.update(existing.id, { value: date });
    } else {
        await db.sync_meta.add({ key, value: date });
    }
}
```

- [ ] **4.2 Optimiser la sync des produits (delta-sync)**

Dans `resources/src/sync/syncManager.js`, remplacer la fonction de sync des produits par :

```js
import { getLastSyncDate, setLastSyncDate } from '../db/localDB';

/**
 * Sync delta des produits — envoie seulement updated_at > last_sync
 * Économise la bande passante : si rien n'a changé, pas de données transférées.
 */
async function synchroniserProduits() {
    const lastSync = await getLastSyncDate('products_last_sync');
    const syncStart = new Date().toISOString();

    const params = {};
    if (lastSync) {
        params.updated_since = lastSync; // Le backend filtre WHERE updated_at > ?
    }

    try {
        const response = await window.axios.get('products/sync', { params });
        const products = response.data.products || [];

        if (products.length === 0) {
            console.log('[Sync] Produits à jour — aucune modification');
            return { synced: 0 };
        }

        // Upsert des produits modifiés seulement
        for (const product of products) {
            const existing = await db.produits.where('remote_id').equals(product.id).first();
            if (existing) {
                await db.produits.update(existing.id, {
                    nom:         product.name,
                    code:        product.code,
                    prix:        product.price,
                    category_id: product.category_id,
                    stock:       product.qte_sale,
                    updated_at:  product.updated_at,
                });
            } else {
                await db.produits.add({
                    remote_id:   product.id,
                    nom:         product.name,
                    code:        product.code,
                    prix:        product.price,
                    category_id: product.category_id,
                    stock:       product.qte_sale,
                    updated_at:  product.updated_at,
                });
            }
        }

        await setLastSyncDate('products_last_sync', syncStart);
        console.log(`[Sync] ${products.length} produit(s) mis à jour`);
        return { synced: products.length };

    } catch (error) {
        console.error('[Sync] Erreur sync produits:', error);
        return { synced: 0, error };
    }
}
```

- [ ] **4.3 Ajouter l'endpoint de sync delta côté Laravel**

Dans `routes/api.php` (dans le groupe tenant+subscription) :

```php
Route::get('products/sync', 'ProductsController@sync');
```

Dans `app/Http/Controllers/ProductsController.php`, ajouter la méthode :

```php
/** Sync delta — retourne seulement les produits modifiés depuis updated_since */
public function sync(Request $request)
{
    $query = Product::select('id', 'name', 'code', 'price', 'category_id', 'qte_sale', 'updated_at');

    if ($request->has('updated_since')) {
        $query->where('updated_at', '>', $request->updated_since);
    }

    return response()->json([
        'products'  => $query->get(),
        'sync_time' => now()->toISOString(),
    ]);
}
```

- [ ] **4.4 Lancer les tests**

```bash
php artisan test --filter=ProductSyncTest
```

- [ ] **4.5 Commit**

```bash
git add resources/src/db/localDB.js resources/src/sync/syncManager.js \
        app/Http/Controllers/ProductsController.php routes/api.php
git commit -m "feat: implement delta-sync for products — only transfer changed data"
```

---

## Task 5 — Optimisation des exports Excel

- [ ] **5.1 Améliorer l'export ventes Excel**

Chercher la classe d'export Excel existante :

```bash
find app/Exports -name "*.php" | head -10
```

Pour chaque classe d'export, améliorer le style avec Maatwebsite. Exemple pour les ventes :

```php
// app/Exports/SalesExport.php — remplacer ou améliorer la classe existante

<?php
namespace App\Exports;

use App\Models\Sale;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithColumnWidths;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;

class SalesExport implements FromCollection, WithHeadings, WithStyles, WithColumnWidths, WithTitle
{
    public function __construct(
        private ?string $startDate = null,
        private ?string $endDate = null
    ) {}

    public function collection()
    {
        return Sale::with('client', 'user')
            ->when($this->startDate, fn($q) => $q->whereDate('date', '>=', $this->startDate))
            ->when($this->endDate,   fn($q) => $q->whereDate('date', '<=', $this->endDate))
            ->orderBy('date', 'desc')
            ->get()
            ->map(fn($s) => [
                'Référence'        => $s->Ref,
                'Date'             => $s->date,
                'Client'           => $s->client?->name ?? 'Comptoir',
                'Statut'           => $s->statut,
                'Sous-total'       => $s->GrandTotal - $s->TaxNet,
                'Taxes'            => $s->TaxNet,
                'Remise'           => $s->discount,
                'Livraison'        => $s->shipping,
                'Total (FCFA)'     => $s->GrandTotal,
                'Payé (FCFA)'      => $s->paid_amount,
                'Reste (FCFA)'     => $s->GrandTotal - $s->paid_amount,
                'Statut paiement'  => $s->payment_statut,
                'Créé par'         => $s->user?->firstname . ' ' . $s->user?->lastname,
            ]);
    }

    public function headings(): array
    {
        return [
            'Référence', 'Date', 'Client', 'Statut',
            'Sous-total', 'Taxes', 'Remise', 'Livraison',
            'Total (FCFA)', 'Payé (FCFA)', 'Reste (FCFA)',
            'Statut paiement', 'Créé par',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            // En-tête coloré violet
            1 => [
                'font'    => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                'fill'    => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '667EEA']],
                'borders' => ['allBorders' => ['borderStyle' => 'thin', 'color' => ['rgb' => '5A67D8']]],
            ],
        ];
    }

    public function columnWidths(): array
    {
        return [
            'A' => 15, 'B' => 12, 'C' => 25, 'D' => 12,
            'E' => 14, 'F' => 10, 'G' => 10, 'H' => 12,
            'I' => 16, 'J' => 16, 'K' => 16,
            'L' => 16, 'M' => 22,
        ];
    }

    public function title(): string { return 'Ventes'; }
}
```

- [ ] **5.2 Commit**

```bash
git add app/Exports/
git commit -m "feat: improve Excel exports with colored headers, proper column widths, and French labels"
```

---

## Task 6 — Tests finaux et tag de version

- [ ] **6.1 Lancer tous les tests**

```bash
php artisan test
```

Résultat attendu : tous les tests verts.

- [ ] **6.2 Vérifier le delta-sync en dev**

```bash
# 1. Démarrer le serveur
php artisan serve

# 2. Se connecter dans l'app
# 3. Ouvrir DevTools → Application → IndexedDB → StockyPOS_DB → produits
# 4. Vérifier que les produits sont en cache local
# 5. Rafraîchir la page
# 6. Vérifier dans Network que products/sync envoie "updated_since" et reçoit moins de données
```

- [ ] **6.3 Tag de version finale**

```bash
git add .
git commit -m "feat: phase 4 complete — reports polish, WhatsApp share, delta-sync optimization"
git tag v4.0.0-saas-complete
```

---

## Résumé Phase 4 — et projet complet

| Fonctionnalité | Statut |
|---|---|
| Thème ECharts centralisé — graphiques modernes | ✅ |
| Template PDF facture redessiné — professionnel | ✅ |
| Partage WhatsApp factures (mobile + web) | ✅ |
| Exports Excel avec en-têtes colorés + colonnes FR | ✅ |
| Delta-sync Dexie.js — consommation réseau minimale | ✅ |

---

## Récapitulatif global du projet SaaS Stocky

| Phase | Description | Durée estimée |
|---|---|---|
| **Phase 1** | Multi-tenant backend + soft deletes + auth | 3-4 semaines |
| **Phase 2** | Admin panel Vue 3 + CinetPay + notifications | 3-4 semaines |
| **Phase 3** | Capacitor mobile + Electron desktop | 2-3 semaines |
| **Phase 4** | Reports polish + offline optimization | 1-2 semaines |
| **Total** | | **9-13 semaines** |
