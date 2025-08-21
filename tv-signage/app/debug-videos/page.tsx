'use client';

import { useState, useEffect } from 'react';

interface FileInfo {
  name: string;
  originalName: string;
  url: string;
  type: string;
  size: number;
  duration?: number;
}

export default function DebugVideos() {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{[key: string]: string}>({});

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/upload');
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        setError('Error al cargar archivos');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const testVideoLoad = async (url: string, filename: string) => {
    setTestResults(prev => ({ ...prev, [filename]: 'Probando...' }));
    
    try {
      // Probar carga directa
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        setTestResults(prev => ({ 
          ...prev, 
          [filename]: `✅ OK - ${Math.round(blob.size / 1024)} KB cargados` 
        }));
      } else {
        setTestResults(prev => ({ 
          ...prev, 
          [filename]: `❌ Error HTTP ${response.status}` 
        }));
      }
    } catch (error) {
      setTestResults(prev => ({ 
        ...prev, 
        [filename]: `❌ Error: ${error}` 
      }));
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const videos = files.filter(f => f.type.startsWith('video/'));
  const images = files.filter(f => f.type.startsWith('image/'));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando archivos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">🎥 Diagnóstico de Videos</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">📊 Total de Archivos</h3>
            <p className="text-3xl font-bold text-blue-600">{files.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">🎥 Videos</h3>
            <p className="text-3xl font-bold text-green-600">{videos.length}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-700">🖼️ Imágenes</h3>
            <p className="text-3xl font-bold text-purple-600">{images.length}</p>
          </div>
        </div>

        {/* Videos */}
        {videos.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">🎥 Videos Subidos</h2>
            </div>
            <div className="p-6">
              <div className="grid gap-6">
                {videos.map((video, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Información del archivo */}
                      <div>
                        <h3 className="font-semibold text-gray-800 mb-2">{video.originalName}</h3>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p><strong>Archivo:</strong> {video.name}</p>
                          <p><strong>Tipo:</strong> {video.type}</p>
                          <p><strong>Tamaño:</strong> {formatFileSize(video.size)}</p>
                          <p><strong>Duración:</strong> {formatDuration(video.duration)}</p>
                          <p><strong>URL:</strong> <code className="bg-gray-100 px-1 rounded">{video.url}</code></p>
                        </div>
                        
                        <div className="mt-3 space-x-2">
                          <button
                            onClick={() => testVideoLoad(video.url, video.name)}
                            className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                          >
                            Probar Carga
                          </button>
                          <a
                            href={video.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 inline-block"
                          >
                            Abrir Directo
                          </a>
                        </div>
                        
                        {testResults[video.name] && (
                          <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                            <strong>Resultado:</strong> {testResults[video.name]}
                          </div>
                        )}
                      </div>

                      {/* Preview del video */}
                      <div>
                        <h4 className="font-semibold text-gray-700 mb-2">Vista Previa</h4>
                        <video
                          controls
                          className="w-full max-w-md rounded border"
                          style={{ maxHeight: '200px' }}
                          onError={(e) => {
                            console.error('Error cargando video:', e);
                            setTestResults(prev => ({ 
                              ...prev, 
                              [video.name]: '❌ Error al cargar video en preview' 
                            }));
                          }}
                          onLoadedData={() => {
                            setTestResults(prev => ({ 
                              ...prev, 
                              [video.name]: '✅ Video cargado correctamente' 
                            }));
                          }}
                        >
                          <source src={video.url} type={video.type} />
                          Tu navegador no soporta el elemento video.
                        </video>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Imágenes */}
        {images.length > 0 && (
          <div className="bg-white rounded-lg shadow mb-6">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800">🖼️ Imágenes Subidas</h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <img
                      src={image.url}
                      alt={image.originalName}
                      className="w-full h-32 object-cover rounded mb-2"
                      onError={(e) => {
                        console.error('Error cargando imagen:', e);
                      }}
                    />
                    <h3 className="font-semibold text-gray-800 text-sm">{image.originalName}</h3>
                    <p className="text-xs text-gray-600">{formatFileSize(image.size)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {files.length === 0 && (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-500 text-lg">No hay archivos subidos</p>
            <a
              href="/admin/content"
              className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Ir a Subir Archivos
            </a>
          </div>
        )}

        {/* Información de red */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h3 className="font-semibold text-blue-800 mb-2">🌐 Información de Red</h3>
          <div className="text-sm text-blue-700 space-y-1">
            <p><strong>URL actual:</strong> {window.location.origin}</p>
            <p><strong>IP del servidor:</strong> 172.16.31.17:3000</p>
            <p><strong>Diagnóstico:</strong> <a href="/debug-videos" className="underline">Recargar página</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
