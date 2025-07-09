import { NextRequest, NextResponse } from 'next/server';
import { getFileSystemManager } from '@/lib/file-system-manager';

interface RouteParams {
  params: Promise<{
    folder: string;
  }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const resolvedParams = await params;
    const folderName = decodeURIComponent(resolvedParams.folder);
    
    console.log(`📁 [Folder API] Solicitando archivos de carpeta: ${folderName}`);
    
    const fileManager = getFileSystemManager();
    const files = await fileManager.getFilesInFolder(folderName);
    const folderInfo = await fileManager.getFolderInfo(folderName);
    
    // Obtener parámetros de consulta
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'video' | 'image' | 'other'
    const search = searchParams.get('search'); // filtro de búsqueda
    
    let filteredFiles = files;
    
    // Filtrar por tipo si se especifica
    if (type && type !== 'all') {
      if (type === 'directory') {
        filteredFiles = filteredFiles.filter(file => file.type === 'directory');
      } else {
        filteredFiles = filteredFiles.filter(file => file.mediaType === type);
      }
    }
    
    // Filtrar por búsqueda si se especifica
    if (search) {
      const searchLower = search.toLowerCase();
      filteredFiles = filteredFiles.filter(file => 
        file.name.toLowerCase().includes(searchLower)
      );
    }
    
    console.log(`✅ [Folder API] Archivos listados: ${filteredFiles.length} de ${files.length} en ${folderName}`);
    
    return NextResponse.json({
      success: true,
      folder: folderInfo,
      files: filteredFiles,
      total: filteredFiles.length,
      filters: {
        type: type || 'all',
        search: search || ''
      }
    });
    
  } catch (error) {
    console.error('❌ [Folder API] Error al listar archivos:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error al obtener archivos de la carpeta',
        files: [],
        total: 0
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const resolvedParams = await params;
    const folderName = decodeURIComponent(resolvedParams.folder);

    // Verificar si es eliminación de carpeta o archivo específico
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('file');

    const fileManager = getFileSystemManager();

    if (fileName) {
      // Eliminar archivo específico
      console.log(`🗑️ [Folder API] Eliminando archivo: ${fileName} de carpeta: ${folderName}`);
      const result = await fileManager.deleteFile(folderName, fileName);

      if (result.success) {
        console.log(`✅ [Folder API] Archivo eliminado exitosamente: ${fileName}`);
        return NextResponse.json(result);
      } else {
        console.log(`❌ [Folder API] Error al eliminar archivo: ${result.message}`);
        return NextResponse.json(result, { status: 400 });
      }
    } else {
      // Eliminar carpeta completa
      console.log(`🗑️ [Folder API] Eliminando carpeta: ${folderName}`);
      const result = await fileManager.deleteFolder(folderName);

      if (result.success) {
        console.log(`✅ [Folder API] Carpeta eliminada exitosamente: ${folderName}`);
        return NextResponse.json(result);
      } else {
        console.log(`❌ [Folder API] Error al eliminar carpeta: ${result.message}`);
        return NextResponse.json(result, { status: 400 });
      }
    }

  } catch (error) {
    console.error('❌ [Folder API] Error al eliminar carpeta:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al eliminar carpeta'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const resolvedParams = await params;
    const folderName = decodeURIComponent(resolvedParams.folder);

    console.log(`📤 [Folder API] Subiendo archivos a carpeta: ${folderName}`);

    const formData = await request.formData();
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se proporcionaron archivos'
        },
        { status: 400 }
      );
    }

    const fileManager = getFileSystemManager();
    const results = [];

    for (const file of files) {
      try {
        const result = await fileManager.uploadFile(folderName, file);
        results.push({
          fileName: file.name,
          success: result.success,
          message: result.message,
          url: result.url
        });

        if (result.success) {
          console.log(`✅ [Folder API] Archivo subido: ${file.name} a ${folderName}`);
        } else {
          console.log(`❌ [Folder API] Error subiendo ${file.name}: ${result.message}`);
        }
      } catch (error) {
        console.error(`❌ [Folder API] Error procesando archivo ${file.name}:`, error);
        results.push({
          fileName: file.name,
          success: false,
          message: 'Error interno al procesar archivo'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const totalCount = results.length;

    return NextResponse.json({
      success: successCount > 0,
      message: `${successCount} de ${totalCount} archivos subidos exitosamente`,
      results,
      uploaded: successCount,
      total: totalCount
    });

  } catch (error) {
    console.error('❌ [Folder API] Error en operación POST:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}
