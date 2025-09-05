'use client';

import PageLayout from '@/components/PageLayout';
import FileManager from '@/components/FileManager';
import { Folder, Upload, Info } from 'lucide-react';

export default function FilesPage() {
  const actions = (
    <div className="flex items-center gap-2">
      <div className="p-2 bg-uct-primary/10 rounded-lg">
        <Folder className="h-5 w-5 text-uct-primary" />
      </div>
    </div>
  );

  return (
    <PageLayout title="Gestión de Archivos" actions={actions}>
      <div className="space-y-6">
        {/* Instructions */}
        <div className="bg-white rounded-xl p-6 shadow-lg">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-500 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">Sistema de Gestión de Archivos:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
                <div>
                  <h4 className="font-medium mb-1">📁 Organización:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Crea carpetas para organizar tu contenido</li>
                    <li>Cada carpeta puede contener videos e imágenes</li>
                    <li>Estructura: C:\Users\[usuario]\Music\tv-signage-media\[carpeta]\</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1">🎵 Integración con Playlists:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Los archivos aquí se pueden usar en playlists</li>
                    <li>Solo archivos existentes se reproducen</li>
                    <li>Soporte para videos e imágenes</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1">📤 Métodos de Carga:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Explorador de Windows: Navega directamente a la carpeta usando el botón 'Abrir en Explorador'</li>
                    <li>Arrastrar y soltar: Usa la función de subida de archivos en la interfaz web</li>
                    <li>Copia directa: Copia archivos directamente a la carpeta desde el explorador</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-1">🔄 Sincronización:</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Los cambios se detectan automáticamente</li>
                    <li>Usa "Rescanear" si es necesario</li>
                    <li>Formatos soportados: MP4, WebM, JPG, PNG, etc.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* File Manager */}
        <FileManager />
      </div>
    </PageLayout>
  );
}
