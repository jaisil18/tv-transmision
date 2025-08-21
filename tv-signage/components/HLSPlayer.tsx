'use client';

import React, { useEffect, useRef, useState } from 'react';

interface HLSPlayerProps {
  screenId: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (error: any) => void;
  onLoad?: () => void;
}

interface NetworkConfig {
  hls: {
    baseUrl: string;
    segmentsUrl: string;
  };
  client: {
    isAndroid: boolean;
    isMobile: boolean;
    isIOS: boolean;
  };
}

export default function HLSPlayer({
  screenId,
  autoplay = true,
  muted = true,
  controls = false,
  className = '',
  onError,
  onLoad
}: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;

  // Detectar configuración de red
  useEffect(() => {
    const detectNetwork = async () => {
      try {
        const response = await fetch('/api/network/detect');
        if (response.ok) {
          const config = await response.json();
          setNetworkConfig(config);
          console.log('🌐 [HLS Player] Configuración de red detectada:', config);
        }
      } catch (error) {
        console.warn('⚠️ [HLS Player] No se pudo detectar configuración de red:', error);
      }
    };

    detectNetwork();
  }, []);

  // Inicializar reproductor HLS
  useEffect(() => {
    if (!networkConfig || !videoRef.current) return;

    const video = videoRef.current;
    const playlistUrl = `${networkConfig.hls.baseUrl}/${screenId}`;

    console.log(`🎬 [HLS Player] Inicializando reproductor para pantalla ${screenId}`);
    console.log(`📺 [HLS Player] URL del playlist: ${playlistUrl}`);

    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Verificar soporte nativo de HLS (Safari, iOS, algunos Android)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          console.log('📱 [HLS Player] Usando soporte nativo de HLS');
          
          video.src = playlistUrl;
          
          video.addEventListener('loadstart', () => {
            console.log('🔄 [HLS Player] Carga iniciada');
          });
          
          video.addEventListener('canplay', () => {
            console.log('✅ [HLS Player] Video listo para reproducir');
            setIsLoading(false);
            onLoad?.();
          });
          
          video.addEventListener('error', (e) => {
            const errorMsg = `Error de video nativo: ${video.error?.message || 'Error desconocido'}`;
            console.error('❌ [HLS Player]', errorMsg);
            setError(errorMsg);
            onError?.(video.error);
          });

          if (autoplay) {
            try {
              await video.play();
            } catch (playError) {
              console.warn('⚠️ [HLS Player] Autoplay falló, requiere interacción del usuario');
            }
          }

        } else {
          // Usar HLS.js para navegadores que no soportan HLS nativamente
          console.log('🌐 [HLS Player] Usando HLS.js');
          
          // Importar HLS.js dinámicamente
          const Hls = (await import('hls.js')).default;
          
          if (Hls.isSupported()) {
            const hls = new Hls({
              debug: false,
              enableWorker: true,
              lowLatencyMode: true,
              backBufferLength: 90,
              maxBufferLength: 30,
              maxMaxBufferLength: 60,
              maxBufferSize: 60 * 1000 * 1000,
              maxBufferHole: 0.5,
              highBufferWatchdogPeriod: 2,
              nudgeOffset: 0.1,
              nudgeMaxRetry: 3,
              maxFragLookUpTolerance: 0.25,
              liveSyncDurationCount: 3,
              liveMaxLatencyDurationCount: 10,
              liveDurationInfinity: true,
              liveBackBufferLength: 0,
              maxLiveSyncPlaybackRate: 1.5,
              liveSyncDuration: 1,
              liveMaxLatencyDuration: 5,
              maxStarvationDelay: 4,
              maxLoadingDelay: 4,
              minAutoBitrate: 0,
              emeEnabled: false,
              widevineLicenseUrl: undefined,
              drmSystemOptions: {},
              requestMediaKeySystemAccessFunc: undefined,
            });

            hlsRef.current = hls;

            hls.loadSource(playlistUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
              console.log('🔗 [HLS Player] Media adjuntado');
            });

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log('📋 [HLS Player] Manifest parseado');
              setIsLoading(false);
              onLoad?.();
              
              if (autoplay) {
                video.play().catch(playError => {
                  console.warn('⚠️ [HLS Player] Autoplay falló:', playError);
                });
              }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('❌ [HLS Player] Error de HLS.js:', data);
              
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log('🔄 [HLS Player] Error de red, reintentando...');
                    if (retryCount < maxRetries) {
                      setRetryCount(prev => prev + 1);
                      setTimeout(() => {
                        hls.startLoad();
                      }, 1000 * (retryCount + 1));
                    } else {
                      setError('Error de red: No se pudo cargar el stream');
                      onError?.(data);
                    }
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log('🔄 [HLS Player] Error de media, recuperando...');
                    hls.recoverMediaError();
                    break;
                  default:
                    setError(`Error fatal de HLS: ${data.details}`);
                    onError?.(data);
                    break;
                }
              }
            });

          } else {
            const errorMsg = 'HLS no es soportado en este navegador';
            console.error('❌ [HLS Player]', errorMsg);
            setError(errorMsg);
            onError?.(new Error(errorMsg));
          }
        }

      } catch (error) {
        const errorMsg = `Error al inicializar reproductor: ${error instanceof Error ? error.message : 'Error desconocido'}`;
        console.error('❌ [HLS Player]', errorMsg);
        setError(errorMsg);
        onError?.(error);
      }
    };

    initializePlayer();

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [screenId, networkConfig, autoplay, onError, onLoad, retryCount]);

  // Manejar cambios de visibilidad para optimizar en móviles
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!videoRef.current) return;

      if (document.hidden) {
        videoRef.current.pause();
      } else if (autoplay) {
        videoRef.current.play().catch(console.warn);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [autoplay]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-900 text-white ${className}`}>
        <div className="text-center p-4">
          <div className="text-red-400 mb-2">❌ Error de reproducción</div>
          <div className="text-sm text-gray-300">{error}</div>
          <button 
            onClick={() => {
              setError(null);
              setRetryCount(0);
              window.location.reload();
            }}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <div>Cargando stream...</div>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay={autoplay}
        muted={muted}
        controls={controls}
        playsInline // Importante para iOS
        webkit-playsinline="true" // Para compatibilidad con versiones antiguas de iOS
        preload="metadata"
      />
    </div>
  );
}
