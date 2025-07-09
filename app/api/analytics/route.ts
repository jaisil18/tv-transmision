import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';

    // Leer datos de pantallas y contenido
    const screensPath = path.join(process.cwd(), 'data', 'screens.json');
    const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
    
    const screensData = JSON.parse(await fs.readFile(screensPath, 'utf8'));
    const playlistsData = JSON.parse(await fs.readFile(playlistsPath, 'utf8'));

    // Simular datos de analytics (en producción vendría de una base de datos)
    const analytics = {
      screenUsage: screensData.map((screen: any) => ({
        name: screen.name,
        hours: Math.floor(Math.random() * 24) + 1
      })),
      contentPopularity: playlistsData.slice(0, 5).map((playlist: any) => ({
        name: playlist.name,
        views: Math.floor(Math.random() * 1000) + 100
      })),
      systemStats: {
        totalScreens: screensData.length,
        activeScreens: screensData.filter((s: any) => s.isOnline).length,
        totalContent: playlistsData.length,
        avgUptime: Math.floor(Math.random() * 20) + 80
      }
    };

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Error fetching analytics' }, { status: 500 });
  }
}