# Phase 3 — App Mobile Capacitor + App Desktop Electron

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Packager l'app Vue.js 2 existante en app Android/iOS via Capacitor et en app desktop Windows/Mac via Electron, avec mises à jour automatiques et fonctionnalités natives.

**Architecture:** Le build Laravel Mix existant génère `public/js/app.js`. Capacitor et Electron consomment ce build directement — aucun changement au code Vue.js. Les fonctionnalités natives (scanner, push, impression) s'ajoutent via des plugins Capacitor.

**Tech Stack:** Capacitor 5, Electron 28, electron-builder, electron-updater, @capacitor/push-notifications, @capacitor-community/barcode-scanner

**Prérequis:** Phase 1 complète. Node.js 18+, Java 17+ (Android), Xcode (iOS, Mac uniquement), Android Studio.

---

## Fichiers créés / modifiés

| Action | Fichier | Rôle |
|---|---|---|
| Create | `capacitor.config.ts` | Config Capacitor |
| Create | `android/` | Projet Android généré par Capacitor |
| Create | `ios/` | Projet iOS généré par Capacitor |
| Create | `electron/` | Projet Electron |
| Create | `electron/main.js` | Process principal Electron |
| Create | `electron/preload.js` | Bridge sécurisé renderer ↔ main |
| Create | `electron/package.json` | Config electron-builder + updater |
| Create | `resources/src/plugins/native.js` | Wrapper Vue pour fonctions natives |
| Modify | `resources/src/main.js` | Import plugin native |
| Modify | `webpack.mix.js` | Optimiser le build pour mobile |
| Modify | `.gitignore` | Ignorer `android/`, `ios/`, `electron/node_modules/` |

---

## Task 1 — Préparer le build Vue.js pour Capacitor/Electron

- [ ] **1.1 Optimiser le build pour usage local (sans serveur)**

Modifier `webpack.mix.js` pour que l'app puisse tourner en local :

```js
// webpack.mix.js
const mix = require('laravel-mix');
const MomentLocalesPlugin = require('moment-locales-webpack-plugin');

mix.js('resources/src/main.js', 'public/js')
   .vue({ version: 2 })
   .sass('resources/src/assets/sass/app.scss', 'public/css')
   .options({
       processCssUrls: false,
       terser: {
           terserOptions: {
               compress: { drop_console: process.env.NODE_ENV === 'production' },
           },
       },
   })
   .webpackConfig({
       plugins: [
           new MomentLocalesPlugin({ localesToKeep: ['fr', 'ar', 'es', 'en'] }),
       ],
       resolve: {
           alias: {
               // s'assurer que vue runtime+compiler est inclus
               'vue$': 'vue/dist/vue.runtime.esm.js',
           },
       },
   });

if (mix.inProduction()) {
    mix.version();
}
```

- [ ] **1.2 Builder l'app**

```bash
npm run production
```

Vérifier que `public/js/app.js` et `public/css/app.css` sont générés.

- [ ] **1.3 Commit**

```bash
git add webpack.mix.js
git commit -m "build: optimize webpack config for capacitor/electron packaging"
```

---

## Task 2 — Capacitor : setup initial

- [ ] **2.1 Installer Capacitor**

```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android @capacitor/ios
npm install @capacitor/push-notifications @capacitor/haptics @capacitor/status-bar
npm install @capacitor-community/barcode-scanner
```

- [ ] **2.2 Créer `capacitor.config.ts`**

```typescript
// capacitor.config.ts
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.stocky.app',
  appName: 'Stocky',
  webDir: 'public',          // Racine du build Laravel (index.html ici)
  bundledWebRuntime: false,
  server: {
    // En développement uniquement — pointe vers le serveur local
    // url: 'http://192.168.1.x:8000',
    // cleartext: true,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#667eea',
      showSpinner: false,
    },
  },
  android: {
    buildOptions: {
      keystorePath: 'stocky-release.jks',      // à générer en production
      keystoreAlias: 'stocky',
    },
  },
};

export default config;
```

