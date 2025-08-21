
import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { join } from 'path';
import { lookup } from 'mime-types';
import { MEDIA_BASE_PATH } from '@/lib/path-config';

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

// GET /api/files/media/[...path] - Servir archivos de media con soporte para Range requests
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

    // Decodificar cada segmento de la ruta
    const decodedSegments = pathSegments.map(segment => decodeURIComponent(segment));
    // Construir la ruta completa del archivo
    const filePath = join(MEDIA_BASE_PATH, ...decodedSegments);
    
    // Verificar si el archivo existe
    try {
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'No es un archivo válido' },
          { status: 400 }
        );
      }

      const fileSize = stats.size;
      const mimeType = lookup(filePath) || 'application/octet-stream';
      
      // Obtener cabecera Range si existe
      const range = request.headers.get('range');
      
      if (range) {
        // Procesar Range request
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        
        if (start >= fileSize || end >= fileSize) {
          return new NextResponse(null, {
            status: 416, // Range Not Satisfiable
            headers: {
              'Content-Range': `bytes */${fileSize}`,
              'Access-Control-Allow-Origin': '*',
            }
          });
        }
        
        const chunkSize = (end - start) + 1;
        const fileBuffer = await readFile(filePath);
        const chunk = fileBuffer.slice(start, end + 1);
        
        return new NextResponse(chunk, {
          status: 206, // Partial Content
          headers: {
            'Content-Type': mimeType,
            'Content-Length': chunkSize.toString(),
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Range, Content-Type',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
            'Cache-Control': 'public, max-age=3600',
          }
        });
      } else {
        // Solicitud normal (sin Range)
        const fileBuffer = await readFile(filePath);
        
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': mimeType,
            'Content-Length': fileSize.toString(),
            'Accept-Ranges': 'bytes',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Range, Content-Type',
            'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
            'Cache-Control': 'public, max-age=3600',
          }
        });
      }
    } catch (error) {
      console.error('Error al acceder al archivo:', error);
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
    }
  });
}

// Agregar soporte para HEAD requests
export async function HEAD(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path;
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse(null, { status: 400 });
    }

    const decodedSegments = pathSegments.map(segment => decodeURIComponent(segment));
    const filePath = join(MEDIA_BASE_PATH, ...decodedSegments);
    
    const stats = await stat(filePath);
    if (!stats.isFile()) {
      return new NextResponse(null, { status: 400 });
    }

    const mimeType = lookup(filePath) || 'application/octet-stream';
    
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Accept-Ranges': 'bytes',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Access-Control-Expose-Headers': 'Content-Range, Content-Length',
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    return new NextResponse(null, { status: 404 });
  }
}
