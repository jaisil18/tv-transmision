import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { clientManager } from '@/utils/event-manager';
import { wsManager } from '@/utils/websocket-server';
import path from 'path';
import type { Screen } from '@/types/screen';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

// POST /api/screens/[id]/refresh
// En el POST handler, agregar más información de diagnóstico
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const content = await fs.readFile(SCREENS_FILE, 'utf-8');
    let screens: Screen[] = JSON.parse(content);
    const screenIndex = screens.findIndex((s) => s.id === id);

    if (screenIndex === -1) {
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    // Actualizamos el lastSeen de la pantalla
    screens[screenIndex] = {
      ...screens[screenIndex],
      lastSeen: Date.now()
    };

    await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));

    // Verificar si la pantalla está conectada antes de enviar
    const isConnected = clientManager.isClientConnected(id);
    console.log(`🔍 Pantalla ${id} conectada via SSE: ${isConnected}`);
    
    if (!isConnected) {
      console.warn(`⚠️ Pantalla ${id} no está conectada via SSE`);
    }

    // 1. Enviar comando via SSE a la pantalla específica
    const sseSuccess = clientManager.sendCommand(id, {
      type: 'refresh',
      timestamp: Date.now(),
      source: 'admin-refresh',
      forced: true // Agregar flag para forzar actualización
    });

    // 2. Enviar notificación via WebSocket a todos los clientes (admin y pantallas)
    const wsNotified = wsManager.notifyContentUpdate(id);

    // 3. Notificar específicamente a clientes admin via WebSocket
    const adminMessage = {
      type: 'screen-refreshed',
      screenId: id,
      screenName: screens[screenIndex].name,
      timestamp: Date.now(),
      success: sseSuccess
    };

    // Enviar a todos los clientes admin conectados
    let adminNotified = 0;
    const wsStats = wsManager.getStats();
    if (wsStats.admins > 0) {
      // Usar el método interno para enviar a admins específicamente
      adminNotified = wsManager.notifyAdminRefresh(adminMessage);
    }

    console.log(`🔄 Comando refresh enviado a pantalla ${id}:`);
    console.log(`  - SSE: ${sseSuccess ? 'exitoso' : 'fallido'}`);
    console.log(`  - WebSocket pantallas: ${wsNotified} notificadas`);
    console.log(`  - WebSocket admins: ${adminNotified} notificados`);

    return NextResponse.json({
      ...screens[screenIndex],
      refreshSent: sseSuccess,
      isConnected: isConnected,
      wsNotified: wsNotified,
      adminNotified: adminNotified,
      message: isConnected 
        ? (sseSuccess ? 'Actualización enviada exitosamente' : 'Error al enviar comando')
        : 'Pantalla no conectada - comando no enviado',
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error al refrescar la pantalla:', error);
    return NextResponse.json(
      { error: 'Error al refrescar la pantalla' },
      { status: 500 }
    );
  }
}
