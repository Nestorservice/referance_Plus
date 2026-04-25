#!/bin/bash
set -e

echo "==> Stocky POS - Démarrage du serveur..."

# Créer .env s'il n'existe pas
# Créer .env s'il n'existe pas
if [ ! -f /var/www/html/.env ]; then
    echo "==> Création du fichier .env..."
    if [ -f /var/www/html/.env.example ]; then
        cp /var/www/html/.env.example /var/www/html/.env
    else
        touch /var/www/html/.env
    fi
fi

# S'assurer que les variables d'environnement sont dans .env
# (Render les injecte en tant que variables système, Laravel les lit directement)

# Générer APP_KEY si elle n'est pas définie correctement
if [ -z "$APP_KEY" ] || [[ ! "$APP_KEY" == base64:* ]]; then
    echo "==> Génération de la clé APP_KEY..."
    php artisan key:generate --force
fi

# Lancer les migrations (recréer toutes les tables depuis zéro)
echo "==> Exécution des migrations..."
php artisan migrate:fresh --seed --force || echo "==> AVERTISSEMENT: Certaines migrations ont échoué. L'application va continuer."

# Vider les caches
echo "==> Nettoyage des caches..."
php artisan config:clear
php artisan cache:clear
php artisan view:clear

# Lien symbolique pour le storage
php artisan storage:link 2>/dev/null || true

echo "==> Correction des permissions..."
chown -R www-data:www-data /var/www/html/storage /var/www/html/bootstrap/cache
chmod -R 775 /var/www/html/storage /var/www/html/bootstrap/cache

echo "==> Démarrage d'Apache..."
exec apache2-foreground
