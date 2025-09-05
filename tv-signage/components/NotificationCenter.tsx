'use client';

import { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useNotifications } from '@/components/notifications/NotificationSystem';

interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationCenterProps {
  onClose: () => void;
}

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const { notifications: systemNotifications } = useNotifications();

  useEffect(() => {
    // Convertir notificaciones del sistema a formato del centro de notificaciones
    const convertedNotifications: Notification[] = systemNotifications.map(notif => ({
      id: notif.id,
      type: notif.type,
      title: notif.title,
      message: notif.message,
      timestamp: new Date().toISOString(),
      read: false
    }));
    
    // Agregar algunas notificaciones de ejemplo si no hay ninguna
    if (convertedNotifications.length === 0) {
      const exampleNotifications: Notification[] = [
        {
          id: '1',
          type: 'info',
          title: 'Sistema Iniciado',
          message: 'El sistema de transmisión digital se ha iniciado correctamente.',
          timestamp: new Date().toISOString(),
          read: false
        },
        {
          id: '2',
          type: 'success',
          title: 'Pantallas Conectadas',
          message: 'Todas las pantallas están conectadas y funcionando correctamente.',
          timestamp: new Date(Date.now() - 300000).toISOString(), // 5 minutos atrás
          read: true
        }
      ];
      setNotifications(exampleNotifications);
    } else {
      setNotifications(convertedNotifications);
    }
  }, [systemNotifications]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return AlertCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
      default: return Info;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-lg shadow-xl border border-uct-gray-200 z-50">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-uct-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-uct-primary">Notificaciones</h3>
          {unreadCount > 0 && (
            <p className="text-sm text-uct-gray-600">{unreadCount} sin leer</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="text-xs"
            >
              Marcar todas como leídas
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-uct-gray-500 hover:text-uct-gray-700"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="max-h-96 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-uct-primary border-t-transparent"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-uct-gray-500">
            <div className="text-4xl mb-2">🔔</div>
            <p>No hay notificaciones</p>
          </div>
        ) : (
          <div className="divide-y divide-uct-gray-100">
            {notifications.map((notification) => {
              const Icon = getIcon(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-uct-gray-50 transition-colors cursor-pointer ${
                    !notification.read ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                  onClick={() => !notification.read && markAsRead(notification.id)}
                >
                  <div className="flex gap-3">
                    <div className={`flex-shrink-0 ${getIconColor(notification.type)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h4 className={`text-sm font-medium ${
                          !notification.read ? 'text-uct-primary' : 'text-uct-gray-900'
                        }`}>
                          {notification.title}
                        </h4>
                        <div className="flex items-center gap-1 text-xs text-uct-gray-500">
                          <Clock className="h-3 w-3" />
                          {new Date(notification.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                      <p className="text-sm text-uct-gray-600 mt-1">
                        {notification.message}
                      </p>
                      {notification.actionUrl && notification.actionLabel && (
                        <Button
                          variant="link"
                          size="sm"
                          className="mt-2 p-0 h-auto text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(notification.actionUrl, '_blank');
                          }}
                        >
                          {notification.actionLabel}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}