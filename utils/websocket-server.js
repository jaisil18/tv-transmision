const { WebSocketServer, WebSocket } = require('ws');
const { parse } = require('url');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Map();
    this.isInitialized = false;
  }

  initialize(server) {
    if (this.isInitialized) return;

    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws, request) => {
      const url = parse(request.url || '', true);
      const clientType = url.query.type;
      const screenId = url.query.screenId;
      
      const clientInfo = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        type: (clientType === 'admin' ? 'admin' : 'screen'),
        screenId: screenId || undefined,
        lastSeen: Date.now()
      };

      this.clients.set(ws, clientInfo);
      
      console.log(`🔌 [WebSocket] Cliente conectado: ${clientInfo.type}${clientInfo.screenId ? ` (pantalla: ${clientInfo.screenId})` : ''}`);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('🔌 [WebSocket] Error al procesar mensaje:', error);
        }
      });

      ws.on('close', () => {
        const clientInfo = this.clients.get(ws);
        if (clientInfo) {
          console.log(`🔌 [WebSocket] Cliente desconectado: ${clientInfo.type}${clientInfo.screenId ? ` (pantalla: ${clientInfo.screenId})` : ''}`);
        }
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('🔌 [WebSocket] Error de conexión:', error);
        this.clients.delete(ws);
      });

      // Enviar mensaje de bienvenida
      this.sendToClient(ws, {
        type: 'connected',
        clientId: clientInfo.id,
        timestamp: Date.now()
      });
    });

    this.isInitialized = true;
    console.log('🔌 [WebSocket] Servidor WebSocket inicializado');
  }

  handleMessage(ws, data) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    clientInfo.lastSeen = Date.now();

    switch (data.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
      case 'screen-status':
        this.broadcastToAdmins({
          type: 'screen-status-update',
          screenId: clientInfo.screenId,
          status: data.status,
          timestamp: Date.now()
        });
        break;
      default:
        console.log(`🔌 [WebSocket] Mensaje no manejado: ${data.type}`);
    }
  }

  sendToClient(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  broadcastToScreens(message, excludeScreenId = null) {
    let sentCount = 0;
    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.type === 'screen' && clientInfo.screenId !== excludeScreenId) {
        this.sendToClient(ws, message);
        sentCount++;
      }
    });
    return sentCount;
  }

  broadcastToAdmins(message) {
    let sentCount = 0;
    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.type === 'admin') {
        this.sendToClient(ws, message);
        sentCount++;
      }
    });
    return sentCount;
  }

  notifyScreenRefresh(screenId, screenName) {
    const message = {
      type: 'refresh',
      screenId,
      timestamp: Date.now()
    };

    let notifiedScreens = 0;
    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.type === 'screen' && clientInfo.screenId === screenId) {
        this.sendToClient(ws, message);
        notifiedScreens++;
      }
    });

    // Notificar a admins sobre el refresh
    const adminMessage = {
      type: 'screen-refreshed',
      screenId,
      screenName,
      timestamp: Date.now()
    };

    this.broadcastToAdmins(adminMessage);

    return { notifiedScreens, notifiedAdmins: this.getAdminCount() };
  }

  notifyContentUpdate(message) {
    const updateMessage = {
      type: 'content-updated',
      ...message,
      timestamp: Date.now()
    };

    const screenCount = this.broadcastToScreens(updateMessage);
    const adminCount = this.broadcastToAdmins(updateMessage);

    return { screenCount, adminCount };
  }

  notifyAdminRefresh(message) {
    let notifiedAdmins = 0;

    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.type === 'admin') {
        this.sendToClient(ws, {
          type: 'admin-refresh',
          ...message,
          timestamp: Date.now()
        });
        notifiedAdmins++;
      }
    });

    return notifiedAdmins;
  }

  getStats() {
    const screens = Array.from(this.clients.values()).filter(c => c.type === 'screen');
    const admins = Array.from(this.clients.values()).filter(c => c.type === 'admin');

    return {
      total: this.clients.size,
      screens: screens.length,
      admins: admins.length,
      screenIds: screens.map(s => s.screenId).filter(Boolean)
    };
  }

  getAdminCount() {
    return Array.from(this.clients.values()).filter(c => c.type === 'admin').length;
  }

  isClientConnected(screenId) {
    return Array.from(this.clients.values()).some(
      client => client.type === 'screen' && client.screenId === screenId
    );
  }
}

// Singleton instance
const wsManager = new WebSocketManager();
module.exports = { wsManager };