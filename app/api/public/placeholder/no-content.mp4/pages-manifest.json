import { NextResponse } from 'next/server';

// GET /api/public/placeholder/no-content.mp4 - Video placeholder cuando no hay contenido
export async function GET() {
  try {
    console.log('📺 [Placeholder] Solicitando video placeholder');
    
    // Crear un video MP4 mínimo de 1 segundo (datos binarios básicos)
    // Este es un MP4 válido pero muy pequeño que muestra una pantalla negra
    const mp4Data = Buffer.from([
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08,
      0x66, 0x72, 0x65, 0x65
    ]);

    return new NextResponse(mp4Data, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': mp4Data.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
      }
    });

  } catch (error) {
    console.error('❌ [Placeholder] Error generando video placeholder:', error);
    return NextResponse.json(
      { error: 'Error generando video placeholder' },
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
