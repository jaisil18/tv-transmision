import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Loader2 } from 'lucide-react';

interface FileUploadProps {
  onUpload?: (files: File[], durations: number[]) => Promise<void>;
  uploading?: boolean;
  // Nuevas propiedades
  endpoint?: string;
  allowedTypes?: string;
  maxSizeMB?: number;
  onSuccess?: () => void;
  buttonText?: string;
  multiple?: boolean;
}

// Función para obtener la duración de un video en el frontend
function getVideoDuration(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('video/')) {
      reject(new Error('El archivo no es un video'));
      return;
    }

    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      const duration = video.duration;
      window.URL.revokeObjectURL(video.src);
      resolve(isNaN(duration) ? 0 : duration);
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Error al cargar el video'));
    };

    video.src = URL.createObjectURL(file);
  });
}

interface FileWithPreview extends File {
  preview?: string;
  duration?: number;
}

interface FileWithDuration {
  file: File;
  duration?: number;
}

export default function FileUpload({ 
  onUpload = async () => {}, 
  uploading = false,
  endpoint,
  allowedTypes,
  maxSizeMB,
  onSuccess,
  buttonText,
  multiple = true
}: FileUploadProps) {
  const [processing, setProcessing] = useState(false);

  const processFiles = async (files: File[]) => {
    setProcessing(true);
    
    try {
      if (endpoint) {
        // Enviar archivos al endpoint especificado
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });
        
        const response = await fetch(endpoint, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al subir archivos');
        }
        
        const result = await response.json();
        console.log('Archivos subidos correctamente:', result);
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Procesamiento local (comportamiento original)
        const processedFiles: FileWithDuration[] = [];

        for (const file of files) {
          if (file.type.startsWith('video/')) {
            try {
              const duration = await getVideoDuration(file);
              processedFiles.push({ file, duration });
            } catch (error) {
              console.error('Error al procesar video:', error);
              processedFiles.push({ file, duration: 0 });
            }
          } else {
            processedFiles.push({ file });
          }
        }

        await onUpload(
          processedFiles.map(pf => pf.file),
          processedFiles.map(pf => pf.duration || 0)
        );
      }
    } catch (error) {
      console.error('Error al procesar archivos:', error);
      alert(error instanceof Error ? error.message : 'Error al subir archivos');
    } finally {
      setProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    processFiles(acceptedFiles);
  }, []);

  // Configurar tipos de archivo aceptados
  const acceptedTypes = (() => {
    const baseTypes: Record<string, string[]> = {};
    
    if (!allowedTypes) {
      return {
        'video/mp4': ['.mp4'],
        'video/webm': ['.webm'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
      };
    }
    
    if (allowedTypes === 'image/*,video/*' || (allowedTypes.includes('image') && allowedTypes.includes('video'))) {
      return {
        'video/mp4': ['.mp4'],
        'video/webm': ['.webm'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
      };
    } else if (allowedTypes.includes('image')) {
      return {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
      } as Record<string, string[]>;
    } else if (allowedTypes.includes('video')) {
      return {
        'video/mp4': ['.mp4'],
        'video/webm': ['.webm'],
      } as Record<string, string[]>;
    } else {
      // Fallback para otros tipos
      return {
        'video/mp4': ['.mp4'],
        'video/webm': ['.webm'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
      };
    }
  })();

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple,
    accept: acceptedTypes,
    maxSize: maxSizeMB ? maxSizeMB * 1024 * 1024 : undefined,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative p-10 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors
        ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center gap-2">
        <Upload className={`h-12 w-12 ${isDragActive ? 'text-blue-500' : 'text-gray-400'}`} />
        {uploading || processing ? (
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <p className="text-blue-500">
              {processing ? 'Procesando archivos...' : 'Subiendo archivos...'}
            </p>
          </div>
        ) : isDragActive ? (
          <p className="text-blue-500 text-lg">Suelta los archivos aquí...</p>
        ) : (
          <>
            <p className="text-lg font-medium">
              Arrastra y suelta archivos aquí, o haz clic para seleccionar
            </p>
            <p className="text-sm text-gray-500">
              Formatos soportados: MP4, WEBM, JPG, PNG, GIF
            </p>
          </>
        )}
      </div>
    </div>
  );
}
