import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useResponsiveVideo } from '@/hooks/useResponsiveVideo';

interface MosaicoItem {
  id: string;
  name: string;
  url: string;
  type: string; // "image" o "video"
  position: number; // 1 para Mosaico 1, 2 para Mosaico 2
  duration?: number; // duración en segundos para imágenes
}

interface MosaicPlayerProps {
  items: MosaicoItem[];
  position: number; // 1 o 2 para identificar qué mosaico es
  className?: string;
  style?: React.CSSProperties;
}

const MosaicPlayer: React.FC<MosaicPlayerProps> = ({ 
  items, 
  position, 
  className = '',
  style = {}
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const { settings } = useSystemSettings();
  const { detectVideoAspectRatio, videoAspectRatio, getVideoConfig } = useResponsiveVideo();

  const currentItem = items[currentIndex];
  const isVideo = currentItem?.type === 'video';

  // Función para avanzar al siguiente elemento
  const goToNextItem = useCallback(() => {
    if (items.length <= 1) return;
    
    setCurrentIndex(prev => (prev + 1) % items.length);
  }, [items.length]);

  // Manejar el final de un video
  const handleVideoEnd = useCallback(() => {
    console.log(`🎬 [Mosaico ${position}] Video terminado - avanzando al siguiente elemento`);
    goToNextItem();
  }, [goToNextItem, position]);

  // Manejar la carga de metadatos del video
  const handleVideoLoadedMetadata = useCallback(() => {
    if (videoRef.current) {
      const video = videoRef.current;
      detectVideoAspectRatio(video);

      // Estrategia para autoplay
      video.preload = 'auto';
      video.playsInline = true;

      // Intentar reproducir
      const attemptPlay = async (attempt = 1) => {
        try {
          await video.play();
          console.log(`✅ [Mosaico ${position}] Autoplay exitoso en intento ${attempt}`);
          setIsPlaying(true);
        } catch (error) {
          console.log(`⚠️ [Mosaico ${position}] Intento ${attempt} falló:`, error instanceof Error ? error.message : error);

          if (attempt < 3) { // Hasta 3 intentos
            setTimeout(() => attemptPlay(attempt + 1), attempt * 500);
          } else {
            console.log(`⚠️ [Mosaico ${position}] Todos los intentos de autoplay fallaron`);
          }
        }
      };

      attemptPlay();
    }
  }, [detectVideoAspectRatio, position]);

  // Efecto para manejar la transición de imágenes
  useEffect(() => {
    if (!currentItem) return;
    
    // Para imágenes, configurar un temporizador para avanzar
    if (currentItem.type === 'image') {
      const duration = (currentItem.duration || 5) * 1000; // Duración en ms (default 5s)
      
      console.log(`🖼️ [Mosaico ${position}] Mostrando imagen por ${duration/1000}s: ${currentItem.name}`);
      
      const timer = setTimeout(() => {
        console.log(`➡️ [Mosaico ${position}] Tiempo agotado - avanzando a la siguiente imagen`);
        goToNextItem();
      }, duration);

      return () => {
        clearTimeout(timer);
      };
    }
  }, [currentItem, goToNextItem, position]);

  // Si no hay elementos, no mostrar nada
  if (!items.length || !currentItem) {
    return null;
  }

  return (
    <div 
      className={`mosaic-player mosaic-${position} ${className}`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        width: '100%',
        height: '100%',
        ...style
      }}
    >
      {isVideo ? (
        <video
          ref={videoRef}
          key={currentItem.url}
          src={currentItem.url}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
          controls={false}
          loop={false}
          preload="auto"
          onEnded={handleVideoEnd}
          onLoadedMetadata={handleVideoLoadedMetadata}
          onError={(e) => {
            console.error(`❌ [Mosaico ${position}] Error de video:`, e);
            // Avanzar al siguiente elemento si hay error
            setTimeout(() => goToNextItem(), 1000);
          }}
        />
      ) : (
        <div ref={imageRef} className="w-full h-full relative">
          <Image
            key={currentItem.url}
            src={currentItem.url}
            alt={`Mosaico ${position}: ${currentItem.name}`}
            fill
            className="object-cover"
            sizes="100%"
            priority
            unoptimized={true}
          />
        </div>
      )}
    </div>
  );
};

export default MosaicPlayer;