import React from 'react';
import { Card } from './Card';

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  muted: boolean;
  location?: string;
  description?: string;
}

interface ScreenCardProps {
  screen: Screen;
  onClick?: (screen: Screen) => void;
  className?: string;
}

const ScreenCard: React.FC<ScreenCardProps> = ({ 
  screen,
  onClick,
  className = ''
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(screen);
    }
  };

  return (
    <Card 
      className={`screen-card ${className}`}
      onClick={handleClick}
    >
      <div className="screen-card-content">
        <h3 className="screen-name">{screen.name}</h3>
        <div className="screen-status">
          <span className={`status-indicator ${screen.status.toLowerCase()}`} />
          {screen.status}
        </div>
        <div className="screen-details">
          <p>Última vez visto: {new Date(screen.lastSeen).toLocaleString()}</p>
          {screen.location && <p>Ubicación: {screen.location}</p>}
          {screen.description && <p>Descripción: {screen.description}</p>}
          <div className="screen-controls">
            {screen.muted && (
              <span className="mute-indicator">🔇</span>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ScreenCard;