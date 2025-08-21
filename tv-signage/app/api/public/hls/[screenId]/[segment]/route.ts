import { NextResponse } from 'next/server';

// GET /api/public/hls/[screenId]/[segment] - Endpoint público para segmentos HLS
export async function GET(
  request: Request,
  { params }: { params: Promise<{ screenId: string; segment: string }> }
) {
  const { screenId, segment } = await params;

  try {
    console.log(`📺 [Public HLS] Solicitando segmento ${segment} para pantalla ${screenId}`);

    // Crear un segmento TS simulado (contenido de video básico)
    const segmentData = createVideoSegment(screenId, segment);

    console.log(`✅ [Public HLS] Segmento ${segment} generado para pantalla ${screenId}`);

    return new NextResponse(segmentData, {
      headers: {
        'Content-Type': 'video/mp2t',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600',
        'Content-Length': segmentData.length.toString()
      }
    });

  } catch (error) {
    console.error('❌ [Public HLS] Error al generar segmento HLS:', error);
    return NextResponse.json(
      { error: 'Error al generar el segmento HLS' },
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

function createVideoSegment(screenId: string, segment: string): Buffer {
  // Crear un segmento TS básico simulado
  // En una implementación real, esto sería contenido de video real
  
  // Header básico de un archivo TS (Transport Stream)
  const tsHeader = Buffer.from([
    0x47, 0x40, 0x00, 0x10, // TS packet header
    0x00, 0x00, 0xB0, 0x0D, // PAT header
    0x00, 0x01, 0xC1, 0x00, // Program info
    0x00, 0x00, 0x01, 0xE1, // PMT PID
    0x00, 0x2A, 0xB1, 0x04, // CRC
  ]);

  // Crear un buffer de datos simulado para el segmento
  const segmentSize = 188 * 100; // 100 paquetes TS de 188 bytes cada uno
  const segmentBuffer = Buffer.alloc(segmentSize);
  
  // Llenar con datos simulados
  for (let i = 0; i < segmentSize; i += 188) {
    // Cada paquete TS comienza con 0x47
    segmentBuffer[i] = 0x47;
    // Llenar el resto con datos simulados
    for (let j = 1; j < 188; j++) {
      segmentBuffer[i + j] = (i + j) % 256;
    }
  }

  return segmentBuffer;
}
