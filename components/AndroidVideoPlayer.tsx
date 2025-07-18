'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AndroidVideoPlayerProps {
  screenId: string;
  autoplay?: boolean;
  muted?: boolean;
  className?: string;
  onError?: (error: any) => void;
  onLoad?: () => void;
}

interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'video' | 'image';
  duration?: number;
}

interface AndroidPlaylist {
  screenId: string;
  playlistName: string;
  items: PlaylistItem[];
  totalItems: number;
  currentIndex: number;
  isLooping: boolean;
  optimizedForAndroid: boolean;
  playbackInstructions?: {
    autoplay: boolean;
    muted: boolean;
    controls: boolean;
    preload: string;
    crossOrigin: string;
  };
}

// Modificar estas interfaces para adaptarse al formato de respuesta del endpoint android-tv-stream
interface StreamItem {
  id: string;
  name: string;
  streamUrl: string;
  type: 'video';
  duration: number;
  preload: 'none' | 'metadata' | 'auto';
  priority: 'high' | 'normal' | 'low';
}

interface AndroidTVPlaylist {
  screenId: string;
  playlistName: string;
  currentItem: StreamItem;
  nextItem?: StreamItem;
  totalItems: number;
  currentIndex: number;
  isLooping: boolean;
  streamingOptimized: boolean;
  androidTVConfig: {
    bufferSize: string;
    preloadStrategy: string;
    memoryManagement: string;
    autoAdvance: boolean;
    crossfade: boolean;
  };
}

