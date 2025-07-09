import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'image';
  duration?: number;
  folder?: string;
}

// GET /api/public/android-playlist/[screenId] - Playlist optimizada para Android
export async function GET(
  request: Request,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params;

  try {
    console.log(`📱 [Android Playlist] Solicitando playlist para Android - pantalla ${screenId}`);

    // Obtener contenido de la pantalla desde los datos reales
    const contentInfo = await getScreenContent(screenId);

    if (!contentInfo || contentInfo.items.length === 0) {
      console.log(`⚠️ [Android Playlist] No hay contenido REAL para pantalla ${screenId}`);

      return NextResponse.json({
        screenId,
        playlistName: 'Sin contenido',
        items: [],
        totalItems: 0,
        currentIndex: 0,
        isLooping: false,
        optimizedForAndroid: true,
        error: 'No hay videos reales asignados a esta pantalla. Verifica que la playlist tenga contenido en la carpeta correspondiente.'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }

    // Filtrar solo videos para Android (las imágenes pueden causar problemas)
    const videoItems = contentInfo.items.filter(item => item.type === 'video');

    if (videoItems.length === 0) {
      console.log(`⚠️ [Android Playlist] No hay videos para pantalla ${screenId}`);
      return NextResponse.json({
        screenId,
        playlistName: contentInfo.playlistName || 'Sin videos',
        items: [],
        totalItems: 0,
        message: 'No hay videos disponibles para reproducir en Android',
        optimizedForAndroid: true
      });
    }

    // Crear playlist optimizada para Android
    const androidPlaylist = {
      screenId,
      playlistName: contentInfo.playlistName || 'Playlist Android',
      items: videoItems.map((item, index) => ({
        id: item.id || `video-${index}`,
        name: item.name,
        url: item.url,
        type: item.type,
        duration: item.duration || 30,
        folder: item.folder
      })),
      totalItems: videoItems.length,
      currentIndex: 0,
      isLooping: true,
      optimizedForAndroid: true,
      playbackInstructions: {
        autoplay: true,
        muted: true,
        controls: false,
        preload: 'auto',
        crossOrigin: 'anonymous'
      }
    };

    console.log(`✅ [Android Playlist] Playlist Android generada para pantalla ${screenId} con ${videoItems.length} videos`);

    return NextResponse.json(androidPlaylist, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    console.error('❌ [Android Playlist] Error al generar playlist Android:', error);
    return NextResponse.json(
      { 
        error: 'Error al generar playlist para Android',
        screenId,
        optimizedForAndroid: true
      },
      { status: 500 }
    );
  }
}

// OPTIONS para CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
// Función para obtener contenido directamente de los archivos de datos
async function getScreenContent(screenId: string): Promise<{ items: PlaylistItem[], playlistName?: string } | null> {
  try {
    console.log(`🔍 [Android Playlist] Acceso directo a datos para pantalla ${screenId}`);

    const fs = require('fs');
    const path = require('path');

    // Leer archivos de datos directamente
    const dataDir = path.join(process.cwd(), 'data');
    const screensFile = path.join(dataDir, 'screens.json');
    const playlistsFile = path.join(dataDir, 'playlists.json');

    console.log(`📁 [Android Playlist] Leyendo archivos de datos desde: ${dataDir}`);

    if (!fs.existsSync(screensFile) || !fs.existsSync(playlistsFile)) {
      console.error('❌ [Android Playlist] Archivos de datos no encontrados');
      return null;
    }

    const screensData = JSON.parse(fs.readFileSync(screensFile, 'utf8'));
    const playlistsData = JSON.parse(fs.readFileSync(playlistsFile, 'utf8'));

    // Buscar la pantalla
    const screen = screensData.find((s: any) => s.id === screenId);
    if (!screen) {
      console.log(`⚠️ [Android Playlist] Pantalla ${screenId} no encontrada`);
      return null;
    }

    // Buscar la playlist asignada
    const playlist = playlistsData.find((p: any) => p.screens && p.screens.includes(screenId));
    if (!playlist) {
      console.log(`⚠️ [Android Playlist] No hay playlist asignada a pantalla ${screenId}`);
      return null;
    }

    // Construir URLs de videos
    const items = (playlist.items || []).map((item: any) => {
      const encodedFolder = encodeURIComponent(item.folder || 'CASS');
      const encodedName = encodeURIComponent(item.name);
      const videoUrl = `http://172.16.31.17:3000/api/files/media/${encodedFolder}/${encodedName}`;
      
      return {
        id: item.id || `video-${item.name}`,
        name: item.name,
        url: videoUrl,
        type: item.type || 'video',
        folder: item.folder || 'CASS',
        duration: item.duration || 30
      };
    });

    console.log(`✅ [Android Playlist] Contenido directo generado: ${playlist.name} con ${items.length} elementos`);

    return {
      items: items,
      playlistName: playlist.name
    };
  } catch (error) {
    console.error('❌ [Android Playlist] Error acceso directo:', error);
    return null;
  }
}