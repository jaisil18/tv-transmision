import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import { clientManager } from '@/utils/event-manager';
import { wsManager } from '@/utils/websocket-server';
import path from 'path';
import type { Screen } from '@/types/screen';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

// POST /api/screens/[id]/refresh-content - Refrescar contenido específico de una pantalla
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verificar que la pantalla existe
    const content = await fs.readFile(SCREENS_FILE, 'utf-8');
    let screens: Screen[] = JSON.parse(content);
    const screenIndex = screens.findIndex((s) => s.id === id);
    
    if (screenIndex === -1) {
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    const screen = screens[screenIndex];
    
    // Actualizar lastSeen de la pantalla
    screens[screenIndex] = {
      ...screen,
      lastSeen: Date.now()
    };
    
    await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));

    // Verificar si la pantalla está conectada
    const isConnected = clientManager.isClientConnected(id);
    
    let refreshSent = false;
    let wsNotified = false;
    
    if (isConnected) {
      // Enviar comando de actualización de contenido vía SSE
      try {
        clientManager.sendCommand(id, {
          type: 'refresh-content',
          timestamp: Date.now(),
          message: 'Actualizando contenido...'
        });
        refreshSent = true;
        console.log(`🔄 [Refresh Content] Comando enviado a pantalla ${id} vía SSE`);
      } catch (error) {
        console.error(`❌ [Refresh Content] Error enviando comando SSE a ${id}:`, error);
      }
    }
    
    // Notificar vía WebSocket a interfaces de administración
    try {
      wsManager.notifyContentUpdate();
      wsNotified = true;
      console.log(`📡 [Refresh Content] Notificación WebSocket enviada`);
    } catch (error) {
      console.error(`❌ [Refresh Content] Error enviando WebSocket:`, error);
    }

    const message = isConnected 
      ? `Contenido actualizado para "${screen.name}"` 
      : `Pantalla "${screen.name}" no está conectada - comando no enviado`;

    console.log(`🔄 [Refresh Content] ${message}`);

    return NextResponse.json({
      success: true,
      message,
      screenId: id,
      screenName: screen.name,
      isConnected,
      refreshSent,
      wsNotified,
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('Error al refrescar contenido:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}