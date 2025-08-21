const { spawn } = require('child_process');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

/**
 * Script para instalar una versión completa de FFmpeg con soporte RTSP
 */

console.log('🎥 Instalando FFmpeg completo con soporte RTSP...\n');

// Función para descargar archivo
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        // Seguir redirección
        return downloadFile(response.headers.location, dest).then(resolve).catch(reject);
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Error HTTP: ${response.statusCode}`));
        return;
      }
      
      const totalSize = parseInt(response.headers['content-length'], 10);
      let downloadedSize = 0;
      
      response.on('data', (chunk) => {
        downloadedSize += chunk.length;
        const progress = ((downloadedSize / totalSize) * 100).toFixed(1);
        process.stdout.write(`\r📥 Descargando: ${progress}%`);
      });
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log('\n✅ Descarga completada');
        resolve();
      });
      
      file.on('error', (err) => {
        fs.unlink(dest, () => {}); // Eliminar archivo parcial
        reject(err);
      });
    }).on('error', reject);
  });
}

// Función para extraer archivo ZIP (Windows)
function extractZip(zipPath, extractPath) {
  return new Promise((resolve, reject) => {
    const powershellCommand = `Expand-Archive -Path "${zipPath}" -DestinationPath "${extractPath}" -Force`;
    
    const process = spawn('powershell', ['-Command', powershellCommand], {
      stdio: 'pipe'
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Extracción completada');
        resolve();
      } else {
        reject(new Error(`Error en extracción: código ${code}`));
      }
    });
    
    process.on('error', reject);
  });
}

// Función principal
async function main() {
  try {
    // Crear directorio para FFmpeg
    const ffmpegDir = path.join(process.cwd(), 'bin', 'ffmpeg');
    if (!fs.existsSync(ffmpegDir)) {
      fs.mkdirSync(ffmpegDir, { recursive: true });
    }
    
    // URL de FFmpeg completo para Windows
    const ffmpegUrl = 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip';
    const zipPath = path.join(ffmpegDir, 'ffmpeg.zip');
    const extractPath = ffmpegDir;
    
    console.log('📥 Descargando FFmpeg completo...');
    await downloadFile(ffmpegUrl, zipPath);
    
    console.log('📦 Extrayendo FFmpeg...');
    await extractZip(zipPath, extractPath);
    
    // Buscar el ejecutable de FFmpeg
    const extractedDirs = fs.readdirSync(extractPath).filter(item => 
      fs.statSync(path.join(extractPath, item)).isDirectory() && 
      item.startsWith('ffmpeg-')
    );
    
    if (extractedDirs.length === 0) {
      throw new Error('No se encontró el directorio de FFmpeg extraído');
    }
    
    const ffmpegBinDir = path.join(extractPath, extractedDirs[0], 'bin');
    const ffmpegExe = path.join(ffmpegBinDir, 'ffmpeg.exe');
    
    if (!fs.existsSync(ffmpegExe)) {
      throw new Error('No se encontró el ejecutable de FFmpeg');
    }
    
    // Verificar que funciona
    console.log('🔧 Verificando FFmpeg instalado...');
    const testResult = await testFFmpeg(ffmpegExe);
    
    if (testResult.success) {
      console.log('🎉 FFmpeg completo instalado exitosamente!');
      console.log(`📍 Ubicación: ${ffmpegExe}`);
      console.log(`📋 Versión: ${testResult.version}`);
      
      // Verificar capacidades RTSP
      console.log('\n🔧 Verificando capacidades RTSP...');
      await checkRTSPCapabilities(ffmpegExe);
      
      // Crear archivo de configuración
      const configPath = path.join(process.cwd(), 'ffmpeg-config.json');
      const config = {
        ffmpegPath: ffmpegExe,
        version: testResult.version,
        installedAt: new Date().toISOString(),
        hasRTSP: true
      };
      
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      console.log(`\n📄 Configuración guardada en: ${configPath}`);
      
    } else {
      throw new Error('FFmpeg no funciona correctamente');
    }
    
    // Limpiar archivo ZIP
    fs.unlinkSync(zipPath);
    console.log('\n🧹 Archivos temporales eliminados');
    
  } catch (error) {
    console.error('\n❌ Error durante la instalación:', error.message);
    console.log('\n💡 Alternativas:');
    console.log('   1. Instalar FFmpeg manualmente desde: https://ffmpeg.org/download.html');
    console.log('   2. Usar Chocolatey: choco install ffmpeg');
    console.log('   3. Usar Scoop: scoop install ffmpeg');
    process.exit(1);
  }
}

// Función para probar FFmpeg
function testFFmpeg(ffmpegPath) {
  return new Promise((resolve) => {
    const process = spawn(ffmpegPath, ['-version'], { stdio: 'pipe' });
    
    let output = '';
    process.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        const version = output.split('\n')[0];
        resolve({ success: true, version });
      } else {
        resolve({ success: false });
      }
    });
    
    process.on('error', () => {
      resolve({ success: false });
    });
  });
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

// Ejecutar instalación
main().catch(console.error);
