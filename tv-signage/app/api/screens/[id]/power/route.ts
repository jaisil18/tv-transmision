import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Screen } from '@/types/screen';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

// POST /api/screens/[id]/power
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { action } = await request.json();
    
    if (!action || (action !== 'on' && action !== 'off')) {
      return NextResponse.json(
        { error: 'Acción inválida' },
        { status: 400 }
      );
    }

    const content = await fs.readFile(SCREENS_FILE, 'utf-8');
    let screens: Screen[] = JSON.parse(content);
    const screenIndex = screens.findIndex((s) => s.id === id);

    if (screenIndex === -1) {
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    // Actualizamos el estado de la pantalla
    screens[screenIndex] = {
      ...screens[screenIndex],
      status: action === 'on' ? 'active' : 'inactive',
      lastSeen: Date.now(),
      currentContent: action === 'off' ? undefined : screens[screenIndex].currentContent
    };

    await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));
    return NextResponse.json(screens[screenIndex]);
  } catch (error) {
    console.error('Error al cambiar el estado de la pantalla:', error);
    return NextResponse.json(
      { error: 'Error al cambiar el estado de la pantalla' },
      { status: 500 }
    );
  }
}
