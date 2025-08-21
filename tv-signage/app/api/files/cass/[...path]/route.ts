import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { lookup } from 'mime-types';

// Configuración de ruta base según el sistema operativo
const CASS_BASE_PATH = process.platform === 'win32' 
  ? 'C:\\Users\\Dev-Uct\\Music' 
  : '/home/uct/Música/CASS';

interface RouteParams {
  params: Promise<{
    path: string[];
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const resolvedParams = await params;
    const filePath = resolvedParams.path.join('/');
    const fullPath = join(CASS_BASE_PATH, decodeURIComponent(filePath));
    
    console.log(`📁 [CASS Files] Solicitando archivo: ${filePath}`);
    console.log(`📁 [CASS Files] Ruta completa: ${fullPath}`);
    
    // Verificar que el archivo está dentro del directorio permitido
    if (!fullPath.startsWith(CASS_BASE_PATH)) {
      console.error(`🚫 [CASS Files] Acceso denegado - fuera del directorio: ${fullPath}`);
      return NextResponse.json(
        { error: 'Acceso denegado' },
        { status: 403 }
      );
    }
    
    // Verificar que el archivo existe
    try {
      const stats = await stat(fullPath);
      if (!stats.isFile()) {
        console.error(`❌ [CASS Files] No es un archivo: ${fullPath}`);
        return NextResponse.json(
          { error: 'Archivo no encontrado' },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error(`❌ [CASS Files] Archivo no existe: ${fullPath}`, error);
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }
    
    // Leer el archivo
    const fileBuffer = await readFile(fullPath);
    const mimeType = lookup(fullPath) || 'application/octet-stream';
    
    console.log(`✅ [CASS Files] Archivo servido: ${filePath} (${mimeType})`);
    
    // Configurar headers para streaming de video
    const headers = new Headers({
      'Content-Type': mimeType,
      'Content-Length': fileBuffer.length.toString(),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600', // Cache por 1 hora
    });
    
    // Soporte para Range requests (importante para video)
    const range = request.headers.get('range');
    if (range && mimeType.startsWith('video/')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileBuffer.length - 1;
      const chunkSize = (end - start) + 1;
      
      const chunk = fileBuffer.slice(start, end + 1);
      
      headers.set('Content-Range', `bytes ${start}-${end}/${fileBuffer.length}`);
      headers.set('Content-Length', chunkSize.toString());
      
      return new NextResponse(chunk, {
        status: 206, // Partial Content
        headers
      });
    }
    
    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    });
    
  } catch (error) {
    console.error('❌ [CASS Files] Error al servir archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
