import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, verifyPassword, changePassword, getUserByUsername } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { currentPassword, newPassword, confirmPassword } = await request.json();

    // Validaciones
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Las contraseñas nuevas no coinciden' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La nueva contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar contraseña actual
    const user = await getUserByUsername(authResult.user.username);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const isCurrentPasswordValid = await verifyPassword(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return NextResponse.json(
        { error: 'La contraseña actual es incorrecta' },
        { status: 401 }
      );
    }

    // Cambiar contraseña
    const success = await changePassword(authResult.user.username, newPassword);
    if (!success) {
      return NextResponse.json(
        { error: 'Error al cambiar la contraseña' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Contraseña cambiada exitosamente' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error cambiando contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
