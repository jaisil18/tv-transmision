import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../lib/logger';

interface VideoState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  error: string | null;
}

interface PlaylistItem {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'video';
  duration?: number;
}

export function useScreenPlayer(playlist: PlaylistItem[], autoPlay = true) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [videoState, setVideoState] = useState<VideoState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    muted: true,
    error: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const currentItem = playlist[currentIndex] || null;

  const goToNext = useCallback(() => {
    if (playlist.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIndex);
    logger.debug(`Moving to next item: ${nextIndex}`);
  }, [currentIndex, playlist.length]);

  const goToPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    
    const prevIndex = currentIndex === 0 ? playlist.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    logger.debug(`Moving to previous item: ${prevIndex}`);
  }, [currentIndex, playlist.length]);

  const goToItem = useCallback((index: number) => {
    if (index >= 0 && index < playlist.length) {
      setCurrentIndex(index);
      logger.debug(`Moving to item: ${index}`);
    }
  }, [playlist.length]);

  const play = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(error => {
        logger.error('Error playing video', error);
        setVideoState(prev => ({ ...prev, error: 'Error al reproducir video' }));
      });
    }
  }, []);

  const pause = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setVideoState(prev => ({ ...prev, muted: videoRef.current!.muted }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (videoRef.current) {
      videoRef.current.volume = Math.max(0, Math.min(1, volume));
      setVideoState(prev => ({ ...prev, volume: videoRef.current!.volume }));
    }
  }, []);

  // Auto-advance for images
  useEffect(() => {
    if (currentItem?.type === 'image' && currentItem.duration) {
      timeoutRef.current = setTimeout(() => {
        goToNext();
      }, currentItem.duration * 1000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentItem, goToNext]);

  // Video event handlers
  const handleVideoLoad = useCallback(() => {
    setIsLoading(false);
    setVideoState(prev => ({ ...prev, error: null }));
    
    if (autoPlay && videoRef.current) {
      play();
    }
  }, [autoPlay, play]);

  const handleVideoError = useCallback((error: any) => {
    logger.error('Video error', error);
    setIsLoading(false);
    setVideoState(prev => ({ ...prev, error: 'Error al cargar video' }));
  }, []);

  const handleVideoEnded = useCallback(() => {
    goToNext();
  }, [goToNext]);

  const handleTimeUpdate = useCallback(() => {
    if (videoRef.current) {
      setVideoState(prev => ({
        ...prev,
        currentTime: videoRef.current!.currentTime,
        duration: videoRef.current!.duration || 0
      }));
    }
  }, []);

  const handlePlayStateChange = useCallback(() => {
    if (videoRef.current) {
      setVideoState(prev => ({
        ...prev,
        isPlaying: !videoRef.current!.paused
      }));
    }
  }, []);

  return {
    // State
    currentItem,
    currentIndex,
    videoState,
    isLoading,
    
    // Refs
    videoRef,
    
    // Actions
    goToNext,
    goToPrevious,
    goToItem,
    play,
    pause,
    toggleMute,
    setVolume,
    
    // Event handlers
    handleVideoLoad,
    handleVideoError,
    handleVideoEnded,
    handleTimeUpdate,
    handlePlayStateChange,
    
    // Computed
    hasNext: currentIndex < playlist.length - 1,
    hasPrevious: currentIndex > 0,
    progress: videoState.duration > 0 ? (videoState.currentTime / videoState.duration) * 100 : 0
  };
}