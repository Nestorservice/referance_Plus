<template>
  <!-- Indicateur de statut de synchronisation dans le header -->
  <div class="sync-status-container" v-if="showStatus">
    <!-- Synchronisation en cours -->
    <div v-if="syncState === 'start' || syncState === 'progress'" 
         class="sync-status sync-status--syncing"
         :title="syncMessage">
      <span class="sync-icon sync-icon--spinning">⟳</span>
      <span class="sync-text d-none d-md-inline">{{ syncMessage }}</span>
    </div>

    <!-- Synchronisation réussie -->
    <div v-else-if="syncState === 'success'" 
         class="sync-status sync-status--success"
         :title="syncMessage">
      <span class="sync-icon">✓</span>
      <span class="sync-text d-none d-md-inline">Synchronisé</span>
    </div>

    <!-- Erreur de synchronisation -->
    <div v-else-if="syncState === 'error'" 
         class="sync-status sync-status--error"
         :title="syncMessage">
      <span class="sync-icon">⚠</span>
      <span class="sync-text d-none d-md-inline">Erreur sync</span>
    </div>

    <!-- Éléments en attente (offline) -->
    <div v-else-if="pendingCount > 0" 
         class="sync-status sync-status--pending"
         :title="pendingCount + ' élément(s) en attente de synchronisation'">
      <span class="sync-icon">⏳</span>
      <span class="sync-text d-none d-md-inline">{{ pendingCount }} en attente</span>
    </div>

    <!-- Tout est synchronisé -->
    <div v-else 
         class="sync-status sync-status--idle"
         title="Tout est synchronisé">
      <span class="sync-icon">☁</span>
    </div>
  </div>
</template>

<script>
/**
 * SyncStatus.vue — Composant d'indicateur de synchronisation
 * Développé par OceanTechnologie
 * 
 * Affiché en permanence dans le header (TopNav)
 * Montre l'état de la synchronisation en temps réel
 */
import { onSyncStateChange, lancerSynchronisation } from '../../sync/syncManager';
import { compterElementsNonSynchronises } from '../../db/localDB';

export default {
  name: 'SyncStatus',

  data() {
    return {
      // État actuel de la synchronisation
      syncState: 'idle', // idle, start, progress, success, error
      // Message de synchronisation
      syncMessage: '',
      // Nombre d'éléments en attente
      pendingCount: 0,
      // Afficher le composant
      showStatus: true,
      // Timer pour masquer le succès
      successTimer: null,
      // Fonction pour se désabonner des événements
      unsubscribe: null,
    };
  },

  methods: {
    /**
     * Gère les changements d'état de la synchronisation
     */
    handleSyncEvent(event) {
      this.syncState = event.state;
      this.syncMessage = event.message || '';

      if (event.state === 'success') {
        // Masquer le message de succès après 5 secondes
        if (this.successTimer) clearTimeout(this.successTimer);
        this.successTimer = setTimeout(() => {
          this.syncState = 'idle';
          this.updatePendingCount();
        }, 5000);
      }

      if (event.state === 'error') {
        // Garder l'erreur visible 10 secondes
        if (this.successTimer) clearTimeout(this.successTimer);
        this.successTimer = setTimeout(() => {
          this.syncState = 'idle';
          this.updatePendingCount();
        }, 10000);
      }
    },

    /**
     * Met à jour le compteur d'éléments en attente
     */
    async updatePendingCount() {
      try {
        this.pendingCount = await compterElementsNonSynchronises();
      } catch (e) {
        this.pendingCount = 0;
      }
    },

    /**
     * Force une synchronisation manuelle
     */
    forcerSync() {
      lancerSynchronisation();
    },
  },

  mounted() {
    // S'abonner aux événements de synchronisation
    this.unsubscribe = onSyncStateChange(this.handleSyncEvent);

    // Mettre à jour le compteur toutes les 30 secondes
    this.updatePendingCount();
    this.pendingInterval = setInterval(() => {
      if (this.syncState === 'idle') {
        this.updatePendingCount();
      }
    }, 30000);
  },

  beforeDestroy() {
    // Se désabonner des événements
    if (this.unsubscribe) this.unsubscribe();
    if (this.successTimer) clearTimeout(this.successTimer);
    if (this.pendingInterval) clearInterval(this.pendingInterval);
  },
};
</script>

<style scoped>
/* Conteneur principal */
.sync-status-container {
  display: inline-flex;
  align-items: center;
  margin-right: 10px;
}

/* Base du statut */
.sync-status {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  cursor: default;
  transition: all 0.3s ease;
}

/* Icône de synchronisation */
.sync-icon {
  font-size: 14px;
  margin-right: 4px;
}

/* Animation de rotation pour l'icône de sync */
.sync-icon--spinning {
  display: inline-block;
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* États visuels */
.sync-status--syncing {
  background-color: rgba(102, 51, 153, 0.15);
  color: #663399;
}

.sync-status--success {
  background-color: rgba(40, 167, 69, 0.15);
  color: #28a745;
}

.sync-status--error {
  background-color: rgba(220, 53, 69, 0.15);
  color: #dc3545;
}

.sync-status--pending {
  background-color: rgba(255, 193, 7, 0.15);
  color: #856404;
}

.sync-status--idle {
  background-color: transparent;
  color: #999;
}

/* Responsive */
.sync-text {
  white-space: nowrap;
}
</style>
