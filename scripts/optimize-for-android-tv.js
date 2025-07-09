#!/usr/bin/env node

/**
 * Script de optimización para Android TV
 * Optimiza videos y configuraciones para mejor rendimiento en TVs de 65"
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Iniciando optimización para Android TV...');

// Configuraciones optimizadas para Android TV
const TV_OPTIMIZATIONS = {
  // Configuraciones de video para mejor rendimiento
  video: {
    maxBitrate: '3000k',      // Bitrate máximo para TVs
    maxResolution: '1920x1080', // Full HD máximo
    fps: '30',                // 30 FPS estable
    codec: 'h264',           // Codec más compatible
    profile: 'main',         // Perfil H.264 main
    level: '4.0'             // Nivel 4.0 para compatibilidad
  },
  
  // Configuraciones de audio
  audio: {
    codec: 'aac',
    bitrate: '128k',
    sampleRate: '44100',
    channels: '2'
  },
  
  // Configuraciones del navegador para TV
  browser: {
    memoryLimit: '512MB',
    cacheSize: '100MB',
    preloadStrategy: 'auto'
  }
};

/**
 * Verificar si ffmpeg está disponible
 */
function checkFFmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    console.log('✅ FFmpeg disponible');
    return true;
  } catch (error) {
    console.log('❌ FFmpeg no encontrado');
    return false;
  }
}

/**
 * Optimizar un video para Android TV
 */
function optimizeVideoForTV(inputPath, outputPath) {
  const { video, audio } = TV_OPTIMIZATIONS;
  
  const ffmpegCommand = [
    'ffmpeg',
    '-i', `"${inputPath}"`,
    '-c:v', video.codec,
    '-profile:v', video.profile,
    '-level:v', video.level,
    '-b:v', video.maxBitrate,
    '-maxrate', video.maxBitrate,
    '-bufsize', '6000k',
    '-r', video.fps,
    '-vf', `scale=${video.maxResolution}:force_original_aspect_ratio=decrease,pad=${video.maxResolution}:(ow-iw)/2:(oh-ih)/2`,
    '-c:a', audio.codec,
    '-b:a', audio.bitrate,
    '-ar', audio.sampleRate,
    '-ac', audio.channels,
    '-movflags', '+faststart',
    '-preset', 'medium',
    '-y',
    `"${outputPath}"`
  ].join(' ');

  console.log(`🎬 Optimizando: ${path.basename(inputPath)}`);
  
  try {
    execSync(ffmpegCommand, { stdio: 'pipe' });
    console.log(`✅ Optimizado: ${path.basename(outputPath)}`);
    return true;
  } catch (error) {
    console.error(`❌ Error optimizando ${path.basename(inputPath)}:`, error.message);
    return false;
  }
}

/**
 * Escanear y optimizar videos en una carpeta
 */
function optimizeVideosInFolder(folderPath) {
  if (!fs.existsSync(folderPath)) {
    console.log(`⚠️ Carpeta no encontrada: ${folderPath}`);
    return;
  }

  const files = fs.readdirSync(folderPath);
  const videoFiles = files.filter(file => 
    /\.(mp4|avi|mov|mkv|webm)$/i.test(file)
  );

  if (videoFiles.length === 0) {
    console.log(`📁 No se encontraron videos en: ${folderPath}`);
    return;
  }

  console.log(`📁 Procesando ${videoFiles.length} videos en: ${folderPath}`);

  let optimized = 0;
  let errors = 0;

  for (const videoFile of videoFiles) {
    const inputPath = path.join(folderPath, videoFile);
    const outputPath = path.join(folderPath, `tv_optimized_${videoFile}`);
    
    // Saltar si ya existe la versión optimizada
    if (fs.existsSync(outputPath)) {
      console.log(`⏭️ Ya optimizado: ${videoFile}`);
      continue;
    }

    if (optimizeVideoForTV(inputPath, outputPath)) {
      optimized++;
      
      // Opcional: reemplazar el archivo original
      // fs.unlinkSync(inputPath);
      // fs.renameSync(outputPath, inputPath);
    } else {
      errors++;
    }
  }

  console.log(`📊 Resultados para ${folderPath}:`);
  console.log(`   ✅ Optimizados: ${optimized}`);
  console.log(`   ❌ Errores: ${errors}`);
  console.log(`   ⏭️ Ya optimizados: ${videoFiles.length - optimized - errors}`);
}

/**
 * Crear configuración optimizada para TV
 */
function createTVOptimizedSettings() {
  const settingsPath = path.join(process.cwd(), 'data', 'tv-settings.json');
  
  const tvSettings = {
    systemName: 'Android TV CODECRAFT',
    transitionTime: 5, // Tiempo más corto para TVs
    defaultVolume: 30, // Volumen más bajo por defecto
    tvOptimizations: {
      enabled: true,
      autoplay: {
        strategy: 'aggressive',
        retryAttempts: 3,
        retryDelay: 2000
      },
      memory: {
        clearBetweenVideos: true,
        preloadNext: false,
        maxCacheSize: '100MB'
      },
      video: {
        preload: 'auto',
        playsInline: true,
        muted: true,
        controls: false
      }
    }
  };

  fs.writeFileSync(settingsPath, JSON.stringify(tvSettings, null, 2));
  console.log(`✅ Configuración para TV creada: ${settingsPath}`);
}

/**
 * Función principal
 */
function main() {
  console.log('🔧 Optimización para Android TV iniciada\n');

  // Verificar dependencias
  if (!checkFFmpeg()) {
    console.log('⚠️ Instala FFmpeg para optimizar videos');
    console.log('   Ubuntu: sudo apt install ffmpeg');
    console.log('   Continuando sin optimización de video...\n');
  }

  // Crear configuración optimizada para TV
  createTVOptimizedSettings();

  // Optimizar videos en carpetas de contenido
  const contentFolders = [
    '/home/uct/Música',
    path.join(process.cwd(), 'public', 'uploads')
  ];

  if (checkFFmpeg()) {
    for (const folder of contentFolders) {
      if (fs.existsSync(folder)) {
        optimizeVideosInFolder(folder);
      }
    }
  }

  console.log('\n🎯 Optimización completada!');
  console.log('\n📋 Recomendaciones para Android TV:');
  console.log('   • Usa videos en formato MP4 H.264');
  console.log('   • Resolución máxima: 1920x1080');
  console.log('   • Bitrate máximo: 3000k');
  console.log('   • Duración recomendada: 30-120 segundos por video');
  console.log('   • Evita videos muy largos (>5 minutos)');
  console.log('\n📺 Para mejor rendimiento en TV:');
  console.log('   • Reinicia la TV cada 24 horas');
  console.log('   • Limpia la caché del navegador regularmente');
  console.log('   • Usa conexión Ethernet en lugar de WiFi');
}

// Ejecutar si se llama directamente
if (require.main === module) {
  main();
}

module.exports = {
  optimizeVideoForTV,
  optimizeVideosInFolder,
  createTVOptimizedSettings,
  TV_OPTIMIZATIONS
};
