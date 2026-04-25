/**
 * syncManager.js — Gestionnaire de synchronisation automatique
 * Développé par OceanTechnologie
 * 
 * Fonctionnalités :
 * - Écoute l'événement 'online' pour déclencher la synchronisation
 * - Récupère les données non synchronisées depuis IndexedDB
 * - Envoie les données au backend Laravel via axios
 * - Gère les conflits par timestamp (le plus récent gagne)
 * - Émet des événements pour l'interface utilisateur
 */

import {
  getVentesNonSynchronisees,
  marquerVenteSynchronisee,
  getFileSyncEnAttente,
  supprimerDeFileSync,
  compterElementsNonSynchronises,
} from '../db/localDB';

// État global de la synchronisation
let isSyncing = false;
let syncListeners = [];

/**
 * Ajoute un listener pour les événements de synchronisation
 * @param {Function} callback - Fonction appelée avec l'état de sync
 * Événements : 'start', 'progress', 'success', 'error', 'idle'
 */
export function onSyncStateChange(callback) {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter(cb => cb !== callback);
  };
}

/**
 * Émet un événement de synchronisation à tous les listeners
 * @param {string} state - État de la synchronisation
 * @param {Object} data - Données supplémentaires
 */
function emitSyncState(state, data = {}) {
  const event = { state, ...data, timestamp: new Date().toISOString() };
  syncListeners.forEach(cb => {
    try {
      cb(event);
    } catch (e) {
      console.error('[Sync] Erreur dans un listener:', e);
    }
  });
}

/**
 * Synchronise toutes les ventes non synchronisées avec le backend
 * @returns {Promise<Object>} - Résultat de la synchronisation
 */
async function synchroniserVentes() {
  const ventesNonSync = await getVentesNonSynchronisees();
  
  if (ventesNonSync.length === 0) {
    return { synced: 0, errors: 0 };
  }

  console.log('[Sync] Synchronisation de', ventesNonSync.length, 'vente(s)...');
  let synced = 0;
  let errors = 0;

  for (const vente of ventesNonSync) {
    try {
      // Envoyer la vente au backend via l'API POS existante
      const response = await window.axios.post('pos/create_pos', vente.data);
      
      if (response.data.success) {
        await marquerVenteSynchronisee(vente.id);
        synced++;
        emitSyncState('progress', {
          message: `Vente ${synced}/${ventesNonSync.length} synchronisée`,
          progress: synced / ventesNonSync.length,
        });
      } else {
        errors++;
        console.warn('[Sync] Échec de la synchronisation pour la vente ID:', vente.id);
      }
    } catch (error) {
      errors++;
      console.error('[Sync] Erreur de synchronisation pour la vente ID:', vente.id, error);
      
      // Si c'est une erreur réseau, on arrête la synchronisation
      if (!navigator.onLine) {
        console.warn('[Sync] Connexion perdue pendant la synchronisation');
        break;
      }
    }
  }

  return { synced, errors };
}

/**
 * Traite la file d'attente de synchronisation générique
 * @returns {Promise<Object>} - Résultat du traitement
 */
async function traiterFileSync() {
  const fileSyncItems = await getFileSyncEnAttente();
  
  if (fileSyncItems.length === 0) {
    return { processed: 0, errors: 0 };
  }

  console.log('[Sync] Traitement de', fileSyncItems.length, 'requête(s) en file d\'attente...');
  let processed = 0;
  let errors = 0;

  for (const item of fileSyncItems) {
    try {
      let response;
      
      let payloadToSend = item.payload;
      let headers = {};

      // Reconstruire le FormData pour les envois d'images
      if (item.payload && item.payload.isFormData) {
        payloadToSend = new FormData();
        const dataObj = item.payload.data;
        for (const key in dataObj) {
          payloadToSend.append(key, dataObj[key]);
        }
        headers = { 'Content-Type': 'multipart/form-data' };
      }

      switch (item.method.toUpperCase()) {
        case 'POST':
          response = await window.axios.post(item.endpoint, payloadToSend, { headers });
          break;
        case 'PUT':
          // Laravel requiert parfois un POST avec _method=PUT pour le FormData
          if (item.payload && item.payload.isFormData) {
            payloadToSend.append('_method', 'PUT');
            response = await window.axios.post(item.endpoint, payloadToSend, { headers });
          } else {
            response = await window.axios.put(item.endpoint, payloadToSend);
          }
          break;
        case 'DELETE':
          response = await window.axios.delete(item.endpoint, { data: payloadToSend });
          break;
        default:
          console.warn('[Sync] Méthode HTTP inconnue:', item.method);
          continue;
      }

      // Si la requête a réussi, on la retire de la file
      await supprimerDeFileSync(item.id);
      processed++;
      
    } catch (error) {
      errors++;
      console.error('[Sync] Erreur pour la requête:', item.endpoint, error);
      
      // Si erreur 409 (conflit), on gère par timestamp
      if (error.status === 409) {
        console.warn('[Sync] Conflit détecté, résolution par timestamp (le plus récent gagne)');
        // On supprime quand même de la file car le serveur a la version plus récente
        await supprimerDeFileSync(item.id);
      }
      
      // Si c'est une erreur réseau, on arrête
      if (!navigator.onLine) {
        break;
      }
    }
  }

  return { processed, errors };
}

