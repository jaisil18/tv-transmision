import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Screen } from '@/types/screen';
import { clientManager } from '@/utils/event-manager';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

async function getScreens(): Promise<Screen[]> {
  const content = await fs.readFile(SCREENS_FILE, 'utf-8');
  return JSON.parse(content);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const screens = await getScreens();
    const index = screens.findIndex((s) => s.id === id);

    if (index === -1) {
      return NextResponse.json({ error: 'Pantalla no encontrada' }, { status: 404 });
    }

    screens[index].isRepeating = !screens[index].isRepeating;

    await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));

    // Enviar comando SSE para notificar el cambio
    const success = clientManager.sendCommand(id, {
      type: 'repeat',
      isRepeating: screens[index].isRepeating
    });

    console.log(`Comando repeat enviado a ${id}:`, success ? 'exitoso' : 'fallido');

    return NextResponse.json(screens[index]);
  } catch (error) {
    console.error('Error al cambiar el estado de repetición:', error);
    return NextResponse.json({ error: 'Error al cambiar el estado de repetición' }, { status: 500 });
  }
}