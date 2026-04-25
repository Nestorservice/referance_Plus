/**
 * localDB.js — Base de données locale IndexedDB avec Dexie.js
 * Développé par OceanTechnologie
 * 
 * Tables :
 * - ventes : ventes créées hors ligne, en attente de synchronisation
 * - produits : copie locale des produits pour le mode offline
 * - clients : copie locale des clients pour le mode offline
 * - sync_queue : file d'attente des requêtes à synchroniser
 */

import Dexie from 'dexie';

// Création de la base de données IndexedDB
const db = new Dexie('StockyPOS_DB');

// Définition du schéma — version 1
db.version(1).stores({
  // Table des ventes locales
  // id : auto-incrémenté
  // data : objet JSON contenant toutes les données de la vente
  // synced : 0 = non synchronisé, 1 = synchronisé
  // created_at : timestamp de création
  ventes: '++id, synced, created_at',

  // Table des produits (copie locale)
  // id : auto-incrémenté
  // remote_id : ID du produit côté serveur
  // nom : nom du produit
  // code : code-barres du produit
  // prix : prix de vente
  // cost : coût d'achat
  // stock : quantité en stock
  // stock_alert : seuil d'alerte stock
  // category_id : ID de la catégorie
  // image : chemin de l'image
  // updated_at : dernier timestamp de mise à jour
  produits: '++id, remote_id, nom, code, prix, category_id, updated_at',

  // Table des clients (copie locale)
  // id : auto-incrémenté
  // remote_id : ID du client côté serveur
  // data : objet JSON contenant toutes les données du client
  // synced : 0 = non synchronisé, 1 = synchronisé
  clients: '++id, remote_id, synced',

  // File d'attente de synchronisation
  // id : auto-incrémenté
  // endpoint : URL de l'API cible
  // method : méthode HTTP (POST, PUT, DELETE)
  // payload : données à envoyer (JSON)
  // created_at : timestamp de création
  sync_queue: '++id, endpoint, method, created_at',
});

/**
 * Sauvegarde une vente localement (offline-first)
 * @param {Object} venteData - Données complètes de la vente
 * @returns {Promise<number>} - ID local de la vente créée
 */
export async function sauvegarderVenteLocale(venteData) {
  try {
    const id = await db.ventes.add({
      data: venteData,
      synced: 0,
      created_at: new Date().toISOString(),
    });
    console.log('[DB] Vente sauvegardée localement avec ID:', id);
    return id;
  } catch (error) {
    console.error('[DB] Erreur lors de la sauvegarde de la vente:', error);
    throw error;
  }
}

/**
 * Récupère toutes les ventes non synchronisées
 * @returns {Promise<Array>} - Liste des ventes avec synced=0
 */
export async function getVentesNonSynchronisees() {
  return await db.ventes.where('synced').equals(0).toArray();
}

/**
 * Marque une vente comme synchronisée
 * @param {number} id - ID local de la vente
 */
export async function marquerVenteSynchronisee(id) {
  await db.ventes.update(id, { synced: 1 });
  console.log('[DB] Vente', id, 'marquée comme synchronisée');
}

/**
 * Sauvegarde ou met à jour les produits dans IndexedDB
 * @param {Array} produits - Liste des produits depuis l'API
 */
export async function sauvegarderProduits(produits) {
  try {
    await db.transaction('rw', db.produits, async () => {
      for (const produit of produits) {
        // Vérifier si le produit existe déjà localement
        const existant = await db.produits.where('remote_id').equals(produit.id).first();
        
        if (existant) {
          // Mise à jour si le produit distant est plus récent
          await db.produits.update(existant.id, {
            nom: produit.name,
            code: produit.code,
            prix: produit.price,
            cost: produit.cost,
            stock: produit.qte || 0,
            stock_alert: produit.stock_alert,
            category_id: produit.category_id,
            image: produit.image,
            updated_at: new Date().toISOString(),
          });
        } else {
          // Créer un nouveau produit local
          await db.produits.add({
            remote_id: produit.id,
            nom: produit.name,
            code: produit.code,
            prix: produit.price,
            cost: produit.cost,
            stock: produit.qte || 0,
            stock_alert: produit.stock_alert,
            category_id: produit.category_id,
            image: produit.image,
            updated_at: new Date().toISOString(),
          });
        }
      }
    });
    console.log('[DB]', produits.length, 'produits sauvegardés/mis à jour localement');
  } catch (error) {
    console.error('[DB] Erreur lors de la sauvegarde des produits:', error);
    throw error;
  }
}

/**
 * Récupère tous les produits locaux
 * @returns {Promise<Array>} - Liste des produits en IndexedDB
 */
export async function getProduitsLocaux() {
  return await db.produits.toArray();
}

/**
 * Sauvegarde ou met à jour les clients dans IndexedDB
 * @param {Array} clientsList - Liste des clients depuis l'API
 */
export async function sauvegarderClients(clientsList) {
  try {
    await db.transaction('rw', db.clients, async () => {
      for (const client of clientsList) {
        const existant = await db.clients.where('remote_id').equals(client.id).first();
        
        if (existant) {
          await db.clients.update(existant.id, {
            data: client,
            synced: 1,
          });
        } else {
          await db.clients.add({
            remote_id: client.id,
            data: client,
            synced: 1,
          });
        }
      }
    });
    console.log('[DB]', clientsList.length, 'clients sauvegardés/mis à jour localement');
  } catch (error) {
    console.error('[DB] Erreur lors de la sauvegarde des clients:', error);
    throw error;
  }
}

/**
 * Récupère tous les clients locaux
 * @returns {Promise<Array>} - Liste des clients en IndexedDB
 */
export async function getClientsLocaux() {
  return await db.clients.toArray();
}

/**
 * Ajoute une requête dans la file d'attente de synchronisation
 * @param {string} endpoint - URL de l'API cible
 * @param {string} method - Méthode HTTP (POST, PUT, DELETE)
 * @param {Object} payload - Données à envoyer
 * @returns {Promise<number>} - ID de l'entrée dans la file
 */
export async function ajouterDansFileSync(endpoint, method, payload) {
  try {
    const id = await db.sync_queue.add({
      endpoint,
      method,
      payload,
      created_at: new Date().toISOString(),
    });
    console.log('[DB] Requête ajoutée dans la file de sync, ID:', id);
    return id;
  } catch (error) {
    console.error('[DB] Erreur lors de l\'ajout dans la file de sync:', error);
    throw error;
  }
}

/**
 * Récupère toutes les requêtes en attente de synchronisation
 * @returns {Promise<Array>} - Liste des requêtes dans sync_queue
 */
export async function getFileSyncEnAttente() {
  return await db.sync_queue.orderBy('created_at').toArray();
}

/**
 * Supprime une requête de la file de synchronisation
 * @param {number} id - ID de l'entrée à supprimer
 */
export async function supprimerDeFileSync(id) {
  await db.sync_queue.delete(id);
  console.log('[DB] Requête supprimée de la file de sync, ID:', id);
}

/**
 * Compte le nombre d'éléments en attente de synchronisation
 * @returns {Promise<number>} - Nombre total d'éléments non synchronisés
 */
export async function compterElementsNonSynchronises() {
  const ventesCount = await db.ventes.where('synced').equals(0).count();
  const queueCount = await db.sync_queue.count();
  return ventesCount + queueCount;
}

// Export de l'instance Dexie pour usage direct si nécessaire
export default db;
