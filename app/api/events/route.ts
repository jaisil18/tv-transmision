import { NextResponse } from 'next/server';
import { clientManager } from '@/utils/event-manager';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const screenId = searchParams.get('screenId');

  if (!screenId) {
    return new NextResponse('screenId es requerido', { status: 400 });
  }

  const stream = new ReadableStream({
    start(controller) {
      // Pasar request para capturar información del dispositivo
      clientManager.addClient(screenId, controller, request);

      // Enviar un evento de conexión inicial
      clientManager.sendCommand(screenId, { type: 'connected' });
    },
    cancel() {
      clientManager.removeClient(screenId);
    },
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
