'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Monitor, PowerOff, RefreshCw, List, Clock, Film, Loader2, Repeat, Volume2, VolumeX, ChevronLeft, ChevronRight, ExternalLink, Copy, Video, RotateCcw, Users, Wifi } from 'lucide-react';
import Modal from '@/components/Modal';
import PageLayout from '@/components/PageLayout';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuthenticatedFetch } from '@/hooks/useAuth';
import type { Screen } from '@/types/screen';

import AnalyticsDashboard from '@/components/analytics/AnalyticsDashboard';
import ContentScheduler from '@/components/ContentScheduler';

interface PlaylistItem {
  name: string;
  url: string;
  type: string;
}

interface ScreenContent {
  playlistName: string;
  items: PlaylistItem[];
}

interface ConnectedDevice {
  id: string;
  userAgent: string;
  ip: string;
  connectedAt: string;
}

function AdminContent() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);
  const [showContentModal, setShowContentModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [selectedScreen, setSelectedScreen] = useState<Screen | null>(null);
  const [screenContent, setScreenContent] = useState<ScreenContent | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<ConnectedDevice[]>([]);
  const [lastScreenCount, setLastScreenCount] = useState<number>(0);
  const [notification, setNotification] = useState<string | null>(null);
  const [isRestartingService, setIsRestartingService] = useState(false);
  const { authenticatedFetch } = useAuthenticatedFetch();

  // Agregar conexión WebSocket para recibir notificaciones en tiempo real
  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws?type=admin`);
      
      ws.onopen = () => {
        console.log('✅ [Admin] WebSocket conectado');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          switch (data.type) {
            case 'screen-refreshed':
              console.log(`🔄 [Admin] Pantalla ${data.screenName} actualizada`);
              setNotification(`Pantalla "${data.screenName}" actualizada exitosamente`);
              // Refrescar la lista de pantallas para mostrar cambios
              fetchScreens();
              // Limpiar notificación después de 5 segundos
              setTimeout(() => setNotification(null), 5000);
              break;
              
            case 'content-updated':
              console.log('🔄 [Admin] Contenido actualizado globalmente');
              fetchScreens();
              break;
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('🔌 [Admin] WebSocket desconectado, reintentando...');
        setTimeout(connectWebSocket, 3000);
      };
      
      return ws;
    };
    
    const ws = connectWebSocket();
    
    return () => {
      ws.close();
    };
  }, []);

  const fetchScreens = async () => {
    try {
      setError(null);
      const response = await authenticatedFetch('/api/screens');

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      const newScreens = Array.isArray(data) ? data : [];

      // Detectar cambios en el número de pantallas
      if (lastScreenCount > 0 && newScreens.length !== lastScreenCount) {
        if (newScreens.length > lastScreenCount) {
          setNotification(`✅ Nueva pantalla detectada! Total: ${newScreens.length}`);
          console.log('🆕 [Screen Detection] Nueva pantalla agregada');
        } else {
          setNotification(`⚠️ Pantalla eliminada. Total: ${newScreens.length}`);
          console.log('🗑️ [Screen Detection] Pantalla eliminada');
        }

        // Limpiar notificación después de 5 segundos
        setTimeout(() => setNotification(null), 5000);
      }

      setLastScreenCount(newScreens.length);
      setScreens(newScreens);
    } catch (error) {
      console.error('Error al obtener las pantallas:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al cargar las pantallas';
      setError(errorMessage);
      setScreens([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectedDevices = async (screenId: string) => {
    try {
      const response = await authenticatedFetch(`/api/screens/${screenId}/devices`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setConnectedDevices(data.devices || []);
    } catch (error) {
      console.error('Error al obtener dispositivos conectados:', error);
      setConnectedDevices([]);
    }
  };

  const handleShowDevices = async (screen: Screen) => {
    setSelectedScreen(screen);
    await fetchConnectedDevices(screen.id);
    setShowDevicesModal(true);
  };

  const handleRefreshContent = async (screenId: string) => {
    setIsActionLoading(screenId);
    try {
      const response = await authenticatedFetch(`/api/screens/${screenId}/refresh-content`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      console.log(`🔄 Contenido actualizado para pantalla ${screenId}:`, result.message);
      setNotification(`Contenido actualizado para "${screens.find(s => s.id === screenId)?.name}"`);
      setTimeout(() => setNotification(null), 3000);
      await fetchScreens();
    } catch (error) {
      console.error('❌ Error al actualizar contenido:', error);
      alert(`Error al actualizar contenido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsActionLoading(null);
    }
  };

  useEffect(() => {
    fetchScreens();
    // Auto-refresh cada 30 segundos para detectar cambios rápidamente
    const interval = setInterval(() => {
      fetchScreens();
      console.log('🔄 [Auto-refresh] Actualizando lista de pantallas...');
    }, 30000); // 30 segundos
    return () => clearInterval(interval);
  }, []);

  const handleRefreshScreen = async (id: string, event?: React.MouseEvent) => {
    // Si se mantiene presionado Ctrl/Cmd, ejecutar reinicio completo del servicio
    if (event && (event.ctrlKey || event.metaKey)) {
      console.log('🔄 [Refresh] Ctrl/Cmd detectado - ejecutando reinicio completo del servicio');
      await handleServiceRestart();
      return;
    }

    setIsActionLoading(id);
    try {
      const response = await authenticatedFetch(`/api/screens/${id}/refresh`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log(`🔄 Actualización de pantalla ${id}:`, result.message);

      // Mostrar feedback visual temporal
      if (result.refreshSent) {
        console.log('✅ Comando de actualización enviado exitosamente');
      } else {
        console.log('⚠️ Pantalla no conectada - comando no enviado');
      }

      await fetchScreens();
    } catch (error) {
      console.error('❌ Error al refrescar la pantalla:', error);
      alert(`Error al refrescar la pantalla: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handlePowerAction = async (id: string, action: 'on' | 'off') => {
    setIsActionLoading(id);
    try {
      const response = await authenticatedFetch(`/api/screens/${id}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      await fetchScreens();
    } catch (error) {
      console.error('Error al cambiar el estado de la pantalla:', error);
      alert(`Error al cambiar el estado de la pantalla: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRepeat = async (id: string) => {
    setIsActionLoading(id);
    try {
      const response = await authenticatedFetch(`/api/screens/${id}/toggle-repeat`, { method: 'POST' });
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      await fetchScreens();
    } catch (error) {
      console.error('Error al cambiar el estado de repetición:', error);
      alert(`Error al cambiar el estado de repetición: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleMuteToggle = async (screenId: string) => {
    setIsActionLoading(screenId);
    try {
      const response = await authenticatedFetch(`/api/screens/${screenId}/mute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}), // Toggle automático
      });

      if (response.ok) {
        await fetchScreens();
      }
    } catch (error) {
      console.error('Error al cambiar mute de pantalla:', error);
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleNavigateContent = async (screenId: string, direction: 'next' | 'previous') => {
    setIsActionLoading(screenId);
    try {
      const response = await authenticatedFetch(`/api/screens/${screenId}/navigate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ direction }),
      });

      if (response.ok) {
        console.log(`Navegación ${direction} enviada a pantalla ${screenId}`);
      }
    } catch (error) {
      console.error('Error al navegar contenido:', error);
    } finally {
      setIsActionLoading(null);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    // Verificar si clipboard API está disponible
    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(text);
        console.log(`✅ ${type} copiada al portapapeles:`, text);
        return;
      } catch (error) {
        console.error('❌ Error con Clipboard API:', error);
      }
    }

    // Fallback manual para navegadores que no soportan clipboard API
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      console.log(`✅ ${type} copiada al portapapeles (fallback):`, text);
    } catch (error) {
      console.error('❌ Error al copiar con fallback:', error);
      // Como último recurso, mostrar la URL para que el usuario la copie manualmente
      alert(`${type}:\n${text}\n\nCopia esta URL manualmente.`);
    }
  };

  const copyScreenUrl = async (screenId: string) => {
    const url = `${window.location.origin}/screen/${screenId}`;
    await copyToClipboard(url, 'URL de pantalla');
  };

  const copyAndroidUrl = async (screenId: string) => {
    const url = `${window.location.origin}/api/public/android-playlist/${screenId}`;
    await copyToClipboard(url, 'URL de Android');
  };

  const handleShowContent = async (screen: Screen) => {
    try {
      const response = await authenticatedFetch(`/api/screens/${screen.id}/content`);
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      const data = await response.json();
      setScreenContent(data);
      setSelectedScreen(screen);
      setShowContentModal(true);
    } catch (error) {
      console.error('Error al obtener el contenido:', error);
      alert(`Error al obtener el contenido: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleServiceRestart = async () => {
    if (!confirm('¿Estás seguro de que quieres reiniciar el servicio? Esto puede interrumpir temporalmente todas las pantallas.')) {
      return;
    }

    setIsRestartingService(true);
    try {
      console.log('🔄 [Service Restart] Iniciando reinicio del servicio...');

      const response = await authenticatedFetch('/api/system/restart', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ [Service Restart] Respuesta:', result);

      if (result.success) {
        setNotification(`✅ ${result.message}`);

        // Si es un reinicio manual, mostrar mensaje especial
        if (result.method === 'manual') {
          setNotification('🔄 Reinicio manual iniciado - La página se recargará automáticamente...');

          // Recargar la página después de unos segundos
          setTimeout(() => {
            window.location.reload();
          }, 3000);
        } else {
          // Para otros métodos, mostrar mensaje de éxito
          setTimeout(() => {
            setNotification('🔄 Servicio reiniciado - Las pantallas se reconectarán automáticamente');
          }, 2000);
        }
      } else {
        throw new Error(result.error || 'Error desconocido al reiniciar servicio');
      }

    } catch (error) {
      console.error('❌ [Service Restart] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setNotification(`❌ Error al reiniciar servicio: ${errorMessage}`);
      alert(`Error al reiniciar el servicio: ${errorMessage}`);
    } finally {
      // Mantener el loading un poco más para dar tiempo al reinicio
      setTimeout(() => {
        setIsRestartingService(false);
      }, 3000);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Tablero">
        <div className="text-center text-gray-500">Cargando pantallas...</div>
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout title="Tablero">
        <div className="text-center py-16">
          <div className="mx-auto h-12 w-12 text-red-400 mb-4">
            ⚠️
          </div>
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error al cargar las pantallas</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={() => {
                setIsLoading(true);
                fetchScreens();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Panel de Control"
      actions={
        <div className="flex items-center gap-2">
          {/* Botón de reiniciar servicio */}
          <button
            onClick={handleServiceRestart}
            disabled={isRestartingService}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isRestartingService ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">
              {isRestartingService ? 'Reiniciando...' : 'Reiniciar Servicio'}
            </span>
          </button>

          {/* Botón de refrescar */}
          <button
            onClick={fetchScreens}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-uct-primary text-white rounded-lg hover:bg-uct-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Actualizar</span>
          </button>
        </div>
      }
    >
      {/* Notificación */}
      {notification && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">{notification}</p>
        </div>
      )}

      {/* Grid de pantallas */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {screens.map((screen) => (
          <div key={screen.id} className={`bg-white rounded-xl shadow-uct border border-uct-gray-200 flex flex-col relative ${isActionLoading === screen.id ? 'opacity-50' : ''} hover:shadow-uct-lg transition-all duration-200`}>
            <div className="w-full flex flex-col">
              {isActionLoading === screen.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-xl">
                  <Loader2 className="h-6 w-6 animate-spin text-uct-primary" />
                </div>
              )}

              <div className="w-full flex flex-col">
                <div className="p-4 border-b border-uct-gray-200 flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-uct-primary">{screen.name}</h3>
                  <div className="flex items-center gap-2">
                    {/* Indicador de conexión */}
                    <div className={`w-2 h-2 rounded-full ${
                      screen.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                      screen.status === 'active'
                        ? 'bg-uct-accent/10 text-uct-accent border border-uct-accent/20'
                        : 'bg-uct-gray-100 text-uct-gray-600 border border-uct-gray-200'
                    }`}>
                      {screen.status === 'active' ? 'Activa' : 'Inactiva'}
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3 text-sm text-uct-gray-600 flex-grow">
                  {screen.currentContent && (
                    <div className="flex items-center gap-2">
                      <Film className="h-4 w-4 text-uct-accent" />
                      <span>{screen.currentContent}</span>
                    </div>
                  )}
                  {screen.lastSeen && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-uct-secondary" />
                      <span>{new Date(screen.lastSeen).toLocaleString()}</span>
                    </div>
                  )}
                  {/* URLs de streaming */}
                  <div className="space-y-2">
                    {/* URL Web */}
                    <div className="flex items-center gap-2 bg-uct-gray-50 p-2 rounded-lg border border-uct-gray-200">
                      <ExternalLink className="h-4 w-4 text-uct-primary flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <div className="text-xs text-uct-gray-500 font-medium">Web</div>
                        <span className="text-xs font-mono text-uct-gray-700 truncate block">
                          {typeof window !== 'undefined' ? `${window.location.origin}/screen/${screen.id}` : `/screen/${screen.id}`}
                        </span>
                      </div>
                      <button
                        onClick={() => copyScreenUrl(screen.id)}
                        title="Copiar URL Web"
                        className="p-1 text-uct-gray-500 hover:text-uct-primary hover:bg-white rounded transition-all duration-200"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>

                    {/* URL Android */}
                    <div className="flex items-center gap-2 bg-blue-50 p-2 rounded-lg border border-blue-200">
                      <Video className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      <div className="flex-grow min-w-0">
                        <div className="text-xs text-blue-600 font-medium">Android</div>
                        <span className="text-xs font-mono text-blue-700 truncate block">
                          {typeof window !== 'undefined' ? `${window.location.origin}/api/public/android-playlist/${screen.id}` : `/api/public/android-playlist/${screen.id}`}
                        </span>
                      </div>
                      <button
                        onClick={() => copyAndroidUrl(screen.id)}
                        title="Copiar URL Android"
                        className="p-1 text-blue-500 hover:text-blue-700 hover:bg-white rounded transition-all duration-200"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-uct-gray-50 border-t border-uct-gray-200 flex flex-wrap gap-2 justify-center">
                  <button
                    onClick={() => window.open(`/screen/${screen.id}`, '_blank')}
                    title="Ver Pantalla"
                    className="p-2 text-uct-gray-600 hover:bg-uct-primary hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                    disabled={!!isActionLoading}
                  >
                    <Monitor className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleShowContent(screen)}
                    title="Ver Contenido"
                    className="p-2 text-uct-gray-600 hover:bg-uct-accent hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                    disabled={!!isActionLoading}
                  >
                    <List className="h-4 w-4" />
                  </button>
                  {/* NUEVO: Botón para ver dispositivos conectados */}
                  <button
                    onClick={() => handleShowDevices(screen)}
                    title="Ver Dispositivos Conectados"
                    className="p-2 text-uct-gray-600 hover:bg-purple-500 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                    disabled={!!isActionLoading}
                  >
                    <Users className="h-4 w-4" />
                  </button>
                  {/* NUEVO: Botón para refrescar contenido */}
                  <button
                    onClick={() => handleRefreshContent(screen.id)}
                    title="Refrescar Contenido"
                    className="p-2 text-uct-gray-600 hover:bg-green-500 hover:text-white rounded-lg transition-all duration-200 disabled:opacity-50"
                    disabled={!!isActionLoading}
                  >
                    <Wifi className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => handleRefreshScreen(screen.id, e)}
                    title="Actualizar pantalla (Ctrl+Click = Reiniciar servicio completo)"
                    className="p-2 text-uct-gray-600 hover:bg-uct-secondary hover:text-uct-primary rounded-lg transition-all duration-200 disabled:opacity-50"
                    disabled={!!isActionLoading || isRestartingService}
                  >
                    {isRestartingService ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRepeat(screen.id)}
                    title={screen.isRepeating ? 'Desactivar Repetición' : 'Activar Repetición'}
                    className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${
                      screen.isRepeating
                        ? 'bg-uct-secondary/20 text-uct-secondary border border-uct-secondary/30'
                        : 'text-uct-gray-600 hover:bg-uct-secondary hover:text-uct-primary'
                    }`}
                    disabled={!!isActionLoading}
                  >
                    <Repeat className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleNavigateContent(screen.id, 'previous')}
                    title="Anterior"
                    className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-uct-gray-600 hover:bg-blue-100 hover:text-blue-600"
                    disabled={!!isActionLoading}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleNavigateContent(screen.id, 'next')}
                    title="Siguiente"
                    className="p-2 rounded-lg transition-all duration-200 disabled:opacity-50 text-uct-gray-600 hover:bg-blue-100 hover:text-blue-600"
                    disabled={!!isActionLoading}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleMuteToggle(screen.id)}
                    title={screen.muted ? 'Activar Audio' : 'Silenciar'}
                    className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${
                      screen.muted !== false
                        ? 'bg-orange-500 text-white border border-orange-600'
                        : 'text-uct-gray-600 hover:bg-orange-100 hover:text-orange-600'
                    }`}
                    disabled={!!isActionLoading}
                  >
                    {screen.muted !== false ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handlePowerAction(screen.id, screen.status === 'active' ? 'off' : 'on')}
                    title={screen.status === 'active' ? 'Apagar' : 'Encender'}
                    className={`p-2 rounded-lg transition-all duration-200 disabled:opacity-50 ${
                      screen.status === 'active'
                        ? 'text-red-600 hover:bg-red-100 border border-red-200'
                        : 'text-uct-accent hover:bg-uct-accent hover:text-white'
                    }`}
                    disabled={!!isActionLoading}
                  >
                    <PowerOff className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={showContentModal}
        onClose={() => setShowContentModal(false)}
        title={`Contenido de ${selectedScreen?.name || ''}`}
      >
        <div className="space-y-4">
          {screenContent?.items?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Esta pantalla no tiene contenido asignado.</p>
          ) : (
            <>
              <p className="text-gray-600">
                Lista de reproducción: <span className="font-medium text-gray-900">{screenContent?.playlistName}</span>
              </p>
              <div className="border-t border-gray-200 mt-4">
                {screenContent?.items?.map((item, index) => (
                  <div key={index} className="py-3 flex items-center gap-4 border-b border-gray-200 last:border-b-0">
                    <span className={`flex items-center justify-center h-10 w-10 rounded-lg ${
                      item.type.includes('video') ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'
                    }`}>
                      {item.type.includes('video') ? <Film className="h-5 w-5"/> : '🖼️'}
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* NUEVO: Modal de dispositivos conectados */}
      <Modal
        isOpen={showDevicesModal}
        onClose={() => setShowDevicesModal(false)}
        title={`Dispositivos conectados a ${selectedScreen?.name || ''}`}
      >
        <div className="space-y-4">
          {connectedDevices.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay dispositivos conectados a esta pantalla.</p>
          ) : (
            <div className="space-y-3">
              {connectedDevices.map((device, index) => (
                <div key={index} className="p-3 bg-gray-50 rounded-lg border">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="font-medium text-gray-800">Dispositivo {index + 1}</span>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><strong>IP:</strong> {device.ip}</p>
                    <p><strong>User Agent:</strong> {device.userAgent}</p>
                    <p><strong>Conectado:</strong> {new Date(device.connectedAt).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </PageLayout>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute>
      <AdminContent />
    </ProtectedRoute>
  );
}
