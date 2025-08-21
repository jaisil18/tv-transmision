import { NextRequest, NextResponse } from 'next/server';
import { getHLSManager } from '@/lib/hls-server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

// GET - Obtener playlist HLS para una pantalla específica
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ screenId: string }> }
) {
  try {
    const { screenId } = await params;

    if (!screenId) {
      return NextResponse.json(
        { error: 'ID de pantalla requerido' },
        { status: 400 }
      );
    }

    console.log(`📺 [HLS API] Solicitando playlist para pantalla ${screenId}`);

    const hlsManager = getHLSManager();
    
    // Verificar si existe un stream HLS para esta pantalla
    let streamState = hlsManager.getHLSStreamState(screenId);
    
    // Si no existe, crear uno nuevo
    if (!streamState) {
      console.log(`🎬 [HLS API] Creando nuevo stream HLS para pantalla ${screenId}`);
      try {
        streamState = await hlsManager.createHLSStream(screenId);
      } catch (error) {
        console.error(`❌ [HLS API] Error al crear stream HLS:`, error);
        console.log(`🔄 [HLS API] Intentando con endpoint público para pantalla ${screenId}`);

        // Si falla el stream complejo, redirigir al endpoint público
        try {
          const baseUrl = getBaseUrl(request);
          const publicHLSUrl = `${baseUrl}/api/public/hls/${screenId}`;
          const response = await fetch(publicHLSUrl);

          if (response.ok) {
            const content = await response.text();
            return new NextResponse(content, {
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
        } catch (publicError) {
          console.error(`❌ [HLS API] Error en endpoint público:`, publicError);
        }

        return NextResponse.json(
          { error: 'No se pudo crear el stream HLS', details: error instanceof Error ? error.message : 'Error desconocido' },
          { status: 500 }
        );
      }
    }

    // Verificar si existe el archivo de playlist
    const playlistPath = hlsManager.getPlaylistPath(screenId);
    if (!playlistPath || !existsSync(playlistPath)) {
      // Si el stream existe pero no hay playlist, esperar un poco y reintentar
      console.log(`⏳ [HLS API] Esperando generación de playlist para pantalla ${screenId}`);
      
      // Esperar hasta 10 segundos para que se genere el playlist
      let attempts = 0;
      const maxAttempts = 20; // 10 segundos (500ms * 20)
      
      while (attempts < maxAttempts && (!playlistPath || !existsSync(playlistPath))) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
        
        // Verificar nuevamente
        const updatedPlaylistPath = hlsManager.getPlaylistPath(screenId);
        if (updatedPlaylistPath && existsSync(updatedPlaylistPath)) {
          break;
        }
      }
      
      // Si después de esperar aún no existe, devolver error
      if (!playlistPath || !existsSync(playlistPath)) {
        return NextResponse.json(
          { error: 'Playlist HLS no disponible aún', status: streamState.status },
          { status: 503 }
        );
      }
    }

    // Leer el contenido del playlist
    try {
      const playlistContent = readFileSync(playlistPath, 'utf8');
      
      // Modificar las URLs de los segmentos para que apunten a nuestra API
      const modifiedPlaylist = playlistContent.replace(
        /segment_(\d+)\.ts/g,
        (match, segmentNumber) => {
          const baseUrl = getBaseUrl(request);
          return `${baseUrl}/api/hls/segments/${screenId}/segment_${segmentNumber}.ts`;
        }
      );

      console.log(`✅ [HLS API] Playlist servido para pantalla ${screenId}`);

      // Devolver el playlist con headers apropiados para HLS
      return new NextResponse(modifiedPlaylist, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });

    } catch (error) {
      console.error(`❌ [HLS API] Error al leer playlist:`, error);
      return NextResponse.json(
        { error: 'Error al leer el playlist HLS' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [HLS API] Error general:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// OPTIONS - Para CORS
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

// Función auxiliar para obtener la URL base
function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host') || 'localhost:3000';
  const protocol = request.headers.get('x-forwarded-proto') || 'http';
  return `${protocol}://${host}`;
}