- [ ] **2.3 Créer le projet Android**

```bash
npx cap add android
```

- [ ] **2.4 Synchroniser les fichiers du build**

```bash
npx cap sync android
```

Résultat attendu : `✔ Copying web assets from public to android/app/src/main/assets/public`.

- [ ] **2.5 Vérifier que l'app s'ouvre dans Android Studio**

```bash
npx cap open android
```

Android Studio s'ouvre. Clique "Run" (▶) pour lancer sur émulateur ou appareil branché.

- [ ] **2.6 Commit**

```bash
git add capacitor.config.ts package.json package-lock.json
# Ne PAS commiter android/ et ios/ (trop lourds)
echo "android/" >> .gitignore
echo "ios/" >> .gitignore
git add .gitignore
git commit -m "feat: add Capacitor config for Android/iOS packaging"
```

---

## Task 3 — Capacitor : plugin natif (scanner + push)

- [ ] **3.1 Créer le wrapper natif Vue**

```js
// resources/src/plugins/native.js
/**
 * native.js — Wrapper pour les fonctionnalités natives Capacitor
 * En mode web (navigateur), toutes les fonctions tombent sur des fallbacks.
 */

import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

const isNative = Capacitor.isNativePlatform();

// ── Scanner codes-barres ──────────────────────────────────────────────────
export async function scanBarcode() {
    if (!isNative) {
        // Fallback web — utilise l'input caméra du navigateur ou retourne null
        return null;
    }

    const { BarcodeScanner } = await import('@capacitor-community/barcode-scanner');
    await BarcodeScanner.checkPermission({ force: true });
    await BarcodeScanner.hideBackground();

    const result = await BarcodeScanner.startScan();
    await BarcodeScanner.showBackground();

    return result.hasContent ? result.content : null;
}

// ── Push Notifications ────────────────────────────────────────────────────
export async function initPushNotifications(onMessage) {
    if (!isNative) return;

    await PushNotifications.requestPermissions();
    await PushNotifications.register();

    PushNotifications.addListener('registration', ({ value: token }) => {
        // Envoyer le token FCM au backend Laravel
        window.axios.post('/api/push/register', { token, platform: Capacitor.getPlatform() });
    });

    PushNotifications.addListener('pushNotificationReceived', onMessage);
}

// ── Détection plateforme ──────────────────────────────────────────────────
export const platform = {
    isNative,
    isAndroid: Capacitor.getPlatform() === 'android',
    isIos:     Capacitor.getPlatform() === 'ios',
    isWeb:     !isNative,
};
```

- [ ] **3.2 Importer le plugin dans `main.js`**

Dans `resources/src/main.js`, ajouter après les imports existants :

```js
// Initialiser les notifications push natives (mobile uniquement)
import { initPushNotifications } from './plugins/native';
initPushNotifications((notification) => {
    console.log('[Push]', notification);
});
```

- [ ] **3.3 Remplacer le bouton scanner dans le POS**

Dans le composant POS existant (chercher le bouton scan dans `resources/src/views/app/pages/pos.vue`) :

Trouver le bloc qui déclenche le scan et remplacer l'implémentation par :

```js
import { scanBarcode } from '@/plugins/native';

async function onScanClick() {
    const code = await scanBarcode();
    if (code) {
        // Utiliser le code scanné — logique existante
        searchProductByBarcode(code);
    }
}
```

- [ ] **3.4 Rebuild et sync**

```bash
npm run production && npx cap sync android
```

- [ ] **3.5 Commit**

```bash
git add resources/src/plugins/native.js resources/src/main.js
git commit -m "feat: add Capacitor native plugin wrapper (barcode scanner + push notifications)"
```

---

## Task 4 — iOS build (si Mac disponible)

- [ ] **4.1 Ajouter la plateforme iOS**

```bash
npx cap add ios
npx cap sync ios
npx cap open ios
```

