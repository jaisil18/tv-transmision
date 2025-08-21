import { NextResponse } from 'next/server';

interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'image';
  duration?: number;
  folder?: string;
}

// GET /api/public/hls/[screenId] - Endpoint público para HLS streaming
export async function GET(
  request: Request,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params;

  try {
    console.log(`📺 [Public HLS] Solicitando stream HLS para pantalla ${screenId}`);

    // Obtener contenido real de la pantalla
    const contentInfo = await getScreenContent(screenId);

    if (!contentInfo || contentInfo.items.length === 0) {
      console.log(`⚠️ [Public HLS] No hay contenido para pantalla ${screenId}, usando contenido por defecto`);
      const defaultManifest = createDefaultHLSManifest(screenId);
      return new NextResponse(defaultManifest, {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }

    // Crear manifest HLS basado en contenido real
    const hlsManifest = createRealHLSManifest(screenId, contentInfo);

    console.log(`✅ [Public HLS] Manifest HLS real generado para pantalla ${screenId} con ${contentInfo.items.length} elementos`);

    return new NextResponse(hlsManifest, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('❌ [Public HLS] Error al generar stream HLS:', error);
    return NextResponse.json(
      { error: 'Error al generar el stream HLS' },
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

// Función para obtener contenido de una pantalla usando el endpoint existente
async function getScreenContent(screenId: string): Promise<{ items: PlaylistItem[], playlistName?: string } | null> {
  try {
    console.log(`🔍 [Public HLS] Obteniendo contenido para pantalla ${screenId}`);

    // Usar el endpoint interno de contenido que ya funciona
    const baseUrl = process.env.NEXT_PUBLIC_SERVER_URL || 'http://172.16.31.17:3000';
    const contentUrl = `${baseUrl}/api/screens/${screenId}/content`;
    console.log(`🔗 [Public HLS] Consultando: ${contentUrl}`);
    const response = await fetch(contentUrl);

    if (!response.ok) {
      console.log(`⚠️ [Public HLS] No se pudo obtener contenido para pantalla ${screenId}: ${response.status}`);
      return null;
    }

    const contentData = await response.json();
    console.log(`📋 [Public HLS] Respuesta del contenido:`, JSON.stringify(contentData, null, 2));

    if (!contentData.items || contentData.items.length === 0) {
      console.log(`⚠️ [Public HLS] No hay elementos de contenido para pantalla ${screenId}`);
      return null;
    }

    console.log(`📋 [Public HLS] Contenido encontrado: ${contentData.playlistName || 'Sin nombre'} con ${contentData.items.length} elementos`);

    return {
      items: contentData.items,
      playlistName: contentData.playlistName
    };
  } catch (error) {
    console.error('❌ [Public HLS] Error al obtener contenido de pantalla:', error);
    return null;
  }
}

// Crear manifest HLS basado en contenido real
function createRealHLSManifest(screenId: string, contentInfo: { items: PlaylistItem[], playlistName?: string }): string {
  console.log(`🎬 [Public HLS] Creando manifest real para pantalla ${screenId}`);
  console.log(`🎬 [Public HLS] Items recibidos:`, JSON.stringify(contentInfo.items, null, 2));

  const videoItems = contentInfo.items.filter(item => item.type === 'video');
  console.log(`🎬 [Public HLS] Videos encontrados: ${videoItems.length}`);

  if (videoItems.length === 0) {
    console.log(`⚠️ [Public HLS] No hay videos, usando manifest por defecto`);
    return createDefaultHLSManifest(screenId);
  }

  // Crear manifest con todos los videos de la playlist
  let manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:300
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD

`;

  // Agregar cada video como un segmento
  videoItems.forEach((video, index) => {
    const duration = video.duration || 30; // Duración por defecto de 30 segundos
    manifest += `#EXTINF:${duration}.0,${video.name}\n`;
    manifest += `${video.url}\n`;
    if (index < videoItems.length - 1) {
      manifest += '\n';
    }
  });

  manifest += '\n#EXT-X-ENDLIST';

  console.log(`🎬 [Public HLS] Manifest creado con ${videoItems.length} videos`);
  return manifest;
}

// Crear manifest HLS por defecto cuando no hay contenido
function createDefaultHLSManifest(screenId: string): string {
  console.log(`🎬 [Public HLS] No hay contenido real para pantalla ${screenId}, creando manifest vacío`);

  const manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXT-X-MEDIA-SEQUENCE:0
#EXT-X-PLAYLIST-TYPE:VOD

#EXTINF:10.0,Sin contenido disponible
# No hay videos en la playlist asignada a esta pantalla

#EXT-X-ENDLIST`;

  return manifest;
}
