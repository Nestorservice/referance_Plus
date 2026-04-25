/**
 * useNetworkStatus.js — Détection de connectivité réseau
 * Développé par OceanTechnologie
 * 
 * Compatible avec Vue 2 (utilisé comme mixin ou via @vue/composition-api)
 * 
 * Fonctionnalités :
 * - Détecte le statut online/offline en temps réel
 * - Affiche une bannière rouge "Mode hors ligne" quand offline
 * - Affiche une bannière verte "Connexion rétablie" quand online
 * - Fournit une méthode pour désactiver les boutons nécessitant internet
 */

/**
 * Mixin Vue 2 pour la détection de connectivité
 * Utilisation : mixins: [networkStatusMixin]
 */
export const networkStatusMixin = {
  data() {
    return {
      // Statut de la connexion réseau
      isOnline: navigator.onLine,
      // Afficher la bannière de reconnexion temporairement
      showReconnectedBanner: false,
      // Timer pour masquer la bannière de reconnexion
      reconnectedTimer: null,
    };
  },

  computed: {
    /**
     * Texte du statut de connexion
     */
    networkStatusText() {
      if (this.showReconnectedBanner) {
        return 'Connexion rétablie ✓';
      }
      return this.isOnline ? '' : 'Mode hors ligne';
    },

    /**
     * Classe CSS pour la bannière de statut
     */
    networkStatusClass() {
      if (this.showReconnectedBanner) {
        return 'network-banner network-banner--online';
      }
      return this.isOnline ? '' : 'network-banner network-banner--offline';
    },
  },

  methods: {
    /**
     * Gère le passage en mode online
     */
    handleOnline() {
      this.isOnline = true;
      this.showReconnectedBanner = true;
      console.log('[Réseau] Connexion rétablie');

      // Masquer la bannière verte après 5 secondes
      if (this.reconnectedTimer) {
        clearTimeout(this.reconnectedTimer);
      }
      this.reconnectedTimer = setTimeout(() => {
        this.showReconnectedBanner = false;
      }, 5000);
    },

    /**
     * Gère le passage en mode offline
     */
    handleOffline() {
      this.isOnline = false;
      this.showReconnectedBanner = false;
      console.log('[Réseau] Mode hors ligne activé');
    },

    /**
     * Vérifie si un bouton doit être désactivé en mode offline
     * @param {boolean} requiresInternet - Le bouton nécessite-t-il internet ?
     * @returns {boolean} - true si le bouton doit être désactivé
     */
    isButtonDisabledOffline(requiresInternet = false) {
      return requiresInternet && !this.isOnline;
    },
  },

  mounted() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  },

  beforeDestroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    if (this.reconnectedTimer) {
      clearTimeout(this.reconnectedTimer);
    }
  },
};

export default networkStatusMixin;
