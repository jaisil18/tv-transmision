'use client';

import { useState, useEffect, createContext, useContext } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'warning' | 'info';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number;
  persistent?: boolean;
}

interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    
    setNotifications(prev => [...prev, newNotification]);

    if (!notification.persistent) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration || 5000);
    }
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  // Monitoreo de pantallas desconectadas
  useEffect(() => {
    const checkScreenStatus = async () => {
      try {
        // Cambiar de '/api/screens/status' a '/api/screens'
        const response = await fetch('/api/screens');
        
        // Verificar que la respuesta sea exitosa
        if (!response.ok) {
          console.error('Error fetching screens:', response.status, response.statusText);
          return;
        }
        
        // Verificar que el content-type sea JSON
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.error('Response is not JSON:', contentType);
          return;
        }
        
        const screens = await response.json();
        
        // Validar que screens sea un array
        if (!Array.isArray(screens)) {
          console.error('Expected screens to be an array, got:', typeof screens, screens);
          return;
        }
        
        screens.forEach((screen: any) => {
          // Cambiar de screen.isOnline a screen.status para verificar el estado
          if (screen.status !== 'active' && screen.lastSeen) {
            const lastSeenTime = new Date(screen.lastSeen).getTime();
            const now = Date.now();
            const minutesOffline = Math.floor((now - lastSeenTime) / (1000 * 60));
            
            if (minutesOffline > 5) {
              addNotification({
                type: 'warning',
                title: 'Pantalla Desconectada',
                message: `La pantalla "${screen.name}" lleva ${minutesOffline} minutos desconectada`,
                persistent: true
              });
            }
          }
        });
      } catch (error) {
        console.error('Error checking screen status:', error);
        // No mostrar notificación de error para evitar spam
      }
    };
  
    const interval = setInterval(checkScreenStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, removeNotification }}>
      {children}
      <NotificationContainer notifications={notifications} onRemove={removeNotification} />
    </NotificationContext.Provider>
  );
}

function NotificationContainer({ 
  notifications, 
  onRemove 
}: { 
  notifications: Notification[];
  onRemove: (id: string) => void;
}) {
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-5 w-5" />;
      case 'error': return <AlertCircle className="h-5 w-5" />;
      case 'warning': return <AlertTriangle className="h-5 w-5" />;
      case 'info': return <Info className="h-5 w-5" />;
    }
  };

  const getStyles = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`p-4 rounded-lg border shadow-lg animate-slide-up ${getStyles(notification.type)}`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {getIcon(notification.type)}
            </div>
            <div className="ml-3 flex-1">
              <h4 className="text-sm font-medium">{notification.title}</h4>
              <p className="text-sm mt-1">{notification.message}</p>
            </div>
            <button
              onClick={() => onRemove(notification.id)}
              className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}