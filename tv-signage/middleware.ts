import { NextRequest, NextResponse } from 'next/server';

// Configuración JWT
const JWT_SECRET = process.env.JWT_SECRET || 'uct-tv-codecraft-secret-key-2024';

// Función para verificar token (simplificada para edge runtime)
function verifyToken(token: string): boolean {
  try {
    // Verificación básica del formato JWT
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    // Decodificar el payload
    const payload = JSON.parse(atob(parts[1]));

    // Verificar expiración
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      console.log('🔒 [Middleware] Token expirado');
      return false;
    }

    // Verificar que tenga username
    const isValid = !!payload.username;
    console.log('🔒 [Middleware] Token válido:', isValid, 'Usuario:', payload.username);
    return isValid;
  } catch (error) {
    console.log('🔒 [Middleware] Error verificando token:', error);
    return false;
  }
}

// Rutas que requieren autenticación
const PROTECTED_ROUTES = [
  '/admin',
  '/admin/screens',
  '/admin/playlists',
  '/admin/files',
  '/admin/settings',
  '/admin/network',
  '/api/screens',
  '/api/playlists',
  '/api/settings',
  '/api/system',
  '/api/files/folders',
  '/api/files/cass'
];

// Rutas públicas (no requieren autenticación)
const PUBLIC_ROUTES = [
  '/screen',
  '/api/auth',
  '/reset-password',
  '/api/public', // Endpoints públicos para pantallas
  '/api/screens/[id]/rtsp-stream', // Para que las pantallas puedan acceder al stream
  '/api/screens/[id]/content', // Para que las pantallas puedan obtener contenido
  '/api/files/media/[...path]', // Para que las pantallas puedan acceder a archivos multimedia
  '/api/files/cass/[...path]', // Para que las pantallas puedan acceder a archivos CASS (compatibilidad)
  '/api/public/android-tv-stream/[screenId]', // Stream optimizado para Android TV
  '/api/events' // Para WebSocket de pantallas
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permitir acceso a archivos estáticos
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Verificar si es una ruta pública
  const isPublicRoute = PUBLIC_ROUTES.some(route => {
    if (route.includes('[id]')) {
      const pattern = route.replace('[id]', '[^/]+');
      return new RegExp(`^${pattern}`).test(pathname);
    }
    return pathname.startsWith(route);
  });

  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Verificar si es una ruta protegida
  const isProtectedRoute = PROTECTED_ROUTES.some(route => 
    pathname.startsWith(route)
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Verificar autenticación para rutas protegidas
  const token = request.cookies.get('auth-token')?.value;
  console.log('🔒 [Middleware] Verificando ruta protegida:', pathname);
  console.log('🔒 [Middleware] Token presente:', !!token);

  if (!token) {
    console.log('🔒 [Middleware] No hay token, redirigiendo');
    // Si es una API, devolver 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Si es una página, redirigir al login
    const loginUrl = new URL('/', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Verificar validez del token
  const isValidToken = verifyToken(token);
  if (!isValidToken) {
    // Token inválido, eliminar cookie y redirigir
    const response = pathname.startsWith('/api/') 
      ? NextResponse.json({ error: 'Token inválido' }, { status: 401 })
      : NextResponse.redirect(new URL('/', request.url));

    response.cookies.set('auth-token', '', {
      httpOnly: true,
      secure: false, // Cambiar a false para desarrollo local
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;
  }

  // Token válido, continuar
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
