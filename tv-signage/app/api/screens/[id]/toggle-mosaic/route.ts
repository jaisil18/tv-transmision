import { NextRequest, NextResponse } from 'next/server';
import { sendEventToScreen } from '@/lib/server-init';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const screenId = params.id;
    
    // Verificar que el ID de la pantalla sea válido
    if (!screenId) {
      return NextResponse.json({ error: 'ID de pantalla no válido' }, { status: 400 });
    }
    
    // Obtener el cuerpo de la solicitud
    const body = await request.json();
    const { action = 'toggle', source = 'api' } = body;
    
    // Validar la acción
    if (!['toggle', 'show', 'hide'].includes(action)) {
      return NextResponse.json({ error: 'Acción no válida. Debe ser "toggle", "show" o "hide"' }, { status: 400 });
    }
    
    // Determinar el comando a enviar
    let command = '';
    switch (action) {
      case 'toggle':
        command = 'mosaic-toggle';
        break;
      case 'show':
        command = 'mosaic-show';
        break;
      case 'hide':
        command = 'mosaic-hide';
        break;
    }
    
    // Enviar el evento a la pantalla
    await sendEventToScreen(screenId, {
      type: 'command',
      command,
      source,
      timestamp: Date.now()
    });
    
    return NextResponse.json({
      success: true,
      message: `Comando de mosaico (${action}) enviado a la pantalla ${screenId}`,
      screenId,
      action
    });
  } catch (error) {
    console.error('Error al enviar comando de mosaico:', error);
    return NextResponse.json(
      { error: 'Error al enviar comando de mosaico' },
      { status: 500 }
    );
  }
}