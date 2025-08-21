import { NextResponse } from 'next/server';
import { readdir, stat } from 'fs/promises';
import { join, extname } from 'path';

const BASE_PATH = '/home/uct/Música';

// GET /api/debug/list-real-files - Listar todos los archivos reales en el sistema
export async function GET() {
  try {
    console.log('📁 [Debug] Listando todos los archivos reales del sistema...');
    
    const result = {
      basePath: BASE_PATH,
      folders: [] as any[],
      totalFiles: 0,
      totalMediaFiles: 0,
      totalVideoFiles: 0,
      errors: [] as string[]
    };

    try {
      // Verificar directorio base
      await stat(BASE_PATH);
      console.log(`✅ [Debug] Directorio base existe: ${BASE_PATH}`);
    } catch (error) {
      result.errors.push(`Directorio base ${BASE_PATH} no existe`);
      return NextResponse.json(result);
    }

    try {
      // Listar carpetas
      const entries = await readdir(BASE_PATH);
      console.log(`📂 [Debug] Entradas encontradas: ${entries.length}`);

      for (const entry of entries) {
        const entryPath = join(BASE_PATH, entry);
        
        try {
          const entryStats = await stat(entryPath);
          
          if (entryStats.isDirectory()) {
            console.log(`📁 [Debug] Procesando carpeta: ${entry}`);
            
            const folderInfo = {
              name: entry,
              path: entryPath,
              files: [] as any[],
              totalFiles: 0,
              mediaFiles: 0,
              videoFiles: 0,
              created: entryStats.birthtime,
              modified: entryStats.mtime
            };

            try {
              // Listar archivos en la carpeta
              const files = await readdir(entryPath);
              console.log(`📄 [Debug] Archivos en ${entry}: ${files.length}`);

              const mediaExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
              const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp'];

              for (const fileName of files) {
                const filePath = join(entryPath, fileName);
                
                try {
                  const fileStats = await stat(filePath);
                  
                  if (fileStats.isFile()) {
                    const ext = extname(fileName).toLowerCase();
                    const isMedia = mediaExtensions.includes(ext);
                    const isVideo = videoExtensions.includes(ext);
                    
                    const fileInfo = {
                      name: fileName,
                      path: filePath,
                      relativePath: join(entry, fileName),
                      size: fileStats.size,
                      sizeFormatted: formatBytes(fileStats.size),
                      modified: fileStats.mtime,
                      extension: ext,
                      isMedia,
                      isVideo,
                      url: isMedia ? `http://172.16.31.17:3000/api/files/media/${encodeURIComponent(join(entry, fileName))}` : null
                    };

                    folderInfo.files.push(fileInfo);
                    folderInfo.totalFiles++;
                    
                    if (isMedia) {
                      folderInfo.mediaFiles++;
                      result.totalMediaFiles++;
                    }
                    
                    if (isVideo) {
                      folderInfo.videoFiles++;
                      result.totalVideoFiles++;
                    }
                    
                    result.totalFiles++;
                    
                    if (isVideo) {
                      console.log(`🎬 [Debug] Video encontrado: ${fileName} (${formatBytes(fileStats.size)})`);
                    } else if (isMedia) {
                      console.log(`🖼️ [Debug] Imagen encontrada: ${fileName} (${formatBytes(fileStats.size)})`);
                    }
                  }
                } catch (fileError) {
                  console.error(`❌ [Debug] Error procesando archivo ${fileName}:`, fileError);
                  result.errors.push(`Error procesando archivo ${fileName}: ${fileError}`);
                }
              }
              
            } catch (folderError) {
              console.error(`❌ [Debug] Error listando archivos en ${entry}:`, folderError);
              result.errors.push(`Error listando archivos en ${entry}: ${folderError}`);
            }

            result.folders.push(folderInfo);
            
          } else if (entryStats.isFile()) {
            // Archivo en el directorio raíz
            console.log(`📄 [Debug] Archivo en raíz: ${entry}`);
          }
          
        } catch (entryError) {
          console.error(`❌ [Debug] Error procesando entrada ${entry}:`, entryError);
          result.errors.push(`Error procesando entrada ${entry}: ${entryError}`);
        }
      }

    } catch (error) {
      result.errors.push(`Error listando directorio base: ${error}`);
    }

    // Ordenar carpetas por nombre
    result.folders.sort((a, b) => a.name.localeCompare(b.name));

    // Ordenar archivos dentro de cada carpeta
    result.folders.forEach(folder => {
      folder.files.sort((a: any, b: any) => a.name.localeCompare(b.name));
    });

    console.log(`✅ [Debug] Listado completo: ${result.folders.length} carpetas, ${result.totalFiles} archivos, ${result.totalVideoFiles} videos`);

    return NextResponse.json({
      success: true,
      result,
      summary: {
        totalFolders: result.folders.length,
        totalFiles: result.totalFiles,
        totalMediaFiles: result.totalMediaFiles,
        totalVideoFiles: result.totalVideoFiles,
        hasErrors: result.errors.length > 0,
        foldersWithVideos: result.folders.filter(f => f.videoFiles > 0).length,
        foldersWithMedia: result.folders.filter(f => f.mediaFiles > 0).length
      }
    });

  } catch (error) {
    console.error('❌ [Debug] Error listando archivos reales:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error listando archivos reales',
        details: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Función auxiliar para formatear bytes
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
