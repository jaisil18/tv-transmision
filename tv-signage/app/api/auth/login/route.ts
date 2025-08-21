import { NextRequest, NextResponse } from 'next/server';
import { 
  getUserByUsername, 
  verifyPassword, 
  generateToken, 
  isAccountLocked, 
  incrementLoginAttempts, 
  resetLoginAttempts 
} from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }

    // Obtener usuario
    const user = await getUserByUsername(username);
    if (!user) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Verificar si la cuenta está bloqueada
    if (isAccountLocked(user)) {
      return NextResponse.json(
        { 
          error: 'Cuenta bloqueada por múltiples intentos fallidos. Intente nuevamente en 15 minutos.',
          locked: true 
        },
        { status: 423 }
      );
    }

    // Verificar contraseña
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      await incrementLoginAttempts(username);
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401 }
      );
    }

    // Login exitoso
    await resetLoginAttempts(username);
    const token = generateToken(username);

    // Crear respuesta con cookie
    const response = NextResponse.json(
      { 
        success: true, 
        message: 'Login exitoso',
        user: { username: user.username }
      },
      { status: 200 }
    );

    // Configurar cookie segura
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: false, // Cambiar a false para desarrollo local
      sameSite: 'lax',
      maxAge: 24 * 60 * 60, // 24 horas
      path: '/'
    });

    console.log('✅ [Login] Token generado y cookie establecida para usuario:', username);

    return response;

  } catch (error) {
    console.error('Error en login:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
