'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Settings, Trash2, List, Monitor, Folder } from 'lucide-react';
import type { Playlist, PlaylistItem } from '@/app/api/playlists/route';
import type { Screen } from '@/types/screen';
import AccessibleModal from '@/components/AccessibleModal';
import ContentSelector from '@/components/ContentSelector';
import ScreenSelector from '@/components/ScreenSelector';
import FolderSelector from '@/components/FolderSelector';
import PageLayout from '@/components/PageLayout';
import EnhancedResponsiveTable from '@/components/EnhancedResponsiveTable';
import { StaggerContainer, StaggerItem, PremiumHover } from '@/components/animations/PageTransition';

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

  const handleOpenModal = (playlist: Playlist | null = null) => {
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
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPlaylist(null);
    setPlaylistData({ name: '', items: [], screens: [], folder: null });
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
    if (!confirm('¿Estás seguro?')) return;
    try {
      await fetch(`/api/playlists/${id}`, { method: 'DELETE' });
      await fetchAllData();
    } catch (error) {
      console.error('Error al eliminar la lista:', error);
    }
  };

  const actions = (
    <motion.button
      onClick={() => handleOpenModal()}
      className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 shadow-lg hover:shadow-xl relative overflow-hidden"
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
    >
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0"
        whileHover={{ opacity: 0.3 }}
        transition={{ duration: 0.3 }}
      />
      <motion.div
        whileHover={{ rotate: 180 }}
        transition={{ duration: 0.3 }}
      >
        <Plus className="h-4 w-4 relative z-10" />
      </motion.div>
      <span className="hidden sm:inline relative z-10">Asignar Carpeta a Pantalla</span>
      <span className="sm:hidden relative z-10">Asignar</span>
    </motion.button>
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
        <motion.div 
          className="flex justify-end gap-1"
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <motion.button
            onClick={() => handleOpenModal(playlist)}
            className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors relative overflow-hidden"
            title="Editar lista"
            whileHover={{ scale: 1.1, rotate: 15 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0"
              whileHover={{ opacity: 0.5 }}
              transition={{ duration: 0.3 }}
            />
            <Settings className="h-4 w-4 relative z-10" />
          </motion.button>
          <motion.button
            onClick={() => handleDelete(playlist.id)}
            className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors relative overflow-hidden"
            title="Eliminar lista"
            whileHover={{ scale: 1.1, rotate: -15 }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 17 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-red-100 to-pink-100 opacity-0"
              whileHover={{ opacity: 0.5 }}
              transition={{ duration: 0.3 }}
            />
            <Trash2 className="h-4 w-4 relative z-10" />
          </motion.button>
        </motion.div>
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
      <motion.div 
        className="flex justify-end gap-2 pt-2 border-t border-gray-100"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <motion.button
          onClick={() => handleOpenModal(playlist)}
          className="p-2 text-uct-primary hover:bg-uct-gray-100 rounded-md transition-colors relative overflow-hidden"
          title="Editar lista"
          whileHover={{ scale: 1.1, rotate: 15 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-100 to-purple-100 opacity-0"
            whileHover={{ opacity: 0.5 }}
            transition={{ duration: 0.3 }}
          />
          <Settings className="h-4 w-4 relative z-10" />
        </motion.button>
        <motion.button
          onClick={() => handleDelete(playlist.id)}
          className="p-2 text-red-500 hover:bg-red-100 rounded-md transition-colors relative overflow-hidden"
          title="Eliminar lista"
          whileHover={{ scale: 1.1, rotate: -15 }}
          whileTap={{ scale: 0.95 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-red-100 to-pink-100 opacity-0"
            whileHover={{ opacity: 0.5 }}
            transition={{ duration: 0.3 }}
          />
          <Trash2 className="h-4 w-4 relative z-10" />
        </motion.button>
      </motion.div>
    </div>
  );

  return (
    <PageLayout title="Listas de Reproducción" actions={actions}>
      <EnhancedResponsiveTable
        columns={columns}
        data={playlists}
        renderRow={renderRow}
        renderMobileCard={renderMobileCard}
        loading={loading}
        emptyMessage="No hay listas de reproducción."
        keyExtractor={(playlist) => playlist.id}
      />

      <AccessibleModal isOpen={isModalOpen} onClose={handleCloseModal} title={editingPlaylist ? 'Editar Lista' : 'Nueva Lista'}>
        <div className="space-y-6">
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
                  }))})}
                />
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
              Guardar
            </button>
          </div>
        </div>
      </AccessibleModal>
    </PageLayout>
  );
}
