import { NextRequest, NextResponse } from 'next/server';
import { getFileMonitorSafe } from '@/lib/file-monitor';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📁 [CASS API] Solicitando lista de archivos CASS');
    
    const monitor = await getFileMonitorSafe();
    const files = monitor.getFiles();
    
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'video' | 'image'
    const search = searchParams.get('search'); // filtro de búsqueda
    
    let filteredFiles = files;
    
    // Filtrar por tipo si se especifica
    if (type && (type === 'video' || type === 'image')) {
      filteredFiles = filteredFiles.filter(file => file.type === type);
    }
    
    // Filtrar por búsqueda si se especifica
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFiles = filteredFiles.filter(file => 
        file.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Ordenar por nombre
    filteredFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    const response = {
      success: true,
      files: filteredFiles,
      total: filteredFiles.length,
      filters: {
        type: type || 'all',
        search: search || ''
      },
      stats: {
        totalFiles: files.length,
        videos: files.filter(f => f.type === 'video').length,
        images: files.filter(f => f.type === 'image').length
      }
    };
    
    console.log(`✅ [CASS API] Archivos listados: ${filteredFiles.length} de ${files.length} total`);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [CASS API] Error al listar archivos:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener lista de archivos',
        files: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('🔄 [CASS API] Solicitando rescan de archivos');
    
    const monitor = await getFileMonitorSafe();
    
    // Forzar un nuevo escaneo
    await monitor.start(); // Esto hará un rescan si ya está iniciado
    
    const files = monitor.getFiles();
    
    console.log(`✅ [CASS API] Rescan completado: ${files.length} archivos encontrados`);
    
    return NextResponse.json({
      success: true,
      message: 'Rescan completado',
      files: files,
      total: files.length
    });
    
  } catch (error) {
    console.error('❌ [CASS API] Error en rescan:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al hacer rescan de archivos'
      },
      { status: 500 }
    );
  }
}
