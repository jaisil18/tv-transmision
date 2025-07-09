import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { updateScreensStatus } from '@/utils/screens';
// Auto-refresh funcionalidad removida para simplificar

export interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration?: number; // duración en segundos para imágenes
}

export interface Playlist {
  id: string;
  name: string;
  items: PlaylistItem[];
  screens: string[]; // IDs de las pantallas asignadas
  createdAt: number;
  updatedAt: number;
  folder?: string; // Nueva propiedad para carpeta
}

const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');

// Asegurarse de que el directorio y archivo existan
async function ensurePlaylistsFile() {
  const dir = path.dirname(PLAYLISTS_FILE);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(PLAYLISTS_FILE);
  } catch {
    await fs.writeFile(PLAYLISTS_FILE, JSON.stringify([]));
  }
}

// GET /api/playlists
export async function GET() {
  try {
    await ensurePlaylistsFile();
    const content = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
    const playlists: Playlist[] = JSON.parse(content);
    return NextResponse.json(playlists);
  } catch (error) {
    console.error('Error al leer las listas de reproducción:', error);
    return NextResponse.json(
      { error: 'Error al obtener las listas de reproducción' },
      { status: 500 }
    );
  }
}

// POST /api/playlists
export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido y no puede estar vacío.' }, { status: 400 });
    }

    await ensurePlaylistsFile();
    const content = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
    const playlists: Playlist[] = JSON.parse(content);

    const newPlaylist: Playlist = {
      id: Date.now().toString(),
      name: data.name,
      items: data.items || [],
      screens: data.screens || [],
      folder: data.folder || undefined, // Incluir el campo folder
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    playlists.push(newPlaylist);
    await fs.writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));

    // Actualizar estado de las pantallas asignadas
    if (newPlaylist.screens.length > 0) {
      await updateScreensStatus(newPlaylist.screens, 'active');
    }

    // Auto-refresh notification removida

    return NextResponse.json(newPlaylist);
  } catch (error) {
    console.error('Error al crear la lista de reproducción:', error);
    return NextResponse.json(
      { error: 'Error al crear la lista de reproducción' },
      { status: 500 }
    );
  }
}

// PUT /api/playlists/:id
export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const content = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
    let playlists: Playlist[] = JSON.parse(content);

    // Encontrar la playlist existente
    const index = playlists.findIndex(p => p.id === data.id);
    if (index === -1) {
      return NextResponse.json(
        { error: 'Lista de reproducción no encontrada' },
        { status: 404 }
      );
    }

    // Obtener las pantallas que ya no están asignadas
    const removedScreens = playlists[index].screens.filter(
      id => !data.screens.includes(id)
    );

    // Actualizar la playlist
    playlists[index] = {
      ...playlists[index],
      ...data,
      updatedAt: Date.now(),
    };

    await fs.writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));

    // Actualizar estados de las pantallas
    if (data.screens.length > 0) {
      await updateScreensStatus(data.screens, 'active');
    }
    if (removedScreens.length > 0) {
      // Verificar si las pantallas removidas están asignadas a otras playlists
      const otherPlaylistScreens = playlists
        .filter(p => p.id !== data.id)
        .flatMap(p => p.screens);
      const screensToDeactivate = removedScreens.filter(
        id => !otherPlaylistScreens.includes(id)
      );
      if (screensToDeactivate.length > 0) {
        await updateScreensStatus(screensToDeactivate, 'inactive');
      }
    }

    // Auto-refresh notification removida

    return NextResponse.json(playlists[index]);
  } catch (error) {
    console.error('Error al actualizar la lista de reproducción:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la lista de reproducción' },
      { status: 500 }
    );
  }
}
