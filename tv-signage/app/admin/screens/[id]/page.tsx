'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Monitor, ArrowLeft, Settings, Play, Pause, Volume2, VolumeX, RefreshCw } from 'lucide-react';
import type { Screen } from '@/types/screen';
import PageLayout from '@/components/PageLayout';
import Link from 'next/link';

type PageParams = { id: string };

export default function ScreenDetailPage({ params }: { params: Promise<PageParams> }) {
  const resolvedParams = React.use<PageParams>(params);
  const screenId = resolvedParams.id;
  const router = useRouter();
  const [screen, setScreen] = useState<Screen | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScreenDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/screens/${screenId}`);
      if (response.ok) {
        const data = await response.json();
        setScreen(data);
      } else {
        setError('No se pudo cargar la información de la pantalla');
      }
    } catch (error) {
      console.error('Error al obtener detalles de la pantalla:', error);
      setError('Error de conexión');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenDetails();
  }, [screenId]);

  const handleToggleMute = async () => {
    if (!screen) return;
    try {
      const response = await fetch(`/api/screens/${screenId}/mute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ muted: !screen.muted }),
      });
      if (response.ok) {
        setScreen({ ...screen, muted: !screen.muted });
      }
    } catch (error) {
      console.error('Error al cambiar el estado de silencio:', error);
    }
  };

  const handleTogglePower = async () => {
    if (!screen) return;
    try {
      const action = screen.status === 'active' ? 'off' : 'on';
      const response = await fetch(`/api/screens/${screenId}/power`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (response.ok) {
        const updatedScreen = await response.json();
        setScreen(updatedScreen);
      }
    } catch (error) {
      console.error('Error al cambiar el estado de la pantalla:', error);
    }
  };

  if (isLoading) {
    return (
      <PageLayout title="Cargando...">
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </PageLayout>
    );
  }

  if (error || !screen) {
    return (
      <PageLayout title="Error">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">
            <Monitor className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg">{error || 'Pantalla no encontrada'}</p>
          </div>
          <Link
            href="/admin/screens"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a pantallas
          </Link>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title={`Pantalla: ${screen.name}`}>
      <div className="space-y-6">
        {/* Header con navegación */}
        <div className="flex items-center justify-between">
          <Link
            href="/admin/screens"
            className="inline-flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a pantallas
          </Link>
          
          <div className="flex space-x-2">
            <button
              onClick={handleToggleMute}
              className={`p-2 rounded-lg transition-colors ${
                screen.muted
                  ? 'bg-red-100 text-red-600 hover:bg-red-200'
                  : 'bg-green-100 text-green-600 hover:bg-green-200'
              }`}
              title={screen.muted ? 'Activar sonido' : 'Silenciar'}
            >
              {screen.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            
            <button
              onClick={handleTogglePower}
              className={`p-2 rounded-lg transition-colors ${
                screen.status === 'active'
                  ? 'bg-green-100 text-green-600 hover:bg-green-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={screen.status === 'active' ? 'Apagar pantalla' : 'Encender pantalla'}
            >
              {screen.status === 'active' ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Información de la pantalla */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <Monitor className="w-8 h-8 text-blue-600 mr-3" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{screen.name}</h2>
              <p className="text-gray-600">ID: {screen.id}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Estado</h3>
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  screen.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                }`}></div>
                <span className={screen.status === 'active' ? 'text-green-700' : 'text-red-700'}>
                  {screen.status === 'active' ? 'Activa' : 'Inactiva'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Audio</h3>
              <div className="flex items-center">
                {screen.muted ? (
                  <VolumeX className="w-4 h-4 text-red-500 mr-2" />
                ) : (
                  <Volume2 className="w-4 h-4 text-green-500 mr-2" />
                )}
                <span className={screen.muted ? 'text-red-700' : 'text-green-700'}>
                  {screen.muted ? 'Silenciado' : 'Con sonido'}
                </span>
              </div>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Última conexión</h3>
              <p className="text-gray-600">
                {screen.lastSeen ? new Date(screen.lastSeen).toLocaleString() : 'Nunca'}
              </p>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/admin/screens/${screenId}/mosaics`}
            className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Gestionar Mosaicos</h3>
                <p className="text-gray-600">Configurar y administrar los mosaicos de contenido</p>
              </div>
              <Settings className="w-8 h-8 text-blue-600 group-hover:text-blue-700" />
            </div>
          </Link>
          
          <div className="bg-white border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Estadísticas</h3>
                <p className="text-gray-600">Ver métricas y rendimiento de la pantalla</p>
              </div>
              <Monitor className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Próximamente disponible</p>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}