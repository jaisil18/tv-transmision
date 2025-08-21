import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; filename: string }> }
) {
  try {
    const { id: screenId, filename } = await params;
    
    // Validar parámetros
    if (!screenId || !filename) {
      return NextResponse.json(
        { error: 'ID de pantalla y nombre de archivo son requeridos' },
        { status: 400 }
      );
    }

    // Decodificar el nombre del archivo por si tiene caracteres especiales
    const decodedFilename = decodeURIComponent(filename);
    
    // Buscar el archivo en los subdirectorios
    const mosaicsDir = path.join(process.cwd(), 'public', 'content', 'mosaics', screenId);
    const possiblePaths = [
      path.join(mosaicsDir, decodedFilename), // Carpeta raíz (archivos antiguos)
      path.join(mosaicsDir, 'mosaico1', decodedFilename), // Subdirectorio mosaico1
      path.join(mosaicsDir, 'mosaico2', decodedFilename)  // Subdirectorio mosaico2
    ];
    
    let filePath: string | null = null;
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        filePath = possiblePath;
        break;
      }
    }
    
    // Verificar que el archivo existe
    if (!filePath) {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar que el archivo está dentro del directorio permitido (seguridad)
    const mosaicoDir = path.join(process.cwd(), 'public', 'content', 'mosaics', screenId);
    const resolvedFilePath = path.resolve(filePath);
    const resolvedMosaicoDir = path.resolve(mosaicoDir);
    
    if (!resolvedFilePath.startsWith(resolvedMosaicoDir)) {
      return NextResponse.json(
        { error: 'Ruta de archivo no válida' },
        { status: 403 }
      );
    }
    
    // Eliminar el archivo
    fs.unlinkSync(filePath);
    
    console.log(`Archivo eliminado: ${filePath}`);
    
    return NextResponse.json({
      success: true,
      message: `Archivo ${decodedFilename} eliminado correctamente`
    });
    
  } catch (error) {
    console.error('Error al eliminar archivo de mosaico:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor al eliminar archivo' },
      { status: 500 }
    );
  }
}