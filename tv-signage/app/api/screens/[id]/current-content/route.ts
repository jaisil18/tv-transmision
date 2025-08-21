import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// GET /api/screens/[id]/current-content - Obtener contenido actual de la pantalla
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`📺 [Current Content] Obteniendo contenido actual para pantalla ${id}`);

    // Leer datos de pantallas
    const screensPath = path.join(process.cwd(), 'data', 'screens.json');
    const screensData = JSON.parse(await fs.readFile(screensPath, 'utf8'));
    const screen = screensData.find((s: any) => s.id === id);

    if (!screen) {
      return NextResponse.json(
        { error: `Pantalla ${id} no encontrada` },
        { status: 404 }
      );
    }

    // Leer playlists para obtener contenido asignado
    const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
    const playlistsData = JSON.parse(await fs.readFile(playlistsPath, 'utf8'));
    const playlist = playlistsData.find((p: any) => p.screens && p.screens.includes(id));

    if (!playlist || !playlist.items || playlist.items.length === 0) {
      return NextResponse.json({
        hasContent: false,
        message: `No hay contenido asignado a la pantalla ${id}`,
        currentContent: null,
        playlistInfo: null
      });
    }

    // Obtener el índice actual del contenido (simulamos rotación basada en tiempo)
    const currentTime = Date.now();
    const rotationInterval = 30000; // 30 segundos por defecto
    const currentIndex = Math.floor((currentTime / rotationInterval) % playlist.items.length);
    const currentContent = playlist.items[currentIndex];

    // Verificar si el archivo existe
    const filePath = path.join(process.cwd(), 'public', currentContent.url);
    let fileExists = false;
    try {
      await fs.access(filePath);
      fileExists = true;
    } catch (error) {
      console.warn(`⚠️ Archivo no encontrado: ${filePath}`);
    }

    const response = {
      hasContent: true,
      currentContent: {
        name: currentContent.name,
        url: currentContent.url,
        type: currentContent.type,
        duration: currentContent.duration || null,
        exists: fileExists
      },
      playlistInfo: {
        name: playlist.name,
        currentIndex,
        totalItems: playlist.items.length,
        nextIndex: (currentIndex + 1) % playlist.items.length
      },
      screenInfo: {
        id: screen.id,
        name: screen.name,
        isActive: screen.isActive || false,
        lastSeen: screen.lastSeen || null
      },
      timestamp: currentTime
    };

    console.log(`✅ [Current Content] Contenido actual para pantalla ${id}:`, {
      content: currentContent.name,
      playlist: playlist.name,
      index: `${currentIndex + 1}/${playlist.items.length}`
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error(`❌ [Current Content] Error al obtener contenido para pantalla ${id}:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/screens/[id]/current-content - Forzar cambio de contenido
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { action, index } = await request.json();

    console.log(`🎮 [Current Content] Acción para pantalla ${id}:`, { action, index });

    // En una implementación real, aquí se enviaría el comando a la pantalla
    // Por ahora, simplemente confirmamos la acción

    const response = {
      success: true,
      screenId: id,
      action,
      index: index || null,
      message: `Acción ${action} ejecutada para pantalla ${id}`,
      timestamp: Date.now()
    };

    console.log(`✅ [Current Content] Acción ejecutada:`, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error(`❌ [Current Content] Error al ejecutar acción para pantalla ${id}:`, error);
    return NextResponse.json(
      { error: 'Error al ejecutar la acción' },
      { status: 500 }
    );
  }
}
