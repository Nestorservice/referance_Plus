# Stocky SaaS — Design Spec
**Date:** 2026-05-29  
**Auteur:** Nestor (propriétaire) + Claude  
**Statut:** Approuvé

---

## Vue d'ensemble

Transformer Stocky (application de gestion commerciale Laravel + Vue.js 2) en une plateforme SaaS multi-tenant complète. L'application existante est conservée et étendue — pas de réécriture. Un nouveau panneau admin séparé (Vue 3 + Vite) est créé pour le propriétaire.

---

## 1. Architecture globale

### Approche : Hybride (Option C)

- **App clients** : codebase Vue.js 2 existant, amélioré et étendu
- **Panneau admin propriétaire** : nouveau projet séparé Vue 3 + Vite (`admin.stocky.com`)
- **Backend** : Laravel 10 existant, amélioré (multi-tenant, CinetPay, soft deletes)

### Plateformes livrées

| Plateforme | Technologie | URL / Distribution |
|---|---|---|
| Web clients | Vue.js 2 (existant) | `app.stocky.com` |
| Mobile Android/iOS | Vue.js 2 + Capacitor | Play Store & App Store |
| Desktop Windows/Mac/Linux | Vue.js 2 + Electron | Téléchargement direct |
| Panneau admin web | Vue 3 + Vite | `admin.stocky.com` |

Un seul compte fonctionne sur toutes les plateformes (web, mobile, desktop).

---

## 2. Multi-tenant & Isolation des données

### Modèle d'isolation : Shared Database, Separate Tenant ID

Toutes les tables Laravel existantes reçoivent une colonne `tenant_id`. Un middleware `TenantMiddleware` injecte automatiquement ce filtre sur chaque requête API — un client ne peut jamais voir les données d'un autre.

### Nouvelle table `tenants`

```
tenants
  - id (ulid)
  - name (nom de la boutique)
  - email (email du propriétaire)
  - plan (enum: one_time, subscription)
  - status (enum: active, suspended, expired)
  - installed_at
  - subscription_expires_at
  - warehouses_count
  - monthly_amount (calculé automatiquement)
  - cinetpay_customer_id
```

### Authentification

- Une seule page de connexion : `app.stocky.com/login`
- L'email est **globalement unique** sur tout le système
- À la connexion, Laravel identifie le `tenant_id` via l'email → charge l'espace du client
- Si abonnement expiré : message dédié + bouton de paiement CinetPay direct
- Si identifiants incorrects : message d'erreur standard

### Création d'employés

Le patron crée les comptes de ses employés depuis son espace. Chaque employé reçoit un email avec ses identifiants. Les employés ont des rôles et permissions définis par le patron — le système de rôles existant de Stocky est conservé.

---

## 3. Protection des données — Soft Deletes

### Principe : rien n'est jamais réellement supprimé

