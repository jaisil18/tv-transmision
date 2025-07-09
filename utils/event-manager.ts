import { ReadableStreamDefaultController } from 'stream/web';

interface Client {
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  // Agregar información del dispositivo
  deviceInfo?: {
    userAgent: string;
    ipAddress: string;
    connectionTime: string;
    lastSeen: number;
  };
}

class ClientManager {
  private clients: Map<string, Client>;

  constructor() {
    this.clients = new Map();
  }

  addClient(screenId: string, controller: ReadableStreamDefaultController, request?: Request) {
    const encoder = new TextEncoder();
    
    // Capturar información del dispositivo desde headers
    let deviceInfo = undefined;
    if (request) {
      const userAgent = request.headers.get('user-agent') || '';
      const xForwardedFor = request.headers.get('x-forwarded-for');
      const xRealIp = request.headers.get('x-real-ip');
      
      let clientIp = 'unknown';
      if (xForwardedFor) {
        clientIp = xForwardedFor.split(',')[0].trim();
      } else if (xRealIp) {
        clientIp = xRealIp;
      }
      
      deviceInfo = {
        userAgent,
        ipAddress: clientIp,
        connectionTime: new Date().toISOString(),
        lastSeen: Date.now()
      };
    }
    
    this.clients.set(screenId, { controller, encoder, deviceInfo });
  }

  // Método para obtener información de dispositivos conectados
  getConnectedDevicesInfo(): Array<{screenId: string, deviceInfo?: any}> {
    return Array.from(this.clients.entries()).map(([screenId, client]) => ({
      screenId,
      deviceInfo: client.deviceInfo
    }));
  }

  removeClient(screenId: string) {
    this.clients.delete(screenId);
    // console.log(`Cliente desconectado: ${screenId}. Total: ${this.clients.size}`);
  }

  sendCommand(screenId: string, command: object) {
    const client = this.clients.get(screenId);
    if (client) {
      try {
        const message = `data: ${JSON.stringify(command)}\n\n`;
        client.controller.enqueue(client.encoder.encode(message));
        console.log(`✅ Comando enviado a ${screenId}:`, command);
        return true;
      } catch (error) {
        console.error(`❌ Error al enviar comando a ${screenId}:`, error);
        this.removeClient(screenId);
        return false;
      }
    }
    console.warn(`⚠️ Intento de enviar comando a cliente no conectado: ${screenId}. Clientes conectados: ${Array.from(this.clients.keys()).join(', ')}`);
    return false;
  }

  // Método para obtener clientes conectados
  getConnectedClients(): string[] {
    return Array.from(this.clients.keys());
  }

  // Método para verificar si un cliente está conectado
  isClientConnected(screenId: string): boolean {
    return this.clients.has(screenId);
  }
}

// Hacemos que el manager sea resistente a Hot Module Reloading en desarrollo
declare global {
  var clientManager: ClientManager | undefined;
}

export const clientManager = global.clientManager || new ClientManager();

if (process.env.NODE_ENV !== 'production') {
  global.clientManager = clientManager;
}