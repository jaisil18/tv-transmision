import { useState, useEffect } from 'react';

export interface SystemSettings {
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

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Detectar si estamos en una pantalla usando window.location
      const isScreenRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/screen/');

      // Usar endpoint público para pantallas, privado para admin
      const endpoint = isScreenRoute ? '/api/public/settings' : '/api/settings';
      console.log(`🔧 Cargando configuraciones desde: ${endpoint} (isScreenRoute: ${isScreenRoute})`);

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
        console.log(`✅ Configuraciones cargadas exitosamente desde ${endpoint}`);
      } else {
        console.error(`❌ Error al cargar desde ${endpoint}: ${response.status} ${response.statusText}`);
        throw new Error('Error al cargar configuraciones');
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Error al cargar las configuraciones del sistema');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();

    // Recargar configuraciones cada 60 segundos (reducido de 5s)
    const interval = setInterval(loadSettings, 60000);
    return () => clearInterval(interval);
  }, []);

  // Función para verificar si estamos en horario de funcionamiento
  const isInOperatingHours = () => {
    if (!settings?.operatingHours.enabled) return true;
    
    const now = new Date();
    const currentDay = now.getDay(); // 0 = domingo, 1 = lunes, etc.
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayKey = dayNames[currentDay] as keyof SystemSettings['operatingHours'];
    
    if (dayKey === 'enabled') return true;
    
    const daySettings = settings.operatingHours[dayKey] as { start: string; end: string; enabled: boolean };
    
    if (!daySettings.enabled) return false;
    
    return currentTime >= daySettings.start && currentTime <= daySettings.end;
  };

  // Función para verificar si hay emergencia activa
  const hasActiveEmergency = () => {
    return settings?.emergency.enabled && settings.emergency.message.trim() !== '';
  };

  return {
    settings,
    loading,
    error,
    loadSettings,
    isInOperatingHours,
    hasActiveEmergency
  };
}
