// Firebase Cloud Messaging background Service Worker.
// This worker listens for messages while the app is in the background and displays notifications.

importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.1/firebase-messaging-compat.js');

// Initialize Firebase App in service worker context
firebase.initializeApp({
  apiKey: "AIzaSyA86P77_HGZldA0OnEWpgLtdp-wtHCBkf0",
  authDomain: "revitup-c8a66.firebaseapp.com",
  projectId: "revitup-c8a66",
  storageBucket: "revitup-c8a66.firebasestorage.app",
  messagingSenderId: "848807710523",
  appId: "1:848807710523:web:d89df1cec6f9e38d57b11e"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || payload.data?.title || 'RevItUp Notification';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'You have a new update in your social garage!',
    icon: '/screenshot.png',
    badge: '/screenshot.png',
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// PWA Install and Offline compliance requirements
const CACHE_NAME = 'revitup-offline-cache-v1';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/screenshot.png',
  '/pwa-icon-192-v10.png',
  '/pwa-icon-512-v10.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Pre-caching offline app shell');
        // Cache individual items gracefully, ignoring optional/missing assets to avoid install failure
        return Promise.allSettled(
          PRECACHE_ASSETS.map(asset => 
            cache.add(asset)
              .catch(err => console.warn(`Failed to pre-cache ${asset}:`, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Intercept requests and implement Stale-While-Revalidate & Network-First strategies
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // Skip Firebase, Firestore, Google APIs, and external tracking/advertisement services from caching
  // to avoid caching auth tokens, analytics, or real-time Firestore database queries.
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('google-analytics') ||
    url.hostname.includes('googlesyndication') ||
    url.hostname.includes('doubleclick') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // Handle SPA navigation requests (e.g. if the user refreshes on a sub-route like /profile while offline)
  // These should be served the cached app shell (/index.html).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Clone the response to store it in cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // If offline, try to return the cached index.html or root
          return caches.match('/')
            .then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              return caches.match('/index.html');
            });
        })
    );
    return;
  }

  // For other same-origin/static requests (like JS, CSS, images, fonts), we use a Stale-While-Revalidate approach.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Fetch from network in parallel
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          // If it's a valid successful response, cache it
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          // Network failed, nothing to do here as cachedResponse will be returned if available
          console.log('[Service Worker] Network request failed for:', event.request.url, error);
        });

      // Return cached response immediately if we have it, otherwise wait for network
      return cachedResponse || networkFetch;
    })
  );
});

