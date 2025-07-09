import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

// Configuraciones por defecto (solo las necesarias para pantallas)
const defaultPublicSettings = {
  systemName: 'Sistema de TV CODECRAFT',
  timezone: 'America/Santiago',
  transitionTime: 3,
  defaultVolume: 50,
  operatingHours: {
    enabled: false,
    monday: { start: '08:00', end: '18:00', enabled: true },
    tuesday: { start: '08:00', end: '18:00', enabled: true },
    wednesday: { start: '08:00', end: '18:00', enabled: true },
    thursday: { start: '08:00', end: '18:00', enabled: true },
    friday: { start: '08:00', end: '18:00', enabled: true },
    saturday: { start: '09:00', end: '17:00', enabled: false },
    sunday: { start: '09:00', end: '17:00', enabled: false },
  },
  emergency: {
    enabled: false,
    message: '',
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    priority: 'medium',
    autoHide: false,
    hideAfter: 60,
  },
};

async function ensureDataDirectory() {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function getPublicSettings() {
  try {
    await ensureDataDirectory();
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const fullSettings = JSON.parse(content);
    
    // Filtrar solo las configuraciones públicas necesarias para pantallas
    return {
      systemName: fullSettings.systemName || defaultPublicSettings.systemName,
      timezone: fullSettings.timezone || defaultPublicSettings.timezone,
      transitionTime: fullSettings.transitionTime || defaultPublicSettings.transitionTime,
      defaultVolume: fullSettings.defaultVolume || defaultPublicSettings.defaultVolume,
      operatingHours: fullSettings.operatingHours || defaultPublicSettings.operatingHours,
      emergency: fullSettings.emergency || defaultPublicSettings.emergency,
    };
  } catch {
    // Si no existe el archivo, devolver configuración por defecto
    return defaultPublicSettings;
  }
}

// GET /api/public/settings - Endpoint público para pantallas
export async function GET() {
  try {
    const publicSettings = await getPublicSettings();
    console.log('✅ Configuraciones públicas servidas exitosamente');
    return NextResponse.json(publicSettings);
  } catch (error) {
    console.error('Error al obtener configuraciones públicas:', error);
    return NextResponse.json(
      { error: 'Error al obtener las configuraciones' },
      { status: 500 }
    );
  }
}
