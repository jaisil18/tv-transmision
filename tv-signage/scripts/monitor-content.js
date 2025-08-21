#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('👁️ Iniciando monitor de contenido...\n');

let lastFileCount = 0;
let lastFileList = [];

function checkContent() {
  try {
    const uploadsDir = path.join('public', 'uploads');
    const playlistsFile = path.join('data', 'playlists.json');

    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Directorio uploads no encontrado');
      return;
    }

    // Obtener archivos actuales
    const currentFiles = fs.readdirSync(uploadsDir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.webm', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });

    const currentFileCount = currentFiles.length;
    const currentFileList = currentFiles.sort();

    // Verificar si hay cambios
    const filesChanged = JSON.stringify(currentFileList) !== JSON.stringify(lastFileList);
    const countChanged = currentFileCount !== lastFileCount;

    if (filesChanged || countChanged) {
      console.log(`\n🔄 [${new Date().toLocaleTimeString()}] Cambios detectados:`);
      console.log(`   📁 Archivos: ${lastFileCount} → ${currentFileCount}`);
      
      if (filesChanged) {
        const newFiles = currentFileList.filter(f => !lastFileList.includes(f));
        const removedFiles = lastFileList.filter(f => !currentFileList.includes(f));
        
        if (newFiles.length > 0) {
          console.log(`   ✅ Nuevos archivos: ${newFiles.join(', ')}`);
        }
        
        if (removedFiles.length > 0) {
          console.log(`   ❌ Archivos eliminados: ${removedFiles.join(', ')}`);
        }
      }

      // Ejecutar reparación automática
      console.log('   🔧 Ejecutando reparación automática...');
      
      try {
        execSync('node scripts/fix-missing-content.js', { 
          stdio: 'inherit',
          cwd: process.cwd()
        });
        console.log('   ✅ Reparación completada');
      } catch (error) {
        console.error('   ❌ Error en reparación:', error.message);
      }

      // Actualizar referencias
      lastFileCount = currentFileCount;
      lastFileList = currentFileList;
      
      console.log('   📢 Cambios procesados\n');
    } else {
      // Solo mostrar estado cada 30 segundos
      const now = new Date();
      if (now.getSeconds() % 30 === 0) {
        console.log(`⏰ [${now.toLocaleTimeString()}] Monitoreando... (${currentFileCount} archivos)`);
      }
    }

  } catch (error) {
    console.error('❌ Error en monitoreo:', error);
  }
}

// Verificación inicial
console.log('🔍 Verificación inicial...');
checkContent();

// Monitoreo continuo cada 5 segundos
console.log('⏰ Iniciando monitoreo cada 5 segundos...');
console.log('   Presiona Ctrl+C para detener\n');

setInterval(checkContent, 5000);

// Manejo de señales para salida limpia
process.on('SIGINT', () => {
  console.log('\n👋 Deteniendo monitor de contenido...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Deteniendo monitor de contenido...');
  process.exit(0);
});
