import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔓 [API Logout] Procesando logout...');

    // Obtener información de la cookie actual
    const currentToken = request.cookies.get('auth-token');
    console.log('🍪 [API Logout] Cookie actual:', currentToken ? 'presente' : 'ausente');

    const response = NextResponse.json(
      { success: true, message: 'Logout exitoso' },
      { status: 200 }
    );

    // Eliminar cookie con todas las configuraciones posibles
    const cookieConfigs = [
      // Configuración actual (lax)
      {
        httpOnly: true,
        secure: false,
        sameSite: 'lax' as const,
        maxAge: 0,
        expires: new Date(0),
        path: '/'
      },
      // Configuración strict
      {
        httpOnly: true,
        secure: false,
        sameSite: 'strict' as const,
        maxAge: 0,
        expires: new Date(0),
        path: '/'
      },
      // Sin httpOnly (por si acaso)
      {
        httpOnly: false,
        secure: false,
        sameSite: 'lax' as const,
        maxAge: 0,
        expires: new Date(0),
        path: '/'
      }
    ];

    // Aplicar todas las configuraciones para asegurar eliminación
    cookieConfigs.forEach((config, index) => {
      response.cookies.set('auth-token', '', config);
      console.log(`🗑️ [API Logout] Configuración ${index + 1} aplicada`);
    });

    // También intentar eliminar sin path específico
    response.cookies.delete('auth-token');

    console.log('✅ [API Logout] Todas las configuraciones de eliminación aplicadas');
    return response;

  } catch (error) {
    console.error('❌ [API Logout] Error en logout:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
