import { NextRequest, NextResponse } from 'next/server';
import { generatePasswordResetToken, verifyResetToken, changePassword } from '@/lib/auth';

// Generar token de recuperación
export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'El nombre de usuario es requerido' },
        { status: 400 }
      );
    }

    const resetToken = await generatePasswordResetToken(username);
    if (!resetToken) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // En un entorno real, aquí enviarías el token por email
    // Por ahora, lo devolvemos en la respuesta para propósitos de desarrollo
    return NextResponse.json(
      { 
        success: true, 
        message: 'Token de recuperación generado',
        resetToken, // En producción, esto NO se devolvería
        resetUrl: `/reset-password?token=${resetToken}`
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error generando token de recuperación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Verificar token y cambiar contraseña
export async function PUT(request: NextRequest) {
  try {
    const { token, newPassword, confirmPassword } = await request.json();

    if (!token || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: 'Las contraseñas no coinciden' },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    // Verificar token
    const user = await verifyResetToken(token);
    if (!user) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    // Cambiar contraseña
    const success = await changePassword(user.username, newPassword);
    if (!success) {
      return NextResponse.json(
        { error: 'Error al cambiar la contraseña' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: 'Contraseña restablecida exitosamente' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error restableciendo contraseña:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
