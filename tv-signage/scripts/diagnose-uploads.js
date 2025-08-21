#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 Diagnóstico de archivos subidos...\n');

// Función para obtener información de un archivo
function getFileInfo(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filePath).toLowerCase();
    
    let info = {
      path: filePath,
      size: stats.size,
      sizeFormatted: formatBytes(stats.size),
      created: stats.birthtime,
      modified: stats.mtime,
      extension: ext,
      isVideo: ['.mp4', '.webm', '.avi', '.mov'].includes(ext),
      isImage: ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)
    };

    // Si es un video, intentar obtener información adicional
    if (info.isVideo) {
      try {
        const ffprobeOutput = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${filePath}"`, { encoding: 'utf8' });
        const videoInfo = JSON.parse(ffprobeOutput);
        
        if (videoInfo.format) {
          info.duration = parseFloat(videoInfo.format.duration);
          info.bitrate = parseInt(videoInfo.format.bit_rate);
        }
        
        const videoStream = videoInfo.streams?.find(s => s.codec_type === 'video');
        if (videoStream) {
          info.resolution = `${videoStream.width}x${videoStream.height}`;
          info.codec = videoStream.codec_name;
          info.fps = eval(videoStream.r_frame_rate);
        }
      } catch (error) {
        info.videoError = 'No se pudo obtener información del video';
      }
    }

    return info;
  } catch (error) {
    return { path: filePath, error: error.message };
  }
}

// Función para formatear bytes
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Función para formatear duración
function formatDuration(seconds) {
  if (!seconds) return 'N/A';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Verificar directorio de uploads
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

console.log(`📁 Directorio de uploads: ${uploadsDir}`);

if (!fs.existsSync(uploadsDir)) {
  console.log('❌ El directorio de uploads no existe');
  process.exit(1);
}

// Listar archivos
const files = fs.readdirSync(uploadsDir);

if (files.length === 0) {
  console.log('📭 No hay archivos en el directorio de uploads');
  process.exit(0);
}

console.log(`📊 Total de archivos: ${files.length}\n`);

// Analizar cada archivo
const fileInfos = files.map(filename => {
  const filePath = path.join(uploadsDir, filename);
  return getFileInfo(filePath);
});

// Mostrar resumen
const videos = fileInfos.filter(f => f.isVideo && !f.error);
const images = fileInfos.filter(f => f.isImage && !f.error);
const errors = fileInfos.filter(f => f.error);

console.log('📈 Resumen:');
console.log(`  🎥 Videos: ${videos.length}`);
console.log(`  🖼️  Imágenes: ${images.length}`);
console.log(`  ❌ Errores: ${errors.length}\n`);

// Mostrar detalles de videos
if (videos.length > 0) {
  console.log('🎥 Detalles de Videos:');
  console.log('─'.repeat(80));
  videos.forEach(video => {
    console.log(`📁 ${path.basename(video.path)}`);
    console.log(`   📏 Tamaño: ${video.sizeFormatted}`);
    console.log(`   ⏱️  Duración: ${formatDuration(video.duration)}`);
    console.log(`   📺 Resolución: ${video.resolution || 'N/A'}`);
    console.log(`   🎬 Codec: ${video.codec || 'N/A'}`);
    console.log(`   📊 Bitrate: ${video.bitrate ? Math.round(video.bitrate/1000) + ' kbps' : 'N/A'}`);
    console.log(`   🔗 URL: /uploads/${encodeURIComponent(path.basename(video.path))}`);
    if (video.videoError) {
      console.log(`   ⚠️  Error: ${video.videoError}`);
    }
    console.log('');
  });
}

// Mostrar detalles de imágenes
if (images.length > 0) {
  console.log('🖼️  Detalles de Imágenes:');
  console.log('─'.repeat(80));
  images.forEach(image => {
    console.log(`📁 ${path.basename(image.path)}`);
    console.log(`   📏 Tamaño: ${image.sizeFormatted}`);
    console.log(`   🔗 URL: /uploads/${encodeURIComponent(path.basename(image.path))}`);
    console.log('');
  });
}

// Mostrar errores
if (errors.length > 0) {
  console.log('❌ Archivos con errores:');
  console.log('─'.repeat(80));
  errors.forEach(error => {
    console.log(`📁 ${path.basename(error.path)}`);
    console.log(`   ❌ Error: ${error.error}`);
    console.log('');
  });
}

// Verificar permisos
console.log('🔐 Verificando permisos...');
try {
  const testFile = path.join(uploadsDir, 'test-permissions.txt');
  fs.writeFileSync(testFile, 'test');
  fs.unlinkSync(testFile);
  console.log('✅ Permisos de escritura: OK');
} catch (error) {
  console.log('❌ Permisos de escritura: ERROR -', error.message);
}

// Verificar acceso web
console.log('\n🌐 URLs de prueba:');
console.log('─'.repeat(50));
console.log('🏠 Página principal: http://172.16.31.17:3000');
console.log('📤 Subir archivos: http://172.16.31.17:3000/admin/content');
console.log('🔍 API de archivos: http://172.16.31.17:3000/api/upload');

if (files.length > 0) {
  const firstFile = files[0];
  console.log(`📁 Archivo de prueba: http://172.16.31.17:3000/uploads/${encodeURIComponent(firstFile)}`);
}

console.log('\n💡 Consejos para solucionar problemas:');
console.log('─'.repeat(50));
console.log('1. Verifica que los videos estén en formato MP4 o WebM');
console.log('2. Asegúrate de que los videos no estén corruptos');
console.log('3. Prueba con videos de menor resolución/tamaño');
console.log('4. Verifica la conexión de red entre dispositivos');
console.log('5. Revisa los logs del servidor para errores específicos');
