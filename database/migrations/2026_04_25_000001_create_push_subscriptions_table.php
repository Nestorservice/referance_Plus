<?php

/**
 * Migration — Table push_subscriptions pour les notifications push
 * Développé par OceanTechnologie
 * 
 * Stocke les abonnements push des utilisateurs pour les notifications
 * d'alertes de stock et autres notifications système.
 */

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Exécuter la migration
     */
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->increments('id');
            $table->morphs('subscribable');
            $table->string('endpoint', 500)->unique();
            $table->string('public_key')->nullable();
            $table->string('auth_token')->nullable();
            $table->string('content_encoding')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Annuler la migration
     */
    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
