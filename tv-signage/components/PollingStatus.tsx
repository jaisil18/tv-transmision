'use client';

import { useState, useEffect } from 'react';

interface ContentStatus {
  hasContent: boolean;
  contentHash: string | null;
  lastModified: number;
  itemCount: number;
  playlistName: string | null;
  files: string[];
}

interface PollingStatusProps {
  status: ContentStatus | null;
  isPolling: boolean;
  error: Error | null;
  lastCheck: Date | null;
  className?: string;
  showDetails?: boolean;
}

export default function PollingStatus({
  status,
  isPolling,
  error,
  lastCheck,
  className = '',
  showDetails = false
}: PollingStatusProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Mostrar temporalmente cuando hay actividad
  useEffect(() => {
    if (isPolling) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isPolling]);

  // Mostrar permanentemente si hay error
  useEffect(() => {
    if (error) {
      setIsVisible(true);
    }
  }, [error]);

  if (!isVisible && !showDetails) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 ${className}`}>
      {/* Indicador principal */}
      <div className={`
        px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg
        transition-all duration-300 flex items-center gap-2
        ${error ? 'bg-red-500/90' : 
          isPolling ? 'bg-blue-500/90' : 
          status?.hasContent ? 'bg-green-500/90' : 'bg-gray-500/90'}
      `}>
        {error ? (
          <>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Error de conexión
          </>
        ) : isPolling ? (
          <>
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            Verificando contenido...
          </>
        ) : status?.hasContent ? (
          <>
            <div className="w-2 h-2 bg-white rounded-full"></div>
            Contenido actualizado
          </>
        ) : (
          <>
            <div className="w-2 h-2 bg-white rounded-full opacity-50"></div>
            Sin contenido
          </>
        )}
      </div>

      {/* Detalles expandidos */}
      {showDetails && status && (
        <div className="mt-2 bg-black/80 text-white px-3 py-2 rounded-lg text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-300">Elementos:</span>
            <span>{status.itemCount}</span>
          </div>
          
          {status.playlistName && (
            <div className="flex justify-between">
              <span className="text-gray-300">Playlist:</span>
              <span className="truncate max-w-32">{status.playlistName}</span>
            </div>
          )}
          
          {status.contentHash && (
            <div className="flex justify-between">
              <span className="text-gray-300">Hash:</span>
              <span className="font-mono">{status.contentHash.substring(0, 8)}...</span>
            </div>
          )}
          
          {lastCheck && (
            <div className="flex justify-between">
              <span className="text-gray-300">Última verificación:</span>
              <span>{lastCheck.toLocaleTimeString()}</span>
            </div>
          )}
          
          {status.files.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-600">
              <div className="text-gray-300 mb-1">Archivos:</div>
              <div className="max-h-20 overflow-y-auto space-y-1">
                {status.files.slice(0, 3).map((file, index) => (
                  <div key={index} className="text-xs truncate">
                    📄 {file}
                  </div>
                ))}
                {status.files.length > 3 && (
                  <div className="text-xs text-gray-400">
                    +{status.files.length - 3} más...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
