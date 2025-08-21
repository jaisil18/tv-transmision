'use client';

import { useEffect, useState, use } from 'react';

interface PageParams {
  params: Promise<{ id: string }>;
}

export default function DebugScreen({ params }: PageParams) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        console.log(`🔍 Debugging pantalla ${id}`);
        
        // Obtener información de la pantalla
        const screenResponse = await fetch(`/api/screens/${id}`);
        const screenData = await screenResponse.json();
        
        // Obtener contenido asignado
        const contentResponse = await fetch(`/api/screens/${id}/content`);
        const contentData = await contentResponse.json();
        
        // Obtener información RTSP
        const rtspResponse = await fetch(`/api/screens/${id}/rtsp-stream`);
        const rtspData = await rtspResponse.json();
        
        setDebugInfo({
          screen: screenData,
          content: contentData,
          rtsp: rtspData,
          timestamp: new Date().toISOString()
        });
        
      } catch (error) {
        console.error('Error en debug:', error);
        setDebugInfo({ error: error instanceof Error ? error.message : 'Error desconocido' });
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <h1 className="text-2xl mb-4">🔍 Diagnosticando Pantalla {id}</h1>
        <p>Cargando información...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <h1 className="text-2xl mb-6">🔍 Diagnóstico de Pantalla {id}</h1>
      
      <div className="space-y-6">
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">📱 Información de Pantalla</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugInfo?.screen, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">📋 Contenido Asignado</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugInfo?.content, null, 2)}
          </pre>
        </div>
        
        <div className="bg-gray-800 p-4 rounded">
          <h2 className="text-xl mb-2">📡 Stream RTSP</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(debugInfo?.rtsp, null, 2)}
          </pre>
        </div>
        
        <div className="bg-blue-800 p-4 rounded">
          <h2 className="text-xl mb-2">🔗 Enlaces de Prueba</h2>
          <div className="space-y-2">
            <a 
              href={`/screen/${id}`}
              className="block text-blue-300 hover:text-blue-100"
              target="_blank"
            >
              ➡️ Ir a Pantalla Normal: /screen/{id}
            </a>
            <a 
              href={`/api/screens/${id}/content`}
              className="block text-green-300 hover:text-green-100"
              target="_blank"
            >
              ➡️ Ver API de Contenido: /api/screens/{id}/content
            </a>
            <a 
              href={`/api/screens/${id}/rtsp-stream`}
              className="block text-yellow-300 hover:text-yellow-100"
              target="_blank"
            >
              ➡️ Ver API RTSP: /api/screens/{id}/rtsp-stream
            </a>
          </div>
        </div>
        
        {debugInfo?.error && (
          <div className="bg-red-800 p-4 rounded">
            <h2 className="text-xl mb-2">❌ Error</h2>
            <p>{debugInfo.error}</p>
          </div>
        )}
      </div>
      
      <div className="mt-8 text-sm text-gray-400">
        Generado: {debugInfo?.timestamp}
      </div>
    </div>
  );
}
