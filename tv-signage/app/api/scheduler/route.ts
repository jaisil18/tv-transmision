import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SCHEDULES_FILE = path.join(process.cwd(), 'data', 'schedules.json');

export async function GET() {
  try {
    const data = await fs.readFile(SCHEDULES_FILE, 'utf8');
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    // Si el archivo no existe, devolver array vacío
    return NextResponse.json([]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const scheduleData = await request.json();
    
    // Leer schedules existentes
    let schedules = [];
    try {
      const data = await fs.readFile(SCHEDULES_FILE, 'utf8');
      schedules = JSON.parse(data);
    } catch (error) {
      // Archivo no existe, usar array vacío
    }

    // Crear nuevo schedule
    const newSchedule = {
      id: Date.now().toString(),
      ...scheduleData,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    schedules.push(newSchedule);

    // Guardar
    await fs.writeFile(SCHEDULES_FILE, JSON.stringify(schedules, null, 2));

    return NextResponse.json(newSchedule, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Error creating schedule' }, { status: 500 });
  }
}