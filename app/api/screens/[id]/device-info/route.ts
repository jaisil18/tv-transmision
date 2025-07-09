import { NextResponse } from 'next/server';
import { clientManager } from '@/utils/event-manager';
import { promises as fs } from 'fs';
import path from 'path';

const DEVICE_INFO_FILE = path.join(process.cwd(), 'data', 'device-info.json');

// POST - Recibir información del dispositivo desde el aplicativo Android
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deviceInfo = await request.json();
    
    // Obtener headers adicionales
    const userAgent = request.headers.get('user-agent') || '';
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    
    // Detectar IP real del dispositivo
    let clientIp = 'unknown';
    if (xForwardedFor) {
      clientIp = xForwardedFor.split(',')[0].trim();
    } else if (xRealIp) {
      clientIp = xRealIp;
    }
    
    // Crear registro completo del dispositivo
    const completeDeviceInfo = {
      screenId: id,
      deviceInfo: {
        ...deviceInfo,
        detectedIP: clientIp,
        serverUserAgent: userAgent,
        connectionTime: new Date().toISOString(),
        lastSeen: Date.now()
      }
    };
    
    // Guardar información del dispositivo
    await saveDeviceInfo(id, completeDeviceInfo);
    
    console.log(`📱 [Device Info] Información recibida de pantalla ${id}:`, completeDeviceInfo);
    
    return NextResponse.json({
      success: true,
      message: 'Información del dispositivo guardada',
      deviceInfo: completeDeviceInfo
    });
    
  } catch (error) {
    console.error('Error al guardar información del dispositivo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

async function saveDeviceInfo(screenId: string, deviceInfo: any) {
  try {
    let deviceData: any = {};
    
    // Leer archivo existente
    try {
      const content = await fs.readFile(DEVICE_INFO_FILE, 'utf-8');
      deviceData = JSON.parse(content);
    } catch {
      // Archivo no existe, crear nuevo
    }
    
    // Actualizar información del dispositivo
    deviceData[screenId] = deviceInfo;
    
    // Guardar archivo
    await fs.writeFile(DEVICE_INFO_FILE, JSON.stringify(deviceData, null, 2));
    
  } catch (error) {
    console.error('Error al guardar archivo de dispositivos:', error);
  }
}