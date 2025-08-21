import { NextResponse } from 'next/server';
import { clientManager } from '@/utils/event-manager';

// POST /api/screens/[id]/navigate - Navegar contenido de una pantalla
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const { direction } = await request.json();

    if (!direction || !['next', 'previous'].includes(direction)) {
      return NextResponse.json(
        { error: 'Dirección inválida. Debe ser "next" o "previous"' },
        { status: 400 }
      );
    }

    // Crear comando de navegación
    const command = {
      type: 'navigate',
      direction: direction,
      timestamp: Date.now()
    };

    // Enviar comando a la pantalla específica usando clientManager
    const success = clientManager.sendCommand(id, command);

    console.log(`📱 Comando de navegación ${direction} enviado a pantalla ${id}: ${success ? 'exitoso' : 'fallido'}`);

    return NextResponse.json({
      success: success,
      message: `Navegación ${direction} ${success ? 'enviada' : 'falló'} a pantalla ${id}`,
      direction,
      screenId: id,
      command,
      connectedClients: clientManager.getConnectedClients()
    });
  } catch (error) {
    console.error('Error al navegar contenido:', error);
    return NextResponse.json(
      { error: 'Error al enviar comando de navegación' },
      { status: 500 }
    );
  }
}