Xcode s'ouvre. Sélectionner l'équipe de développement dans "Signing & Capabilities". Cliquer "Run".

> Si pas de Mac disponible, passer cette tâche — iOS peut être ajouté plus tard.

- [ ] **4.2 Mettre à jour `.gitignore`**

```bash
echo "ios/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore ios/ build artifacts"
```

---

## Task 5 — Electron : setup initial

- [ ] **5.1 Créer le dossier Electron**

```bash
mkdir electron && cd electron
npm init -y
```

- [ ] **5.2 Installer les dépendances Electron**

```bash
npm install electron electron-builder electron-updater --save-dev
npm install electron --save
```

- [ ] **5.3 Créer `electron/main.js`**

```js
// electron/main.js
const { app, BrowserWindow, shell, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

const isDev = !app.isPackaged;
const BASE_URL = isDev
    ? 'http://localhost:8000'  // Dev : serveur Laravel local
    : 'https://app.stocky.com'; // Prod : serveur SaaS

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 600,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        titleBarStyle: 'hidden',
        trafficLightPosition: { x: 16, y: 16 },
    });

    mainWindow.loadURL(BASE_URL);

    // Ouvrir les liens externes dans le navigateur système
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
}

app.whenReady().then(() => {
    createWindow();

    // Vérifier les mises à jour (prod uniquement)
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ── Auto-updater events ────────────────────────────────────────────────────
autoUpdater.on('update-available', () => {
    mainWindow.webContents.send('update-available');
});

autoUpdater.on('update-downloaded', () => {
    mainWindow.webContents.send('update-downloaded');
});

// IPC : installer la mise à jour quand l'utilisateur confirme
const { ipcMain } = require('electron');
ipcMain.on('install-update', () => {
    autoUpdater.quitAndInstall();
});
```

- [ ] **5.4 Créer `electron/preload.js`**

```js
// electron/preload.js
const { contextBridge, ipcRenderer } = require('electron');

// Bridge sécurisé — expose seulement ce dont l'app Vue a besoin
contextBridge.exposeInMainWorld('electronAPI', {
    // Mises à jour
    onUpdateAvailable:  (cb) => ipcRenderer.on('update-available', cb),
    onUpdateDownloaded: (cb) => ipcRenderer.on('update-downloaded', cb),
    installUpdate:      () => ipcRenderer.send('install-update'),

    // Infos plateforme
    platform: process.platform,
    isElectron: true,
});
```

- [ ] **5.5 Créer `electron/package.json`**

```json
{
  "name": "stocky-desktop",
  "version": "1.0.0",
  "description": "Stocky — Application de gestion commerciale",
  "main": "main.js",
  "scripts": {
    "start": "electron .",
    "build:win": "electron-builder --win",
    "build:mac": "electron-builder --mac",
    "build:linux": "electron-builder --linux"
  },
  "build": {
    "appId": "com.stocky.desktop",
    "productName": "Stocky",
    "publish": {
      "provider": "generic",
      "url": "https://releases.stocky.com"
    },
    "win": {
      "target": "nsis",
      "icon": "assets/icon.ico"
    },
    "mac": {
      "target": "dmg",
      "icon": "assets/icon.icns"
    },
    "linux": {
      "target": "AppImage",
      "icon": "assets/icon.png"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  },
  "dependencies": {
    "electron-updater": "^6.1.7"
  },
  "devDependencies": {
    "electron": "^28.0.0",
    "electron-builder": "^24.9.1"
  }
}
```

- [ ] **5.6 Créer le dossier assets et l'icône**

```bash
mkdir -p electron/assets
# Placer stocky-icon.png (512x512) dans electron/assets/icon.png
# Convertir en .ico (Windows) et .icns (Mac) avec un outil comme ImageMagick
```

- [ ] **5.7 Tester en mode dev**

```bash
cd electron
npm install
npm start
```

L'app Electron s'ouvre et charge `http://localhost:8000`. Vérifier que la connexion fonctionne.

- [ ] **5.8 Commit**

