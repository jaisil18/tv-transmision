#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🧹 Limpiando playlists de archivos inexistentes...\n');

async function cleanPlaylists() {
  const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  try {
    // Leer playlists
    const playlistsData = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    console.log(`📋 Playlists encontradas: ${playlistsData.length}`);

    // Obtener lista de archivos existentes
    const existingFiles = fs.readdirSync(uploadsDir);
    console.log(`📁 Archivos en uploads: ${existingFiles.length}`);

    let totalItemsRemoved = 0;
    let totalItemsChecked = 0;

    // Procesar cada playlist
    for (let i = 0; i < playlistsData.length; i++) {
      const playlist = playlistsData[i];
      console.log(`\n📋 Procesando playlist: "${playlist.name}"`);
      console.log(`   Items originales: ${playlist.items.length}`);

      const originalItemCount = playlist.items.length;
      
      // Filtrar items que existen
      playlist.items = playlist.items.filter(item => {
        totalItemsChecked++;
        
        // Extraer nombre del archivo de la URL
        const fileName = item.url.replace('/uploads/', '');
        const fileExists = existingFiles.includes(fileName);
        
        if (!fileExists) {
          console.log(`   ❌ Removiendo: ${item.name} (archivo no encontrado: ${fileName})`);
          totalItemsRemoved++;
          return false;
        } else {
          console.log(`   ✅ Manteniendo: ${item.name}`);
          return true;
        }
      });

      const itemsRemoved = originalItemCount - playlist.items.length;
      if (itemsRemoved > 0) {
        playlist.updatedAt = Date.now();
        console.log(`   🔄 Playlist actualizada: ${itemsRemoved} items removidos`);
      } else {
        console.log(`   ✅ Playlist sin cambios`);
      }
    }

    // Guardar playlists actualizadas
    if (totalItemsRemoved > 0) {
      fs.writeFileSync(playlistsPath, JSON.stringify(playlistsData, null, 2));
      console.log(`\n✅ Playlists guardadas con cambios`);
    } else {
      console.log(`\n✅ No se requirieron cambios`);
    }

    // Resumen
    console.log('\n📊 Resumen:');
    console.log(`   📋 Playlists procesadas: ${playlistsData.length}`);
    console.log(`   🔍 Items verificados: ${totalItemsChecked}`);
    console.log(`   ❌ Items removidos: ${totalItemsRemoved}`);
    console.log(`   ✅ Items válidos: ${totalItemsChecked - totalItemsRemoved}`);

    // Mostrar archivos huérfanos (en uploads pero no en playlists)
    console.log('\n🔍 Verificando archivos huérfanos...');
    const usedFiles = new Set();
    
    playlistsData.forEach(playlist => {
      playlist.items.forEach(item => {
        const fileName = item.url.replace('/uploads/', '');
        usedFiles.add(fileName);
      });
    });

    const orphanFiles = existingFiles.filter(file => {
      const isMediaFile = /\.(mp4|webm|jpg|jpeg|png|gif)$/i.test(file);
      return isMediaFile && !usedFiles.has(file);
    });

    if (orphanFiles.length > 0) {
      console.log(`📁 Archivos huérfanos encontrados (${orphanFiles.length}):`);
      orphanFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const stats = fs.statSync(filePath);
        const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`   📄 ${file} (${sizeInMB} MB)`);
      });
      console.log('\n💡 Estos archivos no están siendo usados en ninguna playlist');
    } else {
      console.log('✅ No se encontraron archivos huérfanos');
    }

    if (totalItemsRemoved > 0) {
      console.log('\n🔄 Se recomienda reiniciar el servicio para aplicar los cambios:');
      console.log('npm run service-restart');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

cleanPlaylists();
