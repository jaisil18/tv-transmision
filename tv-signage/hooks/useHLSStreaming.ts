'use client';

import { useState, useEffect, useCallback } from 'react';

interface StreamingStatus {
  screenId: string;
  rtsp: {
    available: boolean;
    status: string;
    url: string | null;
  };
  hls: {
    available: boolean;
    status: string;
    playlistUrl: string | null;
    segmentsUrl: string | null;
  };
  urls: {
    rtsp: string;
    hls: string;
    segments: string;
  };
}

interface NetworkConfig {
  serverIp: string;
  serverPort: number;
  rtspPort: number;
  hlsBaseUrl: string;
  client: {
    isAndroid: boolean;
    isMobile: boolean;
    isIOS: boolean;
  };
}

interface UseHLSStreamingReturn {
  // Estado
  isLoading: boolean;
  error: string | null;
  streamingStatus: StreamingStatus | null;
  networkConfig: NetworkConfig | null;
  
  // Acciones
  startStreaming: (type?: 'rtsp' | 'hls' | 'both') => Promise<void>;
  stopStreaming: () => Promise<void>;
  refreshStatus: () => Promise<void>;
  
  // URLs
  getHLSUrl: () => string | null;
  getRTSPUrl: () => string | null;
  
  // Utilidades
  isStreamingActive: () => boolean;
  isHLSSupported: () => boolean;
  isRTSPSupported: () => boolean;
}

export function useHLSStreaming(screenId: string): UseHLSStreamingReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingStatus, setStreamingStatus] = useState<StreamingStatus | null>(null);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);

  // Detectar configuración de red
  const detectNetwork = useCallback(async () => {
    try {
      const response = await fetch('/api/network/detect');
      if (response.ok) {
        const config = await response.json();
        setNetworkConfig(config);
        console.log('🌐 [useHLSStreaming] Configuración de red detectada:', config);
      }
    } catch (error) {
      console.warn('⚠️ [useHLSStreaming] Error al detectar red:', error);
    }
  }, []);

  // Obtener estado del streaming
  const refreshStatus = useCallback(async () => {
    if (!screenId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/streaming/${screenId}`);
      if (response.ok) {
        const status = await response.json();
        setStreamingStatus(status);
        console.log('📊 [useHLSStreaming] Estado actualizado:', status);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al obtener estado');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMsg);
      console.error('❌ [useHLSStreaming] Error al obtener estado:', error);
    } finally {
      setIsLoading(false);
    }
  }, [screenId]);

  // Iniciar streaming
  const startStreaming = useCallback(async (type: 'rtsp' | 'hls' | 'both' = 'both') => {
    if (!screenId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🚀 [useHLSStreaming] Iniciando streaming ${type} para pantalla ${screenId}`);

      const response = await fetch(`/api/streaming/${screenId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [useHLSStreaming] Streaming iniciado:', result);
        
        // Actualizar estado después de un breve delay
        setTimeout(() => {
          refreshStatus();
        }, 2000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al iniciar streaming');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMsg);
      console.error('❌ [useHLSStreaming] Error al iniciar streaming:', error);
    } finally {
      setIsLoading(false);
    }
  }, [screenId, refreshStatus]);

  // Detener streaming
  const stopStreaming = useCallback(async () => {
    if (!screenId) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🛑 [useHLSStreaming] Deteniendo streaming para pantalla ${screenId}`);

      const response = await fetch(`/api/streaming/${screenId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('✅ [useHLSStreaming] Streaming detenido');
        
        // Actualizar estado
        setTimeout(() => {
          refreshStatus();
        }, 1000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al detener streaming');
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Error desconocido';
      setError(errorMsg);
      console.error('❌ [useHLSStreaming] Error al detener streaming:', error);
    } finally {
      setIsLoading(false);
    }
  }, [screenId, refreshStatus]);

  // Obtener URL de HLS
  const getHLSUrl = useCallback(() => {
    return streamingStatus?.hls.playlistUrl || null;
  }, [streamingStatus]);

  // Obtener URL de RTSP
  const getRTSPUrl = useCallback(() => {
    return streamingStatus?.rtsp.url || null;
  }, [streamingStatus]);

  // Verificar si el streaming está activo
  const isStreamingActive = useCallback(() => {
    if (!streamingStatus) return false;
    return streamingStatus.hls.status === 'streaming' || streamingStatus.rtsp.status === 'streaming';
  }, [streamingStatus]);

  // Verificar soporte de HLS
  const isHLSSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;

    // Verificar soporte nativo
    const video = document.createElement('video');
    const nativeSupport = !!video.canPlayType('application/vnd.apple.mpegurl');

    // Verificar HLS.js
    let hlsJsSupport = false;
    try {
      hlsJsSupport = typeof window !== 'undefined' && 'MediaSource' in window;
    } catch (e) {
      hlsJsSupport = false;
    }

    return nativeSupport || hlsJsSupport;
  }, []);

  // Verificar soporte de RTSP (limitado en navegadores)
  const isRTSPSupported = useCallback(() => {
    // RTSP no es soportado nativamente en navegadores web
    // Solo en aplicaciones nativas o con plugins especiales
    return false;
  }, []);

  // Efectos
  useEffect(() => {
    detectNetwork();
  }, [detectNetwork]);

  useEffect(() => {
    if (screenId) {
      refreshStatus();
    }
  }, [screenId, refreshStatus]);

  // Auto-refresh cada 45 segundos si hay streaming activo (reducir frecuencia)
  useEffect(() => {
    if (!isStreamingActive()) return;

    const interval = setInterval(() => {
      refreshStatus();
    }, 45000); // Aumentado de 30 a 45 segundos

    return () => clearInterval(interval);
  }, [isStreamingActive, refreshStatus]);

  return {
    // Estado
    isLoading,
    error,
    streamingStatus,
    networkConfig,
    
    // Acciones
    startStreaming,
    stopStreaming,
    refreshStatus,
    
    // URLs
    getHLSUrl,
    getRTSPUrl,
    
    // Utilidades
    isStreamingActive,
    isHLSSupported,
    isRTSPSupported,
  };
}
