import { NextResponse } from 'next/server';
import { readFile, writeFile, readdir, stat } from 'fs/promises';
import { join, extname } from 'path';
import { BASE_PATH } from '@/lib/path-config'; // ✅ Usando alias absoluto

const PLAYLISTS_FILE = join(process.cwd(), 'data', 'playlists.json');

interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'image';
  duration?: number;
  size?: number;
  modified?: number;
}

interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  screens: string[];
  folder?: string;
  createdAt: number;
  updatedAt: number;
}

// GET /api/debug/refresh-playlists - Actualizar playlists con contenido real
export async function GET() {
  try {
    console.log('🔄 [Refresh] Actualizando playlists con contenido real...');
    
    // Leer playlists existentes
    const playlistsContent = await readFile(PLAYLISTS_FILE, 'utf-8');
    const playlists: Playlist[] = JSON.parse(playlistsContent);
    
    const results = [];
    
    for (const playlist of playlists) {
      if (!playlist.folder) {
        results.push({
          playlistId: playlist.id,
          name: playlist.name,
          success: false,
          message: 'Playlist no tiene carpeta asignada'
        });
        continue;
      }
      
      console.log(`📋 [Refresh] Procesando playlist: ${playlist.name} (carpeta: ${playlist.folder})`);
      
      try {
        const folderPath = join(BASE_PATH, playlist.folder);
        
        // Verificar que la carpeta existe
        await stat(folderPath);
        
        // Leer archivos de la carpeta
        const files = await readdir(folderPath);
        const mediaExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
        
        const mediaFiles = files.filter(file => 
          mediaExtensions.includes(extname(file).toLowerCase())
        );
        
        console.log(`📁 [Refresh] Archivos encontrados en ${playlist.folder}: ${mediaFiles.length}`);
        
        // Crear items de playlist
        const items: PlaylistItem[] = [];
        
        for (const fileName of mediaFiles) {
          const filePath = join(folderPath, fileName);
          const fileStats = await stat(filePath);
          const ext = extname(fileName).toLowerCase();
          
          const isVideo = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp'].includes(ext);
          const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
          
          if (isVideo || isImage) {
            const relativePath = join(playlist.folder, fileName);
            const item: PlaylistItem = {
              id: `${playlist.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: fileName,
              url: `http://172.16.31.17:3000/api/files/media/${encodeURIComponent(relativePath)}`,
              type: isVideo ? 'video' : 'image',
              duration: isVideo ? 30 : 5, // 30s para videos, 5s para imágenes
              size: fileStats.size,
              modified: fileStats.mtime.getTime()
            };
            
            items.push(item);
            console.log(`📄 [Refresh] Agregado: ${fileName} (${item.type})`);
          }
        }
        
        // Actualizar playlist
        playlist.items = items;
        playlist.updatedAt = Date.now();
        
        results.push({
          playlistId: playlist.id,
          name: playlist.name,
          folder: playlist.folder,
          success: true,
          itemsFound: items.length,
          items: items.map(i => ({ name: i.name, type: i.type, url: i.url }))
        });
        
        console.log(`✅ [Refresh] Playlist actualizada: ${playlist.name} con ${items.length} elementos`);
        
      } catch (error) {
        console.error(`❌ [Refresh] Error procesando ${playlist.name}:`, error);
        results.push({
          playlistId: playlist.id,
          name: playlist.name,
          folder: playlist.folder,
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }
    
    // Guardar playlists actualizadas
    await writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    
    console.log('✅ [Refresh] Todas las playlists actualizadas');
    
    return NextResponse.json({
      success: true,
      message: 'Playlists actualizadas con contenido real',
      results,
      totalPlaylists: playlists.length,
      successfulUpdates: results.filter(r => r.success).length
    });
    
  } catch (error) {
    console.error('❌ [Refresh] Error actualizando playlists:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error actualizando playlists',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST /api/debug/refresh-playlists - Forzar actualización de una playlist específica
export async function POST(request: Request) {
  try {
    const { playlistId, folder } = await request.json();
    
    if (!playlistId && !folder) {
      return NextResponse.json(
        { error: 'playlistId o folder requerido' },
        { status: 400 }
      );
    }
    
    console.log(`🔄 [Refresh] Actualizando playlist específica: ${playlistId || folder}`);
    
    // Leer playlists
    const playlistsContent = await readFile(PLAYLISTS_FILE, 'utf-8');
    const playlists: Playlist[] = JSON.parse(playlistsContent);
    
    // Encontrar playlist
    const playlist = playlists.find(p => 
      p.id === playlistId || p.folder === folder
    );
    
    if (!playlist) {
      return NextResponse.json(
        { error: 'Playlist no encontrada' },
        { status: 404 }
      );
    }
    
    if (!playlist.folder) {
      return NextResponse.json(
        { error: 'Playlist no tiene carpeta asignada' },
        { status: 400 }
      );
    }
    
    // Actualizar contenido
    const folderPath = join(BASE_PATH, playlist.folder);
    const files = await readdir(folderPath);
    const mediaExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    
    const mediaFiles = files.filter(file => 
      mediaExtensions.includes(extname(file).toLowerCase())
    );
    
    const items: PlaylistItem[] = [];
    
    for (const fileName of mediaFiles) {
      const filePath = join(folderPath, fileName);
      const fileStats = await stat(filePath);
      const ext = extname(fileName).toLowerCase();
      
      const isVideo = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp'].includes(ext);
      const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext);
      
      if (isVideo || isImage) {
        const relativePath = join(playlist.folder, fileName);
        const item: PlaylistItem = {
          id: `${playlist.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: fileName,
          url: `http://172.16.31.17:3000/api/files/media/${encodeURIComponent(relativePath)}`,
          type: isVideo ? 'video' : 'image',
          duration: isVideo ? 30 : 5,
          size: fileStats.size,
          modified: fileStats.mtime.getTime()
        };
        
        items.push(item);
      }
    }
    
    // Actualizar playlist
    playlist.items = items;
    playlist.updatedAt = Date.now();
    
    // Guardar
    await writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    
    return NextResponse.json({
      success: true,
      message: `Playlist ${playlist.name} actualizada`,
      playlist: {
        id: playlist.id,
        name: playlist.name,
        folder: playlist.folder,
        itemsCount: items.length,
        items: items.map(i => ({ name: i.name, type: i.type }))
      }
    });
    
  } catch (error) {
    console.error('❌ [Refresh] Error actualizando playlist específica:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error actualizando playlist',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
