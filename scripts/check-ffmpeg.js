const { spawn } = require('child_process');
const path = require('path');

/**
 * Script para verificar y configurar FFmpeg para streams RTSP
 */

console.log('🎥 Verificando configuración de FFmpeg para streams RTSP...\n');

// Función para verificar si FFmpeg está disponible
function checkFFmpeg(ffmpegPath) {
  return new Promise((resolve) => {
    const process = spawn(ffmpegPath, ['-version'], { stdio: 'pipe' });
    
    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        const version = output.split('\n')[0];
        resolve({ available: true, version, path: ffmpegPath });
      } else {
        resolve({ available: false, path: ffmpegPath });
      }
    });
    
    process.on('error', () => {
      resolve({ available: false, path: ffmpegPath });
    });
  });
}

// Función principal
async function main() {
  const ffmpegSources = [];

  // 1. Verificar FFmpeg del sistema PRIMERO (mejor soporte RTSP)
  ffmpegSources.push({ name: 'sistema', path: 'ffmpeg' });

  // 2. Verificar @ffmpeg-installer/ffmpeg
  try {
    const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
    if (ffmpegInstaller && ffmpegInstaller.path) {
      ffmpegSources.push({ name: '@ffmpeg-installer/ffmpeg', path: ffmpegInstaller.path });
    }
  } catch (error) {
    console.log('⚠️  @ffmpeg-installer/ffmpeg no encontrado');
  }

  // 3. Verificar ffmpeg-static (limitado para RTSP)
  try {
    const ffmpegStatic = require('ffmpeg-static');
    if (ffmpegStatic) {
      ffmpegSources.push({ name: 'ffmpeg-static', path: ffmpegStatic });
    }
  } catch (error) {
    console.log('⚠️  ffmpeg-static no encontrado');
  }
  
  console.log('🔍 Verificando fuentes de FFmpeg disponibles:\n');
  
  let workingFFmpeg = null;
  
  for (const source of ffmpegSources) {
    console.log(`Verificando ${source.name}...`);
    const result = await checkFFmpeg(source.path);
    
    if (result.available) {
      console.log(`✅ ${source.name}: ${result.version}`);
      console.log(`   Ruta: ${result.path}\n`);
      
      if (!workingFFmpeg) {
        workingFFmpeg = result;
      }
    } else {
      console.log(`❌ ${source.name}: No disponible\n`);
    }
  }
  
  if (workingFFmpeg) {
    console.log('🎉 FFmpeg configurado correctamente!');
    console.log(`📍 Usando: ${workingFFmpeg.path}`);
    console.log(`📋 Versión: ${workingFFmpeg.version}\n`);
    
    // Verificar capacidades RTSP
    console.log('🔧 Verificando capacidades RTSP...');
    await checkRTSPCapabilities(workingFFmpeg.path);
    
  } else {
    console.log('❌ No se encontró ninguna instalación funcional de FFmpeg');
    console.log('\n📦 Para instalar FFmpeg, ejecuta:');
    console.log('   npm install ffmpeg-static');
    console.log('   o');
    console.log('   npm install @ffmpeg-installer/ffmpeg');
    console.log('\n🌐 O instala FFmpeg en tu sistema:');
    console.log('   Windows: https://ffmpeg.org/download.html#build-windows');
    console.log('   macOS: brew install ffmpeg');
    console.log('   Linux: sudo apt install ffmpeg');
  }
}

// Función para verificar capacidades RTSP
function checkRTSPCapabilities(ffmpegPath) {
  return new Promise((resolve) => {
    const process = spawn(ffmpegPath, ['-protocols'], { stdio: 'pipe' });
    
    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        const protocols = output.toLowerCase();
        const hasRTSP = protocols.includes('rtsp');
        const hasTCP = protocols.includes('tcp');
        const hasUDP = protocols.includes('udp');
        
        console.log(`   RTSP: ${hasRTSP ? '✅' : '❌'}`);
        console.log(`   TCP: ${hasTCP ? '✅' : '❌'}`);
        console.log(`   UDP: ${hasUDP ? '✅' : '❌'}`);
        
        if (hasRTSP && hasTCP) {
          console.log('\n🎯 FFmpeg está listo para streams RTSP!');
        } else {
          console.log('\n⚠️  FFmpeg puede tener limitaciones para RTSP');
        }
      } else {
        console.log('   ⚠️  No se pudieron verificar los protocolos');
      }
      resolve();
    });
    
    process.on('error', () => {
      console.log('   ❌ Error al verificar protocolos');
      resolve();
    });
  });
}

// Ejecutar verificación
main().catch(console.error);
