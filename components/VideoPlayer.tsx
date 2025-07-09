import React, { memo, forwardRef } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  muted?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
  onLoadStart?: () => void;
  onCanPlay?: () => void;
  onError?: (error: any) => void;
  onEnded?: () => void;
  onTimeUpdate?: () => void;
  onPlay?: () => void;
  onPause?: () => void;
  onVolumeChange?: () => void;
}

export const VideoPlayer = memo(forwardRef<HTMLVideoElement, VideoPlayerProps>((
  {
    src,
    poster,
    muted = true,
    autoPlay = true,
    loop = false,
    className = '',
    onLoadStart,
    onCanPlay,
    onError,
    onEnded,
    onTimeUpdate,
    onPlay,
    onPause,
    onVolumeChange
  },
  ref
) => {
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted={muted}
      autoPlay={autoPlay}
      loop={loop}
      playsInline
      preload="metadata"
      className={`w-full h-full object-cover ${className}`}
      onLoadStart={onLoadStart}
      onCanPlay={onCanPlay}
      onError={onError}
      onEnded={onEnded}
      onTimeUpdate={onTimeUpdate}
      onPlay={onPlay}
      onPause={onPause}
      onVolumeChange={onVolumeChange}
      style={{
        backgroundColor: '#000',
        objectFit: 'cover'
      }}
    />
  );
}));

VideoPlayer.displayName = 'VideoPlayer';