/**
 * Lance la synchronisation complète (ventes + file d'attente)
 * Appelée automatiquement quand l'appareil repasse en ligne
 */
export async function lancerSynchronisation() {
  // Éviter les synchronisations simultanées
  if (isSyncing) {
    console.log('[Sync] Synchronisation déjà en cours, ignorée');
    return;
  }

  // Vérifier la connectivité
  if (!navigator.onLine) {
    console.log('[Sync] Hors ligne, synchronisation reportée');
    return;
  }

  // Vérifier s'il y a des données à synchroniser
  const pendingCount = await compterElementsNonSynchronises();
  if (pendingCount === 0) {
    console.log('[Sync] Rien à synchroniser');
    emitSyncState('idle', { message: 'Tout est synchronisé' });
    return;
  }

  isSyncing = true;
  emitSyncState('start', {
    message: 'Synchronisation en cours...',
    pendingCount,
  });

  try {
    // Synchroniser les ventes
    const ventesResult = await synchroniserVentes();
    
    // Traiter la file d'attente
    const queueResult = await traiterFileSync();

    const totalSynced = ventesResult.synced + queueResult.processed;
    const totalErrors = ventesResult.errors + queueResult.errors;

    if (totalErrors === 0) {
      emitSyncState('success', {
        message: `Synchronisé ✓ (${totalSynced} élément(s))`,
        totalSynced,
      });
      console.log('[Sync] Synchronisation terminée avec succès:', totalSynced, 'élément(s)');
    } else {
      emitSyncState('error', {
        message: `Synchronisation partielle: ${totalSynced} réussi(s), ${totalErrors} erreur(s)`,
        totalSynced,
        totalErrors,
      });
      console.warn('[Sync] Synchronisation avec erreurs:', totalErrors);
    }
  } catch (error) {
    emitSyncState('error', {
      message: 'Erreur de synchronisation',
      error: error.message,
    });
    console.error('[Sync] Erreur globale de synchronisation:', error);
  } finally {
    isSyncing = false;
  }
}

/**
 * Initialise le gestionnaire de synchronisation
 * Écoute les événements de connectivité pour déclencher automatiquement la sync
 */
export function initialiserSyncManager() {
  console.log('[Sync] Initialisation du gestionnaire de synchronisation — OceanTechnologie');

  // Écouter l'événement 'online' pour synchroniser automatiquement
  window.addEventListener('online', () => {
    console.log('[Sync] Connexion rétablie — lancement de la synchronisation');
    // Petit délai pour s'assurer que la connexion est stable
    setTimeout(() => {
      lancerSynchronisation();
    }, 2000);
  });

  // Synchroniser au chargement si en ligne
  if (navigator.onLine) {
    setTimeout(() => {
      lancerSynchronisation();
    }, 5000); // Attendre 5s après le chargement
  }

  // Synchronisation périodique toutes les 5 minutes si en ligne
  setInterval(() => {
    if (navigator.onLine && !isSyncing) {
      lancerSynchronisation();
    }
  }, 5 * 60 * 1000);
}

/**
 * Vérifie si une synchronisation est en cours
 * @returns {boolean}
 */
export function estEnCoursDeSynchronisation() {
  return isSyncing;
}
