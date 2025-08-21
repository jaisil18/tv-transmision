import { NextResponse } from 'next/server';
import { wsManager } from '@/utils/websocket-server';
import { clientManager } from '@/utils/event-manager';

// POST /api/screens/[id]/broadcast-refresh
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { source = 'tv-app' } = body;

    console.log(`🔄 [Broadcast] Señal de actualización desde ${source} para pantalla ${id}`);

    // 1. Notificar a TODAS las pantallas (incluyendo otras TVs)
    const allScreensNotified = wsManager.notifyContentUpdate();

    // 2. Enviar comando SSE a todas las pantallas conectadas
    const connectedClients = clientManager.getConnectedClients();
    let sseNotified = 0;
    
    connectedClients.forEach(screenId => {
      const success = clientManager.sendCommand(screenId, {
        type: 'refresh',
        timestamp: Date.now(),
        source: source,
        triggeredBy: id
      });
      if (success) sseNotified++;
    });

    // 3. Notificar específicamente a todos los admins
    const adminMessage = {
      type: 'screen-broadcast-refresh',
      sourceScreenId: id,
      source: source,
      timestamp: Date.now(),
      affectedScreens: connectedClients.length
    };

    const adminNotified = wsManager.notifyAdminRefresh(adminMessage);

    console.log(`📢 [Broadcast] Actualización enviada:`);
    console.log(`  - WebSocket pantallas: ${allScreensNotified}`);
    console.log(`  - SSE pantallas: ${sseNotified}/${connectedClients.length}`);
    console.log(`  - WebSocket admins: ${adminNotified}`);

    return NextResponse.json({
      success: true,
      sourceScreen: id,
      wsNotified: allScreensNotified,
      sseNotified: sseNotified,
      adminNotified: adminNotified,
      totalClients: connectedClients.length,
      message: `Actualización broadcast enviada a ${allScreensNotified + sseNotified} clientes`,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error en broadcast refresh:', error);
    return NextResponse.json(
      { error: 'Error al enviar broadcast refresh' },
      { status: 500 }
    );
  }
}