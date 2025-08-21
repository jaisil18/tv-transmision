'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, Server, AlertCircle, Globe, RefreshCw } from 'lucide-react';
import { getURLConfig } from '@/lib/url-config';

interface NetworkInfo {
  serverUrl: string;
  serverPort: number;
  currentPort: string;
  detectedPort: number;
  rtspPort?: number;
  isRunning: boolean;
  requiresRestart: boolean;
  lastUpdated: number;
}

export default function NetworkStatus() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [loading, setLoading] = useState(true);
  const [urlConfig, setUrlConfig] = useState(getURLConfig());

  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const response = await fetch('/api/system/network');
        if (response.ok) {
          const data = await response.json();
          setNetworkInfo(data);
          setIsOnline(true);
          // Actualizar configuración de URLs
          setUrlConfig(getURLConfig(true));
        } else {
          setIsOnline(false);
        }
      } catch (error) {
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    };

    // Verificar estado inicial
    checkNetworkStatus();

    // Verificar cada 2 minutos (reducido de 30s)
    const interval = setInterval(checkNetworkStatus, 120000);

    // Escuchar eventos de conectividad del navegador
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span>Verificando red...</span>
      </div>
    );
  }

  const currentPort = typeof window !== 'undefined' ? window.location.port || '3000' : '3000';
  const hasPortMismatch = networkInfo && networkInfo.serverPort.toString() !== currentPort;

  return (
    <div className="flex items-center gap-3">
      {/* Estado de conectividad */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <Wifi className="h-4 w-4 text-green-500" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
          {isOnline ? 'Conectado' : 'Sin conexión'}
        </span>
      </div>

      {/* Información del servidor */}
      {networkInfo && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Server className="h-4 w-4" />
          <span>Puerto: {currentPort}</span>
          
          {hasPortMismatch && (
            <div className="flex items-center gap-1 text-orange-600">
              <AlertCircle className="h-4 w-4" />
              <span className="text-xs">
                Configurado: {networkInfo.serverPort}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Indicador de reinicio requerido */}
      {networkInfo?.requiresRestart && (
        <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-md text-xs">
          <AlertCircle className="h-3 w-3" />
          <span>Reinicio requerido</span>
        </div>
      )}
    </div>
  );
}
