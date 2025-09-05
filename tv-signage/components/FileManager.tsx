'use client';

import { useState, useEffect } from 'react';
import { 
  Folder, 
  FolderPlus, 
  FolderOpen,
  Upload, 
  Search, 
  ArrowLeft,
  Video,
  Image,
  File,
  Trash2,
  RefreshCw,
  HardDrive,
  FileText,
  X
} from 'lucide-react';
import Modal from './Modal';
import { getPathInfo, getFolderPath } from '../lib/path-config';

interface FileItem {
  name: string;
  path: string;
  relativePath: string;
  url: string;
  size: number;
  modified: Date;
  type: 'file' | 'directory';
  mediaType?: 'video' | 'image' | 'other';
  extension?: string;
}

interface FolderInfo {
  name: string;
  path: string;
  relativePath: string;
  itemCount: number;
  totalSize: number;
  created: Date;
  modified: Date;
}

interface Stats {
  totalFolders: number;
  totalFiles: number;
  totalSize: number;
  videoFiles: number;
  imageFiles: number;
}

export default function FileManager() {
  const [folders, setFolders] = useState<FolderInfo[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [currentFiles, setCurrentFiles] = useState<FileItem[]>([]);
  const [currentFolderInfo, setCurrentFolderInfo] = useState<FolderInfo | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalFolders: 0,
    totalFiles: 0,
    totalSize: 0,
    videoFiles: 0,
    imageFiles: 0
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'directory' | 'video' | 'image' | 'other'>('all');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [rescanning, setRescanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{
    type: 'file' | 'folder';
    name: string;
    folderName?: string;
  } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado para información de rutas (evitar hidratación)
  const [pathInfo, setPathInfo] = useState({
    platform: 'linux',
    isWindows: false,
    basePath: '/home/uct/Música',
    displayPath: '/home/uct/Música'
  });
  const [isClient, setIsClient] = useState(false);

  // Detectar OS solo en el cliente
  useEffect(() => {
    setIsClient(true);
    setPathInfo(getPathInfo());
  }, []);

  // Cargar carpetas
  const fetchFolders = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/files/folders');
      const data = await response.json();
      
      if (data.success) {
        setFolders(data.folders);
        setStats(data.stats);
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

  // Cargar archivos de una carpeta
  const fetchFolderFiles = async (folderName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(`/api/files/folders/${encodeURIComponent(folderName)}?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentFiles(data.files);
        setCurrentFolderInfo(data.folder);
      } else {
        setError('Error al cargar archivos de la carpeta');
      }
    } catch (err) {
      setError('Error de conexión al cargar archivos');
      console.error('Error fetching folder files:', err);
    } finally {
      setLoading(false);
    }
  };

  // Crear carpeta
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setCreating(true);
    try {
      const response = await fetch('/api/files/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: newFolderName.trim() })
      });

      const data = await response.json();

      if (data.success) {
        setNewFolderName('');
        setShowCreateFolderModal(false);
        await fetchFolders();
      } else {
        setError(data.message || 'Error al crear carpeta');
      }
    } catch (err) {
      setError('Error al crear carpeta');
      console.error('Error creating folder:', err);
    } finally {
      setCreating(false);
    }
  };

  // Rescanear archivos
  const handleRescan = async () => {
    setRescanning(true);
    try {
      if (currentFolder) {
        // Si estamos en una carpeta, rescanear esa carpeta
        await fetchFolderFiles(currentFolder);
      } else {
        // Si estamos en la vista principal, rescanear todas las carpetas
        await fetchFolders();
      }
    } catch (err) {
      setError('Error al rescanear archivos');
      console.error('Error rescanning:', err);
    } finally {
      setRescanning(false);
    }
  };

  // Navegar a carpeta
  const navigateToFolder = (folderName: string) => {
    setCurrentFolder(folderName);
    fetchFolderFiles(folderName);
  };

  // Volver a la vista de carpetas
  const navigateBack = () => {
    setCurrentFolder(null);
    setCurrentFiles([]);
    setCurrentFolderInfo(null);
    setSearchTerm('');
    setTypeFilter('all');
    fetchFolders();
  };

  // Subir archivos
  const handleFileUpload = async (files: FileList) => {
    if (!currentFolder || files.length === 0) return;

    setUploading(true);
    setUploadProgress({});

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch(`/api/files/folders/${encodeURIComponent(currentFolder)}`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setShowUploadModal(false);
        await fetchFolderFiles(currentFolder);

        // Mostrar resultado
        if (data.uploaded === data.total) {
          alert(`✅ ${data.uploaded} archivos subidos exitosamente`);
        } else {
          alert(`⚠️ ${data.uploaded} de ${data.total} archivos subidos. Revisa los errores.`);
        }
      } else {
        setError(data.error || 'Error al subir archivos');
      }
    } catch (err) {
      setError('Error al subir archivos');
      console.error('Error uploading files:', err);
    } finally {
      setUploading(false);
      setUploadProgress({});
    }
  };

  // Eliminar archivo o carpeta
  const handleDelete = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      let url = '';

      if (itemToDelete.type === 'file' && itemToDelete.folderName) {
        // Eliminar archivo específico
        url = `/api/files/folders/${encodeURIComponent(itemToDelete.folderName)}?file=${encodeURIComponent(itemToDelete.name)}`;
      } else if (itemToDelete.type === 'folder') {
        // Eliminar carpeta
        url = `/api/files/folders/${encodeURIComponent(itemToDelete.name)}`;
      }

      const response = await fetch(url, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        setShowDeleteModal(false);
        setItemToDelete(null);

        if (itemToDelete.type === 'file' && currentFolder) {
          // Recargar archivos de la carpeta actual
          await fetchFolderFiles(currentFolder);
        } else {
          // Recargar lista de carpetas y volver a la vista principal
          setCurrentFolder(null);
          setCurrentFiles([]);
          setCurrentFolderInfo(null);
          await fetchFolders();
        }
      } else {
        setError(data.message || 'Error al eliminar');
      }
    } catch (err) {
      setError('Error al eliminar');
      console.error('Error deleting:', err);
    } finally {
      setDeleting(false);
    }
  };

  // Limpiar mensajes
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // Abrir explorador de archivos
  const handleOpenExplorer = async (folderPath?: string) => {
    // Limpiar mensajes previos antes de iniciar
    clearMessages();
    
    try {
      const response = await fetch('/api/files/open-explorer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderPath })
      });

      const data = await response.json();

      if (data.success) {
        // Mostrar mensaje de éxito (se limpiará automáticamente con useEffect)
        setSuccessMessage('✅ Explorador de archivos abierto exitosamente');
      } else {
        // Mostrar error (se limpiará automáticamente con useEffect)
        setError(data.error || 'No se pudo abrir el explorador de archivos');
      }
    } catch (err) {
      // Mostrar error (se limpiará automáticamente con useEffect)
      setError('Error al intentar abrir el explorador de archivos');
      console.error('Error opening explorer:', err);
    }
  };

  // Formatear tamaño
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formatear fecha
  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleString('es-ES');
  };

  // Obtener icono según tipo de archivo
  const getFileIcon = (file: FileItem) => {
    if (file.type === 'directory') {
      return <Folder className="h-5 w-5 text-blue-500" />;
    }
    
    switch (file.mediaType) {
      case 'video':
        return <Video className="h-5 w-5 text-green-500" />;
      case 'image':
        return <Image className="h-5 w-5 text-purple-500" />;
      default:
        return <File className="h-5 w-5 text-gray-500" />;
    }
  };

  // Efectos
  useEffect(() => {
    fetchFolders();
  }, []);

  useEffect(() => {
    if (currentFolder) {
      fetchFolderFiles(currentFolder);
    }
  }, [searchTerm, typeFilter, currentFolder]);

  // Limpiar mensajes automáticamente después de un tiempo
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError(null);
      }, 8000); // 8 segundos para errores
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 4000); // 4 segundos para mensajes de éxito
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  return (
    <div className="space-y-6">


      {/* Header con información de rutas */}
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
        <div className="flex-1">
          {currentFolder && (
            <button
              onClick={navigateBack}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </button>
          )}
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">
            {currentFolder ? `Carpeta: ${currentFolder}` : 'Gestión de Archivos'}
          </h2>
          <p className="text-sm sm:text-base text-gray-600 break-all">
            {currentFolder 
              ? `Archivos en ${getFolderPath(currentFolder)}`
              : `Administra carpetas y archivos en ${pathInfo.basePath}`
            }
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={handleRescan}
            disabled={loading || rescanning}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors text-sm"
          >
            <RefreshCw className={`h-4 w-4 ${rescanning ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{rescanning ? 'Rescaneando...' : 'Rescanear'}</span>
            <span className="sm:hidden">{rescanning ? 'Rescaneando...' : 'Rescanear'}</span>
          </button>

          <button
            onClick={() => handleOpenExplorer(currentFolder || undefined)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            <FolderOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Abrir en Explorador</span>
            <span className="sm:hidden">Explorador</span>
          </button>

          {currentFolder ? (
            // Botones para vista de carpeta
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Subir Archivos</span>
              <span className="sm:hidden">Subir</span>
            </button>
          ) : (
            // Botón para vista principal
            <button
              onClick={() => setShowCreateFolderModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-uct-primary text-white rounded-lg hover:bg-uct-dark transition-colors text-sm"
            >
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">Nueva Carpeta</span>
              <span className="sm:hidden">Nueva</span>
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {!currentFolder && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center gap-2 sm:gap-3">
              <Folder className="h-6 w-6 sm:h-8 sm:w-8 text-blue-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Carpetas</p>
                <p className="text-lg sm:text-2xl font-bold truncate">{stats.totalFolders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center gap-2 sm:gap-3">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-gray-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Archivos</p>
                <p className="text-lg sm:text-2xl font-bold truncate">{stats.totalFiles}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center gap-2 sm:gap-3">
              <Video className="h-6 w-6 sm:h-8 sm:w-8 text-green-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Videos</p>
                <p className="text-lg sm:text-2xl font-bold truncate">{stats.videoFiles}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border">
            <div className="flex items-center gap-2 sm:gap-3">
              <Image className="h-6 w-6 sm:h-8 sm:w-8 text-purple-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Imágenes</p>
                <p className="text-lg sm:text-2xl font-bold truncate">{stats.imageFiles}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow border col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3">
              <HardDrive className="h-6 w-6 sm:h-8 sm:w-8 text-orange-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-600">Tamaño</p>
                <p className="text-lg sm:text-2xl font-bold truncate">{formatFileSize(stats.totalSize)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtros (solo en vista de carpeta) */}
      {currentFolder && (
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Buscar archivos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-uct-primary"
                />
              </div>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uct-primary focus:border-uct-primary"
            >
              <option value="all">Todos los tipos</option>
              <option value="directory">Carpetas</option>
              <option value="video">Videos</option>
              <option value="image">Imágenes</option>
              <option value="other">Otros</option>
            </select>
          </div>
        </div>
      )}

      {/* Mensajes de Error y Éxito */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-red-700 flex-1">{error}</p>
            <button
              onClick={clearMessages}
              className="ml-3 text-red-500 hover:text-red-700 transition-colors"
              title="Cerrar mensaje"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <p className="text-green-700 flex-1">{successMessage}</p>
            <button
              onClick={clearMessages}
              className="ml-3 text-green-500 hover:text-green-700 transition-colors"
              title="Cerrar mensaje"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="bg-white rounded-lg shadow border">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Cargando...</p>
          </div>
        ) : currentFolder ? (
          // Vista de archivos en carpeta
          currentFiles.length === 0 ? (
            <div className="p-8 text-center">
              <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No se encontraron archivos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="hidden md:block">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Archivo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tamaño
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Modificado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentFiles.map((file) => (
                      <tr key={file.path} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {getFileIcon(file)}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500 truncate">{file.relativePath}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            file.type === 'directory' 
                              ? 'bg-blue-100 text-blue-800'
                              : file.mediaType === 'video' 
                                ? 'bg-green-100 text-green-800' 
                                : file.mediaType === 'image'
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                          }`}>
                            {file.type === 'directory' ? 'Carpeta' : 
                             file.mediaType === 'video' ? 'Video' : 
                             file.mediaType === 'image' ? 'Imagen' : 'Archivo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {file.type === 'file' ? formatFileSize(file.size) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(file.modified)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setItemToDelete({
                                type: file.type as 'file' | 'folder',
                                name: file.name,
                                folderName: currentFolder || undefined
                              });
                              setShowDeleteModal(true);
                            }}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Vista móvil - Cards */}
              <div className="md:hidden space-y-3 p-4">
                {currentFiles.map((file) => (
                  <div key={file.path} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {getFileIcon(file)}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 break-words">{file.name}</p>
                          <p className="text-xs text-gray-500 break-all">{file.relativePath}</p>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({
                            type: file.type as 'file' | 'folder',
                            name: file.name,
                            folderName: currentFolder || undefined
                          });
                          setShowDeleteModal(true);
                        }}
                        className="text-red-600 hover:text-red-800 transition-colors p-1 flex-shrink-0"
                        title="Eliminar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-medium">Tipo:</span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          file.type === 'directory' 
                            ? 'bg-blue-100 text-blue-800'
                            : file.mediaType === 'video' 
                              ? 'bg-green-100 text-green-800' 
                              : file.mediaType === 'image'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-gray-100 text-gray-800'
                        }`}>
                          {file.type === 'directory' ? 'Carpeta' : 
                           file.mediaType === 'video' ? 'Video' : 
                           file.mediaType === 'image' ? 'Imagen' : 'Archivo'}
                        </span>
                      </div>
                      
                      {file.type === 'file' && (
                        <div>
                          <span className="font-medium">Tamaño:</span> {formatFileSize(file.size)}
                        </div>
                      )}
                      
                      <div className="w-full">
                        <span className="font-medium">Modificado:</span> {formatDate(file.modified)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          // Vista de carpetas
          folders.length === 0 ? (
            <div className="p-8 text-center">
              <Folder className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600">No hay carpetas creadas</p>
              <button
                onClick={() => setShowCreateFolderModal(true)}
                className="mt-4 px-4 py-2 bg-uct-primary text-white rounded-lg hover:bg-uct-dark transition-colors"
              >
                Crear primera carpeta
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 sm:p-6">
              {folders.map((folder) => (
                <div
                  key={folder.path}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors relative group"
                >
                  <div
                    onClick={() => navigateToFolder(folder.name)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <Folder className="h-8 w-8 text-blue-500 flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 break-words">{folder.name}</h3>
                        <p className="text-sm text-gray-500 break-all">📁 Ruta: {getFolderPath(folder.name)}</p>
                        <p className="text-sm text-gray-500">{folder.itemCount} archivos</p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Tamaño: {formatFileSize(folder.totalSize)}</p>
                      <p className="break-words">Modificado: {formatDate(folder.modified)}</p>
                    </div>
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setItemToDelete({
                        type: 'folder',
                        name: folder.name
                      });
                      setShowDeleteModal(true);
                    }}
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 transition-all p-1 rounded"
                    title="Eliminar carpeta"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Modal Crear Carpeta */}
      <Modal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        title="Crear Nueva Carpeta"
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="folder-name" className="block text-sm font-medium text-gray-700 mb-2">
              Nombre de la Carpeta
            </label>
            <input
              type="text"
              id="folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-uct-primary focus:border-uct-primary text-sm"
              placeholder="Ej: Videos Institucionales"
            />
          </div>
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              onClick={() => setShowCreateFolderModal(false)}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateFolder}
              disabled={creating || !newFolderName.trim()}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-uct-primary border border-transparent rounded-lg hover:bg-uct-dark transition-colors disabled:opacity-50 order-1 sm:order-2"
            >
              {creating ? 'Creando...' : 'Crear Carpeta'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Subir Archivos */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        title={`Subir Archivos a ${currentFolder}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Archivos
            </label>
            <input
              type="file"
              multiple
              accept="video/*,image/*"
              onChange={(e) => {
                if (e.target.files) {
                  handleFileUpload(e.target.files);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-uct-primary file:text-white hover:file:bg-uct-dark"
              disabled={uploading}
            />
            <p className="text-xs text-gray-500 mt-1">
              Formatos soportados: MP4, WebM, JPG, PNG, GIF (máximo 500MB por archivo)
            </p>
          </div>

          {uploading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                <p className="text-blue-700">Subiendo archivos...</p>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal Confirmar Eliminación */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Confirmar Eliminación"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
            <Trash2 className="h-6 w-6 text-red-500" />
            <div>
              <p className="text-red-800 font-medium">
                ¿Estás seguro de que quieres eliminar {itemToDelete?.type === 'folder' ? 'la carpeta' : 'el archivo'} "{itemToDelete?.name}"?
              </p>
              <p className="text-red-600 text-sm mt-1">
                {itemToDelete?.type === 'folder'
                  ? 'La carpeta debe estar vacía para poder eliminarla.'
                  : 'Esta acción no se puede deshacer.'
                }
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setItemToDelete(null);
              }}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors order-2 sm:order-1"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
        
      </Modal>
    </div>
  );
}

