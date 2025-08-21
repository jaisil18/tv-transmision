import { useState, useEffect, useCallback, useRef } from 'react';

interface ContentStatus {
  hasContent: boolean;
  contentHash: string | null;
  lastModified: number;
  itemCount: number;
  playlistName: string | null;
  files: string[];
}

interface UseContentPollingOptions {
  screenId: string;
  interval?: number; // en milisegundos, default 10000 (10s)
  enabled?: boolean;
  onContentChange?: (newStatus: ContentStatus, oldStatus: ContentStatus | null) => void;
  onError?: (error: Error) => void;
}

export function useContentPolling({
  screenId,
  interval = 120000, // Aumentar a 2 minutos para reducir carga significativamente
  enabled = false, // TEMPORALMENTE DESHABILITADO para reducir carga del servidor
  onContentChange,
  onError
}: UseContentPollingOptions) {
  const [status, setStatus] = useState<ContentStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousStatusRef = useRef<ContentStatus | null>(null);
  const isInitialLoadRef = useRef(true);

  const checkContentStatus = useCallback(async () => {
    if (!enabled || !screenId) return;

    try {
      setIsPolling(true);
      setError(null);

      // Solo log en modo desarrollo
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔄 [Polling] Verificando contenido para pantalla ${screenId}`);
      }

      const response = await fetch(`/api/screens/${screenId}/content-status`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const newStatus: ContentStatus = await response.json();
      setLastCheck(new Date());

      // Comparar con el estado anterior
      const oldStatus = previousStatusRef.current;
      const hasChanged = !oldStatus || 
        oldStatus.contentHash !== newStatus.contentHash ||
        oldStatus.itemCount !== newStatus.itemCount ||
        oldStatus.hasContent !== newStatus.hasContent;

      if (hasChanged) {
        console.log(`🔄 [Polling] Contenido cambió para pantalla ${screenId}:`, {
          old: oldStatus ? {
            hash: oldStatus.contentHash?.substring(0, 8) + '...',
            items: oldStatus.itemCount,
            playlist: oldStatus.playlistName
          } : null,
          new: {
            hash: newStatus.contentHash?.substring(0, 8) + '...',
            items: newStatus.itemCount,
            playlist: newStatus.playlistName
          }
        });

        // Solo llamar onContentChange si no es la carga inicial o si realmente cambió
        if (!isInitialLoadRef.current && onContentChange) {
          onContentChange(newStatus, oldStatus);
        }
      } else {
        // Solo log en modo desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.log(`✅ [Polling] Sin cambios para pantalla ${screenId}`);
        }
      }

      setStatus(newStatus);
      previousStatusRef.current = newStatus;
      isInitialLoadRef.current = false;

    } catch (err) {
      const error = err instanceof Error ? err : new Error('Error desconocido');
      console.error(`❌ [Polling] Error para pantalla ${screenId}:`, error);
      setError(error);
      
      if (onError) {
        onError(error);
      }
    } finally {
      setIsPolling(false);
    }
  }, [screenId, enabled, onContentChange, onError]);

  // Función para forzar una verificación inmediata
  const forceCheck = useCallback(() => {
    console.log(`🔄 [Polling] Verificación forzada para pantalla ${screenId}`);
    checkContentStatus();
  }, [checkContentStatus, screenId]);

  // Configurar polling
  useEffect(() => {
    if (!enabled || !screenId) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Verificación inicial
    checkContentStatus();

    // Configurar intervalo
    intervalRef.current = setInterval(checkContentStatus, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, screenId, interval, checkContentStatus]);

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    status,
    isPolling,
    error,
    lastCheck,
    forceCheck,
    // Utilidades
    hasContent: status?.hasContent ?? false,
    itemCount: status?.itemCount ?? 0,
    playlistName: status?.playlistName,
    contentHash: status?.contentHash
  };
}
