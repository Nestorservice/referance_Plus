/**
 * Service Worker — Stocky POS PWA
 * Développé par OceanTechnologie
 * 
 * v2 — Force cache refresh after rebuild
 */

const CACHE_NAME = 'stocky-cache-v2';
const API_CACHE_NAME = 'stocky-api-cache-v2';

// Assets statiques à pré-cacher (PAS les JS bundles)
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
  console.log('[SW] Installation du Service Worker Stocky v2...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Pré-cache des assets statiques');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.warn('[SW] Erreur lors du pré-cache:', error);
        return self.skipWaiting();
      })
  );
});

// ================ ACTIVATION ================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activation du Service Worker Stocky v2...');
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

  if (request.method !== 'GET') return;
  if (url.origin !== location.origin) return;

  // JS files — TOUJOURS NetworkFirst pour éviter les problèmes de cache stale
  if (url.pathname.endsWith('.js')) {
    event.respondWith(networkFirst(request));
    return;
  }

  // API critiques — NetworkFirst
  if (API_NETWORK_FIRST_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(networkFirst(request));
    return;
  }

  // API secondaires — StaleWhileRevalidate
  if (API_STALE_ROUTES.some(route => url.pathname.startsWith(route))) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // Assets statiques (CSS, images, polices) — CacheFirst
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages HTML — NetworkFirst
  if (request.headers.get('accept') && request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

// ================ STRATÉGIES DE CACHE ================

async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) return cachedResponse;
    return new Response('Hors ligne', { status: 503 });
  }
}

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
    if (cachedResponse) return cachedResponse;
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

async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  }).catch(() => null);

  if (cachedResponse) return cachedResponse;
  const networkResponse = await fetchPromise;
  if (networkResponse) return networkResponse;
  return new Response(
    JSON.stringify({ error: 'Hors ligne - données non disponibles' }),
    { status: 503, headers: { 'Content-Type': 'application/json' } }
  );
}

function isStaticAsset(pathname) {
  // JS est géré séparément (NetworkFirst)
  const staticExtensions = [
    '.css', '.png', '.jpg', '.jpeg', '.gif', '.svg',
    '.woff', '.woff2', '.ttf', '.eot', '.ico', '.webp'
  ];
  return staticExtensions.some(ext => pathname.endsWith(ext));
}

// ================ NOTIFICATIONS PUSH ================
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try { data = event.data.json(); } catch (e) {
      data = { title: 'Stocky POS', body: event.data.text() };
    }
  }
  const options = {
    body: data.body || 'Nouvelle notification',
    icon: '/images/icons/icon-192x192.png',
    badge: '/images/icons/icon-192x192.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/app/dashboard' },
    actions: data.actions || [],
    tag: data.tag || 'stocky-notification',
    renotify: true,
  };
  event.waitUntil(
    self.registration.showNotification(data.title || 'Stocky POS', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || '/app/dashboard';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        return self.clients.openWindow(urlToOpen);
      })
  );
});

console.log('[SW] Service Worker Stocky POS v2 chargé — OceanTechnologie');
