<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class AddFiledsToProductVariants extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->float('cost', 10, 0)->after('name');
            $table->float('price', 10, 0)->after('cost');
            $table->string('code', 192)->after('price');
            $table->string('image')->default('no-image.png')->after('code');
        });

        // Skip data migration in SQLite (test environment) — no production data to backfill
        if (DB::connection()->getDriverName() !== 'sqlite') {
            DB::statement("
                UPDATE product_variants
                INNER JOIN products ON product_variants.product_id = products.id
                SET product_variants.cost  = products.cost,
                    product_variants.price = products.price,
                    product_variants.code  = CONCAT(product_variants.name, '-', products.code)
            ");
        }
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::table('product_variants', function (Blueprint $table) {
            //
        });
    }
}
