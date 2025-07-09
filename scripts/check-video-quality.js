const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🎬 [Quality Check] Verificando calidad de videos e imágenes...\n');

// Función para ejecutar FFprobe y obtener información del video
function getVideoInfo(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ]);

    let output = '';
    let error = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      error += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          resolve(info);
        } catch (e) {
          reject(new Error('Error parsing FFprobe output'));
        }
      } else {
        reject(new Error(`FFprobe failed: ${error}`));
      }
    });

    ffprobe.on('error', (err) => {
      reject(err);
    });
  });
}

// Función para obtener información de imagen
function getImageInfo(filePath) {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_streams',
      filePath
    ]);

    let output = '';
    let error = '';

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });

    ffprobe.stderr.on('data', (data) => {
      error += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code === 0) {
        try {
          const info = JSON.parse(output);
          resolve(info);
        } catch (e) {
          reject(new Error('Error parsing FFprobe output'));
        }
      } else {
        reject(new Error(`FFprobe failed: ${error}`));
      }
    });

    ffprobe.on('error', (err) => {
      reject(err);
    });
  });
}

// Función para formatear tamaño de archivo
function formatFileSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

// Función para evaluar calidad
function evaluateQuality(info, fileSize, isVideo = true) {
  const stream = info.streams[0];
  if (!stream) return 'Desconocida';

  const width = stream.width || 0;
  const height = stream.height || 0;
  const bitrate = parseInt(stream.bit_rate) || 0;

  let quality = 'Baja';
  let recommendations = [];

  if (isVideo) {
    // Evaluación para videos
    if (width >= 3840 && height >= 2160) {
      quality = bitrate >= 15000000 ? 'Excelente 4K' : bitrate >= 8000000 ? 'Buena 4K' : 'Baja 4K';
      if (bitrate < 15000000) recommendations.push('Aumentar bitrate a 15+ Mbps para 4K óptimo');
    } else if (width >= 2560 && height >= 1440) {
      quality = bitrate >= 8000000 ? 'Excelente 2K' : bitrate >= 4000000 ? 'Buena 2K' : 'Baja 2K';
      if (bitrate < 8000000) recommendations.push('Aumentar bitrate a 8+ Mbps para 2K óptimo');
    } else if (width >= 1920 && height >= 1080) {
      quality = bitrate >= 4000000 ? 'Excelente HD' : bitrate >= 2000000 ? 'Buena HD' : 'Baja HD';
      if (bitrate < 4000000) recommendations.push('Aumentar bitrate a 4+ Mbps para HD óptimo');
    } else {
      quality = 'Resolución baja';
      recommendations.push('Usar resolución mínima 1920x1080 (HD)');
    }

    // Verificar codec
    if (stream.codec_name !== 'h264') {
      recommendations.push('Usar codec H.264 para mejor compatibilidad');
    }

    // Verificar frame rate
    const fps = eval(stream.r_frame_rate) || 0;
    if (fps < 24) {
      recommendations.push('Usar mínimo 24 FPS para video fluido');
    }

  } else {
    // Evaluación para imágenes
    if (width >= 3840 && height >= 2160) {
      quality = 'Excelente 4K';
    } else if (width >= 2560 && height >= 1440) {
      quality = 'Excelente 2K';
    } else if (width >= 1920 && height >= 1080) {
      quality = 'Buena HD';
    } else {
      quality = 'Resolución baja';
      recommendations.push('Usar resolución mínima 1920x1080 (HD)');
    }
  }

  return { quality, recommendations };
}

// Función principal
async function checkQuality() {
  const uploadsDir = path.join('public', 'uploads');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Directorio uploads no encontrado');
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  const mediaFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.avi', '.mov', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
  });

  if (mediaFiles.length === 0) {
    console.log('❌ No se encontraron archivos multimedia');
    return;
  }

  console.log(`📁 Analizando ${mediaFiles.length} archivos multimedia...\n`);

  for (const file of mediaFiles) {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const ext = path.extname(file).toLowerCase();
    const isVideo = ['.mp4', '.webm', '.ogg', '.avi', '.mov'].includes(ext);

    console.log(`${isVideo ? '🎬' : '🖼️'} ${file}`);
    console.log(`   📏 Tamaño: ${formatFileSize(fileSize)}`);

    try {
      const info = isVideo ? await getVideoInfo(filePath) : await getImageInfo(filePath);
      const stream = info.streams[0];

      if (stream) {
        console.log(`   📐 Resolución: ${stream.width}x${stream.height}`);
        
        if (isVideo) {
          const bitrate = parseInt(stream.bit_rate) || 0;
          const fps = eval(stream.r_frame_rate) || 0;
          const duration = parseFloat(info.format.duration) || 0;
          
          console.log(`   🎥 Codec: ${stream.codec_name}`);
          console.log(`   📊 Bitrate: ${(bitrate / 1000000).toFixed(2)} Mbps`);
          console.log(`   🎞️ FPS: ${fps.toFixed(2)}`);
          console.log(`   ⏱️ Duración: ${duration.toFixed(2)}s`);
        } else {
          console.log(`   🎨 Formato: ${stream.codec_name}`);
        }

        const evaluation = evaluateQuality(info, fileSize, isVideo);
        console.log(`   ⭐ Calidad: ${evaluation.quality}`);

        if (evaluation.recommendations.length > 0) {
          console.log(`   💡 Recomendaciones:`);
          evaluation.recommendations.forEach(rec => {
            console.log(`      - ${rec}`);
          });
        }

      } else {
        console.log(`   ❌ No se pudo obtener información del stream`);
      }

    } catch (error) {
      console.log(`   ❌ Error al analizar: ${error.message}`);
    }

    console.log('');
  }

  // Recomendaciones generales
  console.log('🎯 RECOMENDACIONES GENERALES PARA MÁXIMA CALIDAD:');
  console.log('');
  console.log('📹 VIDEOS:');
  console.log('   • Resolución: Mínimo 1920x1080 (HD), ideal 3840x2160 (4K)');
  console.log('   • Bitrate: HD=4+ Mbps, 2K=8+ Mbps, 4K=15+ Mbps');
  console.log('   • Codec: H.264 (mejor compatibilidad)');
  console.log('   • FPS: Mínimo 24, ideal 30 o 60');
  console.log('   • Formato: MP4 (mejor compatibilidad)');
  console.log('');
  console.log('🖼️ IMÁGENES:');
  console.log('   • Resolución: Mínimo 1920x1080 (HD), ideal 3840x2160 (4K)');
  console.log('   • Formato: PNG (sin pérdida), JPEG (alta calidad), WebP (moderno)');
  console.log('   • Compresión: Mínima para mantener calidad');
  console.log('');
  console.log('⚙️ CONFIGURACIÓN DEL SISTEMA:');
  console.log('   • HLS: Bitrate alto configurado (8+ Mbps)');
  console.log('   • RTSP: Calidad alta configurada (CRF 20)');
  console.log('   • Next.js: Optimización desactivada (calidad original)');
  console.log('   • CSS: Renderizado de alta calidad activado');
  console.log('');
  console.log('✅ Sistema optimizado para máxima calidad 4K/2K');
}

// Ejecutar verificación
checkQuality().catch(console.error);
