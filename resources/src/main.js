import store from "./store";

import Vue from "vue";
import router from "./router";
import App from "./App.vue";
import Auth from './auth/index.js';
window.auth = new Auth();
import { ValidationObserver, ValidationProvider, extend, localize } from 'vee-validate';
import * as rules from "vee-validate/dist/rules";

localize({
  en: {
    messages: {
      required: 'This field is required',
      required_if: 'This field is required',
      regex: 'This field must be a valid',
      mimes: `This field must have a valid file type.`,
      size: (_, { size }) => `This field size must be less than ${size}.`,
      min: 'This field must have no less than {length} characters',
      max: (_, { length }) => `This field must have no more than ${length} characters`
    }
  },
});
// Install VeeValidate rules and localization
Object.keys(rules).forEach(rule => {
  extend(rule, rules[rule]);
});

// Register it globally
Vue.component("ValidationObserver", ValidationObserver);
Vue.component('ValidationProvider', ValidationProvider);


Vue.component('qrcode-scanner', {
  props: {
    qrbox: {
      type: Number,
      default: 250
    },
    fps: {
      type: Number,
      default: 10
    },
  },
  data() {
    return {
      isFirstScan: true,
      html5QrcodeScanner: null,
    };
  },
  template: `<div id="reader"></div>`, // Use ref instead of id for dynamic rendering

  mounted () {
    this.initializeScanner();
  },
  methods: {
    initializeScanner() {
      const config = {
        fps: this.fps,
        qrbox: this.qrbox,
      };
      this.html5QrcodeScanner = new Html5QrcodeScanner('reader', config); // Use id for dynamic rendering
      this.html5QrcodeScanner.render(this.onScanSuccess);
    },
    onScanSuccess (decodedText, decodedResult) {
      if (this.isFirstScan) {
        this.isFirstScan = false;
        this.$emit('result', decodedText, decodedResult);
      } else {
        this.html5QrcodeScanner.stop();
      }
    },

  },

  beforeDestroy() {
    if (this.html5QrcodeScanner) {
      this.html5QrcodeScanner.clear();
    }
  }

});

import StockyKit from "./plugins/stocky.kit";
Vue.use(StockyKit);
import VueCookies from 'vue-cookies'
Vue.use(VueCookies);

var VueCookie = require('vue-cookie');
Vue.use(VueCookie);

import VueExcelXlsx from "vue-excel-xlsx";
Vue.use(VueExcelXlsx);

window.axios = require('axios');
window.axios.defaults.baseURL = '/api/';

window.axios.defaults.withCredentials = true;
window.axios.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';

// ================ Intercepteur Hors Ligne (PWA) ================
// Développé par OceanTechnologie
import { sauvegarderVenteLocale, ajouterDansFileSync } from './db/localDB';

axios.interceptors.request.use(async (config) => {
  // Mode offline-first pour les requêtes POST/PUT/DELETE PWA
  if (!navigator.onLine && ['post', 'put', 'delete'].includes(config.method.toLowerCase())) {
    
    let dataObj = config.data;
    let isFormData = false;

    // Gestion spécifique des formulaires avec images (FormData)
    if (config.data instanceof FormData) {
      isFormData = true;
      dataObj = {};
      for (let [key, value] of config.data.entries()) {
        dataObj[key] = value; // Peut être une chaîne ou un objet File/Blob
      }
    } else if (typeof config.data === 'string') {
      try { dataObj = JSON.parse(config.data); } catch(e) {}
    }
    
    if (config.url.includes('pos/create_pos')) {
      const id = await sauvegarderVenteLocale(dataObj);
      config.adapter = async () => ({
        data: { success: true, id: 'local_' + id, message: 'Sauvegardé hors ligne' },
        status: 200, statusText: 'OK', headers: {}, config: config, request: {}
      });
    } else {
      // Stockage de la requête avec flag pour FormData
      await ajouterDansFileSync(config.url, config.method, { data: dataObj, isFormData: isFormData });
      config.adapter = async () => ({
        data: { success: true, message: 'Mis en file d\'attente (hors ligne)' },
        status: 200, statusText: 'OK', headers: {}, config: config, request: {}
      });
    }
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});
axios.interceptors.response.use((response) => {

  return response;
}, (error) => {
  if (error.response && error.response.data) {
    if (error.response.status === 401) {
      window.location.href='/login';
    }

    if (error.response.status === 404) {
      router.push({ name: 'NotFound' });
    }
    if (error.response.status === 403) {
      router.push({ name: 'not_authorize' });
    }

    return Promise.reject(error.response.data);
  }
  return Promise.reject(error.message);
});

import vSelect from 'vue-select'
Vue.component('v-select', vSelect)
import 'vue-select/dist/vue-select.css';

import '@trevoreyre/autocomplete-vue/dist/style.css';

window.Fire = new Vue();

import Breadcumb from "./components/breadcumb";
import { i18n } from "./plugins/i18n";

Vue.component("breadcumb", Breadcumb);

Vue.config.productionTip = true;
Vue.config.silent = true;
Vue.config.devtools = false;

  new Vue({
    store,
    router,
    VueCookie,
    i18n,
    render: h => h(App),
  }).$mount("#app");

// ================ Enregistrement du Service Worker PWA ================
// Développé par OceanTechnologie
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker enregistré avec succès. Scope:', registration.scope);
        
        // Vérifier les mises à jour du SW
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('[PWA] Nouveau Service Worker en cours d\'installation...');
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated') {
              console.log('[PWA] Nouveau Service Worker activé');
            }
          });
        });
      })
      .catch((error) => {
        console.error('[PWA] Erreur d\'enregistrement du Service Worker:', error);
      });
  });
}

// ================ Initialisation du Sync Manager et Sync Initiale ================
// Développé par OceanTechnologie
import { initialiserSyncManager } from './sync/syncManager';
import { lancerSyncInitiale } from './sync/initialSync';

// Démarrer le gestionnaire de synchronisation automatique
initialiserSyncManager();

// Lancer la synchronisation initiale (premier lancement uniquement)
lancerSyncInitiale((progress) => {
  console.log('[InitSync]', progress.message);
});

// ================ Initialisation des Notifications Push ================
// Développé par OceanTechnologie
import { initialiserPush } from './push/pushManager';
initialiserPush();
