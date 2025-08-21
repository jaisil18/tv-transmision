import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Auth Verify] Verificando autenticación...');
    const token = request.cookies.get('auth-token')?.value;
    console.log('🔍 [Auth Verify] Token presente:', !!token);

    const authResult = await requireAuth(request);

    if (authResult instanceof NextResponse) {
      console.log('🔍 [Auth Verify] Autenticación fallida');
      return authResult;
    }

    console.log('🔍 [Auth Verify] Autenticación exitosa para:', authResult.user.username);
    return NextResponse.json(
      {
        authenticated: true,
        user: { username: authResult.user.username }
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('❌ [Auth Verify] Error verificando autenticación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