- Tous les modèles Laravel activent `SoftDeletes` (certains l'ont déjà)
- Quand un client "supprime" une vente, un produit ou un client : `deleted_at` est rempli, la donnée disparaît de son interface mais reste en base
- Le propriétaire (Nestor) voit tout depuis le panneau admin, y compris les données supprimées
- Restauration possible à tout moment depuis le panneau admin

### God-Mode admin

Les routes du panneau admin (`/admin/*`) sont exclues du filtre `TenantMiddleware` — elles ont accès à toutes les données de tous les tenants.

---

## 4. Plans tarifaires

### Plan Achat Unique

- Paiement unique (montant défini par le propriétaire)
- Accès complet à toutes les fonctionnalités, illimité
- Entrepôts illimités, utilisateurs illimités
- Maintenance et sauvegarde des données incluses
- Pas d'expiration

### Plan Abonnement Mensuel

- **Frais d'installation (une seule fois) : 45 000 FCFA**
- Tarification par entrepôt/mois :
  - 1er entrepôt : **10 000 FCFA/mois**
  - 2ème et 3ème entrepôt : **5 000 FCFA/mois chacun**
  - 4ème entrepôt et plus : **3 000 FCFA/mois chacun**
- Exemple : 3 entrepôts = 10 000 + 5 000 + 5 000 = **20 000 FCFA/mois**
- Accès automatiquement bloqué si l'abonnement expire
- Notification envoyée 7 jours avant expiration (email + notification in-app)

### Calcul automatique

Le montant mensuel est recalculé automatiquement chaque fois que le client ajoute ou supprime un entrepôt.

---

## 5. Paiements — CinetPay

### Agrégateur choisi : CinetPay

Raisons : couverture maximale (CI, SN, CM, TG, BF, ML, NE...), support Orange Money + MTN Mobile Money + Wave + Visa/Mastercard, API PHP bien documentée, webhooks fiables, sandbox disponible.

### Flux de paiement

1. Client clique "Renouveler mon abonnement" (ou notification d'expiration)
2. Redirection vers la page de paiement CinetPay (montant calculé automatiquement)
3. Client choisit Orange Money ou MTN et valide
4. CinetPay envoie un webhook à Laravel → abonnement renouvelé automatiquement
5. Notification de confirmation envoyée au client

### Frais d'installation

Paiement unique de 45 000 FCFA lors de la première inscription au plan abonnement, traité via CinetPay.

### Configuration admin

Le propriétaire peut modifier les tarifs depuis le panneau admin sans toucher au code. Les nouveaux tarifs s'appliquent aux nouveaux abonnements (les existants gardent leur tarif jusqu'au renouvellement).

---

## 6. Panneau Admin SaaS (`admin.stocky.com`)

### Stack : Vue 3 + Vite + Pinia + Vue Router 4

Nouveau projet frontend séparé du codebase client. Utilise la même API Laravel mais via des routes `/admin/*` protégées par un middleware `AdminOnly`.

### 6 sections

#### 6.1 Dashboard
- Nombre de clients actifs / suspendus / plan achat unique
- Revenu du mois en cours (FCFA)
- MRR (Monthly Recurring Revenue)
- Clients qui expirent dans les 7 prochains jours
- Graphique revenu sur 12 mois (ECharts)
- Liste des derniers clients avec statut coloré

#### 6.2 Gestion Clients
- Liste paginée avec filtres (plan, statut, date inscription)
- Fiche détail : informations, entrepôts, utilisateurs, historique paiements
- Actions : activer, suspendre, bloquer, prolonger abonnement manuellement
- Accès aux données du client (God-Mode)

#### 6.3 Abonnements & Paiements
- Historique complet des transactions CinetPay
- Statut de chaque paiement (succès, échec, en attente)
- Reçus de paiement exportables en PDF
- Statistiques : taux de renouvellement, churn, revenus par plan

#### 6.4 Données God-Mode
- Sélectionner un tenant → naviguer dans toutes ses données
- Voir les données supprimées (soft deleted)
- Restaurer des données supprimées
- Export complet des données d'un client (backup manuel)

#### 6.5 Analytics & Revenus
- MRR / ARR / churn rate
- Courbe d'acquisition clients
- Répartition plans (abonnement vs achat unique)
- Top clients par revenu

#### 6.6 Paramètres SaaS
- Modifier les tarifs (pris en compte sur les nouveaux abonnements)
- Configurer les clés API CinetPay (live / sandbox)
- Templates d'emails automatiques (expiration, bienvenue, renouvellement)
- Créer/modifier les plans depuis l'interface

---

## 7. App Mobile — Capacitor

### Principe

Le codebase Vue.js 2 existant est wrappé dans Capacitor. Les fichiers JS/CSS sont **packagés dans l'app** (aucun téléchargement réseau au démarrage). L'app se connecte à `app.stocky.com/api` pour les données.

### Fonctionnalités natives ajoutées

- **Scanner codes-barres** via caméra native (plugin `@capacitor-community/barcode-scanner`)
- **Notifications push** natives Android/iOS (plugin `@capacitor/push-notifications`)
- **Impression Bluetooth** pour imprimante ticket thermique 80mm
- **Écran toujours allumé** activé automatiquement sur l'écran POS

### Offline-first (Dexie.js déjà présent)

- Produits et prix synchronisés au démarrage et mis en cache local (IndexedDB)
- Ventes POS créées localement → envoyées au serveur en background
- Sync automatique dès que la connexion est rétablie
- L'app est **100% fonctionnelle sans internet** pour les opérations POS courantes

### Distribution

- Android : Play Store + APK direct téléchargeable
- iOS : App Store

---

## 8. App Desktop — Electron

### Principe

Le même codebase Vue.js 2 wrappé dans Electron. Distribué comme un logiciel installable (`.exe` Windows, `.dmg` Mac, `.AppImage` Linux).

### Mises à jour automatiques (electron-updater)

- Le propriétaire publie une nouvelle version sur son serveur de releases
- L'app détecte la mise à jour au démarrage → notifie l'utilisateur
- Téléchargement et installation silencieux en arrière-plan
- Les données utilisateur sont stockées dans `userData` (séparé des fichiers app) → jamais touchées lors d'une mise à jour

### Fonctionnalités desktop spécifiques

- Impression directe sans dialogue (imprimante définie par défaut)
- Raccourcis clavier natifs (F1 pour POS, F2 pour stock...)
- Icône dans la barre des tâches système
- Accès fichiers locaux pour backup et export direct

### Deux builds Electron distincts

1. **Stocky Client** — pour les clients commerçants, se connecte à `app.stocky.com`
2. **Stocky Admin** — pour Nestor uniquement, se connecte à `admin.stocky.com` (à développer en Phase 4, après validation du panneau admin web)

---

## 9. Consommation internet minimale

### Stratégie cache-first

- Catalogue produits : synchronisé une fois au démarrage, delta-sync si changements (comparaison `updated_at`)
- Ventes POS : créées en local → envoyées en batch toutes les 30 secondes si connexion disponible
- Rapports : générés depuis les données locales, pas de requête serveur à chaque consultation
- Images produits : cachées dans IndexedDB après premier chargement

### Ce qui nécessite une connexion

- Authentification initiale
- Synchronisation des données (peut être différée)
- Paiements CinetPay
- Mises à jour de l'app

---

## 10. Rapports (amélioration du design existant)

Les librairies sont déjà présentes (ECharts, jsPDF, DomPDF, Maatwebsite Excel). On améliore uniquement le **design et l'expérience utilisateur**.

### PDF

- Refonte des templates DomPDF : logo de la boutique, couleurs personnalisées, mise en page moderne
- Graphiques ECharts intégrés dans les PDFs
- En-tête et pied de page professionnels (adresse, numéro, date)
- Bouton "Partager" → partage direct WhatsApp ou email
- Formats : A4 standard + reçu thermique 80mm

### Excel

- Nommage cohérent des colonnes (en français)
- Totaux et sous-totaux automatiques
- Mise en forme : en-têtes colorés, alternance lignes
- Feuilles multiples dans un même fichier (ex: ventes + retours dans un seul .xlsx)

### Graphiques interactifs

- Mise à jour des thèmes ECharts (couleurs modernes, animations fluides)
- Tooltips informatifs au survol
- Légendes claires et lisibles
- Responsive mobile (graphiques adaptés aux petits écrans)

---

## 11. Découpage en phases

### Phase 1 — Fondations SaaS (Backend)
- Création table `tenants` et migration `tenant_id` sur toutes les tables
- `TenantMiddleware` + résolution automatique du tenant à la connexion
- Activation `SoftDeletes` sur tous les modèles
- Routes admin protégées (`/admin/*`) sans filtre tenant
- Gestion des statuts d'abonnement (active/expired/suspended) + blocage accès

### Phase 2 — Panneau Admin + Paiements
- Nouveau projet Vue 3 + Vite pour `admin.stocky.com`
- Les 6 sections du panneau admin (Dashboard, Clients, Paiements, God-Mode, Analytics, Paramètres)
- Intégration CinetPay (Orange Money + MTN) pour les abonnements
- Calcul automatique du montant mensuel selon nombre d'entrepôts
- Emails automatiques (bienvenue, expiration J-7, confirmation paiement)

### Phase 3 — Mobile + Desktop
- Build Capacitor (Android + iOS) avec plugins natifs
- Build Electron (Windows + Mac) avec electron-updater
- Optimisations offline (delta-sync, batch sync ventes)
- Tests sur appareils réels

### Phase 4 — Polish & Optimisations
- Refonte design templates PDF
- Amélioration graphiques ECharts
- Bouton partage WhatsApp sur factures
- Build Electron Admin (panneau admin en app desktop pour Nestor)
- Tests de charge et optimisation requêtes

---

## Décisions techniques clés

| Décision | Choix | Raison |
|---|---|---|
| Isolation tenant | Shared DB + tenant_id | Simple, compatible avec le code existant |
| App mobile | Capacitor | Réutilise Vue.js existant, feel natif, offline |
| App desktop | Electron | Installable, mises à jour auto, impression directe |
| Panneau admin | Vue 3 + Vite séparé | Moderne, pas de risque sur l'app cliente |
| Paiement | CinetPay | Meilleure couverture Afrique de l'Ouest/Centrale |
| Accès clients | URL unique (app.stocky.com) | Simple, standard SaaS, 1 compte = 3 plateformes |
| Suppression données | Soft deletes | Données jamais perdues, God-Mode admin |

---

## Hors scope (pour plus tard)

- App Electron Admin (Phase 4, après validation web)
- Migration Vue 2 → Vue 3 pour l'app cliente (risque élevé, non prioritaire)
- Sous-domaines par client (inutile avec l'approche URL unique)
- Multi-devises dans les plans tarifaires
