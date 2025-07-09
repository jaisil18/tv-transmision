import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Screen } from '@/types/screen';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function getScreens(): Promise<Screen[]> {
  try {
    await ensureDataDirectory();
    const content = await fs.readFile(SCREENS_FILE, 'utf-8');
    const screens = JSON.parse(content);
    return Array.isArray(screens) ? screens : [];
  } catch {
    return [];
  }
}

// GET /api/public/screens - Endpoint público para obtener todas las pantallas
export async function GET() {
  try {
    console.log('📱 [Public API] Solicitando todas las pantallas...');
    
    const screens = await getScreens();
    
    // Normalizar el estado de mute para todas las pantallas
    const normalizedScreens = screens.map(screen => ({
      ...screen,
      muted: screen.muted !== false // Por defecto true, false solo si explícitamente se establece
    }));

    console.log(`✅ [Public API] Devolviendo ${normalizedScreens.length} pantallas públicas`);
    
    // Log de cada pantalla para debugging
    normalizedScreens.forEach((screen, index) => {
      console.log(`📺 [Public API] Pantalla ${index + 1}: ${screen.id} - ${screen.name} (${screen.status})`);
    });

    return NextResponse.json(normalizedScreens, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('❌ [Public API] Error al obtener pantallas públicas:', error);
    return NextResponse.json(
      { error: 'Error al obtener las pantallas' },
      { status: 500 }
    );
  }
}