```bash
cd ..
echo "electron/node_modules/" >> .gitignore
echo "electron/dist/" >> .gitignore
git add electron/ .gitignore
git commit -m "feat: add Electron desktop app with auto-updater support"
```

---

## Task 6 — Notification de mise à jour dans Vue.js

- [ ] **6.1 Créer le composant de notification de mise à jour**

```vue
<!-- resources/src/components/UpdateNotification.vue -->
<template>
  <transition name="slide-up">
    <div v-if="showBanner" class="fixed bottom-4 right-4 z-50
                                   bg-indigo-600 text-white rounded-xl shadow-2xl
                                   p-4 max-w-sm flex items-start gap-3">
      <div class="flex-1">
        <p class="font-semibold text-sm">{{ message }}</p>
        <p class="text-xs opacity-80 mt-1">{{ subtitle }}</p>
      </div>
      <button v-if="readyToInstall"
              @click="installUpdate"
              class="bg-white text-indigo-600 text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap">
        Installer maintenant
      </button>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted } from 'vue';

const showBanner     = ref(false);
const readyToInstall = ref(false);
const message        = ref('');
const subtitle       = ref('');

onMounted(() => {
    if (!window.electronAPI) return; // Web ou mobile — pas d'Electron

    window.electronAPI.onUpdateAvailable(() => {
        showBanner.value = true;
        message.value    = 'Mise à jour disponible';
        subtitle.value   = 'Téléchargement en cours...';
    });

    window.electronAPI.onUpdateDownloaded(() => {
        readyToInstall.value = true;
        message.value        = 'Mise à jour prête !';
        subtitle.value       = 'Redémarrez pour appliquer.';
    });
});

function installUpdate() {
    window.electronAPI.installUpdate();
}
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all .3s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100px); opacity: 0; }
</style>
```

- [ ] **6.2 Ajouter le composant dans `App.vue`**

Dans `resources/src/App.vue`, ajouter dans le template :

```vue
<template>
  <div id="app">
    <!-- ... contenu existant ... -->
    <UpdateNotification />
  </div>
</template>

<script>
import UpdateNotification from './components/UpdateNotification.vue';
export default {
    components: { UpdateNotification },
    // ... reste du composant existant
}
</script>
```

- [ ] **6.3 Rebuild**

```bash
npm run production
```

- [ ] **6.4 Commit**

```bash
git add resources/src/components/UpdateNotification.vue resources/src/App.vue
git commit -m "feat: add auto-update notification banner for Electron desktop app"
```

---

## Task 7 — Build de production Electron (Windows)

- [ ] **7.1 Builder l'installateur Windows**

```bash
cd electron
npm run build:win
```

Résultat attendu : fichier `.exe` dans `electron/dist/`.

- [ ] **7.2 Tester l'installateur**

Exécuter le fichier `.exe` généré. Vérifier :
- L'installation se fait sans erreur
- L'app démarre et charge `https://app.stocky.com`
- L'icône apparaît dans la barre des tâches
- La désinstallation fonctionne via Panneau de configuration

- [ ] **7.3 Commit**

```bash
cd ..
git add electron/package.json
git commit -m "build: configure electron-builder for Windows/Mac/Linux production builds"
git tag v3.0.0-phase3
```

---

## Résumé Phase 3

| Fonctionnalité | Statut |
|---|---|
| Build Vue.js optimisé pour packaging | ✅ |
| Capacitor Android configuré et synchronisé | ✅ |
| Scanner codes-barres natif (Capacitor) | ✅ |
| Push notifications natives (Capacitor) | ✅ |
| Electron desktop app — chargement `app.stocky.com` | ✅ |
| Auto-updater Electron avec notification in-app | ✅ |
| Build Windows `.exe` | ✅ |
| iOS (si Mac disponible) | ✅ |

**Phase suivante :** [Phase 4 — Reports Polish + Offline Optimization](./2026-05-29-phase4-reports-polish.md)
