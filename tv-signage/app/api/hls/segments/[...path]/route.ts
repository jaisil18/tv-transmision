import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync, statSync } from 'fs';
import path from 'path';

// GET - Servir segmentos de video HLS
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;

    if (!pathSegments || pathSegments.length < 2) {
      return NextResponse.json(
        { error: 'Ruta de segmento inválida' },
        { status: 400 }
      );
    }

    const screenId = pathSegments[0];
    const segmentFileName = pathSegments[1];

    // Validar que el archivo sea un segmento .ts válido
    if (!segmentFileName.endsWith('.ts') || !segmentFileName.startsWith('segment_')) {
      return NextResponse.json(
        { error: 'Nombre de segmento inválido' },
        { status: 400 }
      );
    }

    console.log(`📹 [HLS Segments] Solicitando segmento ${segmentFileName} para pantalla ${screenId}`);

    // Construir la ruta del archivo de segmento
    const hlsDir = path.join(process.cwd(), 'public', 'hls', screenId);
    const segmentPath = path.join(hlsDir, segmentFileName);

    // Verificar que el archivo existe
    if (!existsSync(segmentPath)) {
      console.warn(`⚠️ [HLS Segments] Segmento no encontrado: ${segmentPath}`);
      return NextResponse.json(
        { error: 'Segmento no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el archivo no esté siendo escrito (esperar si es muy reciente)
    const stats = statSync(segmentPath);
    const fileAge = Date.now() - stats.mtime.getTime();
    
    // Si el archivo es muy reciente (menos de 1 segundo), esperar un poco
    if (fileAge < 1000) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    try {
      // Leer el archivo de segmento
      const segmentData = readFileSync(segmentPath);

      console.log(`✅ [HLS Segments] Segmento ${segmentFileName} servido para pantalla ${screenId} (${segmentData.length} bytes)`);

      // Devolver el segmento con headers apropiados
      return new NextResponse(segmentData, {
        status: 200,
        headers: {
          'Content-Type': 'video/mp2t',
          'Content-Length': segmentData.length.toString(),
          'Cache-Control': 'public, max-age=31536000', // Cache por 1 año (los segmentos no cambian)
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Range',
          'Accept-Ranges': 'bytes',
        },
      });

    } catch (error) {
      console.error(`❌ [HLS Segments] Error al leer segmento ${segmentFileName}:`, error);
      return NextResponse.json(
        { error: 'Error al leer el segmento' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('❌ [HLS Segments] Error general:', error);
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
      'Access-Control-Allow-Headers': 'Content-Type, Range',
    },
  });
}
