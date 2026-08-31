// Care Master Service Worker for PWA functionality
const CACHE_NAME = 'Care Master-v2.0.7';
const STATIC_CACHE = 'Care Master-static-v27';
const DYNAMIC_CACHE = 'Care Master-dynamic-v27';
const API_CACHE = 'Care Master-api-v27';

// Assets to cache on install (avoid hashed filenames that change per build)
// Keep this list restricted to assets that are guaranteed to exist.
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/users',
  '/api/patients',
  '/api/appointments',
  '/api/messages',
  '/api/care-tasks',
  '/api/notifications'
];

// Helper function to safely cache a URL
async function safeCacheAdd(cache, url) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-cache',
      credentials: 'same-origin'
    });
    
    if (response.ok) {
      await cache.put(url, response);
      console.log('✓ Cached:', url);
      return true;
    } else {
      console.warn('⚠ Failed to cache (non-OK response):', url, response.status);
      return false;
    }
  } catch (err) {
    console.warn('⚠ Failed to cache (fetch error):', url, err.message);
    return false;
  }
}

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then(async (cache) => {
        console.log('Caching static assets...');
        // Add assets one by one so a single failure doesn't reject the entire install
        const results = await Promise.all(
          STATIC_ASSETS.map(url => safeCacheAdd(cache, url))
        );
        const successCount = results.filter(Boolean).length;
        console.log(`✓ Cached ${successCount}/${STATIC_ASSETS.length} static assets`);
        return cache;
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('API cache ready...');
        return cache;
      })
    ]).then(() => {
      console.log('✓ Service Worker installed successfully');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up ALL old caches (aggressive cache busting)
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating - v2.0.0 - purging ALL old caches...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      // Delete EVERY cache that doesn't match the current version exactly.
      // This is more aggressive than before and ensures no stale JS bundles
      // survive across deployments.
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE &&
              cacheName !== DYNAMIC_CACHE &&
              cacheName !== API_CACHE) {
            console.log('🗑️ Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
          // Also nuke the dynamic cache (which may hold stale index.html)
          if (cacheName === DYNAMIC_CACHE) {
            console.log('🗑️ Clearing dynamic cache for fresh deploy:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker activated - all old caches purged');
      // Force all clients to reload so they pick up the new JS bundles
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          console.log('🔄 Notifying client to reload:', client.url);
          client.postMessage({ type: 'FORCE_RELOAD' });
        });
      });
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-http(s) schemes and localhost/0.0.0.0 dev hosts to avoid
  // caching or intercepting chrome-extension and dev-server assets
  const isHttp = url.protocol === 'http:' || url.protocol === 'https:';
  const isDevHost = url.hostname === 'localhost' || url.hostname === '0.0.0.0';
  const isSameOrigin = url.origin === self.location.origin;
  const isDevWsPath = url.pathname === '/ws' || url.pathname.startsWith('/ws/');

  // Skip if non-http(s), dev-hosted, cross-origin, or webpack-dev-server ws path
  if (!isHttp || isDevHost || !isSameOrigin || isDevWsPath) {
    return; // Let the browser handle it without SW interference
  }

  // Handle different types of requests
  if (request.method === 'GET') {
    // Static assets (JS/CSS/images) - network first so new deploys are picked up
    if (isStaticAsset(request)) {
      event.respondWith(networkFirstWithFallback(request, STATIC_CACHE));
    }
    // API requests - network first with fallback
    else if (isAPIRequest(request)) {
      event.respondWith(networkFirstWithFallback(request, API_CACHE));
    }
    // HTML navigation requests - ALWAYS network first, never serve stale HTML
    // (stale HTML references old hashed JS chunks that no longer exist)
    else if (isHTMLRequest(request)) {
      event.respondWith(htmlNetworkFirst(request));
    }
    // Other requests - network first
    else {
      event.respondWith(networkFirst(request));
    }
  }
  // Handle POST/PUT/DELETE requests
  else {
    event.respondWith(handleAPIRequest(request));
  }
});

