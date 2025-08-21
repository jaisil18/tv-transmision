'use client';

import { useEffect, useState, use } from 'react';

interface PageParams {
  params: Promise<{ id: string }>;
}

interface FileTest {
  name: string;
  url: string;
  status: number | string;
  accessible: boolean;
  contentType?: string | null;
  size?: string | null;
  error?: string;
}

export default function DebugScreen({ params }: PageParams) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        console.log('🔍 Iniciando debug para pantalla:', id);
        
        // 1. Verificar heartbeat
        const heartbeatResponse = await fetch(`/api/public/screens/${id}/heartbeat`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lastSeen: Date.now() }),
        });
        
        const heartbeatData = await heartbeatResponse.json();
        console.log('💓 Heartbeat:', heartbeatData);

        // 2. Verificar contenido
        const contentResponse = await fetch(`/api/screens/${id}/content`);
        const contentData = await contentResponse.json();
        console.log('📋 Contenido:', contentData);

        // 3. Verificar cada archivo individualmente
        const fileTests: FileTest[] = [];
        if (contentData.items) {
          for (const item of contentData.items) {
            try {
              const fileResponse = await fetch(item.url, { method: 'HEAD' });
              fileTests.push({
                name: item.name,
                url: item.url,
                status: fileResponse.status,
                accessible: fileResponse.ok,
                contentType: fileResponse.headers.get('content-type'),
                size: fileResponse.headers.get('content-length')
              });
            } catch (error) {
              fileTests.push({
                name: item.name,
                url: item.url,
                status: 'ERROR',
                accessible: false,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }

        setDebugInfo({
          screenId: id,
          heartbeat: heartbeatData,
          content: contentData,
          fileTests,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.error('❌ Error en debug:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
    const interval = setInterval(fetchDebugInfo, 10000); // Actualizar cada 10 segundos
    return () => clearInterval(interval);
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl mb-4">🔍 Debug Pantalla {id}</h1>
        <p>Cargando información de debug...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8 font-mono text-sm">
      <h1 className="text-2xl mb-6 text-green-400">🔍 Debug Pantalla {id}</h1>
      
      <div className="space-y-6">
        {/* Información básica */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-lg text-blue-400 mb-2">📊 Información Básica</h2>
          <p><strong>Screen ID:</strong> {debugInfo.screenId}</p>
          <p><strong>Timestamp:</strong> {debugInfo.timestamp}</p>
          <p><strong>URL Actual:</strong> {window.location.href}</p>
        </div>

        {/* Estado del Heartbeat */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-lg text-blue-400 mb-2">💓 Estado de Heartbeat</h2>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(debugInfo.heartbeat, null, 2)}
          </pre>
        </div>

        {/* Contenido de la Playlist */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-lg text-blue-400 mb-2">📋 Contenido de Playlist</h2>
          <p><strong>Playlist:</strong> {debugInfo.content?.playlistName || 'N/A'}</p>
          <p><strong>Total Items:</strong> {debugInfo.content?.items?.length || 0}</p>
          <pre className="text-xs overflow-auto mt-2">
            {JSON.stringify(debugInfo.content, null, 2)}
          </pre>
        </div>

        {/* Test de Archivos */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-lg text-blue-400 mb-2">🎬 Test de Accesibilidad de Archivos</h2>
          {debugInfo.fileTests?.map((test: FileTest, index: number) => (
            <div key={index} className={`p-2 mb-2 rounded ${test.accessible ? 'bg-green-900' : 'bg-red-900'}`}>
              <p><strong>Archivo {index + 1}:</strong> {test.name}</p>
              <p><strong>URL:</strong> {test.url}</p>
              <p><strong>Status:</strong> {test.status}</p>
              <p><strong>Accesible:</strong> {test.accessible ? '✅ SÍ' : '❌ NO'}</p>
              {test.contentType && <p><strong>Tipo:</strong> {test.contentType}</p>}
              {test.size && <p><strong>Tamaño:</strong> {(parseInt(test.size) / 1024 / 1024).toFixed(2)} MB</p>}
              {test.error && <p><strong>Error:</strong> {test.error}</p>}
            </div>
          ))}
        </div>

        {/* Test de Video */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-lg text-blue-400 mb-2">🎥 Test de Reproducción</h2>
          {debugInfo.fileTests?.filter((test: FileTest) => test.accessible).map((test: FileTest, index: number) => (
            <div key={index} className="mb-4">
              <p className="mb-2"><strong>Probando:</strong> {test.name}</p>
              <video 
                controls 
                width="400" 
                height="225"
                className="border border-gray-600"
                onError={(e) => console.error('Error en video:', e)}
                onLoadStart={() => console.log('Video cargando:', test.name)}
                onCanPlay={() => console.log('Video listo:', test.name)}
              >
                <source src={test.url} type={test.contentType || 'video/mp4'} />
                Tu navegador no soporta el elemento video.
              </video>
            </div>
          ))}
        </div>

        {/* Información del Navegador */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-lg text-blue-400 mb-2">🌐 Información del Navegador</h2>
          <p><strong>User Agent:</strong> {navigator.userAgent}</p>
          <p><strong>Idioma:</strong> {navigator.language}</p>
          <p><strong>Plataforma:</strong> {navigator.platform}</p>
          <p><strong>Cookies Habilitadas:</strong> {navigator.cookieEnabled ? 'Sí' : 'No'}</p>
        </div>

        {/* Botones de Acción */}
        <div className="bg-gray-900 p-4 rounded">
          <h2 className="text-lg text-blue-400 mb-2">🔧 Acciones</h2>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()} 
              className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 Recargar Página
            </button>
            <button 
              onClick={() => window.open(`/screen/${id}`, '_blank')} 
              className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
            >
              📺 Abrir Pantalla Normal
            </button>
            <button 
              onClick={() => window.open(`/debug-videos`, '_blank')} 
              className="bg-purple-600 px-4 py-2 rounded hover:bg-purple-700"
            >
              🎬 Debug Videos Global
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
