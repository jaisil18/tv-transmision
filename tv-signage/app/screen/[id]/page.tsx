'use client';

import { useEffect, useState, use, useCallback, useRef } from 'react';
import Image from 'next/image';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useResponsiveVideo } from '@/hooks/useResponsiveVideo';
import { useContentPolling } from '@/hooks/useContentPolling';
import PollingStatus from '@/components/PollingStatus';
import AutoRefreshManager from '@/utils/auto-refresh';
import { useMosaicItems } from '@/hooks/useMosaicItems';
import MosaicPlayer from '@/components/MosaicPlayer';

interface FileInfo {
  url: string;
  name: string;
  timestamp: number;
}

interface PageParams {
  params: Promise<{ id: string }>;
}

export default function Screen({ params }: PageParams) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumeChanged, setVolumeChanged] = useState(false);
  const [screenMuted, setScreenMuted] = useState(true); // Por defecto en mute
  const [showMosaics, setShowMosaics] = useState(false);
  
  // Cargar elementos de mosaico
  const { 
    mosaico1Items, 
    mosaico2Items, 
    isLoading: isMosaicLoading, 
    error: mosaicError,
    refreshMosaicItems 
  } = useMosaicItems(id);

  // Hook para manejo responsivo de video
  const { deviceInfo, videoAspectRatio, getVideoConfig, detectVideoAspectRatio } = useResponsiveVideo();

  // Efecto para prevenir scroll en móviles
  useEffect(() => {
    // Agregar clase para identificar páginas de pantalla
    document.body.classList.add('screen-page');
    
    if (deviceInfo?.type === 'mobile') {
      // Prevenir scroll en móviles
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';

      // Prevenir zoom con gestos
      const preventZoom = (e: TouchEvent) => {
        if (e.touches.length > 1) {
          e.preventDefault();
        }
      };

      document.addEventListener('touchstart', preventZoom, { passive: false });
      document.addEventListener('touchmove', preventZoom, { passive: false });

      return () => {
        // Limpiar clase al desmontar
        document.body.classList.remove('screen-page');
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.removeEventListener('touchstart', preventZoom);
        document.removeEventListener('touchmove', preventZoom);
      };
    }
    
    return () => {
      // Limpiar clase al desmontar
      document.body.classList.remove('screen-page');
    };
  }, [deviceInfo?.type]);

  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenStatus, setScreenStatus] = useState<'active' | 'inactive'>('inactive');
  const [isRepeating, setIsRepeating] = useState(true); // Por defecto en modo repetir
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [isVideoPaused, setIsVideoPaused] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Prevenir múltiples fetches
  const videoRef = useRef<HTMLVideoElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const wsRef = useRef<WebSocket | null>(null);

  // Cargar configuraciones del sistema
  const { settings, isInOperatingHours, hasActiveEmergency } = useSystemSettings();

  // Hook de polling inteligente COMPLETAMENTE DESHABILITADO para evitar bugs
  const contentStatus = null;
  const isPolling = false;
  const pollingError = null;
  const lastCheck = null;





  // Cargar estado de mute de la pantalla
  useEffect(() => {
    const loadMuteStatus = async () => {
      try {
        const response = await fetch(`/api/public/screens/${id}/mute`);
        if (response.ok) {
          const data = await response.json();
          const muteStatus = data.muted !== false; // Por defecto true
          console.log(`🔇 Estado de mute cargado: ${muteStatus}`);
          setScreenMuted(muteStatus);
        } else {
          // Si no se puede cargar, usar mute por defecto
          console.log('🔇 No se pudo cargar estado de mute, usando mute por defecto');
          setScreenMuted(true);
        }
      } catch (error) {
        console.error('Error al cargar estado de mute:', error);
        setScreenMuted(true); // Por defecto en mute si hay error
      }
    };

    loadMuteStatus();
    // Verificar estado de mute cada 60 segundos (menos frecuente)
    const interval = setInterval(loadMuteStatus, 60000);
    return () => clearInterval(interval);
  }, [id]);

  // Actualizar el título de la página con el nombre del sistema
  useEffect(() => {
    if (settings?.systemName) {
      document.title = `${settings.systemName} - Pantalla ${id}`;
    }
  }, [settings?.systemName, id]);

  // Función para cargar los archivos y el estado de la pantalla
  const fetchContent = useCallback(async () => {
    // Prevenir múltiples llamadas simultáneas
    if (isFetching) {
      console.log(`⏸️ fetchContent ya en progreso para pantalla ${id} - omitiendo`);
      return;
    }

    console.log(`🔄 fetchContent iniciado para pantalla ${id}`);
    setIsFetching(true);
    try {
      // Primero, enviamos un heartbeat y obtenemos el estado actualizado de la pantalla
      const heartbeatData = { lastSeen: Date.now() };
      console.log(`📡 Enviando heartbeat a /api/public/screens/${id}/heartbeat`);
      console.log(`📤 Datos a enviar:`, heartbeatData);
      
      const screenResponse = await fetch(`/api/public/screens/${id}/heartbeat`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(heartbeatData),
      });

      console.log(`📡 Respuesta del heartbeat: ${screenResponse.status}`);
      if (!screenResponse.ok) {
        const errorText = await screenResponse.text();
        console.warn(`⚠️ Error en heartbeat: ${screenResponse.status} - ${errorText}`);
        // No detener la ejecución por error de heartbeat
        return;
      }

      const screenData = await screenResponse.json();
      console.log(`📊 Datos de pantalla recibidos:`, screenData);

      // Extraer los datos de la pantalla del objeto de respuesta
      const screen = screenData.screen || screenData;
      setScreenStatus(screen.status);
      setIsRepeating(screen.isRepeating !== false); // Por defecto true, solo false si explícitamente se establece

      // Si la pantalla está inactiva, no cargamos contenido
      if (screen.status !== 'active') {
        console.log(`⏸️ Pantalla inactiva (${screen.status}), no cargando contenido`);
        setFiles([]);
        return;
      }

      // Cargar el contenido de la playlist asignada
      console.log(`📋 Cargando contenido de /api/screens/${id}/content`);
      const contentResponse = await fetch(`/api/screens/${id}/content`);
      console.log(`📋 Respuesta del contenido: ${contentResponse.status}`);

      if (!contentResponse.ok) {
        console.warn(`⚠️ Error al cargar contenido: ${contentResponse.status} - reintentando en 30s`);
        // No mostrar error inmediatamente, reintentar después
        setTimeout(() => fetchContent(), 30000);
        return;
      }

      const contentData = await contentResponse.json();
      console.log(`📋 Datos de contenido recibidos:`, contentData);

      if (contentData && Array.isArray(contentData.items)) {
        console.log(`✅ Contenido válido encontrado: ${contentData.items.length} elementos`);
        console.log(`📋 Archivos recibidos:`, contentData.items.map((item: any) => ({ name: item.name, url: item.url })));

        // Comparamos si el contenido ha cambiado antes de actualizar el estado
        setFiles((prevFiles) => {
          const newUrls = contentData.items.map((item: any) => item.url).join(',');
          const prevUrls = prevFiles.map((item) => item.url).join(',');
          if (newUrls !== prevUrls) {
            console.log(`🔄 Contenido cambió, reiniciando playlist`);
            console.log(`📋 Nuevos archivos:`, contentData.items);
            // Solo reiniciar índice si realmente cambió el contenido
            setCurrentIndex(0);
            return contentData.items;
          }
          console.log(`📋 Contenido sin cambios (${prevFiles.length} archivos)`);
          return prevFiles;
        });
        setError(null);
      } else {
        console.error(`❌ Formato de datos inválido:`, contentData);
        setError('Formato de datos de contenido inválido');
        setFiles([]);
      }
    } catch (error) {
      console.error('❌ Error en fetchContent:', error);
      // No mostrar error, reintentar en 30 segundos
      setTimeout(() => fetchContent(), 30000);
    } finally {
      console.log(`🏁 fetchContent completado`);
      setIsLoading(false);
      setIsFetching(false); // Liberar el lock
    }
  }, [id, isFetching]);

  // Función para manejar eventos de auto-refresh
  const handleAutoRefreshEvent = useCallback((event: any) => {
    console.log('🔄 [AutoRefresh] Evento recibido:', event.type);

    switch (event.type) {
      case 'content-updated':
      case 'files-uploaded':
      case 'playlist-updated':
        console.log('🔄 [AutoRefresh] Actualizando contenido automáticamente...');
        // Mostrar indicador de refresh
        setIsRefreshing(true);
        // Recargar contenido inmediatamente
        fetchContent();
        // También refrescar elementos de mosaico
        refreshMosaicItems();
        // Ocultar indicador después de un momento
        setTimeout(() => setIsRefreshing(false), 2000);
        break;
      case 'mosaic-toggle':
        // Comando para mostrar/ocultar mosaicos
        console.log('🖼️ [AutoRefresh] Comando para alternar mosaicos');
        setShowMosaics(prev => !prev);
        break;
      case 'mosaic-show':
        console.log('🖼️ [AutoRefresh] Comando para mostrar mosaicos');
        setShowMosaics(true);
        break;
      case 'mosaic-hide':
        console.log('🖼️ [AutoRefresh] Comando para ocultar mosaicos');
        setShowMosaics(false);
        break;
    }
  }, [fetchContent, refreshMosaicItems]);

  // Inicializar auto-refresh - TEMPORALMENTE DESHABILITADO
  // useEffect(() => {
  //   const autoRefresh = AutoRefreshManager.getInstance();
  //   autoRefresh.startPolling(handleAutoRefreshEvent);

  //   console.log('✅ [AutoRefresh] Sistema de actualización automática iniciado');

  //   return () => {
  //     autoRefresh.stopPolling();
  //   };
  // }, [handleAutoRefreshEvent]);

  // Función para manejar la conexión SSE
  const setupEventSource = useCallback(() => {
    console.log(`🔌 Configurando SSE para pantalla ${id}`);
    if (eventSourceRef.current) {
      console.log(`🔌 Cerrando conexión SSE existente`);
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource(`/api/events?screenId=${id}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
    setIsConnected(true);
    console.log('✅ Conexión SSE establecida exitosamente');
    // AGREGAR: Notificar que la pantalla está lista
    console.log(`📱 Pantalla ${id} lista para recibir comandos`);
  };

    eventSource.onmessage = async (event) => {
    try {
      console.log('📨 Mensaje SSE recibido:', event.data);
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'connected':
          console.log(`🔗 Pantalla ${id} conectada al sistema de eventos`);
          break;
        case 'heartbeat':
          setIsConnected(true);
          console.log('💓 Heartbeat SSE recibido');
          break;
        case 'refresh':
          console.log('🔄 Comando recibido: refresh - Actualizando contenido...');
          console.log('🔄 Datos del comando refresh:', data);
          // Mostrar indicador de refresh
          setIsRefreshing(true);
          // Forzar recarga completa del contenido
          setIsLoading(true);
          setCurrentIndex(0);
          await fetchContent();
          console.log('✅ Actualización completada');
          // Ocultar indicador después de un momento
          setTimeout(() => setIsRefreshing(false), 3000);
          break;
          case 'repeat':
            console.log('Comando recibido: repeat', data);
            // Actualizar el estado de repetición inmediatamente si se proporciona
            if (typeof data.isRepeating === 'boolean') {
              setIsRepeating(data.isRepeating);
              console.log('Estado de repetición actualizado a:', data.isRepeating);
            } else {
              // Si no se proporciona, recargar el estado completo
              await fetchContent();
            }
            break;
          case 'navigate':
            console.log('Comando recibido: navigate', data);
            if (data.direction === 'next') {
              console.log('📱 Comando remoto: siguiente');
              goToNextFileManual();
            } else if (data.direction === 'previous') {
              console.log('📱 Comando remoto: anterior');
              goToPreviousFile();
            }
            break;
          case 'mute':
            console.log('Comando recibido: mute', data);
            if (typeof data.muted === 'boolean') {
              console.log(`🔇 Comando remoto: mute ${data.muted ? 'activado' : 'desactivado'}`);
              setScreenMuted(data.muted);
            }
            break;
        }
      } catch (err) {
        console.warn('❌ Error al procesar mensaje SSE:', err);
      }
    };

    eventSource.onerror = (error) => {
      console.error('❌ Error en conexión SSE:', error);
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;

      console.log('🔄 Reintentando conexión SSE en 5 segundos...');
      reconnectTimeoutRef.current = setTimeout(() => {
        setupEventSource();
      }, 5000);
    };

    return eventSource;
  }, [id, fetchContent]);

  // Iniciar conexión SSE
  useEffect(() => {
    const eventSource = setupEventSource();
    
    return () => {
      eventSource.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [setupEventSource]);

  // Cargar contenido inicial solamente (el polling inteligente maneja las actualizaciones)
  useEffect(() => {
    fetchContent();
    // Eliminar interval redundante - el polling inteligente ya maneja las actualizaciones
  }, [fetchContent]);

  // Efecto para iniciar/detener la reproducción
  useEffect(() => {
    console.log(`🎬 Estado de reproducción - files.length: ${files.length}, isPlaying: ${isPlaying}`);
    if (files.length > 0) {
      console.log(`▶️ Iniciando reproducción con ${files.length} archivos`);
      setIsPlaying(true);
    } else {
      console.log(`⏹️ Deteniendo reproducción - no hay archivos`);
      setIsPlaying(false);
    }
  }, [files]);





  // Función para avanzar al siguiente archivo
  const goToNextFile = useCallback((forceRepeat = false) => {
    if (files.length === 0) return;

    console.log('🎬 goToNextFile - isRepeating:', isRepeating, 'forceRepeat:', forceRepeat, 'currentIndex:', currentIndex, 'totalFiles:', files.length);

    const nextIndex = (currentIndex + 1) % files.length;

    // Si llegamos al final de la playlist (volvemos al índice 0)
    if (nextIndex === 0) {
      if (isRepeating || forceRepeat) {
        // Modo repetir: volver al inicio de la playlist
        console.log('🔄 Fin de playlist - Modo repetir activo: volviendo al inicio');
        setCurrentIndex(0);
      } else {
        // Sin repetir: detener la reproducción al final
        console.log('⏹️ Fin de playlist - Sin repetir: deteniendo reproducción');
        setIsPlaying(false);
        return;
      }
    } else {
      // Avanzar normalmente al siguiente archivo
      console.log(`➡️ Avanzando al siguiente archivo: ${currentIndex} → ${nextIndex}`);
      setCurrentIndex(nextIndex);
    }

    // Solo establecer tiempo para imágenes, no para videos
    const nextFile = files[nextIndex === 0 ? 0 : nextIndex];
    const isNextVideo = nextFile?.url.match(/\.(mp4|webm|ogg)$/i);

    if (!isNextVideo) {
      const transitionTime = settings?.transitionTime || 10;
      setTimeLeft(transitionTime);
      console.log(`⏰ [IMAGEN] Tiempo reiniciado a ${transitionTime}s`);
    } else {
      setTimeLeft(0);
      console.log(`🎬 [VIDEO] Sin temporizador - reproducción completa`);
    }

    setIsPlaying(true);
  }, [files.length, isRepeating, settings?.transitionTime, currentIndex]);

  // Función para ir al archivo anterior
  const goToPreviousFile = useCallback(() => {
    if (files.length === 0) return;

    const prevIndex = (currentIndex - 1 + files.length) % files.length;
    console.log(`⬅️ Retrocediendo al archivo anterior: ${currentIndex} → ${prevIndex}`);
    setCurrentIndex(prevIndex);

    // Solo establecer tiempo para imágenes, no para videos
    const prevFile = files[prevIndex];
    const isPrevVideo = prevFile?.url.match(/\.(mp4|webm|ogg)$/i);

    if (!isPrevVideo) {
      const transitionTime = settings?.transitionTime || 10;
      setTimeLeft(transitionTime);
      console.log(`⏰ [IMAGEN] Tiempo reiniciado a ${transitionTime}s (anterior)`);
    } else {
      setTimeLeft(0);
      console.log(`🎬 [VIDEO] Sin temporizador - reproducción completa (anterior)`);
    }

    setIsPlaying(true);
  }, [files.length, settings?.transitionTime, currentIndex]);

  // Función para ir al siguiente archivo (manual)
  const goToNextFileManual = useCallback(() => {
    if (files.length === 0) return;

    const nextIndex = (currentIndex + 1) % files.length;
    console.log(`➡️ Avanzando al siguiente archivo (manual): ${currentIndex} → ${nextIndex}`);
    setCurrentIndex(nextIndex);

    // Solo establecer tiempo para imágenes, no para videos
    const nextFile = files[nextIndex];
    const isNextVideo = nextFile?.url.match(/\.(mp4|webm|ogg)$/i);

    if (!isNextVideo) {
      const transitionTime = settings?.transitionTime || 10;
      setTimeLeft(transitionTime);
      console.log(`⏰ [IMAGEN] Tiempo reiniciado a ${transitionTime}s (manual)`);
    } else {
      setTimeLeft(0);
      console.log(`🎬 [VIDEO] Sin temporizador - reproducción completa (manual)`);
    }

    setIsPlaying(true);
  }, [files.length, settings?.transitionTime, currentIndex]);

  // Efecto para el temporizador de imágenes SOLAMENTE (usando configuración del sistema)
  useEffect(() => {
    if (!files.length || !isPlaying) return;

    const currentFile = files[currentIndex];
    const isVideo = currentFile?.url.match(/\.(mp4|webm|ogg)$/i);

    // SOLO aplicar temporizador a imágenes, NO a videos
    if (!isVideo) {
      // Usar el tiempo de transición de las configuraciones del sistema
      const transitionTime = settings?.transitionTime || 10;

      console.log(`⏰ [IMAGEN] Iniciando temporizador para imagen: ${transitionTime}s`);

      // Inicializar el tiempo restante
      setTimeLeft(transitionTime);

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          console.log(`⏰ [IMAGEN] Tiempo restante: ${prev}s`);
          if (prev <= 1) {
            console.log('➡️ [IMAGEN] Tiempo agotado - avanzando al siguiente archivo');
            goToNextFile();
            return transitionTime;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        console.log('🧹 [IMAGEN] Limpiando temporizador');
        clearInterval(timer);
      };
    } else {
      // Para videos, NO usar temporizador - se reproducen hasta el final
      console.log('🎬 [VIDEO] Reproduciendo video completo sin temporizador');
      setTimeLeft(0); // No mostrar countdown para videos
    }
  }, [currentIndex, files, goToNextFile, isPlaying, settings?.transitionTime]);

  const handleVideoEnd = useCallback(() => {
    console.log('🎬 Video terminado - avanzando al siguiente archivo');

    // Para TVs Android: pequeña pausa antes de cambiar video para evitar problemas
    if (deviceInfo?.type === 'tv') {
      setTimeout(() => {
        goToNextFile();
      }, 500); // 500ms de pausa para TVs
    } else {
      goToNextFile();
    }
  }, [goToNextFile, deviceInfo?.type]);

  // Función para detectar aspect ratio del video y manejar autoplay en TVs
  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      detectVideoAspectRatio(video);

      // Estrategia SUPER AGRESIVA para autoplay
      video.preload = 'auto';
      video.playsInline = true;

      // Múltiples intentos de reproducción automática
      const attemptPlay = async (attempt = 1) => {
        try {
          await video.play();
          console.log(`✅ Autoplay exitoso en intento ${attempt}`);
          setIsVideoPaused(false);
        } catch (error) {
          console.log(`⚠️ Intento ${attempt} falló:`, error instanceof Error ? error.message : error);

          if (attempt < 5) { // Hasta 5 intentos
            setTimeout(() => attemptPlay(attempt + 1), attempt * 500);
          } else {
            console.log('⚠️ Todos los intentos de autoplay fallaron');
            // NO mostrar botón, solo marcar como pausado internamente
            setIsVideoPaused(true);

            // Continuar intentando en segundo plano
            const backgroundRetry = setInterval(async () => {
              if (video.paused) {
                try {
                  await video.play();
                  console.log('✅ Reproducción exitosa en segundo plano');
                  setIsVideoPaused(false);
                  clearInterval(backgroundRetry);
                } catch (bgError) {
                  console.log('🔄 Reintentando en segundo plano...');
                }
              } else {
                clearInterval(backgroundRetry);
              }
            }, 2000);

            // Limpiar después de 30 segundos
            setTimeout(() => clearInterval(backgroundRetry), 30000);
          }
        }
      };

      attemptPlay();
    }
  }, [detectVideoAspectRatio, deviceInfo?.type]);

  // Función para manejar click en el video (iniciar reproducción si está pausado)
  const handleVideoClick = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
        console.log('▶️ Video iniciado por interacción del usuario');
        setIsVideoPaused(false);
      }
    }
  }, []);

  // Función para manejar pausas automáticas en TVs - MÁS AGRESIVA
  const handleVideoPause = useCallback(() => {
    console.log('⏸️ Video pausado - intentando reanudar inmediatamente');

    // Intentar reanudar INMEDIATAMENTE sin mostrar botón
    if (videoRef.current) {
      // Primer intento inmediato
      videoRef.current.play().catch(() => {
        console.log('🔄 Primer intento de reanudación falló, reintentando...');

        // Segundo intento después de 500ms
        setTimeout(() => {
          if (videoRef.current && videoRef.current.paused) {
            videoRef.current.play().catch(() => {
              console.log('🔄 Segundo intento falló, reintentando en 1s...');

              // Tercer intento después de 1 segundo
              setTimeout(() => {
                if (videoRef.current && videoRef.current.paused) {
                  videoRef.current.play().catch(() => {
                    console.log('⚠️ Todos los intentos fallaron, marcando como pausado');
                    setIsVideoPaused(true);
                  });
                }
              }, 1000);
            });
          }
        }, 500);
      });
    }
  }, []);

  // Función para manejar cuando el video empieza a reproducir
  const handleVideoPlay = useCallback(() => {
    console.log('▶️ Video reproduciéndose');
    setIsVideoPaused(false);
  }, []);

  // Aplicar configuraciones de audio al video y optimizaciones para TV
  useEffect(() => {
    if (videoRef.current) {
      const video = videoRef.current;

      // Aplicar volumen fijo al 50%
      video.volume = 0.5;

      // SIEMPRE aplicar el estado de mute de la pantalla
      video.muted = screenMuted;

      console.log(`🔊 Audio configurado: volumen=50%, muted=${screenMuted}, currentIndex=${currentIndex}`);

      // Optimizaciones específicas para TVs Android
      if (deviceInfo?.type === 'tv') {
        // Configurar propiedades adicionales para mejor rendimiento en TV
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('x5-video-player-type', 'h5');
        video.setAttribute('x5-video-player-fullscreen', 'true');

        // Limpiar memoria del video anterior en TVs
        const previousVideo = document.querySelector('video:not([src="' + video.src + '"])');
        if (previousVideo) {
          console.log('🧹 [TV] Limpiando video anterior para liberar memoria');
          (previousVideo as HTMLVideoElement).src = '';
          (previousVideo as HTMLVideoElement).load();
        }
      }

      // Mostrar efecto visual solo cuando cambia el estado de mute (no en navegación)
      if (screenMuted !== undefined) {
        setVolumeChanged(true);
        const visualTimer = setTimeout(() => setVolumeChanged(false), 1500);

        return () => clearTimeout(visualTimer);
      }
    }
  }, [screenMuted, currentIndex, deviceInfo?.type]);



  // Efecto SUPER AGRESIVO para forzar reproducción automática
  useEffect(() => {
    if (videoRef.current && files.length > 0) {
      const video = videoRef.current;

      // Múltiples intentos de reproducción automática
      const forcePlay = async (attempt = 1) => {
        if (video.paused) {
          try {
            await video.play();
            console.log(`✅ Reproducción forzada exitosa (intento ${attempt})`);
            setIsVideoPaused(false);
          } catch (error) {
            console.log(`🔄 Intento ${attempt} de reproducción forzada falló`);
            if (attempt < 10) { // Hasta 10 intentos
              setTimeout(() => forcePlay(attempt + 1), 500);
            }
          }
        }
      };

      // Intentar inmediatamente
      forcePlay();

      // Intentar cada 2 segundos durante 20 segundos
      const persistentTimer = setInterval(() => {
        if (video.paused) {
          forcePlay();
        }
      }, 2000);

      // Limpiar después de 20 segundos
      const cleanupTimer = setTimeout(() => {
        clearInterval(persistentTimer);
      }, 20000);

      return () => {
        clearInterval(persistentTimer);
        clearTimeout(cleanupTimer);
      };
    }
  }, [currentIndex, files.length]);

  // Función para enviar señal de actualización a todas las pantallas
  const broadcastRefresh = useCallback(async () => {
    try {
      console.log('📡 [TV] Enviando señal de actualización broadcast...');
      
      const response = await fetch(`/api/screens/${id}/broadcast-refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'tv-app',
          timestamp: Date.now()
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ [TV] Señal de actualización enviada exitosamente:', result);
        
        // Mostrar feedback visual
        setIsRefreshing(true);
        setTimeout(() => setIsRefreshing(false), 2000);
      } else {
        console.error('❌ [TV] Error al enviar señal de actualización');
      }
    } catch (error) {
      console.error('❌ [TV] Error en broadcastRefresh:', error);
    }
  }, [id]);

  // Agregar listener para gesto o tecla específica (ejemplo: doble toque)
  useEffect(() => {
    let touchCount = 0;
    let touchTimeout: NodeJS.Timeout;

    const handleDoubleTouch = () => {
      touchCount++;
      
      if (touchCount === 1) {
        touchTimeout = setTimeout(() => {
          touchCount = 0;
        }, 500);
      } else if (touchCount === 2) {
        clearTimeout(touchTimeout);
        touchCount = 0;
        console.log('🔄 [TV] Doble toque detectado - enviando actualización broadcast');
        broadcastRefresh();
      }
    };

    // Agregar listener para doble toque en pantalla
    document.addEventListener('touchstart', handleDoubleTouch);
    
    // También agregar listener para tecla específica (para testing)
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'r' && e.ctrlKey) {
        e.preventDefault();
        console.log('🔄 [TV] Ctrl+R detectado - enviando actualización broadcast');
        broadcastRefresh();
      }
    };
    
    document.addEventListener('keydown', handleKeyPress);

    return () => {
      document.removeEventListener('touchstart', handleDoubleTouch);
      document.removeEventListener('keydown', handleKeyPress);
      if (touchTimeout) clearTimeout(touchTimeout);
    };
  }, [broadcastRefresh]);

  // Log para debugging
  useEffect(() => {
    console.log('Estado actual - isRepeating:', isRepeating, 'screenStatus:', screenStatus, 'files:', files.length);
  }, [isRepeating, screenStatus, files]);

  // Renderizar error si existe
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-4">{error}</p>
          <button 
            onClick={fetchContent}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Mostrar estado de carga inicial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-xl">Cargando...</p>
      </div>
    );
  }

  // Verificar horarios de funcionamiento
  if (settings && !isInOperatingHours()) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <h2 className="text-2xl mb-4">🌙 Fuera de horario</h2>
          <p className="text-lg">{settings.systemName}</p>
          <p className="text-sm text-gray-400 mt-2">
            La pantalla se activará automáticamente en horario de funcionamiento
          </p>
        </div>
      </div>
    );
  }

  // No mostrar nada si la pantalla está inactiva o no hay archivos
  if (screenStatus === 'inactive' || files.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <p className="text-xl mb-2">Pantalla inactiva o sin contenido asignado</p>
          <p className="text-sm text-gray-400">{settings?.systemName || 'UCT TV CODECRAFT'}</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje cuando la playlist termine sin repetir (SOLO si realmente terminó)
  if (!isPlaying && files.length > 0 && !isRepeating && currentIndex >= files.length - 1) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <div className="text-center">
          <div className="text-6xl mb-6">✅</div>
          <h2 className="text-3xl mb-4 font-bold">Playlist Completada</h2>
          <p className="text-lg mb-6 text-gray-300">
            Se han reproducido todos los elementos de la playlist
          </p>
          <p className="text-sm text-gray-400 mb-6">
            Archivo {currentIndex + 1} de {files.length} • {settings?.systemName || 'UCT TV CODECRAFT'}
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsPlaying(true);
                console.log('🔄 Reiniciando playlist manualmente');
              }}
              className="bg-uct-primary hover:bg-uct-dark text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              🔄 Reproducir de Nuevo
            </button>
            <button
              onClick={() => {
                setCurrentIndex(0);
                setIsPlaying(true);
                // Activar modo repetir desde el admin
                console.log('🔄 Activando modo repetir');
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              🔁 Activar Repetir
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentFile = files[currentIndex];

  console.log(`🎬 Estado actual - currentIndex: ${currentIndex}, files.length: ${files.length}, currentFile:`, currentFile);

  if (!currentFile) {
    console.log(`⚠️ No hay archivo actual para reproducir - currentIndex: ${currentIndex}, files.length: ${files.length}`);
    return (
      <div className="flex items-center justify-center min-h-screen bg-black text-white">
        <p className="text-xl">Cargando...</p>
      </div>
    );
  }

  const isVideo = currentFile.url.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative">
      {/* Mensaje de emergencia */}
      {hasActiveEmergency() && settings?.emergency && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            backgroundColor: settings.emergency.backgroundColor,
            color: settings.emergency.textColor
          }}
        >
          <div className="text-center p-8 max-w-4xl">
            <div className="text-6xl mb-6">
              {settings.emergency.priority === 'critical' && '🚨'}
              {settings.emergency.priority === 'high' && '⚠️'}
              {settings.emergency.priority === 'medium' && '📢'}
              {settings.emergency.priority === 'low' && 'ℹ️'}
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              MENSAJE DE EMERGENCIA
            </h1>
            <p className="text-2xl md:text-4xl leading-relaxed">
              {settings.emergency.message}
            </p>
            <div className="mt-8 text-lg opacity-80">
              {settings.systemName}
            </div>
          </div>
        </div>
      )}

      {!isConnected && (
        <div className="absolute top-4 left-4 bg-yellow-500/80 text-white px-4 py-2 rounded-lg z-20">
          Reconectando...
        </div>
      )}

      {/* Componente de polling deshabilitado para evitar bugs */}

      {isRefreshing && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-blue-500/90 text-white px-6 py-3 rounded-lg z-20 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
          Actualizando contenido...
        </div>
      )}

      {isRepeating && (
        <div className="absolute top-4 right-4 bg-uct-secondary/95 text-uct-primary px-4 py-2 rounded-lg z-20 flex items-center gap-2 font-medium shadow-lg border border-uct-secondary">
          🔄 Repetir Playlist Completa
        </div>
      )}

      {volumeChanged && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-4 rounded-lg z-30 flex items-center gap-3 text-xl font-medium">
          {screenMuted ? '🔇 Audio Silenciado' : '🔊 Audio Activado'}
        </div>
      )}

      {/* Indicador de modo mosaico */}
      {showMosaics && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-600/90 text-white px-4 py-2 rounded-lg z-20 flex items-center gap-2 font-medium">
          🖼️ Modo Mosaico Activado
        </div>
      )}
      
      {isVideo ? (
        <div
          className={`relative w-full h-full flex items-center justify-center bg-black ${
            deviceInfo?.type === 'tv' ? 'tv-container' :
            deviceInfo?.type === 'mobile' ? 'mobile-container' :
            'desktop-container'
          }`}
          style={{
            position: deviceInfo?.type === 'mobile' ? 'fixed' : 'relative',
            top: deviceInfo?.type === 'mobile' ? '0' : 'auto',
            left: deviceInfo?.type === 'mobile' ? '0' : 'auto',
            width: '100vw',
            height: '100vh',
            overflow: 'hidden'
          }}
        >


          {/* Botón Anterior */}
          <button
            onClick={goToPreviousFile}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors z-10"
            title="Anterior"
          >
            ⬅️
          </button>

          <video
            ref={videoRef}
            key={currentFile.url}
            src={currentFile.url}
            className={`cursor-pointer transition-all duration-300 ${
              videoAspectRatio && videoAspectRatio < 1 ? 'vertical-video' : 'horizontal-video'
            } ${getVideoConfig(videoAspectRatio)?.className || ''}`}
            autoPlay
            playsInline
            muted={screenMuted}
            controls={false}
            loop={false}
            preload={deviceInfo?.type === 'tv' ? 'auto' : 'metadata'}
            onClick={handleVideoClick}
            onEnded={handleVideoEnd}
            onPause={handleVideoPause}
            onPlay={handleVideoPlay}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onLoadStart={() => console.log(`🎬 Iniciando carga: ${currentFile.name}`)}
            onCanPlay={() => {
              console.log(`✅ Video listo para reproducir: ${currentFile.name}`);
              // FORZAR reproducción inmediata cuando esté listo
              if (videoRef.current) {
                const forcePlayOnReady = async () => {
                  if (!videoRef.current) return;
                  try {
                    await videoRef.current.play();
                    console.log('✅ Reproducción automática exitosa en onCanPlay');
                    setIsVideoPaused(false);
                  } catch (error) {
                    console.log('🔄 Reintentando reproducción en onCanPlay...');
                    setTimeout(async () => {
                      if (!videoRef.current) return;
                      try {
                        await videoRef.current.play();
                        setIsVideoPaused(false);
                      } catch (retryError) {
                        console.log('⚠️ Reproducción automática falló en onCanPlay');
                      }
                    }, 500);
                  }
                };
                forcePlayOnReady();
              }
            }}
            onCanPlayThrough={() => {
              console.log(`🎬 Video completamente cargado: ${currentFile.name}`);
              // Segundo intento cuando el video está completamente cargado
              if (videoRef.current && videoRef.current.paused) {
                videoRef.current.play().catch(() => {
                  console.log('🔄 Intento en onCanPlayThrough falló');
                });
              }
            }}
            onError={(e) => {
              const target = e.target as HTMLVideoElement;
              const error = target.error;
              
              // Información básica del error
              const errorInfo = {
                fileName: currentFile.name,
                src: target.src,
                currentTime: target.currentTime,
                duration: target.duration,
                networkState: target.networkState,
                readyState: target.readyState,
                paused: target.paused,
                ended: target.ended
              };
              
              // Debug completo del objeto error
              console.log('🔍 DEBUG - Objeto error completo:', {
                error,
                errorExists: !!error,
                errorCode: error?.code,
                errorMessage: error?.message,
                errorKeys: error ? Object.keys(error) : 'No error object'
              });
              
              // Si hay un objeto error específico
              if (error && error.code) {
                const errorDetails = {
                  ...errorInfo,
                  errorCode: error.code,
                  errorMessage: error.message || 'Sin mensaje específico',
                  errorType: {
                    1: 'MEDIA_ERR_ABORTED - Reproducción abortada por el usuario',
                    2: 'MEDIA_ERR_NETWORK - Error de red durante la descarga',
                    3: 'MEDIA_ERR_DECODE - Error al decodificar el archivo',
                    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Formato no soportado'
                  }[error.code] || `Código desconocido: ${error.code}`,
                  // Información adicional de debugging
                  videoSrc: target.src,
                  videoCurrentSrc: target.currentSrc,
                  videoError: {
                    code: error.code,
                    message: error.message,
                    toString: error.toString ? error.toString() : 'No toString method'
                  }
                };
                
                console.error(`❌ Error de video: ${currentFile.name}`, errorDetails);
                
                // Log adicional para debugging
                console.error('📊 Detalles técnicos del error:', {
                  'Error Code': error.code,
                  'Error Message': error.message,
                  'Network State': target.networkState,
                  'Ready State': target.readyState,
                  'Video URL': target.src,
                  'Current Source': target.currentSrc
                });
              } else {
                // Si no hay objeto error específico o no tiene código
                console.error(`❌ Error de video (sin detalles específicos): ${currentFile.name}`, {
                  ...errorInfo,
                  eventType: e.type,
                  eventTarget: (e.target as HTMLElement)?.tagName,
                  errorObject: error ? 'Error object exists but no code' : 'No error object',
                  possibleCauses: [
                    'Archivo corrupto o incompleto',
                    'Formato de video no compatible',
                    'Problema de red o servidor',
                    'Ruta de archivo incorrecta',
                    'Permisos de acceso al archivo'
                  ]
                });
              }
              
              // Para TVs, intentar avanzar al siguiente video si hay error
              if (deviceInfo?.type === 'tv') {
                setTimeout(() => goToNextFile(), 3000);
              }
            }}
            onWaiting={() => {
              console.log('⏳ Video esperando datos...');
              // Para TVs, mostrar que está cargando
              if (deviceInfo?.type === 'tv') {
                setIsVideoPaused(true);
              }
            }}
            onPlaying={() => {
              console.log('🎬 Video reproduciéndose sin interrupciones');
              setIsVideoPaused(false);
            }}
            style={{
              objectFit: getVideoConfig(videoAspectRatio)?.objectFit || 'contain',
              width: getVideoConfig(videoAspectRatio)?.width || '100%',
              height: getVideoConfig(videoAspectRatio)?.height || '100%',
              maxWidth: getVideoConfig(videoAspectRatio)?.maxWidth || '100vw',
              maxHeight: getVideoConfig(videoAspectRatio)?.maxHeight || '100vh',
              transform: getVideoConfig(videoAspectRatio)?.transform || 'none'
            }}
          />

          {/* Overlay invisible para manejar clics sin mostrar botón */}
          {isVideoPaused && (
            <div
              className="absolute inset-0 z-20 cursor-pointer"
              onClick={handleVideoClick}
              style={{ backgroundColor: 'transparent' }}
            />
          )}



          {/* Botón Siguiente */}
          <button
            onClick={goToNextFileManual}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors z-10"
            title="Siguiente"
          >
            ➡️
          </button>
        </div>
      ) : (
        <div
          className={`relative flex items-center justify-center screen-content ${
            deviceInfo?.type === 'tv' ? 'tv-container' :
            deviceInfo?.type === 'mobile' ? 'mobile-container' :
            'desktop-container'
          }`}
          style={{
            width: '100vw',
            height: '100vh',
            position: deviceInfo?.type === 'mobile' ? 'fixed' : 'relative',
            top: deviceInfo?.type === 'mobile' ? '0' : 'auto',
            left: deviceInfo?.type === 'mobile' ? '0' : 'auto',
            overflow: 'hidden'
          }}
        >
          {/* Solo mostrar contador para imágenes, no para videos */}
          {timeLeft > 0 && (
            <div className="absolute top-4 right-4 bg-white/20 px-4 py-2 rounded-full text-white z-10">
              Siguiente: {timeLeft}s
            </div>
          )}

          {/* Botón Anterior */}
          <button
            onClick={goToPreviousFile}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors z-10"
            title="Anterior"
          >
            ⬅️
          </button>

          <Image
            key={currentFile.url}
            src={currentFile.url}
            alt={`Contenido pantalla ${id}`}
            fill
            className="object-cover"
            sizes="100vw"
            priority
            // Configuraciones para máxima calidad manteniendo responsive
            unoptimized={true}
            style={{
              objectFit: deviceInfo?.type === 'mobile' && deviceInfo?.orientation === 'portrait' ? 'contain' : 'contain',
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100vh'
            }}
          />

          {/* Botón Siguiente */}
          <button
            onClick={goToNextFileManual}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-3 rounded-full transition-colors z-10"
            title="Siguiente"
          >
            ➡️
          </button>
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 text-white bg-black/50 px-4 py-2 rounded-lg z-10">
        Archivo {currentIndex + 1} de {files.length}
      </div>

      {/* Información del dispositivo (solo en desarrollo) */}
      {process.env.NODE_ENV === 'development' && deviceInfo && (
        <div className="absolute bottom-4 right-4 text-white bg-black/70 px-3 py-2 rounded-lg z-10 text-xs">
          <div>{deviceInfo.type} | {deviceInfo.orientation}</div>
          <div>{deviceInfo.screenWidth}x{deviceInfo.screenHeight}</div>
          {videoAspectRatio && (
            <div>Video: {videoAspectRatio.toFixed(2)} {videoAspectRatio < 1 ? '(V)' : '(H)'}</div>
          )}
        </div>
      )}

      {/* Mosaicos */}
      {showMosaics && (
        <div className="absolute inset-0 z-20 grid grid-cols-2 gap-2 p-4">
          {/* Mosaico 1 - Esquina superior izquierda */}
          <div className="relative rounded-lg overflow-hidden border-2 border-white/30">
            {mosaico1Items.length > 0 ? (
              <MosaicPlayer 
                items={mosaico1Items} 
                position={1} 
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/70 text-white">
                <p>Mosaico 1 - Sin contenido</p>
              </div>
            )}
          </div>
          
          {/* Mosaico 2 - Esquina superior derecha */}
          <div className="relative rounded-lg overflow-hidden border-2 border-white/30">
            {mosaico2Items.length > 0 ? (
              <MosaicPlayer 
                items={mosaico2Items} 
                position={2}
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/70 text-white">
                <p>Mosaico 2 - Sin contenido</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
