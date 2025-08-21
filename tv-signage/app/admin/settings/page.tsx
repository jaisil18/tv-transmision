'use client';

import { Settings, Save, Clock, Wifi, AlertTriangle, Calendar, CheckCircle, XCircle, Server, Globe, Link, Database, Monitor, Key, Eye, EyeOff } from 'lucide-react';
import PageLayout from '@/components/PageLayout';
import NetworkRestartNotification from '@/components/NetworkRestartNotification';
import { useState, useEffect } from 'react';

interface SystemSettings {
  systemName: string;
  timezone: string;
  serverUrl: string;
  serverPort: number;
  heartbeatInterval: number;
  connectionTimeout: number;
  transitionTime: number;
  defaultVolume: number;
  autoUpdate: boolean;
  operatingHours: {
    enabled: boolean;
    monday: { start: string; end: string; enabled: boolean };
    tuesday: { start: string; end: string; enabled: boolean };
    wednesday: { start: string; end: string; enabled: boolean };
    thursday: { start: string; end: string; enabled: boolean };
    friday: { start: string; end: string; enabled: boolean };
    saturday: { start: string; end: string; enabled: boolean };
    sunday: { start: string; end: string; enabled: boolean };
  };
  emergency: {
    enabled: boolean;
    message: string;
    backgroundColor: string;
    textColor: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    autoHide: boolean;
    hideAfter: number;
  };
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showNetworkRestart, setShowNetworkRestart] = useState(false);
  const [restartInstructions, setRestartInstructions] = useState<any>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Cargar configuraciones al montar el componente
  useEffect(() => {
    loadSettings();
    loadNetworkInfo();
  }, []);

  const loadNetworkInfo = async () => {
    try {
      const response = await fetch('/api/system/network');
      if (response.ok) {
        const data = await response.json();
        setNetworkInfo(data);
      }
    } catch (error) {
      console.error('Error al cargar información de red:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(passwordData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: 'Contraseña cambiada exitosamente' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordChange(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Error al cambiar contraseña' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setSaving(false);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      } else {
        throw new Error('Error al cargar configuraciones');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error al cargar las configuraciones' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    setMessage(null);

    try {
      // Primero guardar configuraciones generales
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (response.ok) {
        setSettings(data.settings);

        // Verificar si hay cambios de red que requieren reinicio
        const networkResponse = await fetch('/api/system/network', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            serverUrl: settings.serverUrl,
            serverPort: settings.serverPort,
            heartbeatInterval: settings.heartbeatInterval,
            connectionTimeout: settings.connectionTimeout,
          }),
        });

        const networkData = await networkResponse.json();

        if (networkData.requiresRestart) {
          setRestartInstructions(networkData.restartInstructions);
          setShowNetworkRestart(true);
          setMessage({ type: 'success', text: networkData.message });
        } else {
          setMessage({ type: 'success', text: 'Configuraciones guardadas y aplicadas exitosamente' });
        }
      } else {
        throw new Error(data.error || 'Error al guardar');
      }
    } catch (error) {
      console.error('Error:', error);
      setMessage({ type: 'error', text: 'Error al guardar las configuraciones' });
    } finally {
      setSaving(false);
    }
  };

  const handleNetworkRestartCompleted = async () => {
    try {
      await fetch('/api/system/network', {
        method: 'PUT',
      });
      setMessage({ type: 'success', text: 'Configuración de red aplicada correctamente' });
    } catch (error) {
      console.error('Error al marcar reinicio como completado:', error);
    }
  };

  const updateSettings = (updates: Partial<SystemSettings>) => {
    if (settings) {
      setSettings({ ...settings, ...updates });
    }
  };

  const updateOperatingHours = (updates: Partial<SystemSettings['operatingHours']>) => {
    if (settings) {
      setSettings({
        ...settings,
        operatingHours: { ...settings.operatingHours, ...updates }
      });
    }
  };

  const updateEmergency = (updates: Partial<SystemSettings['emergency']>) => {
    if (settings) {
      setSettings({
        ...settings,
        emergency: { ...settings.emergency, ...updates }
      });
    }
  };

  const actions = (
    <div className="flex items-center gap-3">
      {message && (
        <div className={`flex items-center gap-2 px-3 py-1 rounded-md text-sm ${
          message.type === 'success'
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <span>{message.text}</span>
        </div>
      )}
      <button
        onClick={handleSave}
        disabled={saving || !settings}
        className="flex items-center gap-2 rounded-lg bg-uct-primary px-6 py-2 text-white transition-colors hover:bg-uct-primary/90 shadow-uct disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Save className="h-5 w-5" />
        <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
        <span className="sm:hidden">{saving ? 'Guardando...' : 'Guardar'}</span>
      </button>
    </div>
  );

  if (loading) {
    return (
      <PageLayout title="Configuración" actions={null}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-uct-primary mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando configuraciones...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!settings) {
    return (
      <PageLayout title="Configuración" actions={null}>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-gray-600">Error al cargar las configuraciones</p>
            <button
              onClick={loadSettings}
              className="mt-4 px-4 py-2 bg-uct-primary text-white rounded-lg hover:bg-uct-primary/90"
            >
              Reintentar
            </button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Configuración" actions={actions}>
      <div className="space-y-8">

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {/* Configuración General */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-uct-primary/10 p-2">
              <Settings className="h-5 w-5 text-uct-primary" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">General</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Nombre del Sistema
              </label>
              <input
                type="text"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-uct-primary focus:outline-none focus:ring-1 focus:ring-uct-primary"
                value={settings.systemName}
                onChange={(e) => updateSettings({ systemName: e.target.value })}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Zona Horaria
              </label>
              <select
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-uct-primary focus:outline-none focus:ring-1 focus:ring-uct-primary"
                value={settings.timezone}
                onChange={(e) => updateSettings({ timezone: e.target.value })}
              >
                <option value="America/Lima">América/Lima (Perú)</option>
                <option value="America/Bogota">América/Bogotá (Colombia)</option>
                <option value="America/Mexico_City">América/Ciudad de México</option>
                <option value="America/Guatemala">América/Guatemala</option>
              </select>
            </div>
          </div>
        </div>



        {/* Configuración de Red */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-uct-accent/10 p-2">
                <Wifi className="h-5 w-5 text-uct-accent" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Red y Conectividad</h2>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">Puerto actual: {typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}</span>
            </div>
          </div>

          <div className="space-y-6">
            {/* Advertencia si el puerto configurado es diferente al actual */}
            {typeof window !== 'undefined' && settings.serverPort !== parseInt(window.location.port || '3000') && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800 mb-1">
                      Puerto Diferente Detectado
                    </h4>
                    <p className="text-sm text-orange-700">
                      El puerto configurado ({settings.serverPort}) es diferente al puerto actual ({window.location.port || '3000'}).
                      Se requerirá reiniciar el servidor para aplicar los cambios.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                URL del Servidor
              </label>
              <input
                type="url"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-uct-primary focus:outline-none focus:ring-1 focus:ring-uct-primary"
                value={settings.serverUrl}
                onChange={(e) => updateSettings({ serverUrl: e.target.value })}
                placeholder="http://192.168.1.100"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Puerto del Servidor
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-uct-primary focus:outline-none focus:ring-1 focus:ring-uct-primary"
                value={settings.serverPort}
                onChange={(e) => updateSettings({ serverPort: parseInt(e.target.value) || 0 })}
                min="1"
                max="65535"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Intervalo de Heartbeat (segundos)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-uct-primary focus:outline-none focus:ring-1 focus:ring-uct-primary"
                value={settings.heartbeatInterval}
                onChange={(e) => updateSettings({ heartbeatInterval: parseInt(e.target.value) || 0 })}
                min="5"
                max="300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Timeout de Conexión (segundos)
              </label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-uct-primary focus:outline-none focus:ring-1 focus:ring-uct-primary"
                value={settings.connectionTimeout}
                onChange={(e) => updateSettings({ connectionTimeout: parseInt(e.target.value) || 0 })}
                min="5"
                max="60"
              />
            </div>
          </div>
        </div>

        {/* Seguridad y Contraseña */}
        <div className="rounded-xl bg-white p-6 shadow-lg border-l-4 border-orange-500">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <Key className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Seguridad</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-orange-50 p-4 border border-orange-200">
              <div>
                <h3 className="font-medium text-gray-800">Cambiar Contraseña</h3>
                <p className="text-sm text-gray-600">Actualiza tu contraseña de administrador</p>
              </div>
              <button
                onClick={() => setShowPasswordChange(!showPasswordChange)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
              >
                {showPasswordChange ? 'Cancelar' : 'Cambiar'}
              </button>
            </div>

            {showPasswordChange && (
              <form onSubmit={handlePasswordChange} className="bg-gray-50 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Ingrese su contraseña actual"
                    required
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Mínimo 8 caracteres"
                      required
                      minLength={8}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirmar Contraseña
                    </label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      placeholder="Repita la nueva contraseña"
                      required
                      minLength={8}
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Cambiando...' : 'Cambiar Contraseña'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordChange(false);
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg">
              <strong>Recomendaciones de seguridad:</strong>
              <ul className="mt-1 space-y-1">
                <li>• Use al menos 8 caracteres</li>
                <li>• Combine letras, números y símbolos</li>
                <li>• Evite información personal</li>
                <li>• Cambie la contraseña regularmente</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Horarios de Funcionamiento */}
        <div className="rounded-xl bg-white p-6 shadow-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Calendar className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Horarios de Funcionamiento</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  Activar Horarios Automáticos
                </span>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={settings.operatingHours.enabled}
                  onChange={(e) => updateOperatingHours({ enabled: e.target.checked })}
                />
                <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-uct-primary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>

            <div className="grid gap-2 grid-cols-1">
              {[
                { name: 'L', key: 'monday' as keyof SystemSettings['operatingHours'] },
                { name: 'M', key: 'tuesday' as keyof SystemSettings['operatingHours'] },
                { name: 'X', key: 'wednesday' as keyof SystemSettings['operatingHours'] },
                { name: 'J', key: 'thursday' as keyof SystemSettings['operatingHours'] },
                { name: 'V', key: 'friday' as keyof SystemSettings['operatingHours'] },
                { name: 'S', key: 'saturday' as keyof SystemSettings['operatingHours'] },
                { name: 'D', key: 'sunday' as keyof SystemSettings['operatingHours'] }
              ].map(({ name, key }) => {
                const daySettings = settings.operatingHours[key] as { start: string; end: string; enabled: boolean };
                return (
                  <div key={name} className="rounded border border-gray-200 p-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{name}</span>
                      <label className="relative inline-flex cursor-pointer items-center">
                        <input
                          type="checkbox"
                          className="peer sr-only"
                          checked={daySettings.enabled}
                          onChange={(e) => updateOperatingHours({
                            [key]: { ...daySettings, enabled: e.target.checked }
                          })}
                        />
                        <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:left-[1px] after:top-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-uct-secondary peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                      </label>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="time"
                        className="w-full rounded border border-gray-300 px-1 py-1 text-xs focus:border-uct-primary focus:outline-none"
                        value={daySettings.start}
                        onChange={(e) => updateOperatingHours({
                          [key]: { ...daySettings, start: e.target.value }
                        })}
                      />
                      <input
                        type="time"
                        className="w-full rounded border border-gray-300 px-1 py-1 text-xs focus:border-uct-primary focus:outline-none"
                        value={daySettings.end}
                        onChange={(e) => updateOperatingHours({
                          [key]: { ...daySettings, end: e.target.value }
                        })}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Configuración de Emergencia */}
        <div className="rounded-xl bg-white p-6 shadow-lg border-l-4 border-red-500">
          <div className="mb-6 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Configuración de Emergencia</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-red-50 p-3 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-700">
                  Activar Modo de Emergencia
                </span>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={settings.emergency.enabled}
                  onChange={(e) => updateEmergency({ enabled: e.target.checked })}
                />
                <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
              </label>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Mensaje de Emergencia
              </label>
              <textarea
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500 resize-none text-sm"
                rows={2}
                placeholder="Mensaje de emergencia..."
                value={settings.emergency.message}
                onChange={(e) => updateEmergency({ message: e.target.value })}
              />
            </div>

            <div className="grid gap-3 grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Prioridad
                </label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none text-sm"
                  value={settings.emergency.priority}
                  onChange={(e) => updateEmergency({ priority: e.target.value as 'low' | 'medium' | 'high' | 'critical' })}
                >
                  <option value="low">🟢 Baja</option>
                  <option value="medium">🟡 Media</option>
                  <option value="high">🟠 Alta</option>
                  <option value="critical">🔴 Crítica</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Color
                </label>
                <div className="flex gap-1">
                  <input
                    type="color"
                    className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                    value={settings.emergency.backgroundColor}
                    onChange={(e) => updateEmergency({ backgroundColor: e.target.value })}
                  />
                  <input
                    type="text"
                    className="flex-1 rounded border border-gray-300 px-2 py-1 focus:border-red-500 focus:outline-none text-xs"
                    value={settings.emergency.backgroundColor}
                    onChange={(e) => updateEmergency({ backgroundColor: e.target.value })}
                    placeholder="#dc2626"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
              <div>
                <span className="text-sm font-medium text-gray-700">Auto-ocultar</span>
                <p className="text-xs text-gray-500">Ocultar después de tiempo especificado</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  className="w-16 rounded border border-gray-300 px-2 py-1 text-xs focus:border-red-500 focus:outline-none"
                  value={settings.emergency.hideAfter}
                  onChange={(e) => updateEmergency({ hideAfter: parseInt(e.target.value) || 0 })}
                  min="1"
                  max="1440"
                />
                <span className="text-xs text-gray-600">min</span>
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={settings.emergency.autoHide}
                    onChange={(e) => updateEmergency({ autoHide: e.target.checked })}
                  />
                  <div className="peer h-4 w-7 rounded-full bg-gray-200 after:absolute after:left-[1px] after:top-[1px] after:h-3 after:w-3 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-red-600 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Opciones Avanzadas */}
      <div className="rounded-xl bg-white p-6 shadow-lg border-l-4 border-blue-500">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Server className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Opciones Avanzadas</h2>
          </div>
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Database className="h-4 w-4" />
            {showAdvancedOptions ? 'Ocultar' : 'Mostrar'} Detalles
          </button>
        </div>

        {showAdvancedOptions && (
          <div className="space-y-6">
            {/* Configuración de Red */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-800">Configuración de Red</h3>
                <div className="flex items-center gap-2 ml-auto">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Conectado</span>
                  <span className="text-sm text-gray-500">Puerto: {typeof window !== 'undefined' ? window.location.port || '3000' : '3000'}</span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Servidor Web */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Monitor className="h-4 w-4 text-blue-600" />
                    <h4 className="font-medium text-gray-700">Servidor Web</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">URL del Servidor:</span>
                      <span className="font-mono text-gray-800">{settings.serverUrl}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Puerto del Servidor:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-gray-800">{settings.serverPort}</span>
                        <button className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded">Auto</button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Servidor RTSP */}
                <div className="bg-white rounded-lg p-4 border">
                  <div className="flex items-center gap-2 mb-3">
                    <Link className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium text-gray-700">Servidor RTSP</h4>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Puerto RTSP:</span>
                      <span className="font-mono text-gray-800">8554</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">URL RTSP Actual:</span>
                      <span className="font-mono text-gray-800 text-xs">rtsp://localhost:8554/live/screen_[id]</span>
                    </div>
                    <div className="text-xs text-gray-500">Puerto estándar para streams RTSP: 8554</div>
                  </div>
                </div>
              </div>

              {/* Configuración de Conexión */}
              <div className="mt-4 bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-700 mb-3">Configuración de Conexión</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Intervalo de Heartbeat (segundos):</span>
                    <span className="font-mono text-gray-800">{settings.heartbeatInterval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Timeout de Conexión (segundos):</span>
                    <span className="font-mono text-gray-800">{settings.connectionTimeout}</span>
                  </div>
                </div>
              </div>

              {/* URLs de Acceso */}
              <div className="mt-4 bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-700 mb-3">URLs de Acceso</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Administración:</span>
                    <a
                      href={typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:${settings.serverPort}/admin` : `${settings.serverUrl}:${settings.serverPort}/admin`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-blue-600 hover:text-blue-800 underline text-xs"
                    >
                      {typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:${settings.serverPort}/admin` : `${settings.serverUrl}:${settings.serverPort}/admin`}
                    </a>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">API:</span>
                    <span className="font-mono text-gray-800 text-xs">{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:${settings.serverPort}/api` : `${settings.serverUrl}:${settings.serverPort}/api`}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pantallas:</span>
                    <span className="font-mono text-gray-800 text-xs">{typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:${settings.serverPort}/screen/[id]` : `${settings.serverUrl}:${settings.serverPort}/screen/[id]`}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">RTSP:</span>
                    <span className="font-mono text-gray-800 text-xs">rtsp://{typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8554/live/screen_[id]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      </div>

      <NetworkRestartNotification
        show={showNetworkRestart}
        instructions={restartInstructions}
        onClose={() => setShowNetworkRestart(false)}
        onCompleted={handleNetworkRestartCompleted}
      />
    </PageLayout>
  );
}
