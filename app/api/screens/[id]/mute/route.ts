import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Screen } from '@/types/screen';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

async function getScreens(): Promise<Screen[]> {
  const content = await fs.readFile(SCREENS_FILE, 'utf-8');
  try {
    const screens = JSON.parse(content);
    return Array.isArray(screens) ? screens : [];
  } catch {
    return [];
  }
}

async function saveScreens(screens: Screen[]): Promise<void> {
  await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));
}

// POST /api/screens/[id]/mute - Toggle mute de una pantalla
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const { muted } = await request.json();
    const screens = await getScreens();
    const index = screens.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar el estado de mute
    const currentMuted = screens[index].muted !== false; // Por defecto true
    const newMuted = muted !== undefined ? muted : !currentMuted;

    const updatedScreen = {
      ...screens[index],
      muted: newMuted,
      lastSeen: Date.now()
    };

    console.log(`🔇 Cambiando mute pantalla ${id}: ${currentMuted} → ${newMuted}`);
    
    screens[index] = updatedScreen;
    await saveScreens(screens);

    // Enviar comando de mute a la pantalla usando clientManager
    try {
      const { clientManager } = await import('@/utils/event-manager');
      const success = clientManager.sendCommand(id, {
        type: 'mute',
        muted: newMuted,
        timestamp: Date.now()
      });
      console.log(`🔇 Comando mute enviado a ${id}: ${success ? 'exitoso' : 'fallido'} - ${newMuted ? 'silenciado' : 'audio activado'}`);
    } catch (error) {
      console.log('⚠️ Error al enviar comando mute:', error);
    }

    return NextResponse.json({
      success: true,
      screen: updatedScreen,
      message: updatedScreen.muted ? 'Pantalla silenciada' : 'Audio activado'
    });
  } catch (error) {
    console.error('Error al cambiar mute de pantalla:', error);
    return NextResponse.json(
      { error: 'Error al cambiar el estado de audio' },
      { status: 500 }
    );
  }
}

// GET /api/screens/[id]/mute - Obtener estado de mute
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const screens = await getScreens();
    const screen = screens.find((s) => s.id === id);

    if (!screen) {
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    // Por defecto las pantallas están en mute (true), solo false si explícitamente se establece
    const muteStatus = screen.muted !== false;

    console.log(`🔇 Estado de mute para pantalla ${id}: ${muteStatus} (valor original: ${screen.muted})`);

    return NextResponse.json({
      muted: muteStatus,
      screenId: screen.id,
      screenName: screen.name
    });
  } catch (error) {
    console.error('Error al obtener estado de mute:', error);
    return NextResponse.json(
      { error: 'Error al obtener el estado de audio' },
      { status: 500 }
    );
  }
}
