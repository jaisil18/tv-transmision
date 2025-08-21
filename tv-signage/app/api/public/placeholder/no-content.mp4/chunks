import { NextResponse } from 'next/server';
import { mkdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';

const BASE_PATH = '/home/uct/Música';

// GET /api/debug/setup-folders - Verificar y crear estructura de carpetas
export async function GET() {
  try {
    console.log('🔧 [Setup] Verificando estructura de carpetas...');
    
    const results = {
      basePath: BASE_PATH,
      folders: [] as any[],
      created: [] as string[],
      errors: [] as string[]
    };

    // Lista de carpetas necesarias
    const requiredFolders = ['CASS', 'TÓPICO', 'Admisión'];

    // Verificar directorio base
    try {
      await stat(BASE_PATH);
      console.log(`✅ [Setup] Directorio base existe: ${BASE_PATH}`);
    } catch {
      console.log(`📁 [Setup] Creando directorio base: ${BASE_PATH}`);
      await mkdir(BASE_PATH, { recursive: true });
      results.created.push(BASE_PATH);
    }

    // Verificar/crear cada carpeta
    for (const folderName of requiredFolders) {
      const folderPath = join(BASE_PATH, folderName);
      
      try {
        const stats = await stat(folderPath);
        if (stats.isDirectory()) {
          console.log(`✅ [Setup] Carpeta existe: ${folderName}`);
          results.folders.push({
            name: folderName,
            path: folderPath,
            exists: true,
            created: stats.birthtime
          });
        }
      } catch {
        console.log(`📁 [Setup] Creando carpeta: ${folderName}`);
        try {
          await mkdir(folderPath, { recursive: true });
          results.created.push(folderPath);
          
          // Crear archivo de prueba
          const testVideoContent = `# Video de prueba para ${folderName}
Este es un archivo de prueba para la carpeta ${folderName}.
En un entorno real, aquí habría archivos de video (.mp4, .webm, etc.)
`;
          
          const testFilePath = join(folderPath, 'README.txt');
          await writeFile(testFilePath, testVideoContent);
          
          results.folders.push({
            name: folderName,
            path: folderPath,
            exists: true,
            created: new Date().toISOString(),
            testFile: 'README.txt'
          });
          
          console.log(`✅ [Setup] Carpeta creada: ${folderName}`);
        } catch (error) {
          console.error(`❌ [Setup] Error creando carpeta ${folderName}:`, error);
          results.errors.push(`Error creando ${folderName}: ${error}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Verificación de estructura completada',
      results
    });

  } catch (error) {
    console.error('❌ [Setup] Error en verificación:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error verificando estructura de carpetas',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST /api/debug/setup-folders - Forzar creación de estructura
export async function POST() {
  try {
    console.log('🔧 [Setup] Forzando creación de estructura...');
    
    // Crear estructura completa
    const folders = [
      'CASS',
      'TÓPICO', 
      'Admisión'
    ];

    const created = [];
    
    // Crear directorio base
    await mkdir(BASE_PATH, { recursive: true });
    
    for (const folder of folders) {
      const folderPath = join(BASE_PATH, folder);
      await mkdir(folderPath, { recursive: true });
      created.push(folderPath);
      
      // Crear archivo de ejemplo
      const exampleContent = `# Carpeta ${folder}
Esta carpeta está lista para recibir contenido multimedia.
Formatos soportados: .mp4, .webm, .ogg, .avi, .mov, .mkv, .jpg, .png, .gif
`;
      
      await writeFile(join(folderPath, 'info.txt'), exampleContent);
    }

    return NextResponse.json({
      success: true,
      message: 'Estructura creada exitosamente',
      created,
      basePath: BASE_PATH
    });

  } catch (error) {
    console.error('❌ [Setup] Error creando estructura:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error creando estructura',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
