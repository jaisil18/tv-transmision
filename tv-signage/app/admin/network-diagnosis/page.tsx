'use client';

import { useState, useEffect } from 'react';

interface NetworkInfo {
  server: {
    currentPort: number;
    host: string;
    interfaces: Array<{
      name: string;
      address: string;
      netmask: string;
      isPrivate: boolean;
      networkType: string;
    }>;
    primaryIP: string;
  };
  client: {
    ip: string;
    userAgent: string;
    isMobile: boolean;
    isAndroid: boolean;
    isIOS: boolean;
    sameNetwork: boolean;
  };
  urls: {
    current: string;
    suggested: Array<{ ip: string; url: string; isPrivate: boolean }>;
    best: string | null;
    local: string;
    network: string;
    external: string;
  };
  access: {
    instructions: any;
    troubleshooting: any;
  };
  timestamp: string;
}

export default function NetworkDiagnosis() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'testing' | 'success' | 'error'>>({});

  useEffect(() => {
    loadNetworkInfo();
  }, []);

  const loadNetworkInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/network/detect');
      if (response.ok) {
        const data = await response.json();
        setNetworkInfo(data);
      } else {
        setError('Error al cargar información de red');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const testConnectivity = async (url: string, type: string) => {
    try {
      setTestResults((prev: Record<string, 'testing' | 'success' | 'error'>) => ({ ...prev, [type]: 'testing' }));

      const response = await fetch(url + '/api/public/settings');
      if (response.ok) {
        setTestResults((prev: Record<string, 'testing' | 'success' | 'error'>) => ({ ...prev, [type]: 'success' }));
      } else {
        setTestResults((prev: Record<string, 'testing' | 'success' | 'error'>) => ({ ...prev, [type]: 'error' }));
      }
    } catch (err) {
      setTestResults((prev: Record<string, 'testing' | 'success' | 'error'>) => ({ ...prev, [type]: 'error' }));
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Detectando configuración de red...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <strong>Error:</strong> {error}
            <button 
              onClick={loadNetworkInfo}
              className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!networkInfo) return null;

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🌐 Diagnóstico de Red</h1>
          <p className="text-gray-600">
            Información detallada sobre la configuración de red y acceso desde otras VLANs
          </p>
          <div className="mt-4 flex gap-4">
            <button 
              onClick={loadNetworkInfo}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Información del Servidor */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🖥️ Información del Servidor</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Host:</strong> {networkInfo.server.host}</p>
              <p><strong>Puerto:</strong> {networkInfo.server.currentPort}</p>
              <p><strong>IP Principal:</strong> {networkInfo.server.primaryIP}</p>
            </div>
            <div>
              <p><strong>Interfaces de Red:</strong> {networkInfo.server.interfaces.length}</p>
              <p><strong>Última actualización:</strong> {new Date(networkInfo.timestamp).toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📱 Información del Cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>IP:</strong> {networkInfo.client.ip}</p>
              <p><strong>Misma Red:</strong> 
                <span className={`ml-2 px-2 py-1 rounded text-sm ${
                  networkInfo.client.sameNetwork ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {networkInfo.client.sameNetwork ? '✅ Sí' : '❌ No'}
                </span>
              </p>
            </div>
            <div>
              <p><strong>Dispositivo:</strong> 
                {networkInfo.client.isMobile ? ' 📱 Móvil' : ' 💻 Desktop'}
                {networkInfo.client.isAndroid && ' (Android)'}
                {networkInfo.client.isIOS && ' (iOS)'}
              </p>
            </div>
          </div>
        </div>

        {/* Interfaces de Red */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🌐 Interfaces de Red Detectadas</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Nombre</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Máscara</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">URL</th>
                  <th className="px-4 py-2 text-left">Test</th>
                </tr>
              </thead>
              <tbody>
                {networkInfo.server.interfaces.map((iface, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2">{iface.name}</td>
                    <td className="px-4 py-2 font-mono">{iface.address}</td>
                    <td className="px-4 py-2 font-mono">{iface.netmask}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        iface.isPrivate ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                      }`}>
                        {iface.isPrivate ? 'Privada' : 'Pública'}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => copyToClipboard(`http://${iface.address}:${networkInfo.server.currentPort}/screen/1750056135868`)}
                        className="text-blue-600 hover:text-blue-800 font-mono text-sm"
                        title="Clic para copiar"
                      >
                        http://{iface.address}:{networkInfo.server.currentPort}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={() => testConnectivity(`http://${iface.address}:${networkInfo.server.currentPort}`, iface.address)}
                        className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700"
                      >
                        {testResults[iface.address] === 'testing' ? '⏳' : 
                         testResults[iface.address] === 'success' ? '✅' : 
                         testResults[iface.address] === 'error' ? '❌' : '🧪'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* URLs de Acceso */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🔗 URLs de Acceso</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900">URL Recomendada:</h3>
              <div className="mt-1 p-3 bg-green-50 border border-green-200 rounded">
                <code className="text-green-800">
                  {networkInfo.urls.best || networkInfo.urls.network}/screen/1750056135868
                </code>
                <button
                  onClick={() => copyToClipboard((networkInfo.urls.best || networkInfo.urls.network) + '/screen/1750056135868')}
                  className="ml-2 text-green-600 hover:text-green-800"
                  title="Copiar URL"
                >
                  📋
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Otras URLs Disponibles:</h3>
              <div className="mt-1 space-y-2">
                <div className="p-2 bg-gray-50 rounded">
                  <strong>Local:</strong> <code>{networkInfo.urls.local}/screen/[SCREEN_ID]</code>
                </div>
                <div className="p-2 bg-gray-50 rounded">
                  <strong>Red:</strong> <code>{networkInfo.urls.network}/screen/[SCREEN_ID]</code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instrucciones de Acceso */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📋 Instrucciones de Acceso</h2>
          
          {Object.entries(networkInfo.access.instructions).map(([key, instruction]: [string, any]) => (
            <div key={key} className="mb-6 p-4 border border-gray-200 rounded">
              <h3 className="font-medium text-gray-900 mb-2">{instruction.description}</h3>
              <div className="mb-2">
                <strong>URL:</strong> 
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded">{instruction.url}</code>
              </div>
              {instruction.example && (
                <div className="mb-2">
                  <strong>Ejemplo:</strong> 
                  <code className="ml-2 px-2 py-1 bg-blue-100 rounded">{instruction.example}</code>
                </div>
              )}
              {instruction.steps && (
                <div>
                  <strong>Pasos:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-1">
                    {instruction.steps.map((step: string, index: number) => (
                      <li key={index} className="text-gray-700">{step}</li>
                    ))}
                  </ol>
                </div>
              )}
              {instruction.requirements && (
                <div>
                  <strong>Requisitos:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    {instruction.requirements.map((req: string, index: number) => (
                      <li key={index} className="text-gray-700">{req}</li>
                    ))}
                  </ul>
                </div>
              )}
              {instruction.testCommand && (
                <div className="mt-2">
                  <strong>Comando de prueba:</strong>
                  <code className="block mt-1 p-2 bg-gray-800 text-green-400 rounded">{instruction.testCommand}</code>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Solución de Problemas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Solución de Problemas</h2>
          
          {Object.entries(networkInfo.access.troubleshooting).map(([category, items]: [string, any]) => (
            <div key={category} className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 capitalize">{category}</h3>
              {Array.isArray(items) ? (
                <ul className="list-disc list-inside space-y-1">
                  {items.map((item: any, index: number) => (
                    <li key={index} className="text-gray-700">
                      {typeof item === 'string' ? item : (
                        <div>
                          <strong>{item.step}:</strong>
                          <code className="block mt-1 p-2 bg-gray-800 text-green-400 rounded text-sm">{item.command}</code>
                          <span className="text-sm text-gray-600">{item.description}</span>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-gray-700">{items}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
