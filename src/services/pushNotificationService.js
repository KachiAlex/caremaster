/**
 * Push Notification Service
 *
 * Handles both:
 * - Native push (Capacitor) on iOS/Android
 * - Web Push API on browsers (PWA)
 *
 * On web, subscribes the service worker to push and sends the
 * subscription to the backend for storage. The backend uses it
 * to send push notifications when high-priority notifications fire.
 */

import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import api from '../api/config';

class PushNotificationService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.webSubscription = null;
  }

  async init() {
    if (this.isNative) {
      return this.initNative();
    }
    return this.initWebPush();
  }

  // ─── Native (Capacitor) ──────────────────────────────────────────
  async initNative() {
    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // TODO: send native token to backend when FCM/APNS integration is added
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received: ' + JSON.stringify(notification));
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });
    } catch (err) {
      console.error('Push Notifications initialization error:', err);
    }
  }

  // ─── Web Push API ─────────────────────────────────────────────────
  async initWebPush() {
    try {
      // Check if service worker and push are supported
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('Web Push not supported in this browser');
        return;
      }

      // Wait for the service worker to be ready
      const registration = await navigator.serviceWorker.ready;

      // Check existing subscription
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        // Fetch the public VAPID key from the backend
        const vapidResponse = await api.get('/push/vapid-public-key');
        const publicKey = vapidResponse.data?.data?.publicKey;
        if (!publicKey) {
          console.log('VAPID public key not available — push disabled');
          return;
        }

        const applicationServerKey = this.urlBase64ToUint8Array(publicKey);

        // Request permission first
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          console.log('Notification permission denied');
          return;
        }

        // Subscribe to push
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        });
      }

      this.webSubscription = subscription;

      // Send subscription to backend
      await api.post('/push/subscribe', { subscription });
      console.log('Web Push subscription registered with backend');
    } catch (err) {
      console.error('Web Push initialization error:', err);
    }
  }

  /**
   * Unsubscribe from web push and notify the backend.
   */
  async unsubscribeWebPush() {
    try {
      if (this.webSubscription) {
        await this.webSubscription.unsubscribe();
        await api.delete('/push/unsubscribe', {
          data: { endpoint: this.webSubscription.endpoint },
        });
        this.webSubscription = null;
        console.log('Web Push subscription removed');
      }
    } catch (err) {
      console.error('Web Push unsubscribe error:', err);
    }
  }

  /**
   * Convert a base64 VAPID public key to a Uint8Array for the
   * PushManager.subscribe() call.
   */
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService;
