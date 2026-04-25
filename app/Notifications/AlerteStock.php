<?php

/**
 * AlerteStock — Notification push pour les alertes de stock bas
 * Développé par OceanTechnologie
 * 
 * Envoyée automatiquement quand le stock d'un produit passe
 * sous le seuil configurable (défaut : 5 unités)
 */

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushChannel;
use NotificationChannels\WebPush\WebPushMessage;

class AlerteStock extends Notification
{
    use Queueable;

    /**
     * Nom du produit en alerte
     */
    protected $productName;

    /**
     * Quantité actuelle du produit
     */
    protected $currentStock;

    /**
     * Seuil d'alerte configuré
     */
    protected $stockAlert;

    /**
     * Nom de l'entrepôt concerné
     */
    protected $warehouseName;

    /**
     * Créer une nouvelle instance de notification d'alerte stock
     *
     * @param string $productName - Nom du produit
     * @param float $currentStock - Stock actuel
     * @param float $stockAlert - Seuil d'alerte
     * @param string $warehouseName - Nom de l'entrepôt
     */
    public function __construct($productName, $currentStock, $stockAlert, $warehouseName = '')
    {
        $this->productName = $productName;
        $this->currentStock = $currentStock;
        $this->stockAlert = $stockAlert;
        $this->warehouseName = $warehouseName;
    }

    /**
     * Canaux de notification utilisés
     */
    public function via($notifiable)
    {
        return [WebPushChannel::class];
    }

    /**
     * Construire le message de notification push
     */
    public function toWebPush($notifiable, $notification)
    {
        $body = "⚠ Le produit \"{$this->productName}\" n'a plus que {$this->currentStock} unité(s) en stock";
        if ($this->warehouseName) {
            $body .= " dans l'entrepôt \"{$this->warehouseName}\"";
        }
        $body .= ". Seuil d'alerte : {$this->stockAlert} unités.";

        return (new WebPushMessage)
            ->title('🔔 Alerte Stock — Stocky POS')
            ->icon('/images/icons/icon-192x192.png')
            ->badge('/images/icons/icon-192x192.png')
            ->body($body)
            ->action('Voir les alertes', 'view_alerts')
            ->tag('stock-alert-' . str_slug($this->productName))
            ->data([
                'url' => '/app/reports/quantity_alerts',
                'product' => $this->productName,
                'stock' => $this->currentStock,
            ]);
    }

    /**
     * Représentation en tableau de la notification (pour stockage DB)
     */
    public function toArray($notifiable)
    {
        return [
            'type' => 'stock_alert',
            'product_name' => $this->productName,
            'current_stock' => $this->currentStock,
            'stock_alert' => $this->stockAlert,
            'warehouse' => $this->warehouseName,
        ];
    }
}
