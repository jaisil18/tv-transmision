'use client';

import { use } from 'react';
import AndroidTVPlayer from '@/components/AndroidTVPlayer';

interface PageProps {
  params: Promise<{
    screenId: string;
  }>;
}

export default function AndroidTVScreenPage({ params }: PageProps) {
  const { screenId } = use(params);

  return (
    <div className="w-screen h-screen bg-black overflow-hidden">
      <AndroidTVPlayer
        screenId={screenId}
        autoplay={true}
        muted={true}
        className="w-full h-full"
        onError={(error) => {
          console.error('Error en reproductor Android TV:', error);
        }}
        onLoad={() => {
          console.log('Reproductor Android TV cargado');
        }}
      />
    </div>
  );
}