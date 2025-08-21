'use client';

import { useState, useEffect } from 'react';

interface ConnectivityTest {
  server: {
    host: string;
    port: number;
    interfaces: Array<{
      name: string;
      address: string;
      isPrivate: boolean;
    }>;
    primaryIP: string;
  };
  client: {
    ip: string;
    userAgent: string;
  };
  connectivity: {
    testUrls: Array<{
      interface: string;
      ip: string;
      url: string;
      testEndpoint: string;
      screenUrl: string;
      isPrivate: boolean;
    }>;
    recommendations: Array<{
      type: string;
      title: string;
      description: string;
      action: string;
    }>;
  };
  troubleshooting: any;
}

interface TestResult {
  url: string;
  status: 'testing' | 'success' | 'error';
  responseTime?: number;
  error?: string;
  statusCode?: number;
}

export default function TestConnectivity() {
  const [connectivityInfo, setConnectivityInfo] = useState<ConnectivityTest | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [loading, setLoading] = useState(true);
  const [autoTest, setAutoTest] = useState(false);

  useEffect(() => {
    loadConnectivityInfo();
  }, []);

  useEffect(() => {
    if (autoTest && connectivityInfo) {
      const interval = setInterval(() => {
        testAllUrls();
      }, 10000); // Test cada 10 segundos

      return () => clearInterval(interval);
    }
  }, [autoTest, connectivityInfo]);

  const loadConnectivityInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/network/test-connectivity');
      if (response.ok) {
        const data = await response.json();
        setConnectivityInfo(data);
      }
    } catch (error) {
      console.error('Error loading connectivity info:', error);
    } finally {
      setLoading(false);
    }
  };

  const testUrl = async (testEndpoint: string, ip: string) => {
    const startTime = Date.now();
    
    setTestResults(prev => ({
      ...prev,
      [ip]: { url: testEndpoint, status: 'testing' }
    }));

    try {
      const response = await fetch(testEndpoint, {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache'
      });

      const responseTime = Date.now() - startTime;

      setTestResults(prev => ({
        ...prev,
        [ip]: {
          url: testEndpoint,
          status: response.ok ? 'success' : 'error',
          responseTime,
          statusCode: response.status
        }
      }));

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      setTestResults(prev => ({
        ...prev,
        [ip]: {
          url: testEndpoint,
          status: 'error',
          responseTime,
          error: error instanceof Error ? error.message : 'Error desconocido'
        }
      }));
    }
  };

  const testAllUrls = () => {
    if (!connectivityInfo) return;
    
    connectivityInfo.connectivity.testUrls.forEach(urlInfo => {
      testUrl(urlInfo.testEndpoint, urlInfo.ip);
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getStatusIcon = (status: 'testing' | 'success' | 'error') => {
    switch (status) {
      case 'testing': return '⏳';
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '🔍';
    }
  };

  const getStatusColor = (status: 'testing' | 'success' | 'error') => {
    switch (status) {
      case 'testing': return 'text-yellow-600 bg-yellow-50';
      case 'success': return 'text-green-600 bg-green-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando información de conectividad...</p>
        </div>
      </div>
    );
  }

  if (!connectivityInfo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error al cargar información de conectividad</p>
          <button 
            onClick={loadConnectivityInfo}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">🔍 Prueba de Conectividad VLAN</h1>
          <p className="text-gray-600 mb-4">
            Diagnóstico en tiempo real para acceso desde diferentes VLANs
          </p>
          
          <div className="flex gap-4 flex-wrap">
            <button 
              onClick={loadConnectivityInfo}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              🔄 Actualizar Info
            </button>
            <button 
              onClick={testAllUrls}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              🧪 Probar Todas las URLs
            </button>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={autoTest}
                onChange={(e) => setAutoTest(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm">Auto-test cada 10s</span>
            </label>
          </div>
        </div>

        {/* Información del Cliente */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">📱 Tu Información</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Tu IP:</strong> {connectivityInfo.client.ip}</p>
              <p><strong>Navegador:</strong> {connectivityInfo.client.userAgent.split(' ')[0]}</p>
            </div>
            <div>
              <p><strong>Servidor:</strong> {connectivityInfo.server.primaryIP}:{connectivityInfo.server.port}</p>
              <p><strong>Interfaces:</strong> {connectivityInfo.server.interfaces.length}</p>
            </div>
          </div>
        </div>

        {/* Pruebas de Conectividad */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🌐 Pruebas de Conectividad</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Interface</th>
                  <th className="px-4 py-2 text-left">IP</th>
                  <th className="px-4 py-2 text-left">Tipo</th>
                  <th className="px-4 py-2 text-left">Estado</th>
                  <th className="px-4 py-2 text-left">Tiempo</th>
                  <th className="px-4 py-2 text-left">URL Pantalla</th>
                  <th className="px-4 py-2 text-left">Acción</th>
                </tr>
              </thead>
              <tbody>
                {connectivityInfo.connectivity.testUrls.map((urlInfo, index) => {
                  const result = testResults[urlInfo.ip];
                  return (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2">{urlInfo.interface}</td>
                      <td className="px-4 py-2 font-mono">{urlInfo.ip}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded text-sm ${
                          urlInfo.isPrivate ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                        }`}>
                          {urlInfo.isPrivate ? 'Privada' : 'Pública'}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {result ? (
                          <span className={`px-2 py-1 rounded text-sm ${getStatusColor(result.status)}`}>
                            {getStatusIcon(result.status)} {result.status}
                            {result.statusCode && ` (${result.statusCode})`}
                          </span>
                        ) : (
                          <span className="text-gray-500">No probado</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        {result?.responseTime ? `${result.responseTime}ms` : '-'}
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => copyToClipboard(urlInfo.screenUrl)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-mono"
                          title="Clic para copiar"
                        >
                          {urlInfo.screenUrl.replace('http://', '')}
                        </button>
                      </td>
                      <td className="px-4 py-2">
                        <button
                          onClick={() => testUrl(urlInfo.testEndpoint, urlInfo.ip)}
                          className="bg-green-600 text-white px-2 py-1 rounded text-sm hover:bg-green-700 mr-2"
                        >
                          🧪 Test
                        </button>
                        <button
                          onClick={() => window.open(urlInfo.screenUrl, '_blank')}
                          className="bg-blue-600 text-white px-2 py-1 rounded text-sm hover:bg-blue-700"
                        >
                          🚀 Abrir
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">💡 Recomendaciones</h2>
          <div className="space-y-4">
            {connectivityInfo.connectivity.recommendations.map((rec, index) => (
              <div key={index} className="border border-gray-200 rounded p-4">
                <h3 className="font-medium text-gray-900 mb-2">{rec.title}</h3>
                <p className="text-gray-700 mb-2">{rec.description}</p>
                <div className="bg-gray-50 p-2 rounded">
                  <code className="text-sm">{rec.action}</code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Solución de Problemas */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">🔧 Solución de Problemas</h2>
          
          {Object.entries(connectivityInfo.troubleshooting).map(([category, steps]: [string, any]) => (
            <div key={category} className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3 capitalize">{category}</h3>
              {Array.isArray(steps) ? (
                <div className="space-y-3">
                  {steps.map((step: any, index: number) => (
                    <div key={index} className="border border-gray-200 rounded p-3">
                      <div className="font-medium text-gray-800">{step.step || step.description}</div>
                      {step.command && (
                        <div className="mt-2">
                          <code className="block p-2 bg-gray-800 text-green-400 rounded text-sm">
                            {step.command}
                          </code>
                        </div>
                      )}
                      {step.expected && (
                        <div className="mt-1 text-sm text-gray-600">
                          <strong>Esperado:</strong> {step.expected}
                        </div>
                      )}
                      {step.action && (
                        <div className="mt-1 text-sm text-blue-600">
                          <strong>Acción:</strong> {step.action}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-700">{steps}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
