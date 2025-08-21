import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSystemSettings } from '@/hooks/useSystemSettings';

interface MosaicManagerProps {
  screenId: string;
  screenName?: string;
}

const MosaicManager: React.FC<MosaicManagerProps> = ({ screenId, screenName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const router = useRouter();
  const { settings } = useSystemSettings();

  // Función para mostrar un mensaje temporal
  const showMessage = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  // Función para enviar comando de mosaico
  const sendMosaicCommand = useCallback(async (action: 'toggle' | 'show' | 'hide') => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/screens/${screenId}/toggle-mosaic`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          source: 'admin'
        })
      });

      if (!response.ok) {
        throw new Error(`Error al enviar comando: ${response.status}`);
      }

      const data = await response.json();
      showMessage(`Comando de mosaico enviado: ${action}`, 'success');
    } catch (error) {
      console.error('Error al enviar comando de mosaico:', error);
      showMessage(`Error al enviar comando: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [screenId, showMessage]);

  // Función para ir a la página de gestión de archivos de mosaico
  const goToMosaicFiles = useCallback(() => {
    router.push(`/admin/screens/${screenId}/mosaics`);
  }, [router, screenId]);

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 flex items-center gap-2">
        <span>🖼️</span> Gestión de Mosaicos
        {screenName && <span className="text-sm font-normal text-gray-500">({screenName})</span>}
      </h2>

      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' ? 'bg-green-100 text-green-800' :
          message.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            onClick={() => sendMosaicCommand('toggle')}
            disabled={isLoading}
            className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              <span>🔄</span>
            )}
            Alternar Mosaicos
          </button>

          <button
            onClick={() => sendMosaicCommand('show')}
            disabled={isLoading}
            className="bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              <span>👁️</span>
            )}
            Mostrar Mosaicos
          </button>

          <button
            onClick={() => sendMosaicCommand('hide')}
            disabled={isLoading}
            className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
            ) : (
              <span>🚫</span>
            )}
            Ocultar Mosaicos
          </button>
        </div>

        <div className="border-t pt-4 mt-2">
          <button
            onClick={goToMosaicFiles}
            className="bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2 w-full"
          >
            <span>📁</span>
            Gestionar Archivos de Mosaico
          </button>
        </div>

        <div className="text-sm text-gray-500 mt-2">
          <p>Los mosaicos permiten mostrar contenido adicional en las esquinas de la pantalla mientras se reproduce el contenido principal.</p>
          <p className="mt-1">Para que funcione correctamente, debe subir archivos a la carpeta de mosaicos de esta pantalla.</p>
        </div>
      </div>
    </div>
  );
};

export default MosaicManager;