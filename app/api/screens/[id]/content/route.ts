import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Screen } from '@/types/screen';
import type { Playlist } from '@/app/api/playlists/route';
import { getFileSystemManager, resetFileSystemManager } from '@/lib/file-system-manager';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');
const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');

// GET /api/screens/[id]/content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    console.log(`📋 [Content API] Solicitando contenido para pantalla: ${id}`);

    // Resetear instancia del FileSystemManager para usar configuración actualizada
    resetFileSystemManager();

    // Validar el ID de la pantalla
    if (!id) {
      console.error(`❌ [Content API] ID de pantalla no proporcionado`);
      return NextResponse.json(
        { error: 'ID de pantalla no proporcionado' },
        { status: 400 }
      );
    }

    // Leer el archivo de playlists
    console.log(`📋 [Content API] Leyendo archivo de playlists: ${PLAYLISTS_FILE}`);
    const playlistsContent = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
    const playlists: Playlist[] = JSON.parse(playlistsContent);
    console.log(`📋 [Content API] Playlists encontradas: ${playlists.length}`);

    // Encontrar la playlist asignada a esta pantalla
    const assignedPlaylist = playlists.find((p) => p.screens?.includes(id));
    console.log(`📋 [Content API] Playlist asignada encontrada:`, assignedPlaylist ? assignedPlaylist.name : 'Ninguna');

    if (!assignedPlaylist) {
      console.log(`📋 [Content API] No hay playlist asignada para pantalla ${id}`);
      return NextResponse.json({ items: [] });
    }

    // Verificar si la playlist tiene una carpeta asignada
    const playlistFolder = (assignedPlaylist as any).folder;

    if (playlistFolder) {
      // Modo carpeta: obtener todos los archivos de la carpeta específica
      console.log(`📁 [Content API] Playlist con carpeta asignada: ${playlistFolder}`);

      const fileManager = getFileSystemManager();
      const folderFiles = await fileManager.getFilesInFolder(playlistFolder);
      const mediaFiles = folderFiles.filter(f => f.type === 'file' && (f.mediaType === 'video' || f.mediaType === 'image'));

      console.log(`📁 [Content API] Archivos encontrados en carpeta ${playlistFolder}: ${mediaFiles.length}`);

      if (mediaFiles.length === 0) {
        console.log(`⚠️ [Content API] No hay archivos multimedia en la carpeta ${playlistFolder}`);
        return NextResponse.json({
          items: [],
          warning: `No se encontraron archivos multimedia en la carpeta "${playlistFolder}"`
        });
      }

      // Mapear archivos de carpeta a formato de playlist
      const folderItems = mediaFiles.map(file => ({
        id: `folder-${file.name}`,
        name: file.name,
        url: file.url,
        type: file.mediaType,
        duration: file.mediaType === 'image' ? 10 : undefined, // 10 segundos para imágenes
        folder: playlistFolder
      }));

      console.log(`✅ [Content API] Reproduciendo carpeta completa: ${folderItems.length} archivos`);

      return NextResponse.json({
        items: folderItems,
        playlistName: assignedPlaylist.name,
        mode: 'folder',
        folder: playlistFolder
      });

    } else {
      // Modo manual: usar archivos específicos de la playlist
      console.log(`📋 [Content API] Playlist con contenido manual`);

      const fileManager = getFileSystemManager();
      const folders = await fileManager.getFolders();

      // Recopilar todos los archivos de todas las carpetas
      const allFiles: any[] = [];
      for (const folder of folders) {
        const folderFiles = await fileManager.getFilesInFolder(folder.name);
        allFiles.push(...folderFiles.filter(f => f.type === 'file'));
      }

      console.log(`📁 [Content API] Archivos encontrados en sistema: ${allFiles.length}`);

      // Filtrar solo los archivos que están en la playlist
      const validItems = assignedPlaylist.items.filter(item => {
        // Buscar el archivo por nombre en cualquier carpeta
        const foundFile = allFiles.find(file => file.name === item.name);
        if (foundFile) {
          console.log(`✅ [Content API] Archivo encontrado: ${item.name} en ${foundFile.relativePath}`);
          return true;
        } else {
          console.log(`❌ [Content API] Archivo NO encontrado: ${item.name}`);
          return false;
        }
      });

      // Mapear items válidos a URLs del sistema de archivos
      const mappedItems = validItems.map(item => {
        const foundFile = allFiles.find(file => file.name === item.name);
        return {
          ...item,
          url: foundFile ? foundFile.url : item.url, // Usar URL del sistema de archivos
          type: foundFile ? foundFile.mediaType : item.type,
          folder: foundFile ? foundFile.relativePath.split('/')[0] : 'unknown'
        };
      });

      console.log(`📋 [Content API] Items válidos encontrados: ${mappedItems.length} de ${assignedPlaylist.items.length}`);

      if (mappedItems.length === 0) {
        console.log(`⚠️ [Content API] No hay archivos válidos para la playlist ${assignedPlaylist.name}`);
        return NextResponse.json({
          items: [],
          warning: `No se encontraron archivos de la playlist "${assignedPlaylist.name}" en el sistema de archivos`
        });
      }

      return NextResponse.json({
        items: mappedItems,
        playlistName: assignedPlaylist.name,
        mode: 'manual'
      });
    }
  } catch (error) {
    console.error('Error al obtener el contenido de la pantalla:', error);
    return NextResponse.json(
      { error: 'Error al obtener el contenido de la pantalla' },
      { status: 500 }
    );
  }
}
