import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { lookup } from 'mime-types';

const MEDIA_BASE_PATH = '/home/uct/Música';

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

// GET /api/files/media/[...path] - Servir archivos de media
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;
    
    if (!pathSegments || pathSegments.length === 0) {
      return NextResponse.json(
        { error: 'Ruta de archivo requerida' },
        { status: 400 }
      );
    }

    // Construir la ruta del archivo
    const filePath = pathSegments.map(segment => decodeURIComponent(segment)).join('/');
    const fullPath = join(MEDIA_BASE_PATH, filePath);
    
    console.log(`📁 [Media Files] Solicitando archivo: ${filePath}`);
    console.log(`📁 [Media Files] Ruta completa: ${fullPath}`);
    
    // Verificar que el archivo está dentro del directorio permitido
    if (!fullPath.startsWith(MEDIA_BASE_PATH)) {
      console.error(`🚫 [Media Files] Acceso denegado - fuera del directorio: ${fullPath}`);
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }

    try {
      // Verificar que el archivo existe
      const fileStats = await stat(fullPath);
      
      if (!fileStats.isFile()) {
        return NextResponse.json(
          { error: 'El recurso solicitado no es un archivo' },
          { status: 404 }
        );
      }

      // Leer el archivo
      const fileBuffer = await readFile(fullPath);
      
      // Determinar el tipo MIME
      const mimeType = lookup(fullPath) || 'application/octet-stream';
      
      console.log(`✅ [Media Files] Sirviendo archivo: ${filePath} (${mimeType}, ${fileStats.size} bytes)`);

      // Crear respuesta con headers apropiados
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Length': fileStats.size.toString(),
          'Cache-Control': 'public, max-age=31536000',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Accept-Ranges': 'bytes'
        }
      });

    } catch (fileError: any) {
      if (fileError.code === 'ENOENT') {
        console.error(`❌ [Media Files] Archivo no encontrado: ${fullPath}`);
        return NextResponse.json(
          { error: 'Archivo no encontrado' },
          { status: 404 }
        );
      } else if (fileError.code === 'EACCES') {
        console.error(`❌ [Media Files] Sin permisos para acceder: ${fullPath}`);
        return NextResponse.json(
          { error: 'Sin permisos para acceder al archivo' },
          { status: 403 }
        );
      } else {
        console.error(`❌ [Media Files] Error leyendo archivo ${fullPath}:`, fileError);
        return NextResponse.json(
          { error: 'Error interno del servidor' },
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error('❌ [Media Files] Error general:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Forzar que sea dinámico - no pre-renderizar
export const dynamic = 'force-dynamic';
export const revalidate = 0;

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
