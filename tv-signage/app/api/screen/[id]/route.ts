import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { getFileInfo, CONTENT_TYPES } from '@/utils/file-metadata';

export const dynamic = 'force-dynamic';

// Función auxiliar para verificar si una pantalla existe
async function validateScreen(screenId: string): Promise<boolean> {
  try {
    const screensContent = await fs.readFile(path.join(process.cwd(), 'data', 'screens.json'), 'utf-8');
    const screens = JSON.parse(screensContent);
    return screens.some((s: any) => s.id === screenId);
  } catch {
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    // Asegurarnos de que el ID existe
    if (!id) {
      return NextResponse.json(
        { error: 'ID de pantalla no proporcionado' },
        { status: 400 }
      );
    }

    const screenId = id;
    const searchParams = new URL(request.url).searchParams;

    // Validar que la pantalla existe
    const screenExists = await validateScreen(screenId);
    if (!screenExists) {
      return NextResponse.json(
        { error: 'Pantalla no registrada en el sistema' },
        { status: 404 }
      );
    }

    // Si se solicita la lista de archivos
    if (searchParams.get('list') === 'true') {
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
      
      try {
        const files = await fs.readdir(uploadsDir);
        const fileInfoPromises = files.map(filename => getFileInfo(filename, uploadsDir));
        const filesInfo = await Promise.all(fileInfoPromises);
        
        return NextResponse.json({ files: filesInfo });
      } catch (error) {
        console.error('Error al listar archivos:', error);
        return NextResponse.json({ files: [] });
      }
    }

    // Si se solicita un archivo específico
    const filename = searchParams.get('filename');
    if (filename) {
      const filePath = path.join(process.cwd(), 'public', 'uploads', filename);
      
      try {
        await fs.access(filePath);
        const ext = path.extname(filename).toLowerCase();
        const contentType = CONTENT_TYPES[ext as keyof typeof CONTENT_TYPES];
        
        if (!contentType) {
          return NextResponse.json(
            { error: 'Tipo de archivo no soportado' },
            { status: 400 }
          );
        }
        
        const fileInfo = await getFileInfo(filename, path.dirname(filePath));
        return NextResponse.json(fileInfo);
      } catch (error) {
        console.error('Error al leer el archivo:', error);
        return NextResponse.json(
          { error: 'Archivo no encontrado o no accesible' },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Solicitud inválida' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error en la ruta de pantalla:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: screenId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: 'Nombre de archivo no proporcionado' },
        { status: 400 }
      );
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    try {
      await fs.access(filePath);
      await fs.unlink(filePath);
      return NextResponse.json({ success: true });
    } catch {
      return NextResponse.json(
        { error: 'Archivo no encontrado' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Error al eliminar el archivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
