/**
 * Service Worker — Stocky POS PWA
 * Développé par OceanTechnologie
 * 
 * Stratégies de cache :
 * - CacheFirst : assets statiques (CSS, JS, polices, images)
 * - NetworkFirst : appels API critiques (produits, clients, paramètres)
 * - StaleWhileRevalidate : données moins critiques
 */

const CACHE_NAME = 'stocky-cache-v1';
const API_CACHE_NAME = 'stocky-api-cache-v1';

// Liste des assets statiques à pré-cacher
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/images/logo.png',
  '/images/favicon.ico',
  '/images/icons/icon-192x192.png',
  '/images/icons/icon-512x512.png',
  '/css/master.css',
];

// Routes API critiques (NetworkFirst)
const API_NETWORK_FIRST_ROUTES = [
  '/api/pos/get_products_pos',
  '/api/pos/data_create_pos',
  '/api/get_clients_without_paginate',
  '/api/get_user_auth',
  '/api/products',
  '/api/categories',
  '/api/brands',
  '/api/warehouses',
];

// Routes API moins critiques (StaleWhileRevalidate)
const API_STALE_ROUTES = [
  '/api/get_Settings_data',
  '/api/get_pos_Settings',
  '/api/currencies',
  '/api/units',
];

// ================ INSTALLATION ================
self.addEventListener('install', (event) => {
  console.log('[SW] Installation du Service Worker Stocky...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pré-cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn('[SW] Erreur lors du pré-cache:', error);
        // On continue même si certains assets ne sont pas encore disponibles
        return self.skipWaiting();
      })
  );
});

// ================ ACTIVATION ================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation du Service Worker Stocky...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== API_CACHE_NAME)
          .map((name) => {
            console.log('[SW] Suppression de l\'ancien cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ================ INTERCEPTION DES REQUÊTES ================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorer les requêtes non-GET pour le cache (sauf stratégie spéciale)
  if (request.method !== 'GET') {
    return;
  }

  // Ignorer les requêtes vers des domaines externes
  if (url.origin !== location.origin) {
    return;
  }

  // ---- Stratégie NetworkFirst pour les API critiques ----
  if (API_NETWORK_FIRST_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // ---- Stratégie StaleWhileRevalidate pour les API secondaires ----
  if (API_STALE_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // ---- Stratégie CacheFirst pour les assets statiques ----
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // ---- Par défaut : NetworkFirst pour les pages HTML ----
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Tout le reste : tenter le réseau puis le cache
  event.respondWith(networkFirst(request));
});

// ================ STRATÉGIES DE CACHE ================

/**
 * CacheFirst — Cherche d'abord dans le cache, puis le réseau
 * Idéal pour les assets statiques (CSS, JS, images, polices)
 */
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    console.warn('[SW] CacheFirst échoué pour:', request.url);
    return new Response('Hors ligne', { status: 503 });
  }
}

/**
 * NetworkFirst — Tente le réseau d'abord, puis le cache en fallback
 * Idéal pour les données API qui changent fréquemment
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Réponse depuis le cache pour:', request.url);
      return cachedResponse;
    }
    // Pour les pages HTML, retourner la page principale en cache
    if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
    }
    return new Response(
      JSON.stringify({ error: 'Hors ligne - données non disponibles' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * StaleWhileRevalidate — Retourne le cache immédiatement, 
 * puis met à jour en arrière-plan
 * Idéal pour les données qui changent rarement (paramètres)
 */
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Lancer la mise à jour en arrière-plan
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  // Retourner le cache s'il existe, sinon attendre le réseau
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetchPromise;
  if (networkResponse) {
    return networkResponse;
  }
  
  return new Response(
    JSON.stringify({ error: 'Hors ligne - données non disponibles' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * Vérifie si une URL correspond à un asset statique
 */
function isStaticAsset(pathname) {
  const staticExtensions = [
    '.css', '.js', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.ico', '.webp'
  ];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// ================ NOTIFICATIONS PUSH ================
self.addEventListener('push', (event) => {
  console.log('[SW] Notification push reçue');
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'Stocky POS',
        body: event.data.text(),
      };
    }
  }

  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/app/dashboard',
    },
    actions: data.actions || [],
    tag: data.tag || 'stocky-notification',
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Stocky POS', options)
  );
});

// ================ CLIC SUR NOTIFICATION ================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Clic sur notification');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/app/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Si une fenêtre est déjà ouverte, la focaliser
        for (const client of clientList) {
          if (client.url.includes(location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Sinon, ouvrir une nouvelle fenêtre
        return self.clients.openWindow(urlToOpen);
      })
  );
});

console.log('[SW] Service Worker Stocky POS chargé — OceanTechnologie');
