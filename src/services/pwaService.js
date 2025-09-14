// PWA Service for ElderX
import { toast } from 'react-toastify';

class PWAService {
  constructor() {
    this.isInstalled = false;
    this.deferredPrompt = null;
    this.isOnline = navigator.onLine;
    this.swRegistration = null;
    
    this.init();
  }

  async init() {
    await this.registerServiceWorker();
    this.setupInstallPrompt();
    this.setupOnlineOfflineListeners();
    this.setupUpdateNotifications();
  }

  // Service Worker Registration
  async registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      try {
        this.swRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', this.swRegistration);
        
        // Handle service worker updates
        this.swRegistration.addEventListener('updatefound', () => {
          const newWorker = this.swRegistration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this.showUpdateNotification();
            }
          });
        });
        
        // Handle messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          this.handleServiceWorkerMessage(event.data);
        });
        
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
  }

  // Install Prompt Setup
  setupInstallPrompt() {
    window.addEventListener('beforeinstallprompt', (event) => {
      console.log('PWA install prompt triggered');
      event.preventDefault();
      this.deferredPrompt = event;
      this.showInstallPrompt();
    });

    window.addEventListener('appinstalled', () => {
      console.log('PWA installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
      toast.success('ElderX has been installed successfully!');
    });
  }

  // Show Install Prompt
  showInstallPrompt() {
    if (this.deferredPrompt && !this.isInstalled) {
      const installButton = document.createElement('button');
      installButton.textContent = 'Install ElderX';
      installButton.className = 'pwa-install-button';
      installButton.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #3b82f6;
        color: white;
        border: none;
        padding: 12px 20px;
        border-radius: 25px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        z-index: 1000;
        animation: slideInUp 0.3s ease-out;
      `;
      
      installButton.addEventListener('click', () => {
        this.installPWA();
        installButton.remove();
      });
      
      document.body.appendChild(installButton);
      
      // Auto-hide after 10 seconds
      setTimeout(() => {
        if (installButton.parentNode) {
          installButton.remove();
        }
      }, 10000);
    }
  }

  // Install PWA
  async installPWA() {
    if (this.deferredPrompt) {
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('User accepted PWA install');
      } else {
        console.log('User dismissed PWA install');
      }
      
      this.deferredPrompt = null;
    }
  }

  // Online/Offline Listeners
  setupOnlineOfflineListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.handleOnline();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.handleOffline();
    });
  }

  // Handle Online Status
  handleOnline() {
    console.log('Connection restored');
    toast.success('Connection restored! Syncing data...');
    
    // Notify service worker to process queued requests
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CONNECTION_RESTORED'
      });
    }
    
    // Sync offline data
    this.syncOfflineData();
  }

  // Handle Offline Status
  handleOffline() {
    console.log('Connection lost');
    toast.info('You\'re now offline. Some features may be limited.');
  }

  // Service Worker Update Notifications
  setupUpdateNotifications() {
    if (this.swRegistration) {
      this.swRegistration.addEventListener('updatefound', () => {
        const newWorker = this.swRegistration.installing;
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            this.showUpdateNotification();
          }
        });
      });
    }
  }

  // Show Update Notification
  showUpdateNotification() {
    const updateNotification = document.createElement('div');
    updateNotification.className = 'pwa-update-notification';
    updateNotification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
        z-index: 1000;
        max-width: 300px;
        animation: slideInRight 0.3s ease-out;
      ">
        <h4 style="margin: 0 0 8px 0; color: #1f2937; font-size: 14px; font-weight: 600;">
          Update Available
        </h4>
        <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px; line-height: 1.4;">
          A new version of ElderX is available. Refresh to update.
        </p>
        <div style="display: flex; gap: 8px;">
          <button id="update-now" style="
            background: #3b82f6;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            font-weight: 500;
          ">Update Now</button>
          <button id="update-later" style="
            background: #f3f4f6;
            color: #6b7280;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
          ">Later</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(updateNotification);
    
    // Add event listeners
    document.getElementById('update-now').addEventListener('click', () => {
      this.updateApp();
      updateNotification.remove();
    });
    
    document.getElementById('update-later').addEventListener('click', () => {
      updateNotification.remove();
    });
    
    // Auto-hide after 15 seconds
    setTimeout(() => {
      if (updateNotification.parentNode) {
        updateNotification.remove();
      }
    }, 15000);
  }

  // Update App
  async updateApp() {
    if (this.swRegistration && this.swRegistration.waiting) {
      this.swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }

  // Sync Offline Data
  async syncOfflineData() {
    try {
      // Process any queued requests
      const queuedRequests = await this.getQueuedRequests();
      
      for (const request of queuedRequests) {
        try {
          await this.retryRequest(request);
          await this.removeQueuedRequest(request.id);
        } catch (error) {
          console.error('Failed to sync request:', error);
        }
      }
      
      if (queuedRequests.length > 0) {
        toast.success(`${queuedRequests.length} offline actions synced successfully!`);
      }
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }

  // Get Queued Requests
  async getQueuedRequests() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('elderx-offline-queue', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onsuccess = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('requests')) {
          resolve([]);
          return;
        }
        
        const transaction = db.transaction(['requests'], 'readonly');
        const store = transaction.objectStore('requests');
        const getAllRequest = store.getAll();
        
        getAllRequest.onsuccess = () => resolve(getAllRequest.result);
        getAllRequest.onerror = () => reject(getAllRequest.error);
      };
      
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('requests')) {
          db.createObjectStore('requests', { keyPath: 'timestamp' });
        }
      };
    });
  }

  // Retry Request
  async retryRequest(requestData) {
    const response = await fetch(requestData.url, {
      method: requestData.method,
      headers: requestData.headers,
      body: requestData.body
    });
    
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }
    
    return response;
  }

  // Remove Queued Request
  async removeQueuedRequest(timestamp) {
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

  // Handle Service Worker Messages
  handleServiceWorkerMessage(data) {
    switch (data.type) {
      case 'REQUEST_QUEUED':
        toast.info('Action queued for when you\'re back online');
        break;
      case 'REQUEST_RETRY_SUCCESS':
        console.log('Queued request retried successfully');
        break;
      case 'UPDATE_AVAILABLE':
        this.showUpdateNotification();
        break;
      default:
        console.log('Unknown service worker message:', data);
    }
  }

  // Check if PWA is installed
  isPWAInstalled() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
  }

  // Get PWA Status
  getPWAStatus() {
    return {
      isInstalled: this.isPWAInstalled(),
      isOnline: this.isOnline,
      hasServiceWorker: !!this.swRegistration,
      canInstall: !!this.deferredPrompt
    };
  }

  // Request Notification Permission
  async requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }

  // Show Local Notification
  showLocalNotification(title, options = {}) {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        ...options
      });
      
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      
      return notification;
    }
  }

  // Background Sync
  async registerBackgroundSync(tag) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
    }
  }

  // Get Cache Status
  async getCacheStatus() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      const cacheStatus = {};
      
      for (const cacheName of cacheNames) {
        const cache = await caches.open(cacheName);
        const keys = await cache.keys();
        cacheStatus[cacheName] = keys.length;
      }
      
      return cacheStatus;
    }
    return {};
  }

  // Clear Cache
  async clearCache() {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      toast.success('Cache cleared successfully');
    }
  }
}

// Create singleton instance
const pwaService = new PWAService();

export default pwaService;
