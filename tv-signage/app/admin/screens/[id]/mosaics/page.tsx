'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageLayout from '@/components/PageLayout';
import FileUpload from '@/components/FileUpload';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { useMosaicItems } from '@/hooks/useMosaicItems';
import Image from 'next/image';

interface MosaicoItem {
  id: string;
  name: string;
  url: string;
  type: string;
  position: number;
  duration?: number;
}

type PageParams = { id: string };

export default function MosaicsPage({ params }: { params: Promise<PageParams> }) {
  // Usar React.use con el tipo correcto para mantener compatibilidad con Usable<T>
  const resolvedParams = React.use<PageParams>(params);

  const screenId = resolvedParams.id;
  const [screenName, setScreenName] = useState<string>('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { settings } = useSystemSettings();

  // Usar el hook personalizado para cargar los elementos de mosaico
  const {
    mosaico1Items,
    mosaico2Items,
    isLoading,
    error,
    refreshMosaicItems
  } = useMosaicItems(screenId);

  // Cargar información de la pantalla
  useEffect(() => {
    const fetchScreenInfo = async () => {
      try {
        const response = await fetch(`/api/screens/${screenId}`);
        if (response.ok) {
          const data = await response.json();
          setScreenName(data.name || 'Pantalla sin nombre');
        }
      } catch (error) {
        console.error('Error al cargar información de la pantalla:', error);
      }
    };

    fetchScreenInfo();
  }, [screenId]);

  // Función para manejar la carga exitosa de archivos
  const handleUploadSuccess = useCallback(() => {
    setUploadSuccess(true);
    setTimeout(() => setUploadSuccess(false), 3000);
    refreshMosaicItems();
  }, [refreshMosaicItems]);

  // Función para eliminar un archivo de mosaico
  const deleteFile = useCallback(async (filename: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar el archivo "${filename}"?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/screens/${screenId}/mosaic-items/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        refreshMosaicItems();
      } else {
        alert('Error al eliminar el archivo');
      }
    } catch (error) {
      console.error('Error al eliminar archivo:', error);
      alert('Error al eliminar el archivo');
    } finally {
      setIsDeleting(false);
    }
  }, [screenId, refreshMosaicItems]);

  // Función para volver a la página de detalles de la pantalla
  const goBack = useCallback(() => {
    router.push(`/admin/screens/${screenId}`);
  }, [router, screenId]);

  return (
    <PageLayout title={`Gestión de Mosaicos - ${screenName}`}>
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={goBack}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors flex items-center gap-2"
        >
          ← Volver a Detalles de Pantalla
        </button>

        <button
          onClick={refreshMosaicItems}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors flex items-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
          ) : (
            <span>🔄</span>
          )}
          Actualizar
        </button>
      </div>

      {uploadSuccess && (
        <div className="bg-green-100 text-green-800 p-3 rounded-md mb-4">
          Archivo subido correctamente
        </div>
      )}

      {error && (
        <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Upload para Mosaico 1 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span>📤</span> Subir a Mosaico 1
          </h2>
          <div className="mb-4 p-3 bg-blue-50 text-blue-800 rounded-md">
            <p className="text-sm">
              <strong>Posición:</strong> Esquina superior izquierda<br/>
              <strong>Duración para imágenes:</strong> Incluir "_5s_" en el nombre para 5 segundos
            </p>
          </div>
          <FileUpload
            endpoint={`/api/screens/${screenId}/upload-mosaic?position=1`}
            allowedTypes="image/*,video/*"
            maxSizeMB={50}
            onSuccess={handleUploadSuccess}
            buttonText="Subir a Mosaico 1"
            multiple={true}
          />
        </div>

        {/* Upload para Mosaico 2 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span>📤</span> Subir a Mosaico 2
          </h2>
          <div className="mb-4 p-3 bg-green-50 text-green-800 rounded-md">
            <p className="text-sm">
              <strong>Posición:</strong> Esquina superior derecha<br/>
              <strong>Duración para imágenes:</strong> Incluir "_5s_" en el nombre para 5 segundos
            </p>
          </div>
          <FileUpload
            endpoint={`/api/screens/${screenId}/upload-mosaic?position=2`}
            allowedTypes="image/*,video/*"
            maxSizeMB={50}
            onSuccess={handleUploadSuccess}
            buttonText="Subir a Mosaico 2"
            multiple={true}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mosaico 1 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span>🖼️</span> Mosaico 1 (Superior Izquierda)
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : mosaico1Items.length === 0 ? (
            <div className="bg-gray-100 rounded-md p-8 text-center text-gray-500">
              No hay archivos para Mosaico 1
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mosaico1Items.map((item) => (
                <div key={item.id} className="border rounded-md overflow-hidden bg-gray-50">
                  <div className="relative h-32">
                    {item.type === 'image' ? (
                      <Image
                        src={item.url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-200">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate" title={item.name}>{item.name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {item.type === 'image' ? `Imagen (${item.duration || 5}s)` : 'Video'}
                      </span>
                      <button
                        onClick={() => deleteFile(item.name)}
                        disabled={isDeleting}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mosaico 2 */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
            <span>🖼️</span> Mosaico 2 (Superior Derecha)
          </h2>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
            </div>
          ) : mosaico2Items.length === 0 ? (
            <div className="bg-gray-100 rounded-md p-8 text-center text-gray-500">
              No hay archivos para Mosaico 2
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {mosaico2Items.map((item) => (
                <div key={item.id} className="border rounded-md overflow-hidden bg-gray-50">
                  <div className="relative h-32">
                    {item.type === 'image' ? (
                      <Image
                        src={item.url}
                        alt={item.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 300px"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full bg-gray-200">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium truncate" title={item.name}>{item.name}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {item.type === 'image' ? `Imagen (${item.duration || 5}s)` : 'Video'}
                      </span>
                      <button
                        onClick={() => deleteFile(item.name)}
                        disabled={isDeleting}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}