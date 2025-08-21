const fs = require('fs');
const path = require('path');
const os = require('os');

// Rutas de configuración
const DATA_DIR = path.join(process.cwd(), 'data');
const PLAYLISTS_FILE = path.join(DATA_DIR, 'playlists.json');

// Detectar sistema operativo y usar ruta correcta
const isWindows = os.platform() === 'win32';
const MUSIC_BASE_PATH = isWindows ? 'C:\\Users\\jaisi\\Music' : '/home/uct/Música';

console.log(`🪟 Sistema detectado: ${os.platform()}`);
console.log(`📁 Ruta base: ${MUSIC_BASE_PATH}`);

// Extensiones de video soportadas
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.mkv', '.m4v', '.3gp'];

/**
 * Obtener archivos de video de una carpeta
 */
function getVideoFiles(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);
    return files
      .filter(file => {
        const ext = path.extname(file).toLowerCase();
        return VIDEO_EXTENSIONS.includes(ext);
      })
      .map(file => {
        const filePath = path.join(folderPath, file);
        const stats = fs.statSync(filePath);
        return {
          id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: file,
          type: 'video',
          folder: path.basename(folderPath),
          duration: 30, // Duración por defecto
          size: stats.size,
          modified: stats.mtime.toISOString(),
          url: `http://172.16.31.17:3000/api/files/media/${encodeURIComponent(path.basename(folderPath))}/${encodeURIComponent(file)}`
        };
      });
  } catch (error) {
    console.error(`❌ Error leyendo carpeta ${folderPath}:`, error.message);
    return [];
  }
}

/**
 * Actualizar playlists con archivos reales
 */
function updatePlaylists() {
  try {
    console.log('🔄 Actualizando playlists con archivos reales...');

    // Leer playlists actuales
    const playlistsData = fs.readFileSync(PLAYLISTS_FILE, 'utf8');
    const playlists = JSON.parse(playlistsData);

    console.log(`📋 Encontradas ${playlists.length} playlists`);

    // Actualizar cada playlist
    playlists.forEach(playlist => {
      if (playlist.folder) {
        const folderPath = path.join(MUSIC_BASE_PATH, playlist.folder);
        console.log(`📁 Procesando playlist "${playlist.name}" - Carpeta: ${playlist.folder}`);

        if (fs.existsSync(folderPath)) {
          const videoFiles = getVideoFiles(folderPath);
          playlist.items = videoFiles;
          playlist.updatedAt = Date.now();

          console.log(`✅ Playlist "${playlist.name}" actualizada con ${videoFiles.length} videos`);
          videoFiles.forEach(video => {
            console.log(`   🎬 ${video.name}`);
          });
        } else {
          console.log(`⚠️ Carpeta no encontrada: ${folderPath}`);
          playlist.items = [];
        }
      } else {
        console.log(`⚠️ Playlist "${playlist.name}" no tiene carpeta asignada`);
      }
    });

    // Guardar playlists actualizadas
    fs.writeFileSync(PLAYLISTS_FILE, JSON.stringify(playlists, null, 2));
    console.log('✅ Playlists actualizadas y guardadas');

    // Mostrar resumen
    console.log('\n📊 Resumen de actualización:');
    playlists.forEach(playlist => {
      console.log(`   📋 ${playlist.name}: ${playlist.items.length} videos`);
    });

    return { success: true, playlists };
  } catch (error) {
    console.error('❌ Error actualizando playlists:', error);
    return { success: false, error: error.message };
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  const result = updatePlaylists();
  if (result.success) {
    console.log('\n🎉 ¡Playlists actualizadas exitosamente!');
    process.exit(0);
  } else {
    console.error('\n💥 Error actualizando playlists:', result.error);
    process.exit(1);
  }
}

module.exports = { updatePlaylists };
