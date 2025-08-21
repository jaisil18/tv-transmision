'use client';

import { useState, useEffect, use } from 'react';
import { ArrowLeft, Save, Plus, Trash2, Clock, Monitor } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Playlist, PlaylistItem } from '@/app/api/playlists/route';
import FileUpload from '@/components/FileUpload';
import ScreenSelector from '@/components/ScreenSelector';
import Modal from '@/components/Modal';

interface UploadedFile {
  originalName?: string;
  url: string;
  type?: string;
}

export default function PlaylistConfigPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const router = useRouter();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedScreens, setSelectedScreens] = useState<string[]>([]);
  const [allScreens, setAllScreens] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const resolvedParams = await params;
      if (!resolvedParams.id) {
        router.push('/admin/playlists');
        return;
      }

      try {
        // Fetch playlist
        const playlistResponse = await fetch(`/api/playlists/${resolvedParams.id}`);
        const playlistData = await playlistResponse.json();
        if (!playlistResponse.ok) {
          throw new Error(playlistData.error || 'Error al cargar la lista');
        }
        if (!playlistData || !playlistData.id) {
          throw new Error('Datos de lista inválidos');
        }
        setPlaylist(playlistData);
        setSelectedScreens(playlistData.screens || []);

        // Fetch screens
        const screensResponse = await fetch('/api/screens');
        const screensData = await screensResponse.json();
        if (!screensResponse.ok) {
          throw new Error(screensData.error || 'Error al cargar las pantallas');
        }
        setAllScreens(screensData);

      } catch (error) {
        console.error('Error:', error);
        // Optional: Redirect or show a more specific error message
        // router.push('/admin/playlists');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params, router]);

  const handleUploadComplete = async (files: File[]) => {
    if (!playlist) return;

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Error al subir archivos');
      }

      const uploadResponse = await response.json();
      const uploadedFiles: UploadedFile[] = uploadResponse.files || uploadResponse;
      if (!Array.isArray(uploadedFiles)) {
        throw new Error('Formato de respuesta inválido');
      }

      const newItems: PlaylistItem[] = uploadedFiles.map(file => ({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        name: file.originalName || 'Sin nombre',
        url: file.url,
        type: file.type?.toLowerCase().startsWith('video') ? 'video' : 'image',
        duration: file.type?.toLowerCase().startsWith('image') ? 10 : undefined,
      }));

      setPlaylist(prevPlaylist => {
        if (!prevPlaylist) return null;
        return {
          ...prevPlaylist,
          items: [...prevPlaylist.items, ...newItems]
        };
      });

      setShowUploadModal(false);
    } catch (error) {
      console.error('Error al subir archivos:', error);
      alert(error instanceof Error ? error.message : 'Error al subir los archivos');
    } finally {
      setUploading(false);
    }
  };

  const handleScreenSelect = (screens: string[]) => {
    setSelectedScreens(screens);
    setPlaylist(prevPlaylist => {
      if (!prevPlaylist) return null;
      return {
        ...prevPlaylist,
        screens
      };
    });
  };

  const handleSave = async () => {
    if (!playlist) return;

    try {
      const response = await fetch(`/api/playlists/${playlist.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...playlist, screens: selectedScreens }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Error al guardar la lista');
      }

      alert('Lista guardada correctamente');
      router.refresh();
    } catch (error) {
      console.error('Error:', error);
      alert(error instanceof Error ? error.message : 'Error al guardar la lista');
    }
  };

  const handleDeleteItem = (itemId: string) => {
    setPlaylist(prevPlaylist => {
      if (!prevPlaylist) return null;
      return {
        ...prevPlaylist,
        items: prevPlaylist.items.filter((item: PlaylistItem) => item.id !== itemId)
      };
    });
  };

  if (loading) {
    return <div className="p-8">Cargando...</div>;
  }

  if (!playlist) {
    return <div className="p-8">Lista no encontrada</div>;
  }

  return (
    <div className="space-y-8 p-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/playlists"
            className="rounded-lg bg-gray-100 p-2 text-gray-600 hover:bg-gray-200"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-4xl font-bold text-gray-800">
            Configurar: {playlist.name}
          </h1>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
        >
          <Save className="h-5 w-5" />
          <span>Guardar Cambios</span>
        </button>
      </div>

      {/* Acciones */}
      <div className="flex gap-4">
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white transition-colors hover:bg-green-700"
        >
          <Plus className="h-5 w-5" />
          <span>Agregar Contenido</span>
        </button>
        <button
          onClick={() => setShowScreenModal(true)}
          className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-white transition-colors hover:bg-purple-700"
        >
          <Monitor className="h-5 w-5" />
          <span>Asignar Pantallas</span>
        </button>
      </div>

      {/* Lista de contenido */}
      <div className="rounded-xl bg-white p-6 shadow-lg">
        <h2 className="mb-6 text-xl font-semibold text-gray-800">
          Contenido de la Lista
        </h2>
        <div className="space-y-4">
          {playlist.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100">
                  {item.type === 'video' ? (
                    <video src={item.url} className="h-8 w-8" />
                  ) : (
                    <img src={item.url} alt={item.name} className="h-8 w-8" />
                  )}
                </div>
                <div>
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    {item.type === 'image' ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {item.duration}s
                      </span>
                    ) : (
                      'Video'
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDeleteItem(item.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          ))}
          {playlist.items.length === 0 && (
            <p className="text-center text-gray-500">
              No hay contenido en esta lista de reproducción
            </p>
          )}
        </div>
      </div>

      {/* Modal de carga de archivos */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title="Agregar Contenido"
      >
        <FileUpload onUpload={handleUploadComplete} uploading={uploading} />
      </Modal>

      {/* Modal de selección de pantallas */}
      <Modal
        isOpen={showScreenModal}
        onClose={() => setShowScreenModal(false)}
        title="Asignar Pantallas"
      >
        <ScreenSelector
          screens={allScreens}
          selectedScreens={selectedScreens}
          onScreenSelect={handleScreenSelect}
        />
      </Modal>
    </div>
  );
}
