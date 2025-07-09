import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    // Verificar que el directorio de uploads sea accesible
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    const files = await readdir(uploadsDir);
    
    // Verificar que las rutas principales funcionen
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      uploads: {
        directory: uploadsDir,
        fileCount: files.length,
        accessible: true
      },
      memory: process.memoryUsage(),
      version: process.version
    };

    return NextResponse.json(health);
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy', 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
