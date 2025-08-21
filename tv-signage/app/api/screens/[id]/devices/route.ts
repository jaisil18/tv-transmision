import { NextResponse } from 'next/server';
import { clientManager } from '@/utils/event-manager';
import { promises as fs } from 'fs';
import path from 'path';
import type { Screen } from '@/types/screen';

const SCREENS_FILE = path.join(process.cwd(), 'data', 'screens.json');
const DEVICE_INFO_FILE = path.join(process.cwd(), 'data', 'device-info.json');

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verificar que la pantalla existe
    const content = await fs.readFile(SCREENS_FILE, 'utf-8');
    const screens: Screen[] = JSON.parse(content);
    const screen = screens.find((s) => s.id === id);
    
    if (!screen) {
      return NextResponse.json(
        { error: 'Pantalla no encontrada' },
        { status: 404 }
      );
    }

    // Obtener información de dispositivos conectados desde clientManager
    const connectedDevicesInfo = clientManager.getConnectedDevicesInfo();
    const screenDevice = connectedDevicesInfo.find(d => d.screenId === id);
    
    // Obtener información adicional guardada
    let savedDeviceInfo = null;
    try {
      const deviceData = await fs.readFile(DEVICE_INFO_FILE, 'utf-8');
      const allDeviceInfo = JSON.parse(deviceData);
      savedDeviceInfo = allDeviceInfo[id];
    } catch {
      // No hay información guardada
    }
    
    // Crear información completa del dispositivo
    const devices = screenDevice ? [{
      id: `device-${id}`,
      screenId: id,
      connectionTime: screenDevice.deviceInfo?.connectionTime || new Date().toISOString(),
      userAgent: screenDevice.deviceInfo?.userAgent || savedDeviceInfo?.deviceInfo?.userAgent || 'Unknown',
      ipAddress: screenDevice.deviceInfo?.ipAddress || savedDeviceInfo?.deviceInfo?.detectedIP || 'Unknown',
      deviceModel: savedDeviceInfo?.deviceInfo?.deviceModel || extractDeviceModel(screenDevice.deviceInfo?.userAgent),
      androidVersion: savedDeviceInfo?.deviceInfo?.androidVersion || 'Unknown',
      manufacturer: savedDeviceInfo?.deviceInfo?.manufacturer || 'Unknown',
      screenResolution: savedDeviceInfo?.deviceInfo?.screenResolution || 'Unknown',
      networkType: savedDeviceInfo?.deviceInfo?.networkType || 'Unknown',
      status: 'connected',
      lastSeen: screenDevice.deviceInfo?.lastSeen || Date.now()
    }] : [];

    console.log(`📱 [Devices API] Dispositivos conectados para pantalla ${id}:`, devices.length);

    return NextResponse.json({
      screenId: id,
      screenName: screen.name,
      connectedCount: devices.length,
      devices: devices,
      isConnected: devices.length > 0
    });
    
  } catch (error) {
    console.error('Error al obtener dispositivos conectados:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Función auxiliar para extraer modelo del dispositivo desde User Agent
function extractDeviceModel(userAgent?: string): string {
  if (!userAgent) return 'Unknown';
  
  // Patrones comunes para detectar modelos de Android TV
  const patterns = [
    /Android.*?;\s*([^)]+)\)/,
    /\(([^;]+);.*Android/,
    /Android TV.*?([A-Z0-9-]+)/
  ];
  
  for (const pattern of patterns) {
    const match = userAgent.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return 'Android Device';
}