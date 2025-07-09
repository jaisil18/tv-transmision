import React, { useMemo } from 'react';
import { useScreens } from '@/hooks/useScreens';
import LoadingSpinner from '../ui/LoadingSpinner';
import ErrorMessage from '../ui/ErrorMessage';
import ScreenCard from '../ui/ScreenCard';

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastSeen: number;
  muted: boolean;
  location?: string;
  description?: string;
}

interface ScreenListProps {
  filter?: string;
  onScreenSelect?: (screen: Screen) => void;
}

const ScreenList: React.FC<ScreenListProps> = ({ filter = '', onScreenSelect }) => {
  const { data: screens, isLoading, error } = useScreens();

  const filteredScreens = useMemo(() => {
    return screens?.filter((screen: Screen) =>
      screen.name.toLowerCase().includes(filter.toLowerCase())
    ) ?? [];
  }, [screens, filter]);

  if (isLoading) {
    return <LoadingSpinner size="large" />;
  }

  if (error) {
    return <ErrorMessage message={error.message || 'Error al cargar las pantallas'} />;
  }

  return (
    <div className="screen-list">
      {filteredScreens.map((screen: Screen) => (
        <ScreenCard
          key={screen.id}
          screen={screen}
          onClick={onScreenSelect}
          className="mb-4"
        />
      ))}
    </div>
  );
};

export default ScreenList;