#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔄 Sincronizando contenido...\n');

async function syncContent() {
  const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  try {
    // Leer playlists y archivos
    const playlistsData = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    const existingFiles = fs.readdirSync(uploadsDir);
    
    console.log(`📋 Playlists encontradas: ${playlistsData.length}`);
    console.log(`📁 Archivos en uploads: ${existingFiles.length}\n`);

    let totalChanges = 0;

    for (const playlist of playlistsData) {
      console.log(`📋 Procesando playlist: "${playlist.name}"`);
      
      const originalItemCount = playlist.items.length;
      
      // 1. Remover items que no existen
      playlist.items = playlist.items.filter(item => {
        const fileName = item.url.replace('/uploads/', '');
        const fileExists = existingFiles.includes(fileName);
        
        if (!fileExists) {
          console.log(`   ❌ Removiendo: ${item.name} (archivo no encontrado)`);
          totalChanges++;
          return false;
        }
        return true;
      });

      // 2. Agregar archivos huérfanos
      const usedFiles = playlist.items.map(item => item.url.replace('/uploads/', ''));
      const orphanFiles = existingFiles.filter(file => {
        const isMediaFile = /\.(mp4|webm|jpg|jpeg|png|gif)$/i.test(file);
        return isMediaFile && !usedFiles.includes(file);
      });

      console.log(`   📁 Archivos huérfanos encontrados: ${orphanFiles.length}`);

      // Agregar archivos huérfanos automáticamente
      orphanFiles.forEach(file => {
        const newItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          name: file,
          url: `/uploads/${file}`,
          type: file.match(/\.(mp4|webm)$/i) ? 'video' : 'image',
          duration: 10 // duración por defecto
        };

        playlist.items.push(newItem);
        console.log(`   ✅ Agregado: ${file}`);
        totalChanges++;
      });

      for (const orphanFile of orphanFiles) {
        const isVideo = /\.(mp4|webm)$/i.test(orphanFile);
        const newItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
          name: orphanFile,
          url: `/uploads/${orphanFile}`,
          type: isVideo ? 'video' : 'image',
          duration: isVideo ? undefined : 10
        };

        playlist.items.push(newItem);
        console.log(`   ✅ Agregando: ${orphanFile} (${newItem.type})`);
        totalChanges++;
      }

      const finalItemCount = playlist.items.length;
      const itemsChanged = Math.abs(finalItemCount - originalItemCount);
      
      if (itemsChanged > 0) {
        playlist.updatedAt = Date.now();
        console.log(`   🔄 Playlist actualizada: ${itemsChanged} cambios`);
      } else {
        console.log(`   ✅ Playlist sin cambios`);
      }
      
      console.log(`   📊 Items: ${originalItemCount} → ${finalItemCount}\n`);
    }

    // Guardar cambios
    if (totalChanges > 0) {
      fs.writeFileSync(playlistsPath, JSON.stringify(playlistsData, null, 2));
      console.log(`✅ Playlists guardadas con ${totalChanges} cambios totales\n`);
      
      // Notificar auto-refresh
      try {
        const AutoRefreshManager = require('../utils/auto-refresh.ts');
        AutoRefreshManager.default.notifyContentUpdate('content-updated', {
          changes: totalChanges,
          timestamp: Date.now()
        });
        console.log(`📢 Notificación de auto-refresh enviada\n`);
      } catch (error) {
        console.log(`⚠️  No se pudo enviar notificación de auto-refresh\n`);
      }
      
      console.log('🔄 Recomendaciones:');
      console.log('1. Las pantallas deberían actualizarse automáticamente en 5 segundos');
      console.log('2. Si no se actualizan, recarga la página de la pantalla (Ctrl+F5)');
      console.log('3. Verifica que los archivos sean accesibles desde el navegador');
      
    } else {
      console.log(`✅ No se requirieron cambios\n`);
    }

    // Mostrar resumen final
    console.log('📊 Resumen final:');
    playlistsData.forEach(playlist => {
      console.log(`   📋 ${playlist.name}: ${playlist.items.length} items`);
      playlist.items.forEach((item, index) => {
        const type = item.type === 'video' ? '🎬' : '🖼️';
        console.log(`      ${index + 1}. ${type} ${item.name}`);
      });
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

syncContent();