// Cache first strategy
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Try to fetch from network
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        // Only cache successful responses
        cache.put(request, networkResponse.clone()).catch(err => {
          console.warn('Failed to cache response:', err);
        });
      }
      return networkResponse;
    } catch (fetchError) {
      // Network fetch failed - check cache one more time as fallback
      const fallbackCache = await cache.match(request);
      if (fallbackCache) {
        return fallbackCache;
      }
      
      // No cache available and network failed - return offline response
      // Only log as warning since this is expected in offline scenarios
      console.warn('Cache first: Network failed and no cache available for:', request.url);
      return new Response('Offline content not available', { 
        status: 503,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  } catch (error) {
    // Critical error - log but don't crash
    console.warn('Cache first strategy error:', error.message);
    return new Response('Service unavailable', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Network first with fallback
async function networkFirstWithFallback(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for HTML requests
    if (isHTMLRequest(request)) {
      return caches.match('/offline.html') || new Response('Offline', { status: 503 });
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Network first strategy
async function networkFirst(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Network request failed - this is expected in offline scenarios
    console.warn('Network request failed:', error.message);
    return new Response('Network error', { 
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Handle API requests with offline queue
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // API request failed - queue for retry (expected in offline scenarios)
    console.warn('API request failed, queuing for retry:', error.message);
    
    // Queue request for retry when online
    await queueRequestForRetry(request).catch(err => {
      console.warn('Failed to queue request:', err);
    });
    
    return new Response(JSON.stringify({
      error: 'Offline',
      message: 'Request queued for retry when online',
      queued: true
    }), {
      status: 202,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Queue requests for retry
async function queueRequestForRetry(request) {
  try {
    const requestData = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };
    
    // Store in IndexedDB for persistence
    await storeQueuedRequest(requestData);
    
    // Notify client about queued request
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'REQUEST_QUEUED',
          data: requestData
        });
      });
    });
  } catch (error) {
    console.error('Failed to queue request:', error);
  }
}

// Store queued request in IndexedDB
async function storeQueuedRequest(requestData) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('Care Master-offline-queue', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const addRequest = store.add(requestData);
      
      addRequest.onsuccess = () => resolve();
      addRequest.onerror = () => reject(addRequest.error);
    };
    
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('requests')) {
        const store = db.createObjectStore('requests', { keyPath: 'timestamp' });
        store.createIndex('timestamp', 'timestamp');
      }
    };
  });
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  // Never cache the service worker itself or manifest — always fetch fresh
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.json') {
    return false;
  }
  return url.pathname.startsWith('/static/') ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('googleapis');
}

function isHTMLRequest(request) {
  const accept = request.headers.get('accept');
  return accept && accept.includes('text/html');
}

// HTML network-first — always fetch fresh HTML from network.
// If offline, serve cached HTML as fallback. Never cache 503/error responses.
// This prevents stale HTML from referencing non-existent JS chunks after deploy.
async function htmlNetworkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    // Only cache successful HTML responses (200)
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone()).catch(() => {});
    }
    return networkResponse;
  } catch (error) {
    // Network failed — try cache as fallback for offline support
    const cache = await caches.open(DYNAMIC_CACHE);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // No cache available — try offline page
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) {
      return offlinePage;
    }
    return new Response('Offline', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
}

// Background sync for offline requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(processQueuedRequests());
  }
});

// Process queued requests when back online
async function processQueuedRequests() {
  try {
    const queuedRequests = await getQueuedRequests();
    
    for (const requestData of queuedRequests) {
      try {
        const request = new Request(requestData.url, {
          method: requestData.method,
          headers: requestData.headers,
          body: requestData.body
        });
        
        const response = await fetch(request);
        
        if (response.ok) {
          await removeQueuedRequest(requestData.timestamp);
          
          // Notify client about successful retry
          self.clients.matchAll().then(clients => {
            clients.forEach(client => {
              client.postMessage({
                type: 'REQUEST_RETRY_SUCCESS',
                data: requestData
              });
            });
          });
        }
      } catch (error) {
        console.error('Failed to retry request:', error);
      }
    }
  } catch (error) {
    console.error('Failed to process queued requests:', error);
  }
}

// Get queued requests from IndexedDB
async function getQueuedRequests() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('Care Master-offline-queue', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readonly');
      const store = transaction.objectStore('requests');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => resolve(getAllRequest.result);
      getAllRequest.onerror = () => reject(getAllRequest.error);
    };
  });
}

// Remove queued request from IndexedDB
async function removeQueuedRequest(timestamp) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('Care Master-offline-queue', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['requests'], 'readwrite');
      const store = transaction.objectStore('requests');
      const deleteRequest = store.delete(timestamp);
      
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
  });
}

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);
  
  const options = {
    body: event.data ? event.data.text() : 'New notification from Care Master',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open Care Master',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ],
    requireInteraction: true,
    silent: false
  };
  
  event.waitUntil(
    self.registration.showNotification('Care Master', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then((clientList) => {
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('Care Master Service Worker loaded successfully');
