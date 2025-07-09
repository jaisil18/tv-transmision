import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const REFRESH_FILE = path.join(process.cwd(), 'data', 'refresh-events.json');

export async function GET() {
  try {
    // Intentar leer el archivo de eventos
    const data = await fs.readFile(REFRESH_FILE, 'utf8');
    const events = JSON.parse(data);
    
    return NextResponse.json(events);
  } catch (error) {
    // Si el archivo no existe o hay error, devolver array vacío
    return NextResponse.json([]);
  }
}

// Limpiar eventos antiguos (opcional)
export async function DELETE() {
  try {
    await fs.writeFile(REFRESH_FILE, JSON.stringify([], null, 2));
    return NextResponse.json({ success: true, message: 'Eventos limpiados' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Error limpiando eventos' },
      { status: 500 }
    );
  }
}
