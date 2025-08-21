'use client';

import { useState, useEffect } from 'react';
import { Folder, Check } from 'lucide-react';

interface FolderInfo {
  name: string;
  path: string;
  relativePath: string;
  itemCount: number;
  totalSize: number;
  created: Date;
  modified: Date;
}

interface FolderSelectorProps {
  selectedFolder: string | null;
  onFolderSelect: (folderName: string | null) => void;
}

export default function FolderSelector({ selectedFolder, onFolderSelect }: FolderSelectorProps) {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFolders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/files/folders');
      const data = await response.json();
      
      if (data.success) {
        setFolders(data.folders);
      } else {
        setError('Error al cargar carpetas');
      }
    } catch (err) {
      setError('Error de conexión al cargar carpetas');
      console.error('Error fetching folders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-uct-primary mx-auto"></div>
        <p className="text-sm text-gray-500 mt-2">Cargando carpetas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center">
        <p className="text-sm text-red-600">{error}</p>
        <button
          onClick={fetchFolders}
          className="mt-2 text-sm text-uct-primary hover:text-uct-dark"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="p-4 text-center">
        <Folder className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">No hay carpetas disponibles</p>
        <p className="text-xs text-gray-400 mt-1">
          Crea carpetas en el módulo de Archivos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Opción para no seleccionar carpeta */}
      <div
        onClick={() => onFolderSelect(null)}
        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
          selectedFolder === null
            ? 'border-uct-primary bg-uct-primary/5'
            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Folder className="h-4 w-4 text-gray-500" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Sin carpeta específica</h4>
              <p className="text-sm text-gray-500">Usar contenido manual</p>
            </div>
          </div>
          {selectedFolder === null && (
            <Check className="h-5 w-5 text-uct-primary" />
          )}
        </div>
      </div>

      {/* Lista de carpetas */}
      {folders.map((folder) => (
        <div
          key={folder.name}
          onClick={() => onFolderSelect(folder.name)}
          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
            selectedFolder === folder.name
              ? 'border-uct-primary bg-uct-primary/5'
              : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Folder className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{folder.name}</h4>
                <div className="flex gap-3 text-sm text-gray-500">
                  <span>{folder.itemCount} archivos</span>
                  <span>{formatFileSize(folder.totalSize)}</span>
                </div>
              </div>
            </div>
            {selectedFolder === folder.name && (
              <Check className="h-5 w-5 text-uct-primary" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
