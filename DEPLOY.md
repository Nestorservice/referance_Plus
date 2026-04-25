# Guide de Déploiement Stocky POS PWA sur Render.com
**Développé par OceanTechnologie**

Ce projet est désormais configuré pour être déployé en tant qu'application **Offline-First PWA** sur la plateforme Render.com avec une architecture robuste.

## 🚀 Étape 1 : Préparation du compte Render
1. Créez un compte sur [Render.com](https://render.com) (ou connectez-vous).
2. Liez votre compte GitHub ou GitLab à Render.

## 📦 Étape 2 : Déploiement automatique (Méthode Blueprint)
La méthode la plus simple consiste à utiliser le fichier `render.yaml` inclus à la racine du projet.

1. Allez dans le **Dashboard Render**.
2. Cliquez sur **New +** puis sélectionnez **Blueprint**.
3. Connectez votre dépôt Git contenant le code de Stocky POS.
4. Render détectera automatiquement le fichier `render.yaml`.
5. Cliquez sur **Approve** pour lancer le déploiement des deux services :
   - `stocky-db` : Base de données MariaDB (disque persistant 1GB).
   - `stocky-app` : Application Laravel + Vue.js (serveur web).

*Render générera automatiquement les mots de passe de la base de données, la clé d'application Laravel (APP_KEY) et les clés VAPID pour les notifications push.*

## 🔑 Étape 3 : Configuration du domaine (Optionnel)
1. Allez dans les paramètres du service `stocky-app`.
2. Dans la section **Custom Domains**, ajoutez votre domaine personnalisé (ex: `pos.votre-domaine.com`).
3. Suivez les instructions pour configurer vos enregistrements DNS.

## 🔄 Étape 4 : CI/CD avec GitHub Actions
Un workflow GitHub Actions a été préparé dans `.github/workflows/deploy.yml`.

1. Une fois votre application déployée sur Render, allez dans **Settings** de l `stocky-app`.
2. Trouvez l'URL **Deploy Hook**.
3. Allez dans les paramètres de votre dépôt GitHub > **Secrets and variables** > **Actions**.
4. Créez un nouveau secret nommé `RENDER_DEPLOY_HOOK_URL` et collez l'URL.
5. Désormais, chaque push sur la branche `main` déclenchera un redéploiement automatique !

---

### Fonctionnalités PWA & Offline
L'application est configurée pour fonctionner hors ligne avec :
- **Service Worker (Workbox)** : Mise en cache des fichiers statiques et stratégies réseau intelligentes.
- **IndexedDB (Dexie.js)** : Stockage local des produits, clients et sauvegarde des ventes en attente.
- **Synchronisation automatique** : Dès que la connexion est rétablie, les ventes locales sont envoyées au serveur.
- **Notifications Push** : Alertes de stock bas en temps réel gérées par Laravel WebPush.

> *Pour tester le mode PWA en local, utilisez Google Chrome (DevTools > Application > Service Workers / IndexedDB) et simulez le mode "Offline".*
