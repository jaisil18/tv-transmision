import React, { memo } from 'react';
import UCTLogo from './UCTLogo';

interface ScreenStatusProps {
  status: 'loading' | 'offline' | 'inactive' | 'no-content' | 'completed';
  message?: string;
  onRestart?: () => void;
  onToggleRepeat?: () => void;
  isRepeating?: boolean;
  showControls?: boolean;
}

const statusConfig = {
  loading: {
    title: 'Cargando contenido...',
    icon: '⏳',
    bgColor: 'bg-blue-500'
  },
  offline: {
    title: 'Fuera de horario de funcionamiento',
    icon: '🌙',
    bgColor: 'bg-gray-800'
  },
  inactive: {
    title: 'Pantalla inactiva',
    icon: '💤',
    bgColor: 'bg-gray-600'
  },
  'no-content': {
    title: 'Sin contenido disponible',
    icon: '📭',
    bgColor: 'bg-yellow-600'
  },
  completed: {
    title: 'Playlist completada',
    icon: '✅',
    bgColor: 'bg-green-600'
  }
};

export const ScreenStatus = memo<ScreenStatusProps>(({ 
  status, 
  message, 
  onRestart, 
  onToggleRepeat, 
  isRepeating = false,
  showControls = false 
}) => {
  const config = statusConfig[status];
  
  return (
    <div className={`min-h-screen flex flex-col items-center justify-center text-white ${config.bgColor}`}>
      <div className="text-center space-y-8 p-8">
        {/* Logo */}
        <div className="mb-8">
          <UCTLogo className="w-32 h-32 mx-auto" />
        </div>
        
        {/* Status Icon */}
        <div className="text-8xl mb-4">
          {config.icon}
        </div>
        
        {/* Status Title */}
        <h1 className="text-4xl font-bold mb-4">
          {config.title}
        </h1>
        
        {/* Custom Message */}
        {message && (
          <p className="text-xl text-gray-200 max-w-2xl mx-auto">
            {message}
          </p>
        )}
        
        {/* Controls */}
        {showControls && status === 'completed' && (
          <div className="flex gap-4 justify-center mt-8">
            {onRestart && (
              <button
                onClick={onRestart}
                className="px-6 py-3 bg-white text-gray-800 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                🔄 Reiniciar Playlist
              </button>
            )}
            
            {onToggleRepeat && (
              <button
                onClick={onToggleRepeat}
                className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
                  isRepeating 
                    ? 'bg-yellow-500 text-white hover:bg-yellow-600' 
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
              >
                {isRepeating ? '🔁 Repetición ON' : '🔁 Activar Repetición'}
              </button>
            )}
          </div>
        )}
        
        {/* Loading Animation */}
        {status === 'loading' && (
          <div className="flex justify-center mt-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        )}
      </div>
    </div>
  );
});

ScreenStatus.displayName = 'ScreenStatus';