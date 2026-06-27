# Guide de Déploiement Stocky POS PWA sur VPS
**Développé par OceanTechnologie**

Ce projet est configuré pour être déployé sur un VPS auto-hébergé (comme `113.30.151.217`) en utilisant Docker, Docker Compose et Nginx comme reverse proxy.

## 📋 Prérequis sur le VPS (Debian / Ubuntu)

Connectez-vous à votre VPS en SSH (`ssh root@113.30.151.217`) et exécutez les commandes suivantes pour installer Docker, Docker Compose et Nginx.

### 1. Installation de Docker et Docker Compose
```bash
apt update
apt install -y docker.io docker-compose-v2
systemctl enable --now docker
```

### 2. Installation de Nginx
```bash
apt install -y nginx
systemctl enable --now nginx
```

---

## 🚀 Étape 1 : Cloner le projet et préparer l'environnement

1. Créez le dossier de l'application sur le VPS et clonez votre dépôt Git :
   ```bash
   mkdir -p /var/www
   cd /var/www
   git clone <URL_DE_VOTRE_DEPOT> stocky
   cd stocky
   ```

2. Créez le fichier de configuration de production `.env` :
   ```bash
   cp .env.example .env
   ```

3. Modifiez le fichier `.env` avec vos accès de production (notamment les accès à la base de données Aiven et l'IP du VPS pour `APP_URL`) :
   ```ini
   APP_NAME="Stocky POS"
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=http://113.30.151.217

   DB_CONNECTION=mysql
   DB_HOST=stockydb-nestorcorneille-3ea7.i.aivencloud.com
   DB_PORT=16730
   DB_DATABASE=defaultdb
   DB_USERNAME=avnadmin
   DB_PASSWORD=<VOTRE_MOT_DE_PASSE_AIVEN>
   MYSQL_ATTR_SSL_CA="" # Requis pour Aiven MySQL
   ```

---

## 📦 Étape 2 : Configuration du serveur Web Nginx

1. Copiez la configuration Nginx du projet dans les sites disponibles de Nginx :
   ```bash
   cp nginx.conf /etc/nginx/sites-available/stocky.conf
   ```

2. Activez le site et redémarrez Nginx :
   ```bash
   ln -s /etc/nginx/sites-available/stocky.conf /etc/nginx/sites-enabled/
   rm /etc/nginx/sites-enabled/default # Supprime la page d'accueil par défaut de Nginx
   nginx -t # Vérifie que la syntaxe est correcte
   systemctl restart nginx
   ```

---

## 🛠️ Étape 3 : Lancer l'application avec Docker Compose

1. Lancez la construction et le démarrage des conteneurs :
   ```bash
   docker compose up -d --build
   ```

Ce processus effectuera les actions suivantes automatiquement via le script d'entrée (`docker-entrypoint.sh`) :
- Compilation des assets Node/Vue.js (Webpack)
- Installation des dépendances Composer (PHP)
- Génération de la clé d'application (`APP_KEY`) si manquante
- Exécution des migrations de base de données
- Configuration des dossiers de stockage et des permissions

2. L'application est maintenant accessible sur **`http://113.30.151.217`**.

---

## 🔄 Étape 4 : CI/CD (Déploiement Automatique avec GitHub Actions)

Le workflow GitHub Actions est configuré dans `.github/workflows/deploy-vps.yml`.

Pour l'activer :
1. Générez une paire de clés SSH sur votre machine locale ou le VPS si vous n'en avez pas.
2. Ajoutez la **clé publique** dans le fichier `/root/.ssh/authorized_keys` de votre VPS.
3. Sur votre dépôt GitHub, allez dans **Settings > Secrets and variables > Actions > Secrets**.
4. Créez un nouveau secret nommé `VPS_SSH_KEY` et collez-y la **clé privée** SSH correspondante.
5. À chaque push sur les branches `main` ou `master`, le code sera automatiquement mis à jour sur votre VPS et le conteneur sera reconstruit sans interruption.
