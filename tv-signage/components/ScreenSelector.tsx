import { Monitor } from 'lucide-react';

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface ScreenSelectorProps {
  screens: Screen[];
  selectedScreens: string[];
  onScreenSelect: (screens: string[]) => void;
  readOnly?: boolean;
}

export default function ScreenSelector({ 
  screens = [], // Proporcionar un array vacío como valor por defecto
  selectedScreens = [], 
  onScreenSelect,
  readOnly = false
}: ScreenSelectorProps) {
  const toggleScreen = (screenId: string) => {
    if (readOnly) return;
    
    const newSelection = selectedScreens.includes(screenId)
      ? selectedScreens.filter(id => id !== screenId)
      : [...selectedScreens, screenId];
    onScreenSelect(newSelection);
  };

  // Si screens es undefined o está vacío
  if (!screens?.length) {
    return (
      <div className="text-center py-4 text-gray-500">
        No hay pantallas disponibles. Por favor, cree algunas pantallas primero.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {screens.map((screen) => (
        <div
          key={screen.id}
          onClick={() => toggleScreen(screen.id)}
          className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
            selectedScreens.includes(screen.id)
              ? 'border-uct-primary bg-uct-primary/5 ring-2 ring-uct-primary/20'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
          } ${
            readOnly ? 'cursor-default opacity-80' : 'cursor-pointer'
          }`}
        >
          <div className={`p-2 rounded-lg ${
            screen.status === 'active' ? 'bg-uct-accent/10' : 'bg-gray-100'
          }`}>
            <Monitor className={`h-5 w-5 ${
              screen.status === 'active' ? 'text-uct-accent' : 'text-gray-500'
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-gray-800 truncate">{screen.name}</p>
            <p className={`text-xs font-medium ${
              screen.status === 'active' ? 'text-uct-accent' : 'text-gray-500'
            }`}>
              {screen.status === 'active' ? 'Activa' : 'Inactiva'}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
