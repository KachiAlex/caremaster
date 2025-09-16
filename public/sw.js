// ElderX Service Worker for PWA functionality
const CACHE_NAME = 'elderx-v1.0.0';
const STATIC_CACHE = 'elderx-static-v1';
const DYNAMIC_CACHE = 'elderx-dynamic-v1';
const API_CACHE = 'elderx-api-v1';

// Assets to cache on install (avoid hashed filenames that change per build)
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
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

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => {
        console.log('Caching static assets...');
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(API_CACHE).then((cache) => {
        console.log('API cache ready...');
        return cache;
      })
    ]).then(() => {
      console.log('Service Worker installed successfully');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && 
              cacheName !== DYNAMIC_CACHE && 
              cacheName !== API_CACHE) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker activated');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle different types of requests
  if (request.method === 'GET') {
    // Static assets - cache first strategy
    if (isStaticAsset(request)) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
    }
    // API requests - network first with fallback
    else if (isAPIRequest(request)) {
      event.respondWith(networkFirstWithFallback(request, API_CACHE));
    }
    // HTML pages - network first with fallback
    else if (isHTMLRequest(request)) {
      event.respondWith(networkFirstWithFallback(request, DYNAMIC_CACHE));
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
    
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    return new Response('Offline content not available', { status: 503 });
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
    console.error('Network request failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

// Handle API requests with offline queue
async function handleAPIRequest(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    console.error('API request failed:', error);
    
    // Queue request for retry when online
    await queueRequestForRetry(request);
    
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
    const request = indexedDB.open('elderx-offline-queue', 1);
    
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
  return url.pathname.startsWith('/static/') ||
         url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') ||
         url.hostname.includes('firebase') ||
         url.hostname.includes('googleapis');
}

function isHTMLRequest(request) {
  return request.headers.get('accept').includes('text/html');
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
    const request = indexedDB.open('elderx-offline-queue', 1);
    
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
    const request = indexedDB.open('elderx-offline-queue', 1);
    
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
    body: event.data ? event.data.text() : 'New notification from ElderX',
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
        title: 'Open ElderX',
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
    self.registration.showNotification('ElderX', options)
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

console.log('ElderX Service Worker loaded successfully');
