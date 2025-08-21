import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';

interface ClientInfo {
  id: string;
  type: 'screen' | 'admin';
  screenId?: string;
  lastSeen: number;
}

class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private isInitialized = false;

  initialize(server: any) {
    if (this.isInitialized) return;

    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocket, request: IncomingMessage) => {
      const url = parse(request.url || '', true);
      const clientType = url.query.type as string;
      const screenId = url.query.screenId as string;
      
      const clientInfo: ClientInfo = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        type: (clientType === 'admin' ? 'admin' : 'screen') as 'screen' | 'admin',
        screenId: screenId || undefined,
        lastSeen: Date.now()
      };

      this.clients.set(ws, clientInfo);
      
      // console.log(`🔌 [WebSocket] Cliente conectado: ${clientInfo.type}${clientInfo.screenId ? ` (pantalla: ${clientInfo.screenId})` : ''}`);
      // console.log(`📊 [WebSocket] Clientes conectados: ${this.clients.size}`);

      // Enviar mensaje de bienvenida
      this.sendToClient(ws, {
        type: 'connected',
        clientId: clientInfo.id,
        timestamp: Date.now()
      });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ [WebSocket] Error parsing message:', error);
        }
      });

      ws.on('close', () => {
        // console.log(`🔌 [WebSocket] Cliente desconectado: ${clientInfo.type}${clientInfo.screenId ? ` (pantalla: ${clientInfo.screenId})` : ''}`);
        this.clients.delete(ws);
        // console.log(`📊 [WebSocket] Clientes conectados: ${this.clients.size}`);
      });

      ws.on('error', (error) => {
        console.error('❌ [WebSocket] Error:', error);
        this.clients.delete(ws);
      });

      // Ping periódico para mantener conexión
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
          clientInfo.lastSeen = Date.now();
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    });

    this.isInitialized = true;
    console.log('✅ [WebSocket] Servidor WebSocket inicializado');
  }

  private handleMessage(ws: WebSocket, message: any) {
    const clientInfo = this.clients.get(ws);
    if (!clientInfo) return;

    // console.log(`📨 [WebSocket] Mensaje de ${clientInfo.type}:`, message.type);

    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', timestamp: Date.now() });
        break;
      
      case 'heartbeat':
        clientInfo.lastSeen = Date.now();
        break;
    }
  }

  private sendToClient(ws: WebSocket, message: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Notificar a todas las pantallas que hay contenido nuevo
  notifyContentUpdate(screenId?: string) {
    const message = {
      type: 'content-updated',
      screenId,
      timestamp: Date.now(),
      action: 'refresh-content'
    };

    let notifiedClients = 0;

    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.type === 'screen') {
        // Si se especifica screenId, solo notificar a esa pantalla
        if (!screenId || clientInfo.screenId === screenId) {
          this.sendToClient(ws, message);
          notifiedClients++;
        }
      }
    });

    // console.log(`📢 [WebSocket] Notificación de contenido actualizado enviada a ${notifiedClients} pantallas`);
    return notifiedClients;
  }

  // Notificar que se subieron nuevos archivos
  notifyFileUploaded(files: string[]) {
    const message = {
      type: 'files-uploaded',
      files,
      timestamp: Date.now(),
      action: 'refresh-content'
    };

    let notifiedClients = 0;

    this.clients.forEach((clientInfo, ws) => {
      this.sendToClient(ws, message);
      notifiedClients++;
    });

    // console.log(`📢 [WebSocket] Notificación de archivos subidos enviada a ${notifiedClients} clientes`);
    return notifiedClients;
  }

  // Notificar cambios en playlists
  notifyPlaylistUpdate(playlistId: string, affectedScreens: string[]) {
    const message = {
      type: 'playlist-updated',
      playlistId,
      affectedScreens,
      timestamp: Date.now(),
      action: 'refresh-content'
    };

    let notifiedClients = 0;

    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.type === 'screen' && clientInfo.screenId) {
        // Solo notificar a pantallas afectadas
        if (affectedScreens.includes(clientInfo.screenId)) {
          this.sendToClient(ws, message);
          notifiedClients++;
        }
      } else if (clientInfo.type === 'admin') {
        // Notificar a todos los admins
        this.sendToClient(ws, message);
        notifiedClients++;
      }
    });

    // console.log(`📢 [WebSocket] Notificación de playlist actualizada enviada a ${notifiedClients} clientes`);
    return notifiedClients;
  }

  // Notificar específicamente a clientes admin sobre refresh de pantalla
  notifyAdminRefresh(message: any) {
    let notifiedAdmins = 0;

    this.clients.forEach((clientInfo, ws) => {
      if (clientInfo.type === 'admin') {
        this.sendToClient(ws, message);
        notifiedAdmins++;
      }
    });

    console.log(`📢 [WebSocket] Notificación de refresh enviada a ${notifiedAdmins} admins`);
    return notifiedAdmins;
  }

  // Obtener estadísticas de clientes conectados
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
}

// Singleton instance
export const wsManager = new WebSocketManager();
export default wsManager;
