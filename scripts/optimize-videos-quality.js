const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🎬 [Video Optimizer] Optimizando videos para máxima calidad...\n');

// Función para ejecutar FFmpeg
function runFFmpeg(inputPath, outputPath, args) {
  return new Promise((resolve, reject) => {
    console.log(`🎥 Procesando: ${path.basename(inputPath)}`);
    console.log(`📤 Salida: ${path.basename(outputPath)}`);
    console.log(`⚙️ Comando: ffmpeg ${args.join(' ')}`);

    const ffmpeg = spawn('ffmpeg', args);
    
    let stderr = '';
    
    ffmpeg.stderr.on('data', (data) => {
      stderr += data.toString();
      // Mostrar progreso
      const progressMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (progressMatch) {
        process.stdout.write(`\r⏳ Progreso: ${progressMatch[0]}     `);
      }
    });

    ffmpeg.on('close', (code) => {
      process.stdout.write('\n');
      if (code === 0) {
        console.log(`✅ Completado: ${path.basename(outputPath)}\n`);
        resolve();
      } else {
        console.log(`❌ Error en: ${path.basename(inputPath)}`);
        console.log(`Error: ${stderr.slice(-500)}\n`);
        reject(new Error(`FFmpeg failed with code ${code}`));
      }
    });

    ffmpeg.on('error', (err) => {
      reject(err);
    });
  });
}

// Función para obtener información del video
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

    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
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
        reject(new Error('FFprobe failed'));
      }
    });
  });
}

// Función para optimizar video vertical a horizontal
async function optimizeVideo(inputPath, outputPath) {
  try {
    const info = await getVideoInfo(inputPath);
    const videoStream = info.streams.find(s => s.codec_type === 'video');
    
    if (!videoStream) {
      throw new Error('No video stream found');
    }

    const width = videoStream.width;
    const height = videoStream.height;
    const isVertical = height > width;
    
    console.log(`📐 Resolución original: ${width}x${height} ${isVertical ? '(Vertical)' : '(Horizontal)'}`);

    // Configuración base para máxima calidad
    const baseArgs = [
      '-i', inputPath,
      '-y', // Sobrescribir archivo de salida
      
      // Configuración de video para máxima calidad
      '-c:v', 'libx264',
      '-preset', 'slow', // Preset lento para máxima calidad
      '-crf', '18', // Factor de calidad constante (18 = muy alta calidad)
      '-profile:v', 'high',
      '-level', '5.1',
      '-pix_fmt', 'yuv420p',
      
      // Configuración de audio de alta calidad
      '-c:a', 'aac',
      '-b:a', '320k',
      '-ar', '48000',
      '-ac', '2',
      
      // Configuraciones adicionales
      '-movflags', '+faststart', // Optimizar para streaming
      '-avoid_negative_ts', 'make_zero',
    ];

    if (isVertical) {
      // Para videos verticales: crear composición horizontal con fondo borroso
      console.log('🔄 Convirtiendo video vertical a horizontal con fondo borroso...');
      
      const targetWidth = 1920;
      const targetHeight = 1080;
      
      // Filtro complejo para crear fondo borroso y centrar video
      const videoFilter = [
        // Crear fondo borroso escalado
        `[0:v]scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},gblur=sigma=20[bg]`,
        // Escalar video principal manteniendo proporción
        `[0:v]scale=-1:${targetHeight}:force_original_aspect_ratio=decrease[fg]`,
        // Superponer video principal sobre fondo borroso
        `[bg][fg]overlay=(W-w)/2:(H-h)/2[v]`
      ].join(';');

      baseArgs.push(
        '-filter_complex', videoFilter,
        '-map', '[v]',
        '-map', '0:a?', // Mapear audio si existe
        '-s', `${targetWidth}x${targetHeight}`
      );
      
    } else {
      // Para videos horizontales: escalar a 4K manteniendo calidad
      console.log('📈 Escalando video horizontal a máxima calidad...');
      
      if (width < 1920 || height < 1080) {
        // Escalar a HD mínimo
        baseArgs.push(
          '-vf', 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080',
          '-s', '1920x1080'
        );
      } else if (width < 3840 || height < 2160) {
        // Escalar a 4K si es posible
        baseArgs.push(
          '-vf', 'scale=3840:2160:force_original_aspect_ratio=increase,crop=3840:2160:flags=lanczos',
          '-s', '3840x2160'
        );
      }
    }

    baseArgs.push(outputPath);

    await runFFmpeg(inputPath, outputPath, baseArgs);
    
    // Verificar el archivo de salida
    const outputInfo = await getVideoInfo(outputPath);
    const outputVideoStream = outputInfo.streams.find(s => s.codec_type === 'video');
    
    if (outputVideoStream) {
      console.log(`✅ Optimización completada:`);
      console.log(`   📐 Nueva resolución: ${outputVideoStream.width}x${outputVideoStream.height}`);
      console.log(`   📊 Bitrate: ${(parseInt(outputVideoStream.bit_rate) / 1000000).toFixed(2)} Mbps`);
      console.log(`   🎞️ FPS: ${eval(outputVideoStream.r_frame_rate).toFixed(2)}`);
      
      const inputSize = fs.statSync(inputPath).size;
      const outputSize = fs.statSync(outputPath).size;
      console.log(`   📏 Tamaño: ${(inputSize / 1024 / 1024).toFixed(2)} MB → ${(outputSize / 1024 / 1024).toFixed(2)} MB`);
    }

  } catch (error) {
    console.error(`❌ Error optimizando ${path.basename(inputPath)}:`, error.message);
    throw error;
  }
}

