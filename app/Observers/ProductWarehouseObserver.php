<?php

namespace App\Observers;

use App\Models\product_warehouse;
use App\Models\User;
use App\Notifications\AlerteStock;
use Illuminate\Support\Facades\Notification;

class ProductWarehouseObserver
{
    /**
     * Handle the product_warehouse "updated" event.
     *
     * @param  \App\Models\product_warehouse  $product_warehouse
     * @return void
     */
    public function updated(product_warehouse $product_warehouse)
    {
        // Vérifier si le stock a changé et s'il est sous le seuil d'alerte
        if ($product_warehouse->isDirty('qte')) {
            $product = $product_warehouse->product;
            
            if ($product && $product_warehouse->qte <= $product->stock_alert) {
                // Éviter de renvoyer l'alerte si l'ancien stock était déjà sous le seuil
                $oldQte = $product_warehouse->getOriginal('qte');
                if ($oldQte > $product->stock_alert) {
                    
                    // Trouver tous les administrateurs pour envoyer la notification
                    $admins = User::where('role_id', 1)->get(); // role_id 1 = Admin par défaut
                    
                    $warehouseName = $product_warehouse->warehouse ? $product_warehouse->warehouse->name : '';
                    
                    Notification::send($admins, new AlerteStock(
                        $product->name,
                        $product_warehouse->qte,
                        $product->stock_alert,
                        $warehouseName
                    ));
                }
            }
        }
    }
}
