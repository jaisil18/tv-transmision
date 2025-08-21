import { NextResponse } from 'next/server';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const PLAYLISTS_FILE = join(process.cwd(), 'data', 'playlists.json');
const SCREENS_FILE = join(process.cwd(), 'data', 'screens.json');
const BASE_PATH = '/home/uct/Música';

// GET /api/debug/screen-content/[screenId] - Diagnóstico completo de contenido
export async function GET(
  request: Request,
  { params }: { params: Promise<{ screenId: string }> }
) {
  const { screenId } = await params;

  try {
    console.log(`🔍 [Debug] Diagnosticando contenido para pantalla ${screenId}`);
    
    const diagnosis = {
      screenId,
      timestamp: new Date().toISOString(),
      screen: null as any,
      playlist: null as any,
      folder: null as any,
      files: [] as any[],
      errors: [] as string[],
      warnings: [] as string[]
    };

    // 1. Verificar que la pantalla existe
    try {
      const screensContent = await readFile(SCREENS_FILE, 'utf-8');
      const screens = JSON.parse(screensContent);
      diagnosis.screen = screens.find((s: any) => s.id === screenId);
      
      if (!diagnosis.screen) {
        diagnosis.errors.push(`Pantalla ${screenId} no encontrada en screens.json`);
        return NextResponse.json(diagnosis);
      }
      
      console.log(`✅ [Debug] Pantalla encontrada: ${diagnosis.screen.name}`);
    } catch (error) {
      diagnosis.errors.push(`Error leyendo screens.json: ${error}`);
      return NextResponse.json(diagnosis);
    }

    // 2. Buscar playlist asignada
    try {
      const playlistsContent = await readFile(PLAYLISTS_FILE, 'utf-8');
      const playlists = JSON.parse(playlistsContent);
      diagnosis.playlist = playlists.find((p: any) => p.screens?.includes(screenId));
      
      if (!diagnosis.playlist) {
        diagnosis.errors.push(`No hay playlist asignada a la pantalla ${screenId}`);
        return NextResponse.json(diagnosis);
      }
      
      console.log(`✅ [Debug] Playlist encontrada: ${diagnosis.playlist.name}`);
    } catch (error) {
      diagnosis.errors.push(`Error leyendo playlists.json: ${error}`);
      return NextResponse.json(diagnosis);
    }

    // 3. Verificar carpeta asignada
    if (!diagnosis.playlist.folder) {
      diagnosis.errors.push(`La playlist ${diagnosis.playlist.name} no tiene carpeta asignada`);
      return NextResponse.json(diagnosis);
    }

    const folderPath = join(BASE_PATH, diagnosis.playlist.folder);
    console.log(`📁 [Debug] Verificando carpeta: ${folderPath}`);

    try {
      const folderStats = await stat(folderPath);
      if (!folderStats.isDirectory()) {
        diagnosis.errors.push(`${folderPath} no es una carpeta válida`);
        return NextResponse.json(diagnosis);
      }
      
      diagnosis.folder = {
        name: diagnosis.playlist.folder,
        path: folderPath,
        exists: true,
        created: folderStats.birthtime,
        modified: folderStats.mtime
      };
      
      console.log(`✅ [Debug] Carpeta existe: ${diagnosis.playlist.folder}`);
    } catch (error) {
      diagnosis.errors.push(`Carpeta ${folderPath} no existe o no es accesible: ${error}`);
      return NextResponse.json(diagnosis);
    }

    // 4. Listar archivos en la carpeta
    try {
      const files = await readdir(folderPath);
      console.log(`📄 [Debug] Archivos encontrados: ${files.length}`);
      
      const mediaExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
      
      for (const fileName of files) {
        const filePath = join(folderPath, fileName);
        const fileStats = await stat(filePath);
        const ext = extname(fileName).toLowerCase();
        
        const isMedia = mediaExtensions.includes(ext);
        const isVideo = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp'].includes(ext);
        const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
        
        const fileInfo = {
          name: fileName,
          path: filePath,
          size: fileStats.size,
          modified: fileStats.mtime,
          extension: ext,
          isMedia,
          isVideo,
          isImage,
          url: isMedia ? `http://172.16.31.17:3000/api/files/media/${encodeURIComponent(join(diagnosis.playlist.folder, fileName))}` : null
        };
        
        diagnosis.files.push(fileInfo);
        
        if (isMedia) {
          console.log(`📹 [Debug] Archivo multimedia: ${fileName} (${isVideo ? 'video' : 'imagen'})`);
        }
      }
      
      const mediaFiles = diagnosis.files.filter(f => f.isMedia);
      const videoFiles = diagnosis.files.filter(f => f.isVideo);
      
      if (mediaFiles.length === 0) {
        diagnosis.warnings.push(`No hay archivos multimedia en la carpeta ${diagnosis.playlist.folder}`);
      }
      
      if (videoFiles.length === 0) {
        diagnosis.warnings.push(`No hay videos en la carpeta ${diagnosis.playlist.folder} (solo se encontraron ${mediaFiles.length} archivos multimedia)`);
      }
      
    } catch (error) {
      diagnosis.errors.push(`Error listando archivos en ${folderPath}: ${error}`);
    }

    // 5. Verificar items en la playlist
    const playlistItems = diagnosis.playlist.items || [];
    if (playlistItems.length === 0) {
      diagnosis.warnings.push(`La playlist ${diagnosis.playlist.name} tiene items vacíos. Necesita actualización.`);
    } else {
      console.log(`📋 [Debug] Playlist tiene ${playlistItems.length} items configurados`);
    }

    // 6. Generar recomendaciones
    const recommendations = [];
    
    if (diagnosis.files.filter(f => f.isVideo).length > 0 && playlistItems.length === 0) {
      recommendations.push('Ejecutar /api/debug/refresh-playlists para actualizar la playlist con los archivos encontrados');
    }
    
    if (diagnosis.files.length === 0) {
      recommendations.push(`Subir archivos multimedia a la carpeta ${folderPath}`);
    }
    
    diagnosis.warnings.push(...recommendations);

    return NextResponse.json({
      success: true,
      diagnosis,
      summary: {
        screenExists: !!diagnosis.screen,
        playlistExists: !!diagnosis.playlist,
        folderExists: !!diagnosis.folder,
        totalFiles: diagnosis.files.length,
        mediaFiles: diagnosis.files.filter(f => f.isMedia).length,
        videoFiles: diagnosis.files.filter(f => f.isVideo).length,
        playlistItems: playlistItems.length,
        hasErrors: diagnosis.errors.length > 0,
        hasWarnings: diagnosis.warnings.length > 0
      }
    });

  } catch (error) {
    console.error('❌ [Debug] Error en diagnóstico:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error en diagnóstico',
        details: error instanceof Error ? error.message : 'Error desconocido',
        screenId
      },
      { status: 500 }
    );
  }
}
