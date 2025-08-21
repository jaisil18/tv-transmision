'use client';

import { useState } from 'react';

export default function DebugLogout() {
  const [logs, setLogs] = useState<string[]>([]);
  const [authStatus, setAuthStatus] = useState<any>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkAuthStatus = async () => {
    try {
      addLog('🔍 Verificando estado de autenticación...');
      
      const response = await fetch('/api/auth/verify', {
        credentials: 'include'
      });
      
      const status: any = {
        status: response.status,
        authenticated: response.ok,
        cookies: document.cookie
      };

      if (response.ok) {
        const data = await response.json();
        status.user = data;
        addLog(`✅ Usuario autenticado: ${data.username || 'N/A'}`);
      } else {
        addLog('🚫 No autenticado');
      }
      
      setAuthStatus(status);
      addLog(`📊 Estado: ${JSON.stringify(status, null, 2)}`);
      
    } catch (error) {
      addLog(`❌ Error verificando auth: ${error}`);
    }
  };

  const testLogout = async () => {
    try {
      addLog('🔓 Iniciando test de logout...');
      addLog(`🍪 Cookies antes: ${document.cookie}`);
      
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      addLog(`📡 Respuesta: ${response.status} ${response.statusText}`);
      
      const data = await response.json();
      addLog(`📄 Datos: ${JSON.stringify(data)}`);
      
      addLog(`🍪 Cookies después: ${document.cookie}`);
      
      // Limpiar storage
      localStorage.clear();
      sessionStorage.clear();
      addLog('🧹 Storage limpiado');
      
      if (response.ok) {
        addLog('✅ Logout exitoso');
        setTimeout(() => {
          addLog('🔄 Redirigiendo...');
          window.location.href = '/';
        }, 2000);
      } else {
        addLog(`❌ Error en logout: ${data.error}`);
      }
      
    } catch (error) {
      addLog(`❌ Error durante logout: ${error}`);
    }
  };

  const forceLogout = () => {
    addLog('🚨 Forzando logout completo...');
    
    // Limpiar todas las cookies
    document.cookie.split(";").forEach(function(c) { 
      document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
    });
    
    localStorage.clear();
    sessionStorage.clear();
    
    addLog('🧹 Todo limpiado, redirigiendo...');
    setTimeout(() => {
      window.location.href = '/';
    }, 1000);
  };

  const clearLogs = () => {
    setLogs([]);
    setAuthStatus(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🔍 Diagnóstico de Logout</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Panel de Control */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🛠️ Controles</h2>
            
            <div className="space-y-3">
              <button
                onClick={checkAuthStatus}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
              >
                🔍 Verificar Estado de Auth
              </button>
              
              <button
                onClick={testLogout}
                className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors"
              >
                🔓 Probar Logout Normal
              </button>
              
              <button
                onClick={forceLogout}
                className="w-full bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
              >
                🚨 Forzar Logout Completo
              </button>
              
              <button
                onClick={clearLogs}
                className="w-full bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
              >
                🧹 Limpiar Logs
              </button>
            </div>
          </div>

          {/* Estado de Autenticación */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">📊 Estado Actual</h2>
            
            {authStatus ? (
              <div className="space-y-2">
                <div className={`p-2 rounded ${authStatus.authenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  <strong>Estado:</strong> {authStatus.authenticated ? '✅ Autenticado' : '🚫 No Autenticado'}
                </div>
                
                <div className="p-2 bg-gray-100 rounded">
                  <strong>HTTP Status:</strong> {authStatus.status}
                </div>
                
                {authStatus.user && (
                  <div className="p-2 bg-blue-100 rounded">
                    <strong>Usuario:</strong> {authStatus.user.username}
                  </div>
                )}
                
                <div className="p-2 bg-yellow-100 rounded text-xs">
                  <strong>Cookies:</strong> {authStatus.cookies || 'Ninguna'}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Haz clic en "Verificar Estado de Auth" para ver el estado actual</p>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="mt-6 bg-black text-green-400 rounded-lg p-4">
          <h2 className="text-xl font-semibold mb-4">📝 Logs de Diagnóstico</h2>
          
          <div className="h-64 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No hay logs aún...</p>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Instrucciones */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-blue-800 mb-2">💡 Instrucciones</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-700">
            <li>Primero, verifica tu estado de autenticación</li>
            <li>Si estás autenticado, prueba el logout normal</li>
            <li>Si el logout normal no funciona, usa el forzar logout</li>
            <li>Revisa los logs para ver qué está pasando</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
