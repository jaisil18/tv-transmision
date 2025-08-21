'use client';

import { useState, useEffect } from 'react';
import { Plus, Settings, Trash2, List, Monitor, Folder, Grid2X2 } from 'lucide-react';
import type { Playlist, PlaylistItem } from '@/app/api/playlists/route';
import type { Screen } from '@/types/screen';
import Modal from '@/components/Modal';
import ContentSelector from '@/components/ContentSelector';
import ScreenSelector from '@/components/ScreenSelector';
import FolderSelector from '@/components/FolderSelector';
import MosaicToggle from '@/components/MosaicToggle';
import PageLayout from '@/components/PageLayout';
import ResponsiveTable from '@/components/ResponsiveTable';

export default function PlaylistsPage() {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);
  const [playlistData, setPlaylistData] = useState({
    name: '',
    items: [] as PlaylistItem[],
    screens: [] as string[],
    folder: null as string | null
  });
  const [loading, setLoading] = useState(true);
  const [folderCounts, setFolderCounts] = useState<Record<string, number>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  // Función para obtener el conteo real de elementos de una playlist
  const getPlaylistItemCount = async (playlist: Playlist): Promise<number> => {
    if (playlist.folder) {
      // Si tiene carpeta asignada, contar archivos de la carpeta
      if (folderCounts[playlist.folder] !== undefined) {
        return folderCounts[playlist.folder];
      }

      try {
        const response = await fetch(`/api/files/folders/${encodeURIComponent(playlist.folder)}`);
        if (response.ok) {
          const data = await response.json();
          const mediaFiles = data.files?.filter((f: any) =>
            f.type === 'file' && (f.mediaType === 'video' || f.mediaType === 'image')
          ) || [];
          return mediaFiles.length;
        }
      } catch (error) {
        console.error('Error al obtener archivos de carpeta:', error);
      }
      return 0;
    } else {
      // Si no tiene carpeta, usar items manuales
      return playlist.items?.length || 0;
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [playlistsRes, screensRes] = await Promise.all([
        fetch('/api/playlists'),
        fetch('/api/screens'),
      ]);
      const playlistsData = await playlistsRes.json();
      const screensData = await screensRes.json();
      setPlaylists(Array.isArray(playlistsData) ? playlistsData : []);
      setScreens(Array.isArray(screensData) ? screensData : []);

      // Obtener conteos de carpetas para playlists que las usan
      const newFolderCounts: Record<string, number> = {};
      const playlistsWithFolders = playlistsData.filter((p: Playlist) => p.folder);

      for (const playlist of playlistsWithFolders) {
        if (playlist.folder && !newFolderCounts[playlist.folder]) {
          try {
            const response = await fetch(`/api/files/folders/${encodeURIComponent(playlist.folder)}`);
            if (response.ok) {
              const data = await response.json();
              const mediaFiles = data.files?.filter((f: any) =>
                f.type === 'file' && (f.mediaType === 'video' || f.mediaType === 'image')
              ) || [];
              newFolderCounts[playlist.folder] = mediaFiles.length;
            }
          } catch (error) {
            console.error(`Error al obtener archivos de carpeta ${playlist.folder}:`, error);
            newFolderCounts[playlist.folder] = 0;
          }
        }
      }

      setFolderCounts(newFolderCounts);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleOpenModal = (playlist: Playlist | null = null, tab: string = 'general') => {
    if (playlist) {
      setEditingPlaylist(playlist);
      setPlaylistData({
        name: playlist.name,
        items: playlist.items || [],
        screens: playlist.screens || [],
        folder: (playlist as any).folder || null,
      });
    } else {
      setEditingPlaylist(null);
      setPlaylistData({ name: '', items: [], screens: [], folder: null });
    }
    setActiveTab(tab);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlaylist(null);
    setPlaylistData({ name: '', items: [], screens: [], folder: null });
    setActiveTab('general');
  };

  const handleSave = async () => {
    if (!playlistData.name.trim()) {
      alert('El nombre de la lista es requerido.');
      return;
    }

    const url = editingPlaylist ? `/api/playlists/${editingPlaylist.id}` : '/api/playlists';
    const method = editingPlaylist ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playlistData),
      });
      
      if (response.ok) {
        const savedPlaylist = await response.json();
        
        // En handleSave, antes del refresh:
        if (playlistData.folder) {
          setIsRefreshing(true);
          try {
            const refreshResponse = await fetch('/api/debug/refresh-playlists', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                playlistId: savedPlaylist.id || editingPlaylist?.id,
                folder: playlistData.folder 
              })
            });
            
            if (refreshResponse.ok) {
              console.log('✅ Contenido actualizado automáticamente');
            } else {
              console.warn('⚠️ Error en refresh automático, pero playlist guardada');
            }
          } catch (refreshError) {
            console.warn('⚠️ Error en refresh automático:', refreshError);
          }
          setIsRefreshing(false);
        }
        
        await fetchAllData();
        handleCloseModal();
      } else {
        alert('Error al guardar la lista. Verifique los datos.');
      }
    } catch (error) {
      console.error('Error al guardar la lista:', error);
      alert('Error de conexión al guardar la lista.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lista de reproducción?')) return;
    
    console.log('🗑️ Iniciando eliminación de playlist:', id);
    
    try {
      const response = await fetch(`/api/playlists/${id}`, { 
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Respuesta del servidor:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        console.error('❌ Error del servidor:', errorData);
        alert(`Error al eliminar la lista: ${errorData.error || 'Error desconocido'}`);
        return;
      }
      
      const result = await response.json();
      console.log('✅ Lista eliminada exitosamente:', result);
      
      // Actualizar los datos después de la eliminación exitosa
      await fetchAllData();
      console.log('🔄 Datos actualizados después de la eliminación');
      
    } catch (error) {
      console.error('💥 Error de red o excepción:', error);
      alert(`Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const actions = (
    <button
      onClick={() => handleOpenModal()}
      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-uct-primary text-white text-sm font-medium rounded-lg hover:bg-uct-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-uct-primary transition-all duration-200 shadow-uct"
    >
      <Plus className="h-4 w-4" />
      <span className="hidden sm:inline">Asignar Carpeta a Pantalla</span>
      <span className="sm:hidden">Asignar</span>
    </button>
  );

  const columns = [
    { key: 'name', label: 'Nombre', mobileLabel: 'Lista' },
    { key: 'items', label: 'N.º de Elementos', mobileLabel: 'Elementos' },
    { key: 'screens', label: 'Pantallas Asignadas', mobileLabel: 'Pantallas' },
    { key: 'actions', label: 'Acciones', className: 'text-right' }
  ];

  const getDisplayItemCount = (playlist: Playlist): string => {
    if (playlist.folder) {
      const count = folderCounts[playlist.folder];
      return count !== undefined ? `${count} (carpeta)` : 'Cargando...';
    }
    return `${playlist.items?.length || 0}`;
  };

  const renderRow = (playlist: Playlist) => (
    <>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{playlist.name}</td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getDisplayItemCount(playlist)}</td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500">{playlist.screens?.length || 0}</td>
      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex justify-end gap-1">
          <button
            onClick={() => handleOpenModal(playlist)}
            className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors"
            title="Editar lista"
          >
            <Settings className="h-4 w-4" />
          </button>
          {playlist.screens && playlist.screens.length > 0 && (
            <button
              onClick={() => {
                // Abrir el modal de edición con la pestaña de mosaicos activa
                handleOpenModal(playlist, 'mosaics');
              }}
              className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-md transition-colors"
              title="Gestionar mosaicos"
            >
              <Grid2X2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => handleDelete(playlist.id)}
            className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors"
            title="Eliminar lista"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </>
  );

  const renderMobileCard = (playlist: Playlist) => (
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-medium text-gray-900">{playlist.name}</h3>
          <div className="flex gap-4 mt-1 text-sm text-gray-500">
            <span>{getDisplayItemCount(playlist)} elementos</span>
            <span>{playlist.screens?.length || 0} pantallas</span>
          </div>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
        <button
          onClick={() => handleOpenModal(playlist)}
          className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors"
          title="Editar lista"
        >
          <Settings className="h-4 w-4" />
        </button>
        {playlist.screens && playlist.screens.length > 0 && (
          <button
            onClick={() => {
              // Abrir el modal de edición con la pestaña de mosaicos activa
              handleOpenModal(playlist, 'mosaics');
            }}
            className="p-2 text-indigo-500 hover:bg-indigo-100 rounded-md transition-colors"
            title="Gestionar mosaicos"
          >
            <Grid2X2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => handleDelete(playlist.id)}
          className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors"
          title="Eliminar lista"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <PageLayout title="Listas de Reproducción" actions={actions}>
      <ResponsiveTable
        columns={columns}
        data={playlists}
        renderRow={renderRow}
        renderMobileCard={renderMobileCard}
        loading={loading}
        emptyMessage="No hay listas de reproducción."
        keyExtractor={(playlist) => playlist.id}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPlaylist ? 'Editar Lista' : 'Nueva Lista'}>
        <div className="space-y-6">
          {/* Pestañas de navegación */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 text-sm font-medium ${activeTab === 'general' ? 'text-uct-primary border-b-2 border-uct-primary' : 'text-gray-500 hover:text-gray-700'}`}
            >
              General
            </button>
            {playlistData.screens.length > 0 && (
              <button
                onClick={() => setActiveTab('mosaics')}
                className={`px-4 py-2 text-sm font-medium ${activeTab === 'mosaics' ? 'text-indigo-500 border-b-2 border-indigo-500' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Mosaicos
              </button>
            )}
          </div>
          {activeTab === 'general' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Lista</label>
                <input
                  type="text"
                  value={playlistData.name}
                  onChange={(e) => setPlaylistData({ ...playlistData, name: e.target.value })}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-uct-primary focus:border-uct-primary text-sm"
                  placeholder="Ej: Lista Principal"
                />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Carpeta de Contenido</h3>
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <p className="text-sm text-gray-600">
                    💡 <strong>Nuevo:</strong> Selecciona una carpeta para reproducir automáticamente todos sus archivos,
                    o deja sin seleccionar para agregar contenido manualmente.
                  </p>
                </div>
                <div className="max-h-48 overflow-y-auto">
                  <FolderSelector
                    selectedFolder={playlistData.folder}
                    onFolderSelect={(folder) => setPlaylistData({ ...playlistData, folder })}
                  />
                </div>
              </div>

              {!playlistData.folder && (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Contenido Manual</h3>
                  <div className="max-h-60 overflow-y-auto">
                    <ContentSelector
                      selectedContent={playlistData.items.map(i => i.name)}
                      onContentSelect={(names) => setPlaylistData({ ...playlistData, items: names.map(name => ({
                        id: `item-${Date.now()}-${Math.random()}`,
                        name,
                        url: `/uploads/${name}`,
                        type: name.endsWith('.mp4') ? 'video' : 'image',
                        duration: 10
                      }))})}                    />
                  </div>
                </div>
              )}

              {playlistData.folder && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-1 bg-blue-100 rounded">
                      <Folder className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900">Reproducción Automática</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Esta lista reproducirá automáticamente todos los archivos de la carpeta
                        <strong> "{playlistData.folder}"</strong>. Los archivos se detectarán automáticamente
                        cuando agregues nuevo contenido.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Pantallas</h3>
                <div className="max-h-40 overflow-y-auto">
                  <ScreenSelector
                    screens={screens}
                    selectedScreens={playlistData.screens}
                    onScreenSelect={(screenIds) => setPlaylistData({ ...playlistData, screens: screenIds })}
                  />
                </div>
              </div>
            </>
          )}
          
          {activeTab === 'mosaics' && (
            <div className="space-y-6">
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-indigo-100 rounded">
                    <Grid2X2 className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-indigo-900">Gestión de Mosaicos</h4>
                    <p className="text-sm text-indigo-700 mt-1">
                      Controla la visualización de mosaicos en las pantallas seleccionadas y gestiona los archivos de mosaico para cada pantalla.
                    </p>
                  </div>
                </div>
              </div>
              
              {playlistData.screens.length > 0 ? (
                <>
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Pantallas Seleccionadas</h3>
                    <div className="max-h-40 overflow-y-auto">
                      <ScreenSelector
                        screens={screens}
                        selectedScreens={playlistData.screens}
                        onScreenSelect={(screenIds) => setPlaylistData({ ...playlistData, screens: screenIds })}
                        readOnly={true}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <MosaicToggle 
                      screenIds={playlistData.screens}
                      screens={screens}
                      disabled={loading}
                    />
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center p-3 bg-gray-100 rounded-full mb-4">
                    <Monitor className="h-6 w-6 text-gray-500" />
                  </div>
                  <h3 className="text-base font-medium text-gray-900 mb-1">No hay pantallas seleccionadas</h3>
                  <p className="text-sm text-gray-500 mb-4">Selecciona al menos una pantalla en la pestaña General para gestionar los mosaicos.</p>
                  <button
                    onClick={() => setActiveTab('general')}
                    className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Ir a la pestaña General
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleCloseModal}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-uct-primary border border-transparent rounded-lg hover:bg-uct-dark transition-colors"
            >
              {activeTab === 'mosaics' ? 'Guardar Cambios' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
}
