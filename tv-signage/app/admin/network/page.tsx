'use client';

import { useState, useEffect } from 'react';
import { Save, RefreshCw, AlertCircle, CheckCircle, Server, Globe } from 'lucide-react';
import NetworkStatus from '@/components/NetworkStatus';
import { getURLConfig } from '@/lib/url-config';

interface NetworkConfig {
  serverUrl: string;
  serverPort: number;
  rtspPort: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  autoDetectPort: boolean;
  preferredPorts: number[];
}

export default function NetworkConfigPage() {
  const [config, setConfig] = useState<NetworkConfig>({
    serverUrl: 'http://localhost',
    serverPort: 3000,
    rtspPort: 8554,
    heartbeatInterval: 30,
    connectionTimeout: 10,
    autoDetectPort: true,
    preferredPorts: [3000, 3001, 8080]
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null);
  const [urlConfig, setUrlConfig] = useState(getURLConfig());

  // Cargar configuración actual
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await fetch('/api/system/network');
        if (response.ok) {
          const data = await response.json();
          setConfig({
            serverUrl: data.serverUrl || 'http://localhost',
            serverPort: data.serverPort || 3000,
            rtspPort: data.rtspPort || 8554,
            heartbeatInterval: data.heartbeatInterval || 30,
            connectionTimeout: data.connectionTimeout || 10,
            autoDetectPort: data.autoDetectPort !== false,
            preferredPorts: data.preferredPorts || [3000, 3001, 8080]
          });
        }
      } catch (error) {
        console.error('Error al cargar configuración:', error);
        setMessage({ type: 'error', text: 'Error al cargar la configuración de red' });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  // Guardar configuración
  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/system/network', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: result.message });
        
        // Actualizar configuración de URLs
        setUrlConfig(getURLConfig(true));
        
        if (result.requiresRestart) {
          setMessage({ 
            type: 'warning', 
            text: 'Configuración guardada. Se requiere reiniciar el servidor para aplicar cambios de puerto.' 
          });
        }
      } else {
        setMessage({ type: 'error', text: result.error || 'Error al guardar configuración' });
      }
    } catch (error) {
      console.error('Error al guardar:', error);
      setMessage({ type: 'error', text: 'Error de conexión al guardar configuración' });
    } finally {
      setSaving(false);
    }
  };

  // Detectar puerto automáticamente
  const handleAutoDetect = () => {
    const detectedPort = typeof window !== 'undefined' ? 
      parseInt(window.location.port) || 3000 : 3000;
    
    setConfig(prev => ({
      ...prev,
      serverPort: detectedPort
    }));
    
    setMessage({ 
      type: 'success', 
      text: `Puerto detectado automáticamente: ${detectedPort}` 
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <RefreshCw className="h-6 w-6 text-blue-500 animate-spin" />
            <h1 className="text-2xl font-bold text-gray-900">Configuración de Red</h1>
          </div>
          <p className="text-gray-600">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold text-gray-900">Configuración de Red</h1>
          </div>
          
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            {saving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>

        {/* Mensaje de estado */}
        {message && (
          <div className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
            message.type === 'warning' ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' :
            'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {message.type === 'warning' && <AlertCircle className="h-5 w-5" />}
            {message.type === 'error' && <AlertCircle className="h-5 w-5" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Estado actual de la red */}
        <NetworkStatus />

        {/* Configuración del servidor web */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Server className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900">Servidor Web</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL del Servidor
              </label>
              <input
                type="text"
                value={config.serverUrl}
                onChange={(e) => setConfig(prev => ({ ...prev, serverUrl: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="http://localhost"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puerto del Servidor
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={config.serverPort}
                  onChange={(e) => setConfig(prev => ({ ...prev, serverPort: parseInt(e.target.value) || 3000 }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="1"
                  max="65535"
                />
                <button
                  onClick={handleAutoDetect}
                  className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                  title="Detectar puerto actual"
                >
                  Auto
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Configuración RTSP */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-5 w-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900">Servidor RTSP</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Puerto RTSP
              </label>
              <input
                type="number"
                value={config.rtspPort}
                onChange={(e) => setConfig(prev => ({ ...prev, rtspPort: parseInt(e.target.value) || 8554 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="65535"
              />
              <p className="text-xs text-gray-500 mt-1">Puerto estándar para streams RTSP: 8554</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL RTSP Actual
              </label>
              <div className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg font-mono text-sm">
                rtsp://localhost:{config.rtspPort}/live/screen_[id]
              </div>
            </div>
          </div>
        </div>

        {/* Configuración de conexión */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Configuración de Conexión</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Intervalo de Heartbeat (segundos)
              </label>
              <input
                type="number"
                value={config.heartbeatInterval}
                onChange={(e) => setConfig(prev => ({ ...prev, heartbeatInterval: parseInt(e.target.value) || 30 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="5"
                max="300"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timeout de Conexión (segundos)
              </label>
              <input
                type="number"
                value={config.connectionTimeout}
                onChange={(e) => setConfig(prev => ({ ...prev, connectionTimeout: parseInt(e.target.value) || 10 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="1"
                max="60"
              />
            </div>
          </div>
        </div>

        {/* URLs de acceso */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">URLs de Acceso</h2>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Administración:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{urlConfig.baseUrl}/admin</code>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">API:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{urlConfig.apiUrl}</code>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Pantallas:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{urlConfig.screenUrl}/[id]</code>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-600">RTSP:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{urlConfig.rtspUrl}/live/screen_[id]</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
