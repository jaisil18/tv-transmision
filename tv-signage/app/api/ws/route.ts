import { NextRequest } from 'next/server';
import { wsManager } from '@/utils/websocket-server';

export async function GET(request: NextRequest) {
  // Esta ruta es solo para inicializar el WebSocket server
  // El WebSocket real se maneja en el servidor HTTP
  
  const stats = wsManager.getStats();
  
  return Response.json({
    message: 'WebSocket server status',
    stats,
    timestamp: Date.now()
  });
}

// WebSocket se maneja en el servidor HTTP personalizado
