import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'data', 'settings.json');
const NETWORK_CONFIG_FILE = path.join(process.cwd(), 'data', 'network-config.json');

interface NetworkConfig {
  serverUrl: string;
  serverPort: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  lastUpdated: number;
  requiresRestart: boolean;
}

async function getSettings() {
  try {
    const content = await fs.readFile(SETTINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function getNetworkConfig(): Promise<NetworkConfig | null> {
  try {
    const content = await fs.readFile(NETWORK_CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function saveNetworkConfig(config: NetworkConfig): Promise<void> {
  const dataDir = path.join(process.cwd(), 'data');
  try {
    await fs.access(dataDir);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
  }
  await fs.writeFile(NETWORK_CONFIG_FILE, JSON.stringify(config, null, 2));
}

// GET /api/system/network - Obtener configuración de red actual
export async function GET() {
  try {
    const settings = await getSettings();
    const networkConfig = await getNetworkConfig();
    
    if (!settings) {
      return NextResponse.json({ error: 'No se pudieron cargar las configuraciones' }, { status: 500 });
    }

    const currentConfig = {
      serverUrl: settings.serverUrl || 'http://localhost',
      serverPort: settings.serverPort || 3000,
      heartbeatInterval: settings.heartbeatInterval || 30,
      connectionTimeout: settings.connectionTimeout || 10,
      currentPort: process.env.PORT || 3000,
      isRunning: true,
      requiresRestart: networkConfig?.requiresRestart || false,
      lastUpdated: networkConfig?.lastUpdated || Date.now()
    };

    return NextResponse.json(currentConfig);
  } catch (error) {
    console.error('Error al obtener configuración de red:', error);
    return NextResponse.json(
      { error: 'Error al obtener la configuración de red' },
      { status: 500 }
    );
  }
}

// POST /api/system/network - Aplicar nueva configuración de red
export async function POST(request: Request) {
  try {
    const { serverUrl, serverPort, heartbeatInterval, connectionTimeout } = await request.json();
    
    // Validaciones
    if (!serverUrl || !serverPort) {
      return NextResponse.json(
        { error: 'URL del servidor y puerto son requeridos' },
        { status: 400 }
      );
    }

    if (serverPort < 1 || serverPort > 65535) {
      return NextResponse.json(
        { error: 'El puerto debe estar entre 1 y 65535' },
        { status: 400 }
      );
    }

    const currentPort = parseInt(process.env.PORT || '3000');
    const requiresRestart = serverPort !== currentPort;

    // Guardar configuración de red
    const networkConfig: NetworkConfig = {
      serverUrl,
      serverPort,
      heartbeatInterval: heartbeatInterval || 30,
      connectionTimeout: connectionTimeout || 10,
      lastUpdated: Date.now(),
      requiresRestart
    };

    await saveNetworkConfig(networkConfig);

    // Actualizar también las configuraciones principales
    const settings = await getSettings();
    if (settings) {
      settings.serverUrl = serverUrl;
      settings.serverPort = serverPort;
      settings.heartbeatInterval = heartbeatInterval;
      settings.connectionTimeout = connectionTimeout;
      
      await fs.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    }

    let message = 'Configuración de red actualizada exitosamente';
    let restartInstructions = null;

    if (requiresRestart) {
      message = 'Configuración guardada. Se requiere reiniciar el servidor para aplicar el nuevo puerto.';
      restartInstructions = {
        currentPort,
        newPort: serverPort,
        command: `npm run dev -- --port ${serverPort}`,
        steps: [
          '1. Detener el servidor actual (Ctrl+C)',
          `2. Ejecutar: npm run dev -- --port ${serverPort}`,
          '3. Actualizar las URLs de las pantallas',
          `4. Acceder al admin en: ${serverUrl}:${serverPort}/admin`
        ]
      };
    }

    return NextResponse.json({
      success: true,
      message,
      config: networkConfig,
      requiresRestart,
      restartInstructions
    });

  } catch (error) {
    console.error('Error al aplicar configuración de red:', error);
    return NextResponse.json(
      { error: 'Error al aplicar la configuración de red' },
      { status: 500 }
    );
  }
}

// PUT /api/system/network/restart - Marcar que el reinicio fue completado
export async function PUT() {
  try {
    const networkConfig = await getNetworkConfig();
    if (networkConfig) {
      networkConfig.requiresRestart = false;
      networkConfig.lastUpdated = Date.now();
      await saveNetworkConfig(networkConfig);
    }

    return NextResponse.json({
      success: true,
      message: 'Estado de reinicio actualizado'
    });
  } catch (error) {
    console.error('Error al actualizar estado de reinicio:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado' },
      { status: 500 }
    );
  }
}
