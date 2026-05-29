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
        'transfers', 'transfer_details', 'transfer_money',
        'quotations', 'quotation_details',
        'expenses', 'expense_categories',
        'deposits', 'deposit_categories',
        'employees', 'employee_accounts', 'employee_experiences',
        'employee_project', 'employee_task',
        'attendances', 'payrolls', 'leaves', 'leave_types', 'holidays',
        'departments', 'designations', 'office_shifts',
        'accounts', 'settings', 'companies',
        'projects', 'tasks',
        'shipments', 'draft_sales', 'draft_sale_details',
        'count_stock',
        'payment_sales', 'payment_purchases',
        'payment_sale_returns', 'payment_purchase_returns',
        'payment_with_credit_card',
        'pos_settings', 'roles',
        'combined_products', 'ecommerce_clients',
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
                $blueprint->dropIndex($table . '_tenant_id_index');
                $blueprint->dropColumn('tenant_id');
            });
        }
    }
};
