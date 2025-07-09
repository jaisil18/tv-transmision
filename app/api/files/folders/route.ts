import { NextRequest, NextResponse } from 'next/server';
import { getFileSystemManager } from '@/lib/file-system-manager';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    console.log('📁 [Folders API] Solicitando lista de carpetas');
    
    const fileManager = getFileSystemManager();
    const folders = await fileManager.getFolders();
    const stats = await fileManager.getStats();
    
    console.log(`✅ [Folders API] Carpetas listadas: ${folders.length} carpetas encontradas`);
    
    return NextResponse.json({
      success: true,
      folders,
      stats,
      total: folders.length
    });
    
  } catch (error) {
    console.error('❌ [Folders API] Error al listar carpetas:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener lista de carpetas',
        folders: [],
        stats: {
          totalFolders: 0,
          totalFiles: 0,
          totalSize: 0,
          videoFiles: 0,
          imageFiles: 0
        },
        total: 0
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { folderName } = await request.json();
    
    console.log(`📁 [Folders API] Creando carpeta: ${folderName}`);
    
    if (!folderName || typeof folderName !== 'string') {
      return NextResponse.json(
        { 
          success: false,
          error: 'Nombre de carpeta requerido'
        },
        { status: 400 }
      );
    }
    
    const fileManager = getFileSystemManager();
    const result = await fileManager.createFolder(folderName);
    
    if (result.success) {
      console.log(`✅ [Folders API] Carpeta creada exitosamente: ${folderName}`);
      return NextResponse.json(result);
    } else {
      console.log(`❌ [Folders API] Error al crear carpeta: ${result.message}`);
      return NextResponse.json(result, { status: 400 });
    }
    
  } catch (error) {
    console.error('❌ [Folders API] Error al crear carpeta:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error interno al crear carpeta'
      },
      { status: 500 }
    );
  }
}
