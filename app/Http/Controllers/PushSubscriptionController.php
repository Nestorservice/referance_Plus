<?php

/**
 * PushSubscriptionController — Gestion des abonnements push
 * Développé par OceanTechnologie
 * 
 * Routes :
 * - POST /api/push/subscribe : Enregistrer un abonnement push
 * - DELETE /api/push/unsubscribe : Supprimer un abonnement push
 */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PushSubscriptionController extends Controller
{
    /**
     * Enregistrer un nouvel abonnement push pour l'utilisateur connecté
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function subscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
            'keys.p256dh' => 'required|string',
            'keys.auth' => 'required|string',
        ]);

        $user = Auth::user();

        // Mettre à jour ou créer l'abonnement push
        $user->updatePushSubscription(
            $request->input('endpoint'),
            $request->input('keys.p256dh'),
            $request->input('keys.auth')
        );

        return response()->json([
            'success' => true,
            'message' => 'Abonnement push enregistré avec succès',
        ], 201);
    }

    /**
     * Supprimer un abonnement push pour l'utilisateur connecté
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function unsubscribe(Request $request)
    {
        $request->validate([
            'endpoint' => 'required|string',
        ]);

        $user = Auth::user();

        // Supprimer l'abonnement push
        $user->deletePushSubscription($request->input('endpoint'));

        return response()->json([
            'success' => true,
            'message' => 'Abonnement push supprimé avec succès',
        ], 200);
    }
}
