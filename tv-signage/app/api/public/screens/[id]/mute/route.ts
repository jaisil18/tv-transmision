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

// GET /api/public/screens/[id]/mute - Obtener estado de mute (público para pantallas)
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

    console.log(`🔇 [Public] Estado de mute para pantalla ${id}: ${muteStatus} (valor original: ${screen.muted})`);

    return NextResponse.json({
      muted: muteStatus,
      screenId: screen.id,
      screenName: screen.name
    });
  } catch (error) {
    console.error('Error al obtener estado de mute público:', error);
    return NextResponse.json(
      { error: 'Error al obtener el estado de audio' },
      { status: 500 }
    );
  }
}
