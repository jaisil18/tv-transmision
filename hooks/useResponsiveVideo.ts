import { useState, useEffect, useCallback } from 'react';

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop' | 'tv';
  orientation: 'portrait' | 'landscape';
  screenWidth: number;
  screenHeight: number;
  aspectRatio: number;
  isTouch: boolean;
  pixelRatio: number;
}

export interface VideoAdaptiveConfig {
  objectFit: 'contain' | 'cover' | 'fill';
  width: string;
  height: string;
  maxWidth?: string;
  maxHeight?: string;
  transform?: string;
  className?: string;
}

export function useResponsiveVideo() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [videoAspectRatio, setVideoAspectRatio] = useState<number | null>(null);

  // Función para detectar información del dispositivo
  const detectDeviceInfo = useCallback((): DeviceInfo => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspectRatio = width / height;
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const pixelRatio = window.devicePixelRatio || 1;

    // Detectar User Agent para móviles
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // Detectar tipo de dispositivo con lógica mejorada
    let type: DeviceInfo['type'] = 'desktop';

    // Detectar TV (pantallas muy grandes sin touch)
    if (width >= 1920 && height >= 1080 && !isTouch && !isMobileUA) {
      type = 'tv';
    }
    // Detectar móvil (User Agent móvil O pantallas pequeñas O touch con pantalla pequeña)
    else if (isMobileUA || width <= 768 || (isTouch && Math.min(width, height) <= 768)) {
      type = 'mobile';
    }
    // Detectar tablet (pantallas medianas con touch, pero no móvil)
    else if (width <= 1024 && isTouch && !isMobileUA) {
      type = 'tablet';
    }
    // Por defecto desktop
    else {
      type = 'desktop';
    }

    // Detectar orientación
    const orientation: DeviceInfo['orientation'] = width > height ? 'landscape' : 'portrait';

    return {
      type,
      orientation,
      screenWidth: width,
      screenHeight: height,
      aspectRatio,
      isTouch,
      pixelRatio
    };
  }, []);

  // Función para calcular configuración adaptativa de video
  const calculateVideoConfig = useCallback((deviceInfo: DeviceInfo, videoAspectRatio: number | null): VideoAdaptiveConfig => {
    const { type, orientation, screenWidth, screenHeight, aspectRatio: screenAspectRatio } = deviceInfo;
    
    // Si no tenemos aspect ratio del video, usar configuración por defecto
    if (!videoAspectRatio) {
      return {
        objectFit: 'contain',
        width: '100%',
        height: '100%',
        maxWidth: '100vw',
        maxHeight: '100vh',
        className: 'responsive-video-default'
      };
    }
    
    const isVideoVertical = videoAspectRatio < 0.9;
    const isVideoHorizontal = videoAspectRatio > 1.1;
    const isVideoSquare = videoAspectRatio >= 0.9 && videoAspectRatio <= 1.1;
    
    // Configuraciones específicas por dispositivo y orientación
    switch (type) {
      case 'mobile':
        if (orientation === 'portrait') {
          // Móvil vertical
          if (isVideoVertical) {
            return {
              objectFit: 'contain',
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100vh',
              className: 'mobile-portrait-vertical-video'
            };
          } else if (isVideoHorizontal) {
            return {
              objectFit: 'contain',
              width: '100%',
              height: 'auto',
              maxWidth: '100vw',
              className: 'mobile-portrait-horizontal-video'
            };
          } else {
            return {
              objectFit: 'contain',
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100vh',
              className: 'mobile-portrait-square-video'
            };
          }
        } else {
          // Móvil horizontal
          return {
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            maxWidth: '100vw',
            maxHeight: '100vh',
            className: 'mobile-landscape-video'
          };
        }
        
      case 'tablet':
        return {
          objectFit: 'contain',
          width: '100%',
          height: '100%',
          maxWidth: '100vw',
          maxHeight: '100vh',
          className: 'tablet-video'
        };
        
      case 'tv':
        // Para TV, optimizar para pantalla completa
        if (isVideoVertical && orientation === 'landscape') {
          return {
            objectFit: 'contain',
            width: 'auto',
            height: '100%',
            maxHeight: '100vh',
            className: 'tv-vertical-video'
          };
        } else {
          return {
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            maxWidth: '100vw',
            maxHeight: '100vh',
            className: 'tv-horizontal-video'
          };
        }
        
      case 'desktop':
      default:
        if (orientation === 'landscape') {
          // Desktop horizontal
          if (isVideoVertical) {
            // Video vertical en pantalla horizontal: centrar y mostrar completo
            return {
              objectFit: 'contain',
              width: 'auto',
              height: '100%',
              maxHeight: '100vh',
              className: 'desktop-landscape-vertical-video'
            };
          } else {
            // Video horizontal en pantalla horizontal: llenar
            return {
              objectFit: 'contain',
              width: '100%',
              height: '100%',
              maxWidth: '100vw',
              maxHeight: '100vh',
              className: 'desktop-landscape-horizontal-video'
            };
          }
        } else {
          // Desktop vertical (poco común)
          return {
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            maxWidth: '100vw',
            maxHeight: '100vh',
            className: 'desktop-portrait-video'
          };
        }
    }
  }, []);

  // Efecto para detectar información del dispositivo y cambios de orientación
  useEffect(() => {
    const updateDeviceInfo = () => {
      const newDeviceInfo = detectDeviceInfo();
      setDeviceInfo(newDeviceInfo);
      
      console.log('📱 [ResponsiveVideo] Información del dispositivo actualizada:', {
        type: newDeviceInfo.type,
        orientation: newDeviceInfo.orientation,
        screen: `${newDeviceInfo.screenWidth}x${newDeviceInfo.screenHeight}`,
        aspectRatio: newDeviceInfo.aspectRatio.toFixed(2),
        isTouch: newDeviceInfo.isTouch,
        pixelRatio: newDeviceInfo.pixelRatio
      });
    };

    // Detectar al cargar
    updateDeviceInfo();

    // Escuchar cambios de orientación y redimensionamiento
    const handleResize = () => {
      updateDeviceInfo();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [detectDeviceInfo]);

  // Función para obtener configuración de video
  const getVideoConfig = useCallback((videoAspectRatio: number | null): VideoAdaptiveConfig | null => {
    if (!deviceInfo) return null;
    return calculateVideoConfig(deviceInfo, videoAspectRatio);
  }, [deviceInfo, calculateVideoConfig]);

  // Función para detectar aspect ratio del video
  const detectVideoAspectRatio = useCallback((video: HTMLVideoElement): number => {
    const aspectRatio = video.videoWidth / video.videoHeight;
    setVideoAspectRatio(aspectRatio);
    
    console.log('📐 [ResponsiveVideo] Aspect ratio del video detectado:', {
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: aspectRatio.toFixed(2),
      type: aspectRatio < 0.9 ? 'vertical' : aspectRatio > 1.1 ? 'horizontal' : 'cuadrado'
    });
    
    return aspectRatio;
  }, []);

  return {
    deviceInfo,
    videoAspectRatio,
    getVideoConfig,
    detectVideoAspectRatio,
    setVideoAspectRatio
  };
}
