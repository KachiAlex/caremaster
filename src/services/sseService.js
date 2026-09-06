/**
 * Server-Sent Events (SSE) service.
 *
 * Opens a persistent connection to /api/events and notifies registered
 * listeners when the backend reports a table change. This allows real-time
 * updates for calls, messages, and care logs without aggressive polling.
 *
 * When the connection drops it reconnects with exponential backoff.
 */

const API_BASE = () =>
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

class SSEService {
  constructor() {
    this.eventSource = null;
    this.listeners = new Map();
    this.reconnectTimeout = null;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.connected = false;
  }

  connect() {
    if (this.eventSource || !window.EventSource) return;

    const token = getToken();
    // Native clients pass the token in the query string because EventSource
    // cannot set headers; on the web the httpOnly cookie is sent automatically.
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';

    const url = `${API_BASE()}/events${tokenParam}`;
    try {
      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.onopen = () => {
        this.connected = true;
        this.reconnectDelay = 1000;
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.notify(data);
        } catch (e) {
          // Ignore malformed events
        }
      };

      this.eventSource.onerror = () => {
        this.connected = false;
        this.scheduleReconnect();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimeout) return;
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.disconnect();
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.eventSource) {
      try {
        this.eventSource.close();
      } catch (e) {
        // ignore
      }
      this.eventSource = null;
    }
    this.connected = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  /**
   * Subscribe to table-change events for a specific collection.
   * Returns an unsubscribe function.
   */
  subscribe(table, callback) {
    if (!this.listeners.has(table)) {
      this.listeners.set(table, new Set());
    }
    this.listeners.get(table).add(callback);

    if (!this.connected && !this.eventSource) {
      this.connect();
    }

    return () => {
      const set = this.listeners.get(table);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.listeners.delete(table);
      }
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  notify(data) {
    if (data.type !== 'table-change' || !data.table) return;
    const table = data.table;
    const callbacks = this.listeners.get(table);
    if (callbacks) {
      for (const cb of callbacks) {
        try {
          cb(data.payload);
        } catch (e) {
          // ignore listener errors
        }
      }
    }
  }
}

export const sseService = new SSEService();
