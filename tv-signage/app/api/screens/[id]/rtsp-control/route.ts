import { NextResponse } from 'next/server';
import { getRTSPManager } from '@/lib/rtsp-server';
import { clientManager } from '@/utils/event-manager';

// POST /api/screens/[id]/rtsp-control - Enviar comandos de control RTSP
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const command = await request.json();
    console.log(`🎮 [RTSP Control] Comando recibido para pantalla ${id}:`, command);

    // Validar comando
    const validCommands = ['play', 'pause', 'seek', 'stop', 'restart', 'quality_change'];
    if (!command.type || !validCommands.includes(command.type)) {
      return NextResponse.json(
        { error: 'Tipo de comando inválido' },
        { status: 400 }
      );
    }

    // Procesar comando según el tipo
    let result;
    switch (command.type) {
      case 'play':
        result = await handlePlayCommand(id, command);
        break;
      case 'pause':
        result = await handlePauseCommand(id, command);
        break;
      case 'seek':
        result = await handleSeekCommand(id, command);
        break;
      case 'stop':
        result = await handleStopCommand(id, command);
        break;
      case 'restart':
        result = await handleRestartCommand(id, command);
        break;
      case 'quality_change':
        result = await handleQualityChangeCommand(id, command);
        break;
      default:
        throw new Error(`Comando no implementado: ${command.type}`);
    }

    console.log(`✅ [RTSP Control] Comando ejecutado exitosamente:`, result);

    return NextResponse.json({
      success: true,
      command: command.type,
      screenId: id,
      result,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('❌ [RTSP Control] Error al procesar comando:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Funciones de manejo de comandos RTSP
async function handlePlayCommand(screenId: string, command: any) {
  console.log(`▶️ [RTSP] Ejecutando PLAY para pantalla ${screenId}`);
  
  // Enviar comando a la pantalla via SSE
  const sseCommand = {
    type: 'rtsp_control',
    action: 'play',
    timestamp: Date.now(),
    payload: command.payload
  };
  
  const sent = clientManager.sendCommand(screenId, sseCommand);
  
  return {
    action: 'play',
    sent: sent,
    message: sent ? 'Comando PLAY enviado a la pantalla' : 'Pantalla no conectada'
  };
}

async function handlePauseCommand(screenId: string, command: any) {
  console.log(`⏸️ [RTSP] Ejecutando PAUSE para pantalla ${screenId}`);
  
  const sseCommand = {
    type: 'rtsp_control',
    action: 'pause',
    timestamp: Date.now(),
    payload: command.payload
  };
  
  const sent = clientManager.sendCommand(screenId, sseCommand);
  
  return {
    action: 'pause',
    sent: sent,
    message: sent ? 'Comando PAUSE enviado a la pantalla' : 'Pantalla no conectada'
  };
}

async function handleSeekCommand(screenId: string, command: any) {
  console.log(`⏭️ [RTSP] Ejecutando SEEK para pantalla ${screenId}`, command.payload);
  
  const { position } = command.payload || {};
  if (typeof position !== 'number') {
    throw new Error('Posición de seek inválida');
  }
  
  const sseCommand = {
    type: 'rtsp_control',
    action: 'seek',
    timestamp: Date.now(),
    payload: { position }
  };
  
  const sent = clientManager.sendCommand(screenId, sseCommand);
  
  return {
    action: 'seek',
    position,
    sent: sent,
    message: sent ? `Comando SEEK enviado (posición: ${position}s)` : 'Pantalla no conectada'
  };
}

async function handleStopCommand(screenId: string, command: any) {
  console.log(`⏹️ [RTSP] Ejecutando STOP para pantalla ${screenId}`);
  
  const sseCommand = {
    type: 'rtsp_control',
    action: 'stop',
    timestamp: Date.now(),
    payload: command.payload
  };
  
  const sent = clientManager.sendCommand(screenId, sseCommand);
  
  return {
    action: 'stop',
    sent: sent,
    message: sent ? 'Comando STOP enviado a la pantalla' : 'Pantalla no conectada'
  };
}

async function handleRestartCommand(screenId: string, command: any) {
  console.log(`🔄 [RTSP] Ejecutando RESTART para pantalla ${screenId}`);
  
  const sseCommand = {
    type: 'rtsp_control',
    action: 'restart',
    timestamp: Date.now(),
    payload: command.payload
  };
  
  const sent = clientManager.sendCommand(screenId, sseCommand);
  
  return {
    action: 'restart',
    sent: sent,
    message: sent ? 'Comando RESTART enviado a la pantalla' : 'Pantalla no conectada'
  };
}

async function handleQualityChangeCommand(screenId: string, command: any) {
  console.log(`🎚️ [RTSP] Ejecutando QUALITY_CHANGE para pantalla ${screenId}`, command.payload);
  
  const { quality, bitrate } = command.payload || {};
  if (!quality) {
    throw new Error('Calidad no especificada');
  }
  
  const sseCommand = {
    type: 'rtsp_control',
    action: 'quality_change',
    timestamp: Date.now(),
    payload: { quality, bitrate }
  };
  
  const sent = clientManager.sendCommand(screenId, sseCommand);
  
  return {
    action: 'quality_change',
    quality,
    bitrate,
    sent: sent,
    message: sent ? `Calidad cambiada a ${quality}` : 'Pantalla no conectada'
  };
}
