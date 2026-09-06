/**
 * Simple SSE (Server-Sent Events) manager for real-time updates.
 *
 * Keeps a registry of authenticated client connections keyed by user and
 * institution. Call/message write paths can broadcast events so the frontend
 * can refresh data without polling.
 *
 * NOTE: This is a single-server in-memory registry. If you scale to multiple
 * backend processes, replace this with Redis Pub/Sub or a message broker.
 */

class SSEManager {
  constructor() {
    this.clients = new Map();
  }

  addClient(userId, institutionId, res) {
    if (!userId) return null;

    const client = {
      id: `${userId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      userId,
      institutionId,
      res,
      heartbeat: null,
    };

    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Map());
    }
    this.clients.get(userId).set(client.id, client);

    // Send initial connection ack
    this.send(client, { type: 'connected', userId });

    // Heartbeat to keep connection alive through proxies/load balancers
    client.heartbeat = setInterval(() => {
      this.sendRaw(client.res, ':heartbeat\n\n');
    }, 30000);

    res.on('close', () => this.removeClient(userId, client.id));
    res.on('error', () => this.removeClient(userId, client.id));

    return client;
  }

  removeClient(userId, clientId) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;
    const client = userClients.get(clientId);
    if (client) {
      if (client.heartbeat) clearInterval(client.heartbeat);
      try {
        client.res.end();
      } catch (e) {
        // already closed
      }
      userClients.delete(clientId);
    }
    if (userClients.size === 0) {
      this.clients.delete(userId);
    }
  }

  send(client, payload) {
    try {
      client.res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch (e) {
      this.removeClient(client.userId, client.id);
    }
  }

  sendRaw(res, data) {
    try {
      res.write(data);
    } catch (e) {
      // ignore
    }
  }

  toUser(userId, payload) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;
    for (const client of userClients.values()) {
      this.send(client, payload);
    }
  }

  toInstitution(institutionId, payload) {
    if (!institutionId) return;
    for (const userClients of this.clients.values()) {
      for (const client of userClients.values()) {
        if (client.institutionId === institutionId) {
          this.send(client, payload);
        }
      }
    }
  }

  // Broadcast an event to users interested in a given table.
  // If known, target specific userIds; otherwise fall back to institution.
  emitTableEvent(tableName, payload, { userIds = [], institutionId = null } = {}) {
    const event = { type: 'table-change', table: tableName, payload };
    const seen = new Set();
    for (const uid of userIds) {
      if (uid && !seen.has(uid)) {
        seen.add(uid);
        this.toUser(uid, event);
      }
    }
    if (institutionId) {
      this.toInstitution(institutionId, event);
    }
  }
}

module.exports = new SSEManager();