// Función principal
async function optimizeAllVideos() {
  const uploadsDir = path.join('public', 'uploads');
  const optimizedDir = path.join('public', 'uploads', 'optimized');
  
  if (!fs.existsSync(uploadsDir)) {
    console.log('❌ Directorio uploads no encontrado');
    return;
  }

  // Crear directorio optimizado
  if (!fs.existsSync(optimizedDir)) {
    fs.mkdirSync(optimizedDir, { recursive: true });
    console.log('📁 Directorio optimizado creado');
  }

  const files = fs.readdirSync(uploadsDir);
  const videoFiles = files.filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.mp4', '.webm', '.ogg', '.avi', '.mov'].includes(ext);
  });

  if (videoFiles.length === 0) {
    console.log('❌ No se encontraron videos para optimizar');
    return;
  }

  console.log(`🎬 Optimizando ${videoFiles.length} videos para máxima calidad...\n`);

  for (const file of videoFiles) {
    const inputPath = path.join(uploadsDir, file);
    const outputPath = path.join(optimizedDir, `optimized_${file}`);
    
    // Saltar si ya existe el archivo optimizado
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️ Saltando ${file} (ya optimizado)\n`);
      continue;
    }

    try {
      await optimizeVideo(inputPath, outputPath);
    } catch (error) {
      console.error(`❌ Falló la optimización de ${file}:`, error.message);
    }
  }

  console.log('🎉 OPTIMIZACIÓN COMPLETADA!');
  console.log('');
  console.log('📁 Archivos optimizados guardados en: public/uploads/optimized/');
  console.log('');
  console.log('🔄 PRÓXIMOS PASOS:');
  console.log('1. Revisa los videos optimizados en la carpeta optimized/');
  console.log('2. Si estás satisfecho con la calidad, reemplaza los originales');
  console.log('3. Actualiza las playlists para usar los videos optimizados');
  console.log('4. Los videos verticales ahora tienen fondo borroso y son horizontales');
  console.log('5. Los videos horizontales están escalados a máxima calidad');
  console.log('');
  console.log('⚠️ IMPORTANTE: Los videos optimizados mantienen máxima calidad pero pueden ser más grandes');
}

// Ejecutar optimización
optimizeAllVideos().catch(console.error);
