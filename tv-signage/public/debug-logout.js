// Script de diagnóstico para logout
// Copia y pega este código en la consola del navegador (F12 -> Console)

console.log('🔍 Iniciando diagnóstico de logout...');

// Función para probar logout
async function testLogout() {
  try {
    console.log('🔓 Probando logout...');
    
    // Verificar cookies antes del logout
    console.log('🍪 Cookies antes del logout:', document.cookie);
    
    // Realizar logout
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Respuesta del servidor:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries())
    });
    
    const data = await response.json();
    console.log('📄 Datos de respuesta:', data);
    
    // Verificar cookies después del logout
    console.log('🍪 Cookies después del logout:', document.cookie);
    
    // Limpiar storage
    localStorage.clear();
    sessionStorage.clear();
    console.log('🧹 Storage limpiado');
    
    if (response.ok) {
      console.log('✅ Logout exitoso, redirigiendo...');
      // Esperar un poco y redirigir
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } else {
      console.error('❌ Error en logout:', data);
    }
    
  } catch (error) {
    console.error('❌ Error durante logout:', error);
  }
}

// Función para verificar estado de autenticación
async function checkAuthStatus() {
  try {
    console.log('🔍 Verificando estado de autenticación...');
    
    const response = await fetch('/api/auth/verify', {
      credentials: 'include'
    });
    
    console.log('📡 Estado de auth:', {
      status: response.status,
      authenticated: response.ok
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('👤 Usuario autenticado:', data);
    } else {
      console.log('🚫 No autenticado');
    }
    
  } catch (error) {
    console.error('❌ Error verificando auth:', error);
  }
}

// Función para forzar logout completo
function forceLogout() {
  console.log('🚨 Forzando logout completo...');
  
  // Limpiar todas las cookies del dominio
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  // Limpiar storage
  localStorage.clear();
  sessionStorage.clear();
  
  console.log('🧹 Todo limpiado, redirigiendo...');
  window.location.href = '/';
}

// Ejecutar diagnóstico automáticamente
console.log('🔍 Ejecutando diagnóstico automático...');
checkAuthStatus();

// Exponer funciones globalmente para uso manual
window.testLogout = testLogout;
window.checkAuthStatus = checkAuthStatus;
window.forceLogout = forceLogout;

console.log(`
🛠️ Funciones disponibles:
- testLogout(): Probar logout normal
- checkAuthStatus(): Verificar estado de autenticación  
- forceLogout(): Forzar logout completo

💡 Ejemplo de uso:
testLogout();
`);