export default function AndroidVideoPlayer({
  screenId,
  autoplay = true,
  muted = true,
  className = '',
  onError,
  onLoad
}: AndroidVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tvPlaylist, setTVPlaylist] = useState<AndroidTVPlaylist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Cargar playlist desde la API optimizada para TV
  useEffect(() => {
    loadTVStream();
  }, [screenId, currentIndex]);
  
  // Resetear contador de reintentos cuando cambia el índice
  useEffect(() => {
    setRetryCount(0);
  }, [currentIndex]);

  const loadTVStream = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`📺 [Android TV Player] Cargando stream para pantalla ${screenId}, índice ${currentIndex}`);
      
      const response = await fetch(`/api/public/android-tv-stream/${screenId}?index=${currentIndex}`);
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const streamData: AndroidTVPlaylist = await response.json();
      console.log(`📺 [Android TV Player] Stream cargado:`, streamData);
      
      setTVPlaylist(streamData);
      setIsLoading(false);
      
      if (onLoad) {
        onLoad();
      }
      
    } catch (error) {
      console.error('❌ [Android TV Player] Error cargando stream:', error);
      setError(error instanceof Error ? error.message : 'Error desconocido');
      setIsLoading(false);
      
      if (onError) {
        onError(error);
      }
      
      // Reintentar después de 5 segundos con delay incremental
      if (retryCount < 3) {
        const delay = 5000 * (retryCount + 1); // 5s, 10s, 15s
        setTimeout(() => {
          setRetryCount(prev => prev + 1);
          loadTVStream();
        }, delay);
      } else {
        // Después de 3 intentos, mostrar error pero permitir reintentos manuales
        console.log('🔄 [Android Player] Máximo de reintentos alcanzado, esperando intervención manual');
      }
    }
  };

  const setupVideo = async () => {
    if (!videoRef.current || !tvPlaylist) return;

    const video = videoRef.current;
    const currentItem = tvPlaylist.currentItem;
    
    console.log(`📺 [Android TV Player] Configurando video: ${currentItem.name}`);
    
    try {
      // Limpiar video anterior
      video.pause();
      video.removeAttribute('src');
      video.load();
      
      // Configurar video para Android TV
      video.src = currentItem.streamUrl;
      video.muted = muted;
      video.autoplay = autoplay;
      video.controls = false;
      video.preload = currentItem.preload || 'metadata';
      video.crossOrigin = 'anonymous';
      
      // Propiedades específicas para Android
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      
      // Configuraciones adicionales para Android TV
      video.volume = muted ? 0 : 1;
      video.defaultMuted = muted;
      
      // Cargar video con manejo de errores mejorado
      await new Promise((resolve, reject) => {
        const handleLoad = () => {
          video.removeEventListener('loadedmetadata', handleLoad);
          video.removeEventListener('error', handleError);
          resolve(void 0);
        };
        
        const handleError = (e: Event) => {
          video.removeEventListener('loadedmetadata', handleLoad);
          video.removeEventListener('error', handleError);
          reject(e);
        };
        
        video.addEventListener('loadedmetadata', handleLoad);
        video.addEventListener('error', handleError);
        
        video.load();
      });
      
      if (autoplay) {
        // Múltiples intentos de reproducción para Android
        await attemptPlay();
      }
      
    } catch (error) {
      console.warn('⚠️ [Android TV Player] Error configurando video (no crítico):', error);
      // No llamar handleVideoError aquí para evitar bucles infinitos
      // Solo intentar continuar con el siguiente video
      setTimeout(() => {
        if (tvPlaylist && tvPlaylist.totalItems > 1) {
          const nextIndex = (currentIndex + 1) % tvPlaylist.totalItems;
          setCurrentIndex(nextIndex);
        }
      }, 3000);
    }
  };

  // Configurar video cuando cambia el stream
  useEffect(() => {
    if (tvPlaylist) {
      setupVideo();
    }
  }, [tvPlaylist]);

  const attemptPlay = async () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    
    try {
      // Intento 1: Reproducción directa
      await video.play();
      console.log('✅ [Android Player] Reproducción iniciada');
      setError(null); // Limpiar errores previos
      
    } catch (error) {
      console.log('⚠️ [Android Player] Primer intento falló, reintentando...');
      
      // Intento 2: Con delay y asegurar mute
      setTimeout(async () => {
        if (!videoRef.current) return;
        try {
          video.muted = true; // Asegurar que esté silenciado
          await video.play();
          console.log('✅ [Android Player] Reproducción iniciada (segundo intento)');
          setError(null);
        } catch (secondError) {
          console.log('⚠️ [Android Player] Segundo intento falló, intento final...');
          
          // Intento 3: Forzar reproducción con configuración específica para Android
          setTimeout(async () => {
            if (!videoRef.current) return;
            try {
              // Configuración específica para Android TV
              video.muted = true;
              video.volume = 0;
              video.preload = 'auto';
              
              await video.play();
              console.log('✅ [Android Player] Reproducción iniciada (intento final)');
              setError(null);
            } catch (finalError) {
              console.warn('⚠️ [Android Video Player] Todos los intentos de reproducción fallaron, pero continuando...');
              // No llamar handleVideoError aquí para evitar bucles
              // Solo log del error sin bloquear la aplicación
              const errorMessage = finalError instanceof Error ? finalError.message : 'Error desconocido';
              console.log('📝 [Android Video Player] Error de reproducción (no crítico):', errorMessage);
            }
          }, 1000);
        }
      }, 500);
    }
  };

  const handleVideoError = (error: any) => {
    console.error('❌ [Android Player] Error de video:', error);
    
    // Obtener información detallada del error
    const target = error.target || videoRef.current;
    const videoError = target?.error;
    
    // Información básica del error
    const errorInfo = {
      fileName: tvPlaylist?.currentItem?.name || 'Desconocido',
      src: target?.src,
      currentTime: target?.currentTime,
      duration: target?.duration,
      networkState: target?.networkState,
      readyState: target?.readyState,
      paused: target?.paused,
      ended: target?.ended
    };
    
    // Si hay un objeto error específico del video
    if (videoError && videoError.code) {
      const errorDetails = {
        ...errorInfo,
        errorCode: videoError.code,
        errorMessage: videoError.message || 'Sin mensaje específico',
        errorType: ({
          1: 'MEDIA_ERR_ABORTED - Reproducción abortada',
          2: 'MEDIA_ERR_NETWORK - Error de red durante la descarga',
          3: 'MEDIA_ERR_DECODE - Error al decodificar el archivo',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Formato no soportado'
        } as Record<number, string>)[videoError.code] || `Código desconocido: ${videoError.code}`
      };
      
      console.error(`❌ Error de video detallado:`, errorDetails);
      
      // Manejo específico por tipo de error
      switch (videoError.code) {
        case 2: // MEDIA_ERR_NETWORK
          console.log('🔄 [Android Player] Error de red detectado, reintentando...');
          if (retryCount < 3) {
            setTimeout(() => {
              if (videoRef.current && tvPlaylist) {
                setRetryCount(prev => prev + 1);
                setupVideo();
              }
            }, 2000 * (retryCount + 1)); // Delay incremental
            setError('Error de conexión, reintentando...');
            return;
          }
          break;
        case 3: // MEDIA_ERR_DECODE
          console.log('⚠️ [Android Player] Error de decodificación, pasando al siguiente...');
          setTimeout(() => {
            if (tvPlaylist) {
              const nextIndex = (currentIndex + 1) % tvPlaylist.totalItems;
              setCurrentIndex(nextIndex);
            }
          }, 1000);
          setError('Error de formato de video, pasando al siguiente...');
          return;
        case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
          console.log('⚠️ [Android Player] Formato no soportado, pasando al siguiente...');
          setTimeout(() => {
            if (tvPlaylist) {
              const nextIndex = (currentIndex + 1) % tvPlaylist.totalItems;
              setCurrentIndex(nextIndex);
            }
          }, 1000);
          setError('Formato no soportado, pasando al siguiente...');
          return;
      }
    }
    
    // Detectar errores de streaming por mensaje
    const errorMessage = error.message || videoError?.message || 'Error desconocido';
    
    if (errorMessage.includes('unexpected end of stream') || 
        errorMessage.includes('ProtocolException') ||
        errorMessage.includes('NetworkError')) {
      console.log('🔄 [Android Player] Error de streaming detectado, reintentando...');
      
      if (retryCount < 3) {
        setTimeout(() => {
          if (videoRef.current && tvPlaylist) {
            setRetryCount(prev => prev + 1);
            setupVideo();
          }
        }, 2000 * (retryCount + 1));
        setError('Error de conexión, reintentando...');
        return;
      }
    }
    
    // Error genérico - mostrar mensaje pero no bloquear
    console.log('⚠️ [Android Player] Error genérico, continuando reproducción...');
    setError(`Error temporal: ${errorMessage}`);
    
    // Limpiar error después de 5 segundos
    setTimeout(() => {
      setError(null);
    }, 5000);
    
    if (onError) {
      onError(error);
    }
  };

  const handleVideoEnded = () => {
    if (!tvPlaylist) return;
    
    console.log('🔄 [Android TV Player] Video terminado, pasando al siguiente');
    
    // Avanzar al siguiente índice
    const nextIndex = (currentIndex + 1) % tvPlaylist.totalItems;
    setCurrentIndex(nextIndex);
  };

  const handleVideoLoadStart = () => {
    console.log('📱 [Android Player] Iniciando carga de video...');
  };

  const handleVideoCanPlay = () => {
    console.log('📱 [Android Player] Video listo para reproducir');
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-black text-white ${className}`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Cargando contenido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-900 text-white ${className}`}>
        <div className="text-center p-4">
          <p className="text-lg font-bold mb-2">Error de reproducción</p>
          <p className="text-sm mb-4">{error}</p>
          <button 
            onClick={loadTVStream}
            className="bg-red-700 hover:bg-red-600 px-4 py-2 rounded"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!tvPlaylist) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white ${className}`}>
        <div className="text-center">
          <p>No hay contenido disponible</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative bg-black ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        onEnded={handleVideoEnded}
        onError={(e) => handleVideoError(e.nativeEvent)}
        onLoadStart={handleVideoLoadStart}
        onCanPlay={handleVideoCanPlay}
        playsInline
        webkit-playsinline="true"
      />
      
      {/* Información de debug (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white text-xs p-2 rounded">
          <p>Pantalla: {screenId}</p>
          <p>Video: {currentIndex + 1}/{tvPlaylist.totalItems}</p>
          <p>Archivo: {tvPlaylist.currentItem.name}</p>
        </div>
      )}
    </div>
  );
}
