import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import type { Playlist } from '../route';
import { updateScreensStatus } from '@/utils/screens';

const PLAYLISTS_FILE = path.join(process.cwd(), 'data', 'playlists.json');

async function getPlaylists(): Promise<Playlist[]> {
  const content = await fs.readFile(PLAYLISTS_FILE, 'utf-8');
  return JSON.parse(content);
}

// GET /api/playlists/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const playlists = await getPlaylists();
    const { id } = await params;
    const playlist = playlists.find((p) => p.id === id);

    if (!playlist) {
      return NextResponse.json(
        { error: 'Lista de reproducción no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(playlist);
  } catch (error) {
    console.error('Error al obtener la lista de reproducción:', error);
    return NextResponse.json(
      { error: 'Error al obtener la lista de reproducción' },
      { status: 500 }
    );
  }
}

// DELETE /api/playlists/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const playlists = await getPlaylists();
    const { id } = await params;
    const index = playlists.findIndex((p) => p.id === id);    if (index === -1) {
      return NextResponse.json(
        { error: 'Lista de reproducción no encontrada' },
        { status: 404 }
      );
    }

    // Obtener las pantallas de la playlist antes de eliminarla
    const screensToUpdate = playlists[index].screens || [];
    
    // Eliminar la playlist
    playlists.splice(index, 1);
    await fs.writeFile(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));

    // Verificar si las pantallas están asignadas a otras playlists
    if (screensToUpdate.length > 0) {
      const otherPlaylistScreens = playlists.flatMap(p => p.screens);
      const screensToDeactivate = screensToUpdate.filter(
        id => !otherPlaylistScreens.includes(id)
      );
      
      if (screensToDeactivate.length > 0) {
        await updateScreensStatus(screensToDeactivate, 'inactive');
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error al eliminar la lista de reproducción:', error);
    return NextResponse.json(
      { error: 'Error al eliminar la lista de reproducción' },
      { status: 500 }
    );
  }
}

// PUT /api/playlists/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();

    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      return NextResponse.json({ error: 'El nombre es requerido y no puede estar vacío.' }, { status: 400 });
    }
    const playlists = await getPlaylists();
    const index = playlists.findIndex((p) => p.id === id);

    if (index === -1) {
      return NextResponse.json(
        { error: 'Lista de reproducción no encontrada' },
        { status: 404 }
      );
    }

    // Obtener las pantallas que ya no están asignadas
    const removedScreens = playlists[index].screens.filter(
      screenId => !data.screens.includes(screenId)
    );

    // Actualizar la playlist, asegurando que los items se reemplacen
    const originalPlaylist = playlists[index];
    playlists[index] = {
      ...originalPlaylist,
      name: data.name,
      items: data.items, // Reemplazar completamente los items
      screens: data.screens,
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
        .filter(p => p.id !== id)
        .flatMap(p => p.screens);
      const screensToDeactivate = removedScreens.filter(
        screenId => !otherPlaylistScreens.includes(screenId)
      );
      if (screensToDeactivate.length > 0) {
        await updateScreensStatus(screensToDeactivate, 'inactive');
      }
    }

    return NextResponse.json(playlists[index]);
  } catch (error) {
    console.error('Error al actualizar la lista de reproducción:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la lista de reproducción' },
      { status: 500 }
    );
  }
}
