import React, { useState, useCallback } from 'react';
import { Grid2X2, FolderOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Screen {
  id: string;
  name: string;
  status: 'active' | 'inactive';
}

interface MosaicToggleProps {
  screenIds: string[];
  screens?: Screen[];
  disabled?: boolean;
  className?: string;
}

const MosaicToggle: React.FC<MosaicToggleProps> = ({ 
  screenIds, 
  screens = [],
  disabled = false,
  className = ''
}) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Función para mostrar un mensaje temporal
  const showMessage = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  // Función para enviar comando de mosaico a múltiples pantallas
  const sendMosaicCommand = useCallback(async (action: 'toggle' | 'show' | 'hide') => {
    if (!screenIds.length) {
      showMessage('No hay pantallas seleccionadas', 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      // Crear un array de promesas para enviar el comando a todas las pantallas seleccionadas
      const promises = screenIds.map(screenId => 
        fetch(`/api/screens/${screenId}/toggle-mosaic`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action,
            source: 'playlist'
          })
        })
      );

      // Esperar a que todas las promesas se resuelvan
      const results = await Promise.allSettled(promises);
      
      // Contar éxitos y fallos
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.length - successful;

      if (failed === 0) {
        showMessage(`Comando de mosaico enviado a ${successful} pantalla(s)`, 'success');
      } else {
        showMessage(`Comando enviado a ${successful} pantalla(s), ${failed} fallaron`, 'info');
      }
    } catch (error) {
      console.error('Error al enviar comandos de mosaico:', error);
      showMessage(`Error al enviar comandos: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [screenIds, showMessage]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-4 ${className}`}>
      <h2 className="text-lg font-semibold mb-3 text-gray-800 flex items-center gap-2">
        <Grid2X2 className="h-5 w-5" />
        Control de Mosaicos
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

      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => sendMosaicCommand('toggle')}
          disabled={isLoading || disabled || !screenIds.length}
          className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
          ) : (
            <span>🔄</span>
          )}
          Alternar
        </button>

        <button
          onClick={() => sendMosaicCommand('show')}
          disabled={isLoading || disabled || !screenIds.length}
          className="bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
          ) : (
            <span>👁️</span>
          )}
          Mostrar
        </button>

        <button
          onClick={() => sendMosaicCommand('hide')}
          disabled={isLoading || disabled || !screenIds.length}
          className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {isLoading ? (
            <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
          ) : (
            <span>🚫</span>
          )}
          Ocultar
        </button>
      </div>

      {!screenIds.length && (
        <p className="text-sm text-gray-500 mt-3">
          Selecciona al menos una pantalla para controlar los mosaicos.
        </p>
      )}

      {screenIds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Gestión de Archivos</h3>
          
          {screenIds.length === 1 ? (
            <button
              onClick={() => router.push(`/admin/screens/${screenIds[0]}/mosaics`)}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <FolderOpen className="h-4 w-4" />
              Gestionar Archivos de Mosaico
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 mb-2">
                Hay {screenIds.length} pantallas seleccionadas. Seleccione una pantalla específica para gestionar sus archivos de mosaico:
              </p>
              <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                {screenIds.map(screenId => {
                  // Buscar el nombre de la pantalla si está disponible
                  const screen = screens.find(s => s.id === screenId);
                  const screenName = screen ? screen.name : `Pantalla ${screenId}`;
                  
                  return (
                    <button
                      key={screenId}
                      onClick={() => router.push(`/admin/screens/${screenId}/mosaics`)}
                      className="w-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 py-1 px-2 rounded-md transition-colors flex items-center justify-left gap-1 text-xs"
                    >
                      <FolderOpen className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{screenName}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-3">
        <p>Los mosaicos permiten mostrar contenido adicional en las esquinas de la pantalla mientras se reproduce el contenido principal.</p>
        <p className="mt-1">Para que funcione correctamente, debe subir archivos a la carpeta de mosaicos de cada pantalla.</p>
      </div>
    </div>
  );
};

export default MosaicToggle;