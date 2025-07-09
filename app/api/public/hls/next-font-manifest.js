import { NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';

const BASE_PATH = '/home/uct/Música';

// POST /api/debug/create-test-video - Crear video de prueba
export async function POST(request: Request) {
  try {
    const { folder } = await request.json();
    
    if (!folder) {
      return NextResponse.json(
        { error: 'Nombre de carpeta requerido' },
        { status: 400 }
      );
    }

    console.log(`🎬 [Test Video] Creando video de prueba para carpeta: ${folder}`);
    
    // Crear un archivo MP4 mínimo válido (1 segundo de video negro)
    // Este es un MP4 básico que la mayoría de reproductores pueden manejar
    const mp4Header = Buffer.from([
      // ftyp box
      0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
      0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
      0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31,
      
      // free box
      0x00, 0x00, 0x00, 0x08, 0x66, 0x72, 0x65, 0x65,
      
      // mdat box (datos de video mínimos)
      0x00, 0x00, 0x00, 0x10, 0x6D, 0x64, 0x61, 0x74,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
    ]);

    const videoPath = join(BASE_PATH, folder, `test-video-${folder.toLowerCase()}.mp4`);
    
    await writeFile(videoPath, mp4Header);
    
    console.log(`✅ [Test Video] Video creado: ${videoPath}`);

    return NextResponse.json({
      success: true,
      message: `Video de prueba creado para ${folder}`,
      videoPath,
      fileName: `test-video-${folder.toLowerCase()}.mp4`
    });

  } catch (error) {
    console.error('❌ [Test Video] Error creando video:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error creando video de prueba',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// GET /api/debug/create-test-video - Crear videos para todas las carpetas
export async function GET() {
  try {
    console.log('🎬 [Test Video] Creando videos de prueba para todas las carpetas...');
    
    const folders = ['CASS', 'TÓPICO', 'Admisión'];
    const results = [];

    // MP4 básico válido
    const mp4Data = Buffer.from([
      // ftyp box - File Type Box
      0x00, 0x00, 0x00, 0x20, // box size (32 bytes)
      0x66, 0x74, 0x79, 0x70, // box type 'ftyp'
      0x69, 0x73, 0x6F, 0x6D, // major brand 'isom'
      0x00, 0x00, 0x02, 0x00, // minor version
      0x69, 0x73, 0x6F, 0x6D, // compatible brand 'isom'
      0x69, 0x73, 0x6F, 0x32, // compatible brand 'iso2'
      0x61, 0x76, 0x63, 0x31, // compatible brand 'avc1'
      0x6D, 0x70, 0x34, 0x31, // compatible brand 'mp41'
      
      // moov box - Movie Box (metadata)
      0x00, 0x00, 0x00, 0x28, // box size (40 bytes)
      0x6D, 0x6F, 0x6F, 0x76, // box type 'moov'
      
      // mvhd box - Movie Header Box
      0x00, 0x00, 0x00, 0x20, // box size (32 bytes)
      0x6D, 0x76, 0x68, 0x64, // box type 'mvhd'
      0x00, 0x00, 0x00, 0x00, // version + flags
      0x00, 0x00, 0x00, 0x00, // creation time
      0x00, 0x00, 0x00, 0x00, // modification time
      0x00, 0x00, 0x03, 0xE8, // timescale (1000)
      0x00, 0x00, 0x03, 0xE8, // duration (1000 = 1 second)
      0x00, 0x01, 0x00, 0x00, // rate (1.0)
      
      // mdat box - Media Data Box
      0x00, 0x00, 0x00, 0x08, // box size (8 bytes)
      0x6D, 0x64, 0x61, 0x74  // box type 'mdat'
    ]);

    for (const folder of folders) {
      try {
        const videoPath = join(BASE_PATH, folder, `video-prueba-${folder.toLowerCase().replace(/[^a-z0-9]/g, '')}.mp4`);
        await writeFile(videoPath, mp4Data);
        
        results.push({
          folder,
          success: true,
          videoPath,
          fileName: `video-prueba-${folder.toLowerCase().replace(/[^a-z0-9]/g, '')}.mp4`
        });
        
        console.log(`✅ [Test Video] Video creado para ${folder}: ${videoPath}`);
      } catch (error) {
        results.push({
          folder,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
        console.error(`❌ [Test Video] Error creando video para ${folder}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Videos de prueba creados',
      results,
      totalCreated: results.filter(r => r.success).length
    });

  } catch (error) {
    console.error('❌ [Test Video] Error general:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error creando videos de prueba',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
