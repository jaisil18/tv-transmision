// Sistema de auto-refresh simple usando localStorage y polling
// Esta es una solución temporal hasta implementar WebSocket completamente

interface RefreshEvent {
  type: 'content-updated' | 'files-uploaded' | 'playlist-updated';
  timestamp: number;
  data?: any;
}

class AutoRefreshManager {
  private static instance: AutoRefreshManager;
  private lastCheck: number = 0;
  private checkInterval: NodeJS.Timeout | null = null;

  static getInstance(): AutoRefreshManager {
    if (!AutoRefreshManager.instance) {
      AutoRefreshManager.instance = new AutoRefreshManager();
    }
    return AutoRefreshManager.instance;
  }

  // Notificar que hay contenido nuevo (llamado desde el servidor)
  static notifyContentUpdate(type: RefreshEvent['type'], data?: any) {
    if (typeof window === 'undefined') {
      // Estamos en el servidor, guardar en un archivo temporal
      const fs = require('fs');
      const path = require('path');
      
      const refreshFile = path.join(process.cwd(), 'data', 'refresh-events.json');
      
      try {
        let events: RefreshEvent[] = [];
        
        // Leer eventos existentes
        try {
          const existingData = fs.readFileSync(refreshFile, 'utf8');
          events = JSON.parse(existingData);
        } catch (error) {
          // Archivo no existe o está corrupto, crear nuevo
          events = [];
        }

        // Agregar nuevo evento
        const newEvent: RefreshEvent = {
          type,
          timestamp: Date.now(),
          data
        };

        events.push(newEvent);

        // Mantener solo los últimos 10 eventos
        if (events.length > 10) {
          events = events.slice(-10);
        }

        // Crear directorio si no existe
        const dir = path.dirname(refreshFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        // Guardar eventos
        fs.writeFileSync(refreshFile, JSON.stringify(events, null, 2));
        
        console.log(`📢 [AutoRefresh] Evento guardado: ${type}`);
      } catch (error) {
        console.error('❌ [AutoRefresh] Error guardando evento:', error);
      }
    }
  }

  // Iniciar el polling para verificar actualizaciones (llamado desde el cliente)
  startPolling(callback: (event: RefreshEvent) => void) {
    if (typeof window === 'undefined') return;

    this.lastCheck = Date.now();
    
    this.checkInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/refresh-events');
        if (response.ok) {
          const events: RefreshEvent[] = await response.json();
          
          // Verificar si hay eventos nuevos desde la última verificación
          const newEvents = events.filter(event => event.timestamp > this.lastCheck);
          
          if (newEvents.length > 0) {
            console.log(`🔄 [AutoRefresh] ${newEvents.length} eventos nuevos encontrados`);
            
            // Procesar cada evento nuevo
            newEvents.forEach(event => {
              console.log(`📢 [AutoRefresh] Procesando evento: ${event.type}`);
              callback(event);
            });
            
            // Actualizar timestamp de última verificación
            this.lastCheck = Math.max(...newEvents.map(e => e.timestamp));
          }
        }
      } catch (error) {
        console.error('❌ [AutoRefresh] Error verificando eventos:', error);
      }
    }, 60000); // Verificar cada 60 segundos (reducido para optimizar)

    console.log('✅ [AutoRefresh] Polling iniciado');
  }

  // Detener el polling
  stopPolling() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      console.log('🛑 [AutoRefresh] Polling detenido');
    }
  }
}

export default AutoRefreshManager;
