import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');
const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

interface SystemSettings {
  operatingHours: {
    enabled: boolean;
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
}

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  currentContent?: any;
}

async function getSettings(): Promise<SystemSettings | null> {
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getScreens(): Promise<Screen[]> {
  try {
    const content = await fs.readFile(SCREENS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function updateScreensStatus(screens: Screen[]): Promise<void> {
  await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));
}

function isInOperatingHours(settings: SystemSettings): boolean {
  if (!settings.operatingHours.enabled) return true;
  
  const now = new Date();
  const currentDay = now.getDay(); // 0 = domingo, 1 = lunes, etc.
  const currentTime = now.toTimeString().slice(0, 5); // HH:MM
  
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayKey = dayNames[currentDay] as keyof SystemSettings['operatingHours'];
  
  if (dayKey === 'enabled') return true;
  
  const daySettings = settings.operatingHours[dayKey] as { start: string; end: string; enabled: boolean };
  
  if (!daySettings.enabled) return false;
  
  return currentTime >= daySettings.start && currentTime <= daySettings.end;
}

// GET /api/system/schedule - Verificar y aplicar horarios
export async function GET() {
  try {
    const settings = await getSettings();
    if (!settings) {
      return NextResponse.json({ error: 'No se pudieron cargar las configuraciones' }, { status: 500 });
    }

    const screens = await getScreens();
    const shouldBeActive = isInOperatingHours(settings);
    
    let updatedScreens = false;
    
    // Actualizar el estado de las pantallas según el horario
    const newScreens = screens.map(screen => {
      if (shouldBeActive && screen.status === 'inactive') {
        // Activar pantallas si estamos en horario de funcionamiento
        updatedScreens = true;
        return {
          ...screen,
          status: 'active' as const,
          lastSeen: Date.now()
        };
      } else if (!shouldBeActive && screen.status === 'active') {
        // Desactivar pantallas si estamos fuera de horario
        updatedScreens = true;
        return {
          ...screen,
          status: 'inactive' as const,
          lastSeen: Date.now(),
          currentContent: undefined
        };
      }
      return screen;
    });

    if (updatedScreens) {
      await updateScreensStatus(newScreens);
    }

    return NextResponse.json({
      inOperatingHours: shouldBeActive,
      screensUpdated: updatedScreens,
      totalScreens: screens.length,
      activeScreens: newScreens.filter(s => s.status === 'active').length,
      message: shouldBeActive 
        ? 'Sistema en horario de funcionamiento' 
        : 'Sistema fuera de horario de funcionamiento'
    });
  } catch (error) {
    console.error('Error en verificación de horarios:', error);
    return NextResponse.json(
      { error: 'Error al verificar horarios del sistema' },
      { status: 500 }
    );
  }
}

// POST /api/system/schedule - Forzar verificación de horarios
export async function POST() {
  return GET(); // Reutilizar la lógica del GET
}
