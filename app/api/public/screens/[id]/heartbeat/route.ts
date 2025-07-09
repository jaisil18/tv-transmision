import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  currentContent?: string;
  isRepeating?: boolean;
  muted?: boolean;
}

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
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function saveScreens(screens: Screen[]): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(SCREENS_FILE, JSON.stringify(screens, null, 2));
}

// PUT /api/public/screens/[id]/heartbeat - Heartbeat público para pantallas
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`💓 [Heartbeat] Recibido heartbeat para pantalla: ${id}`);
    
    // Validar que hay contenido en el body
    const contentLength = request.headers.get('content-length');
    console.log(`📏 Content-Length: ${contentLength}`);
    
    let data: any = {};
    
    try {
      // Intentar leer el body como texto primero para debugging
      const bodyText = await request.text();
      console.log(`📄 Body recibido: "${bodyText}"`);
      
      if (bodyText.trim() === '') {
        console.warn('⚠️ Body vacío recibido, usando valores por defecto');
        data = { lastSeen: Date.now() };
      } else {
        data = JSON.parse(bodyText);
        console.log(`✅ JSON parseado correctamente:`, data);
      }
    } catch (jsonError) {
      console.error('❌ Error al parsear JSON:', jsonError);
      console.log('🔄 Usando valores por defecto para heartbeat');
      data = { lastSeen: Date.now() };
    }
    
    const screens = await getScreens();
    console.log(`💓 [Heartbeat] Pantallas en sistema: ${screens.length}`);

    const index = screens.findIndex((s) => s.id === id);

    if (index === -1) {
      console.error(`❌ [Heartbeat] Pantalla ${id} no encontrada`);
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la pantalla con heartbeat
    const screen = screens[index];
    const currentTime = Date.now();
    const lastSeen = data.lastSeen || currentTime;
    const isOnline = (currentTime - lastSeen) < 300000; // 5 minutos

    const updatedScreen: Screen = {
      ...screen,
      status: isOnline ? 'active' : 'inactive',
      lastSeen: lastSeen,
      currentContent: data.currentContent || screen.currentContent,
      isRepeating: data.isRepeating !== undefined ? data.isRepeating : screen.isRepeating,
      muted: data.muted !== undefined ? data.muted : screen.muted
    };

    screens[index] = updatedScreen;
    await saveScreens(screens);

    console.log(`✅ [Heartbeat] Pantalla ${id} actualizada - Estado: ${updatedScreen.status}, Última vez visto: ${new Date(lastSeen).toLocaleString()}`);

    return NextResponse.json({
      success: true,
      screen: updatedScreen,
      message: 'Heartbeat actualizado correctamente'
    });

  } catch (error) {
    console.error('Error al procesar heartbeat:', error);
    return NextResponse.json(
      { error: 'Error al procesar heartbeat' },
      { status: 500 }
    );
  }
}
