import { useEffect, useState } from 'react';
import { FileVideo, Image as ImageIcon } from 'lucide-react';
import Image from 'next/image';

interface MediaFile {
  name: string;
  originalName?: string;
  url: string;
  type: string;
  size: number;
  duration?: number;
  thumbnail?: string;
  folder?: string;
}

interface ContentSelectorProps {
  selectedContent: string[];
  onContentSelect: (contentIds: string[]) => void;
}

export default function ContentSelector({ selectedContent, onContentSelect }: ContentSelectorProps) {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    try {
      // Obtener archivos de todas las carpetas del nuevo sistema
      const foldersResponse = await fetch('/api/files/folders');
      const foldersData = await foldersResponse.json();

      if (foldersData.success && foldersData.folders) {
        const allFiles: MediaFile[] = [];

        // Obtener archivos de cada carpeta
        for (const folder of foldersData.folders) {
          try {
            const folderResponse = await fetch(`/api/files/folders/${encodeURIComponent(folder.name)}`);
            const folderData = await folderResponse.json();

            if (folderData.success && folderData.files) {
              // Convertir archivos del sistema de archivos al formato esperado
              const folderFiles = folderData.files
                .filter((file: any) => file.type === 'file' && (file.mediaType === 'video' || file.mediaType === 'image'))
                .map((file: any) => ({
                  name: file.name,
                  url: file.url,
                  type: file.mediaType,
                  size: file.size,
                  folder: folder.name
                }));

              allFiles.push(...folderFiles);
            }
          } catch (error) {
            console.error(`Error al cargar archivos de carpeta ${folder.name}:`, error);
          }
        }

        setFiles(allFiles);
      }
    } catch (error) {
      console.error('Error al cargar contenido:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleContent = (file: MediaFile) => {
    // Usar una identificación única que incluya la carpeta si está disponible
    const fileId = file.folder ? `${file.folder}/${file.name}` : file.name;
    const isSelected = selectedContent.includes(fileId);

    if (isSelected) {
      onContentSelect(selectedContent.filter(id => id !== fileId));
    } else {
      onContentSelect([...selectedContent, fileId]);
    }
  };

  if (loading) return <div className="text-center py-4">Cargando contenido...</div>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 max-h-[60vh] overflow-y-auto p-2 sm:p-4">
      {files.map((file) => {
        // Crear una key única que incluya la carpeta para evitar duplicados
        const uniqueKey = file.folder ? `${file.folder}/${file.name}` : file.name;

        return (
          <div
            key={uniqueKey}
            onClick={() => toggleContent(file)}
            className={`relative rounded-lg border p-2 cursor-pointer transition-all ${
              selectedContent.includes(uniqueKey)
                ? 'border-uct-primary bg-uct-primary/5 ring-2 ring-uct-primary/20'
                : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
            }`}
          >
          {file.type === 'video' ? (
            <div className="aspect-video relative bg-gray-100 rounded overflow-hidden">
              <video
                src={file.url}
                className="w-full h-full object-cover"
                muted
                playsInline
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {file.duration ? `${Math.floor(file.duration / 60)}:${String(Math.floor(file.duration % 60)).padStart(2, '0')}` : ''}
              </div>
            </div>
          ) : (
            <div className="aspect-video relative bg-gray-100 rounded overflow-hidden">
              <Image
                src={file.url}
                alt={file.originalName || file.name}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="mt-2">
            <p className="text-sm font-medium truncate">
              {file.originalName || file.name}
            </p>
            {file.folder && (
              <p className="text-xs text-gray-500 truncate">
                📁 {file.folder}
              </p>
            )}
          </div>
          <div className="absolute top-2 right-2">
            {file.type === 'video' ? (
              <FileVideo className="h-4 w-4 text-purple-500" />
            ) : (
              <ImageIcon className="h-4 w-4 text-blue-500" />
            )}
          </div>
        </div>
        );
      })}
    </div>
  );
}
