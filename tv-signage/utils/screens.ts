import { promises as fs } from 'fs';
import path from 'path';
import type { Screen } from '@/types/screen';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

// Función para actualizar el estado de las pantallas cuando se les asigna o quita una lista
export async function updateScreensStatus(screenIds: string[], status: 'active' | 'inactive') {
  try {
    const content = await fs.readFile(SCREENS_FILE, 'utf-8');
    let screens: Screen[] = JSON.parse(content);    // Solo actualizamos las pantallas especificadas
    screens = screens.map(screen => {
      if (screenIds.includes(screen.id)) {
        return {
          ...screen,
          status: status, // Actualizamos el estado según lo solicitado
          lastSeen: Date.now(),
          currentContent: status === 'inactive' ? undefined : screen.currentContent // Limpiamos el contenido si está inactiva
        };
      }
      return screen;
    });

    await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));
    return screens;
  } catch (error) {
    console.error('Error al actualizar el estado de las pantallas:', error);
    throw error;
  }
}
