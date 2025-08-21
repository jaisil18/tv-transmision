import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');

export interface SystemSettings {
  // Configuración General
  systemName: string;
  timezone: string;
  
  // Configuración de Red
  serverUrl: string;
  serverPort: number;
  heartbeatInterval: number; // en segundos
  connectionTimeout: number; // en segundos
  
  // Configuración del Sistema
  transitionTime: number; // en segundos
  defaultVolume: number; // 0-100
  autoUpdate: boolean;
  
  // Horarios de Funcionamiento
  operatingHours: {
    enabled: boolean;
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
  
  // Configuración de Emergencia
  emergency: {
    enabled: boolean;
    message: string;
    backgroundColor: string;
    textColor: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    autoHide: boolean;
    hideAfter: number; // en minutos
  };
}

const defaultSettings: SystemSettings = {
  systemName: 'UCT TV CODECRAFT',
  timezone: 'America/Lima',
  serverUrl: 'http://localhost',
  serverPort: 3000,
  heartbeatInterval: 30,
  connectionTimeout: 10,
  transitionTime: 10,
  defaultVolume: 50,
  autoUpdate: true,
  operatingHours: {
    enabled: false,
    monday: { start: '07:00', end: '22:00', enabled: true },
    tuesday: { start: '07:00', end: '22:00', enabled: true },
    wednesday: { start: '07:00', end: '22:00', enabled: true },
    thursday: { start: '07:00', end: '22:00', enabled: true },
    friday: { start: '07:00', end: '22:00', enabled: true },
    saturday: { start: '08:00', end: '20:00', enabled: true },
    sunday: { start: '08:00', end: '20:00', enabled: false },
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

async function getSettings(): Promise<SystemSettings> {
  try {
    await ensureDataDirectory();
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    const settings = JSON.parse(content);
    return { ...defaultSettings, ...settings };
  } catch {
    // Si no existe el archivo, crear uno con configuración por defecto
    await saveSettings(defaultSettings);
    return defaultSettings;
  }
}

async function saveSettings(settings: SystemSettings): Promise<void> {
  await ensureDataDirectory();
  await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
}

// GET /api/settings
export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error al obtener configuraciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener las configuraciones' },
      { status: 500 }
    );
  }
}

// PUT /api/settings
export async function PUT(request: Request) {
  try {
    const newSettings = await request.json();
    
    // Validar configuraciones básicas
    if (!newSettings.systemName || newSettings.systemName.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del sistema es requerido' },
        { status: 400 }
      );
    }
    
    if (newSettings.serverPort < 1 || newSettings.serverPort > 65535) {
      return NextResponse.json(
        { error: 'El puerto debe estar entre 1 y 65535' },
        { status: 400 }
      );
    }
    
    if (newSettings.defaultVolume < 0 || newSettings.defaultVolume > 100) {
      return NextResponse.json(
        { error: 'El volumen debe estar entre 0 y 100' },
        { status: 400 }
      );
    }
    
    // Combinar con configuraciones existentes
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...newSettings };
    
    await saveSettings(updatedSettings);
    
    return NextResponse.json({ 
      message: 'Configuraciones guardadas exitosamente',
      settings: updatedSettings 
    });
  } catch (error) {
    console.error('Error al guardar configuraciones:', error);
    return NextResponse.json(
      { error: 'Error al guardar las configuraciones' },
      { status: 500 }
    );
  }
}
