'use client';

import { use } from 'react';
import AndroidVideoPlayer from '@/components/AndroidVideoPlayer';

interface PageProps {
  params: Promise<{
    screenId: string;
  }>;
}

export default function AndroidScreenPage({ params }: PageProps) {
  const { screenId } = use(params);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      <AndroidVideoPlayer
        screenId={screenId}
        autoplay={true}
        muted={true}
        className="w-full h-full"
        onError={(error) => {
          console.error('Error en reproductor Android:', error);
        }}
        onLoad={() => {
          console.log('Reproductor Android cargado exitosamente');
        }}
      />
    </div>
  );
}
