<template>
  <!-- Bannière de statut réseau — affichée en haut de l'écran -->
  <transition name="slide-down">
    <div v-if="isVisible" :class="bannerClass" class="offline-banner">
      <div class="offline-banner__content">
        <span class="offline-banner__icon">{{ bannerIcon }}</span>
        <span class="offline-banner__text">{{ bannerText }}</span>
      </div>
      <button 
        v-if="showReconnected" 
        class="offline-banner__close" 
        @click="dismissBanner"
        aria-label="Fermer"
      >
        ✕
      </button>
    </div>
  </transition>
</template>

<script>
/**
 * OfflineBanner.vue — Bannière de statut de connexion réseau
 * Développé par OceanTechnologie
 * 
 * Affiche :
 * - Bannière rouge fixe quand l'appareil est hors ligne
 * - Bannière verte temporaire quand la connexion est rétablie
 */
export default {
  name: 'OfflineBanner',

  data() {
    return {
      // Statut de connexion
      isOnline: navigator.onLine,
      // Afficher la bannière de reconnexion
      showReconnected: false,
      // Timer pour masquer la bannière
      hideTimer: null,
      // Était hors ligne avant (pour détecter la reconnexion)
      wasOffline: false,
    };
  },

  computed: {
    /**
     * La bannière doit-elle être visible ?
     */
    isVisible() {
      return !this.isOnline || this.showReconnected;
    },

    /**
     * Classe CSS de la bannière
     */
    bannerClass() {
      if (!this.isOnline) return 'offline-banner--offline';
      if (this.showReconnected) return 'offline-banner--online';
      return '';
    },

    /**
     * Icône de la bannière
     */
    bannerIcon() {
      return this.isOnline ? '✓' : '⚡';
    },

    /**
     * Texte de la bannière
     */
    bannerText() {
      if (!this.isOnline) {
        return 'Mode hors ligne — Les ventes seront sauvegardées localement et synchronisées automatiquement';
      }
      return 'Connexion rétablie — Synchronisation en cours...';
    },
  },

  methods: {
    /**
     * Gère le passage en mode online
     */
    onOnline() {
      this.isOnline = true;
      if (this.wasOffline) {
        this.showReconnected = true;
        // Masquer après 6 secondes
        if (this.hideTimer) clearTimeout(this.hideTimer);
        this.hideTimer = setTimeout(() => {
          this.showReconnected = false;
        }, 6000);
      }
      this.wasOffline = false;
    },

    /**
     * Gère le passage en mode offline
     */
    onOffline() {
      this.isOnline = false;
      this.wasOffline = true;
      this.showReconnected = false;
      if (this.hideTimer) clearTimeout(this.hideTimer);
    },

    /**
     * Ferme manuellement la bannière de reconnexion
     */
    dismissBanner() {
      this.showReconnected = false;
      if (this.hideTimer) clearTimeout(this.hideTimer);
    },
  },

  mounted() {
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
    // Initialiser le statut
    this.wasOffline = !navigator.onLine;
  },

  beforeDestroy() {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
    if (this.hideTimer) clearTimeout(this.hideTimer);
  },
};
</script>

<style scoped>
/* Bannière fixe en haut de l'écran */
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* Contenu de la bannière */
.offline-banner__content {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Icône */
.offline-banner__icon {
  font-size: 16px;
}

/* Bouton de fermeture */
.offline-banner__close {
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  color: inherit;
  font-size: 16px;
  cursor: pointer;
  opacity: 0.7;
  padding: 4px;
}

.offline-banner__close:hover {
  opacity: 1;
}

/* Mode hors ligne — rouge */
.offline-banner--offline {
  background-color: #dc3545;
  color: #ffffff;
}

/* Connexion rétablie — vert */
.offline-banner--online {
  background-color: #28a745;
  color: #ffffff;
}

/* Animation d'entrée/sortie */
.slide-down-enter-active,
.slide-down-leave-active {
  transition: all 0.4s ease;
}

.slide-down-enter,
.slide-down-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}

.slide-down-enter-to,
.slide-down-leave {
  transform: translateY(0);
  opacity: 1;
}
</style>
