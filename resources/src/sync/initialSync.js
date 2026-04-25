/**
 * initialSync.js — Synchronisation initiale au premier lancement
 * Développé par OceanTechnologie
 * 
 * Au premier lancement de l'application :
 * - Télécharge tous les produits depuis l'API
 * - Télécharge tous les clients depuis l'API
 * - Les stocke dans IndexedDB
 * - Marque la synchronisation initiale comme complète dans localStorage
 */

import { sauvegarderProduits, sauvegarderClients } from '../db/localDB';

// Clé localStorage pour marquer la sync initiale comme terminée
const SYNC_INIT_KEY = 'stocky_initial_sync_complete';
const SYNC_INIT_VERSION_KEY = 'stocky_initial_sync_version';
const CURRENT_SYNC_VERSION = '1.0.0';

/**
 * Vérifie si la synchronisation initiale a déjà été effectuée
 * @returns {boolean}
 */
export function estSyncInitialeComplete() {
  const isComplete = localStorage.getItem(SYNC_INIT_KEY) === 'true';
  const version = localStorage.getItem(SYNC_INIT_VERSION_KEY);
  // Refaire la sync si la version a changé
  return isComplete && version === CURRENT_SYNC_VERSION;
}

/**
 * Télécharge et sauvegarde tous les produits depuis l'API
 * @returns {Promise<number>} - Nombre de produits synchronisés
 */
async function syncProduits() {
  try {
    console.log('[InitSync] Téléchargement des produits...');
    const response = await window.axios.get('products', {
      params: {
        page: 1,
        limit: 10000, // Récupérer tous les produits
      }
    });

    let produits = [];
    
    // Gérer les différents formats de réponse
    if (response.data && response.data.products) {
      produits = response.data.products;
    } else if (response.data && Array.isArray(response.data)) {
      produits = response.data;
    } else if (response.data && response.data.data) {
      produits = response.data.data;
    }

    if (produits.length > 0) {
      await sauvegarderProduits(produits);
      console.log('[InitSync]', produits.length, 'produits synchronisés');
    } else {
      console.log('[InitSync] Aucun produit à synchroniser');
    }

    return produits.length;
  } catch (error) {
    console.error('[InitSync] Erreur lors de la synchronisation des produits:', error);
    throw error;
  }
}

/**
 * Télécharge et sauvegarde tous les clients depuis l'API
 * @returns {Promise<number>} - Nombre de clients synchronisés
 */
async function syncClients() {
  try {
    console.log('[InitSync] Téléchargement des clients...');
    const response = await window.axios.get('get_clients_without_paginate');

    let clients = [];

    if (response.data && Array.isArray(response.data)) {
      clients = response.data;
    } else if (response.data && response.data.clients) {
      clients = response.data.clients;
    }

    if (clients.length > 0) {
      await sauvegarderClients(clients);
      console.log('[InitSync]', clients.length, 'clients synchronisés');
    } else {
      console.log('[InitSync] Aucun client à synchroniser');
    }

    return clients.length;
  } catch (error) {
    console.error('[InitSync] Erreur lors de la synchronisation des clients:', error);
    throw error;
  }
}

/**
 * Lance la synchronisation initiale complète
 * Télécharge produits et clients depuis l'API et les stocke en IndexedDB
 * 
 * @param {Function} onProgress - Callback pour suivre la progression
 * @returns {Promise<Object>} - Résultat de la synchronisation
 */
export async function lancerSyncInitiale(onProgress = null) {
  // Ne pas refaire si déjà complète
  if (estSyncInitialeComplete()) {
    console.log('[InitSync] Synchronisation initiale déjà effectuée');
    return { alreadyDone: true };
  }

  // Vérifier la connectivité
  if (!navigator.onLine) {
    console.warn('[InitSync] Pas de connexion internet — synchronisation reportée');
    return { offline: true };
  }

  console.log('[InitSync] Démarrage de la synchronisation initiale — OceanTechnologie');

  try {
    if (onProgress) onProgress({ step: 'produits', message: 'Synchronisation des produits...' });
    
    // Synchroniser les produits
    const nbProduits = await syncProduits();
    
    if (onProgress) onProgress({ step: 'clients', message: 'Synchronisation des clients...' });
    
    // Synchroniser les clients
    const nbClients = await syncClients();

    // Marquer la synchronisation initiale comme terminée
    localStorage.setItem(SYNC_INIT_KEY, 'true');
    localStorage.setItem(SYNC_INIT_VERSION_KEY, CURRENT_SYNC_VERSION);
    localStorage.setItem('stocky_initial_sync_date', new Date().toISOString());

    const result = {
      success: true,
      produits: nbProduits,
      clients: nbClients,
    };

    console.log('[InitSync] Synchronisation initiale terminée:', result);
    if (onProgress) onProgress({ step: 'complete', message: 'Synchronisation terminée ✓', result });

    return result;
  } catch (error) {
    console.error('[InitSync] Échec de la synchronisation initiale:', error);
    if (onProgress) onProgress({ step: 'error', message: 'Erreur de synchronisation', error });
    return { success: false, error: error.message };
  }
}

/**
 * Force une nouvelle synchronisation initiale (réinitialise le flag)
 */
export function forcerResyncInitiale() {
  localStorage.removeItem(SYNC_INIT_KEY);
  localStorage.removeItem(SYNC_INIT_VERSION_KEY);
  console.log('[InitSync] Flag de sync initiale réinitialisé');
}
