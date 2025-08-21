'use client';

import { useState, useEffect } from 'react';
import { Monitor, Plus, RefreshCw, Trash2, PowerOff, Volume2, VolumeX, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Screen } from '@/types/screen';
import Modal from '@/components/Modal';
import PageLayout from '@/components/PageLayout';
import ResponsiveTable from '@/components/ResponsiveTable';

export default function ScreensPage() {
  const [screens, setScreens] = useState<Screen[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newScreenName, setNewScreenName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchScreens = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/screens');
      if (response.ok) {
        const data = await response.json();
        setScreens(data);
      }
    } catch (error) {
      console.error('Error al obtener las pantallas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScreens();
    // Reducir frecuencia de actualización a 2 minutos
    const interval = setInterval(fetchScreens, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleAddScreen = async () => {
    if (!newScreenName.trim()) return;
    try {
      const response = await fetch('/api/screens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newScreenName }),
      });
      if (response.ok) {
        await fetchScreens();
        setNewScreenName('');
        setShowAddModal(false);
      }
    } catch (error) {
      console.error('Error al crear la pantalla:', error);
    }
  };

  const handleDeleteScreen = async (id: string) => {
    if (!confirm('¿Estás seguro?')) return;
    try {
      await fetch(`/api/screens/${id}`, { method: 'DELETE' });
      await fetchScreens();
    } catch (error) {
      console.error('Error al eliminar la pantalla:', error);
    }
  };

  const handleRefreshScreen = async (id: string) => {
    try {
      await fetch(`/api/screens/${id}/refresh`, { method: 'POST' });
    } catch (error) {
      console.error('Error al actualizar la pantalla:', error);
    }
  };

  const handlePowerAction = async (id: string, action: 'on' | 'off') => {
    try {
      await fetch(`/api/screens/${id}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
    } catch (error) {
      console.error('Error al cambiar el estado de la pantalla:', error);
    }
  };

  const handleMuteToggle = async (screenId: string) => {
    try {
      const response = await fetch(`/api/screens/${screenId}/mute`, {
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
    }
  };

  const handleNavigateContent = async (screenId: string, direction: 'next' | 'previous') => {
    try {
      const response = await fetch(`/api/screens/${screenId}/navigate`, {
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
    }
  };

  const actions = (
    <button
      onClick={() => setShowAddModal(true)}
      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-uct-primary text-white text-sm font-medium rounded-lg hover:bg-uct-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uct-primary transition-all duration-200 shadow-uct"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Añadir Pantalla</span>
      <span className="sm:hidden">Añadir</span>
    </button>
  );

  const columns = [
    { key: 'name', label: 'Nombre', mobileLabel: 'Pantalla' },
    { key: 'status', label: 'Estado' },
    { key: 'lastSeen', label: 'Última Conexión', hideOnMobile: true },
    { key: 'actions', label: 'Acciones', className: 'text-right' }
  ];

  const renderRow = (screen: Screen) => (
    <>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{screen.name}</td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
          screen.status === 'active' ? 'bg-uct-accent/10 text-uct-accent border border-uct-accent/20' : 'bg-gray-100 text-gray-800 border border-gray-200'
        }`}>
          {screen.status === 'active' ? 'Activa' : 'Inactiva'}
        </span>
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        {screen.lastSeen ? new Date(screen.lastSeen).toLocaleString() : 'Nunca'}
      </td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-1">
          <button
            onClick={() => window.open(`/screen/${screen.id}`, '_blank')}
            className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors"
            title="Ver pantalla"
          >
            <Monitor className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleRefreshScreen(screen.id)}
            className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors"
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleNavigateContent(screen.id, 'previous')}
            className="p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-md transition-colors"
            title="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleNavigateContent(screen.id, 'next')}
            className="p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-md transition-colors"
            title="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleMuteToggle(screen.id)}
            className={`p-2 rounded-md transition-colors ${screen.muted !== false ? 'text-white bg-orange-500' : 'text-gray-600 hover:bg-orange-100 hover:text-orange-600'}`}
            title={screen.muted ? 'Activar Audio' : 'Silenciar'}
          >
            {screen.muted !== false ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => handlePowerAction(screen.id, screen.status === 'active' ? 'off' : 'on')}
            className={`p-2 rounded-md transition-colors ${screen.status === 'active' ? 'text-red-500 hover:bg-red-100' : 'text-green-500 hover:bg-green-100'}`}
            title={screen.status === 'active' ? 'Desactivar' : 'Activar'}
          >
            <PowerOff className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteScreen(screen.id)}
            className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors"
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </>
  );

  const renderMobileCard = (screen: Screen) => (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{screen.name}</h3>
          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full mt-1 ${
            screen.status === 'active' ? 'bg-uct-accent/10 text-uct-accent border border-uct-accent/20' : 'bg-gray-100 text-gray-800 border border-gray-200'
          }`}>
            {screen.status === 'active' ? 'Activa' : 'Inactiva'}
          </span>
        </div>
      </div>
      <div className="text-sm text-gray-500">
        <strong>Última conexión:</strong> {screen.lastSeen ? new Date(screen.lastSeen).toLocaleString() : 'Nunca'}
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => window.open(`/screen/${screen.id}`, '_blank')}
          className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors"
          title="Ver pantalla"
        >
          <Monitor className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleRefreshScreen(screen.id)}
          className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors"
          title="Actualizar"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleNavigateContent(screen.id, 'previous')}
          className="p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-md transition-colors"
          title="Anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleNavigateContent(screen.id, 'next')}
          className="p-2 text-gray-600 hover:bg-blue-100 hover:text-blue-600 rounded-md transition-colors"
          title="Siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleMuteToggle(screen.id)}
          className={`p-2 rounded-md transition-colors ${screen.muted !== false ? 'text-white bg-orange-500' : 'text-gray-600 hover:bg-orange-100 hover:text-orange-600'}`}
          title={screen.muted ? 'Activar Audio' : 'Silenciar'}
        >
          {screen.muted !== false ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
        <button
          onClick={() => handlePowerAction(screen.id, screen.status === 'active' ? 'off' : 'on')}
          className={`p-2 rounded-md transition-colors ${screen.status === 'active' ? 'text-red-500 hover:bg-red-100' : 'text-green-500 hover:bg-green-100'}`}
          title={screen.status === 'active' ? 'Desactivar' : 'Activar'}
        >
          <PowerOff className="h-4 w-4" />
        </button>
        <button
          onClick={() => handleDeleteScreen(screen.id)}
          className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors"
          title="Eliminar"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <PageLayout title="Pantallas" actions={actions}>
      <ResponsiveTable
        columns={columns}
        data={screens}
        renderRow={renderRow}
        renderMobileCard={renderMobileCard}
        loading={isLoading}
        emptyMessage="No hay pantallas configuradas."
        keyExtractor={(screen) => screen.id}
      />

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Añadir Nueva Pantalla">
        <div className="space-y-4">
          <div>
            <label htmlFor="screen-name" className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Pantalla</label>
            <input
              type="text"
              id="screen-name"
              value={newScreenName}
              onChange={(e) => setNewScreenName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-uct-primary focus:border-uct-primary text-sm"
              placeholder="Ej: Pantalla de Recepción"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddScreen}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-uct-primary border border-transparent rounded-lg hover:bg-uct-dark transition-colors"
            >
              Guardar
            </button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
