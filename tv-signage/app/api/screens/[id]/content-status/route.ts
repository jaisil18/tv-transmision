import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Playlist } from '@/app/api/playlists/route';
import { getFileSystemManager } from '@/lib/file-system-manager';

const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');

// Cache simple para evitar recalcular constantemente
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = 60000; // 60 segundos de cache para reducir carga

function getCachedData(key: string) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  return null;
}

function setCachedData(key: string, data: any, ttl: number = CACHE_TTL) {
  cache.set(key, { data, timestamp: Date.now(), ttl });
}

// GET /api/screens/[id]/content-status - Obtener estado del contenido para polling
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    // Verificar cache primero
    const cacheKey = `content-status-${id}`;
    const cachedResult = getCachedData(cacheKey);
    if (cachedResult) {
      // Logs deshabilitados para reducir carga del servidor
      // if (process.env.NODE_ENV === 'development') {
      //   console.log(`💾 [Content Status] Usando cache para pantalla ${id}`);
      // }
      return NextResponse.json(cachedResult);
    }

    // Logs deshabilitados para producción - solo en desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 [Content Status] Verificando estado para pantalla ${id}`);
    }

    // Leer playlists
    const playlistsContent = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
    const playlists: Playlist[] = JSON.parse(playlistsContent);
    
    // Encontrar playlist asignada
    const assignedPlaylist = playlists.find((p) => p.screens?.includes(id));

    if (!assignedPlaylist) {
      // Si no hay playlist, intentar auto-detectar archivos
      try {
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        const files = await fs.readdir(uploadsDir);
        const mediaFiles = files.filter(file => {
          const ext = path.extname(file).toLowerCase();
          return ['.mp4', '.webm', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
        });

        if (mediaFiles.length > 0) {
          // Obtener información de los archivos para generar hash
          const fileStats = await Promise.all(
            mediaFiles.map(async (file) => {
              const filePath = path.join(uploadsDir, file);
              const stats = await fs.stat(filePath);
              return {
                name: file,
                size: stats.size,
                modified: stats.mtime.getTime()
              };
            })
          );

          // Generar hash basado en archivos
          const contentHash = Buffer.from(
            JSON.stringify(fileStats.sort((a, b) => a.name.localeCompare(b.name)))
          ).toString('base64');

          const lastModified = Math.max(...fileStats.map(f => f.modified));

          return NextResponse.json({
            hasContent: true,
            contentHash,
            lastModified,
            itemCount: mediaFiles.length,
            playlistName: 'Auto-detectado',
            files: fileStats.map(f => f.name)
          });
        }
      } catch (error) {
        console.error('❌ [Content Status] Error en auto-detección:', error);
      }

      return NextResponse.json({
        hasContent: false,
        contentHash: null,
        lastModified: 0,
        itemCount: 0,
        playlistName: null,
        files: []
      });
    }

    // Verificar si la playlist tiene una carpeta asignada
    const playlistFolder = (assignedPlaylist as any).folder;
    let validItems: any[] = [];

    if (playlistFolder) {
      // Modo carpeta: obtener todos los archivos de la carpeta específica
      try {
        const fileManager = getFileSystemManager();
        const folderFiles = await fileManager.getFilesInFolder(playlistFolder);
        const mediaFiles = folderFiles.filter(f => f.type === 'file' && (f.mediaType === 'video' || f.mediaType === 'image'));

        validItems = mediaFiles.map(file => ({
          name: file.name,
          size: file.size || 0,
          modified: file.modified || Date.now(),
          url: file.url,
          type: file.mediaType
        }));

        if (process.env.NODE_ENV === 'development') {
          console.log(`📁 [Content Status] Archivos encontrados en carpeta ${playlistFolder}: ${validItems.length}`);
        }
      } catch (error) {
        console.error(`❌ [Content Status] Error al obtener archivos de carpeta ${playlistFolder}:`, error);
      }
    } else {
      // Modo manual: verificar archivos específicos de la playlist
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

      for (const item of assignedPlaylist.items) {
        try {
          const fileName = item.url.replace('/uploads/', '');
          const filePath = path.join(uploadsDir, fileName);
          const stats = await fs.stat(filePath);

          validItems.push({
            name: fileName,
            size: stats.size,
            modified: stats.mtime.getTime(),
            url: item.url,
            type: item.type
          });
        } catch (error) {
          console.warn(`⚠️ [Content Status] Archivo no encontrado: ${item.name}`);
        }
      }
    }

    // Generar hash del contenido válido
    const contentHash = Buffer.from(
      JSON.stringify({
        playlist: assignedPlaylist.name,
        folder: playlistFolder || null,
        mode: playlistFolder ? 'folder' : 'manual',
        items: validItems.sort((a, b) => a.name.localeCompare(b.name)),
        updatedAt: assignedPlaylist.updatedAt
      })
    ).toString('base64');

    const lastModified = validItems.length > 0 
      ? Math.max(...validItems.map(f => f.modified), assignedPlaylist.updatedAt)
      : assignedPlaylist.updatedAt;

    const response = {
      hasContent: validItems.length > 0,
      contentHash,
      lastModified,
      itemCount: validItems.length,
      playlistName: assignedPlaylist.name,
      files: validItems.map(f => f.name)
    };

    // Solo log en modo desarrollo
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ [Content Status] Estado para pantalla ${id}:`, {
        hasContent: response.hasContent,
        itemCount: response.itemCount,
        playlist: response.playlistName
      });
    }

    // Guardar en cache
    setCachedData(cacheKey, response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ [Content Status] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado del contenido' },
      { status: 500 }
    );
  }
}
