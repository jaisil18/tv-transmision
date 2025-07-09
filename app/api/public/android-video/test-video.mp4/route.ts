import { NextResponse } from 'next/server';

// GET /api/public/android-video/test-video.mp4 - Video optimizado para Android
export async function GET() {
  try {
    console.log('📱 [Android Video] Solicitando video de prueba para Android');
    
    // Crear un MP4 más completo y compatible con Android
    // Este incluye headers más completos para mejor compatibilidad
    const mp4Data = Buffer.from([
      // ftyp box - File Type Box (más completo para Android)
      0x00, 0x00, 0x00, 0x28, // box size (40 bytes)
      0x66, 0x74, 0x79, 0x70, // box type 'ftyp'
      0x69, 0x73, 0x6F, 0x6D, // major brand 'isom'
      0x00, 0x00, 0x02, 0x00, // minor version
      0x69, 0x73, 0x6F, 0x6D, // compatible brand 'isom'
      0x69, 0x73, 0x6F, 0x32, // compatible brand 'iso2'
      0x61, 0x76, 0x63, 0x31, // compatible brand 'avc1'
      0x6D, 0x70, 0x34, 0x31, // compatible brand 'mp41'
      0x64, 0x61, 0x73, 0x68, // compatible brand 'dash' (para Android)
      0x6D, 0x70, 0x34, 0x76, // compatible brand 'mp4v'
      
      // free box
      0x00, 0x00, 0x00, 0x08, // box size
      0x66, 0x72, 0x65, 0x65, // box type 'free'
      
      // moov box - Movie Box (metadata más completa)
      0x00, 0x00, 0x00, 0x6C, // box size (108 bytes)
      0x6D, 0x6F, 0x6F, 0x76, // box type 'moov'
      
      // mvhd box - Movie Header Box
      0x00, 0x00, 0x00, 0x64, // box size (100 bytes)
      0x6D, 0x76, 0x68, 0x64, // box type 'mvhd'
      0x00, 0x00, 0x00, 0x00, // version + flags
      0x00, 0x00, 0x00, 0x00, // creation time
      0x00, 0x00, 0x00, 0x00, // modification time
      0x00, 0x00, 0x03, 0xE8, // timescale (1000 units per second)
      0x00, 0x00, 0x07, 0xD0, // duration (2000 = 2 seconds)
      0x00, 0x01, 0x00, 0x00, // rate (1.0)
      0x01, 0x00, 0x00, 0x00, // volume (1.0)
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x00, 0x00, 0x00, // reserved
      0x00, 0x01, 0x00, 0x00, // matrix[0] (1.0)
      0x00, 0x00, 0x00, 0x00, // matrix[1] (0.0)
      0x00, 0x00, 0x00, 0x00, // matrix[2] (0.0)
      0x00, 0x00, 0x00, 0x00, // matrix[3] (0.0)
      0x00, 0x01, 0x00, 0x00, // matrix[4] (1.0)
      0x00, 0x00, 0x00, 0x00, // matrix[5] (0.0)
      0x00, 0x00, 0x00, 0x00, // matrix[6] (0.0)
      0x00, 0x00, 0x00, 0x00, // matrix[7] (0.0)
      0x40, 0x00, 0x00, 0x00, // matrix[8] (1.0)
      0x00, 0x00, 0x00, 0x00, // pre_defined[0]
      0x00, 0x00, 0x00, 0x00, // pre_defined[1]
      0x00, 0x00, 0x00, 0x00, // pre_defined[2]
      0x00, 0x00, 0x00, 0x00, // pre_defined[3]
      0x00, 0x00, 0x00, 0x00, // pre_defined[4]
      0x00, 0x00, 0x00, 0x00, // pre_defined[5]
      0x00, 0x00, 0x00, 0x02, // next_track_ID
      
      // mdat box - Media Data Box (datos mínimos)
      0x00, 0x00, 0x00, 0x10, // box size (16 bytes)
      0x6D, 0x64, 0x61, 0x74, // box type 'mdat'
      0x00, 0x00, 0x00, 0x00, // padding
      0x00, 0x00, 0x00, 0x00, // padding
      0x00, 0x00, 0x00, 0x00  // padding
    ]);

    return new NextResponse(mp4Data, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': mp4Data.length.toString(),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Cache-Control': 'public, max-age=86400', // Cache por 24 horas
        // Headers específicos para Android
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': 'inline; filename="test-video.mp4"'
      }
    });

  } catch (error) {
    console.error('❌ [Android Video] Error generando video para Android:', error);
    return NextResponse.json(
      { error: 'Error generando video para Android' },
      { status: 500 }
    );
  }
}

// HEAD para soporte de range requests (importante para Android)
export async function HEAD() {
  const mp4Size = 200; // Tamaño aproximado del MP4
  
  return new NextResponse(null, {
    headers: {
      'Content-Type': 'video/mp4',
      'Content-Length': mp4Size.toString(),
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

// OPTIONS para CORS
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    }
  });
}
