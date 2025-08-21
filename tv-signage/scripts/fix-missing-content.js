#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 Reparando contenido faltante...\n');

async function fixMissingContent() {
  try {
    const uploadsDir = path.join('public', 'uploads');
    const playlistsFile = path.join('data', 'playlists.json');

    // 1. Verificar que existan los directorios
    if (!fs.existsSync(uploadsDir)) {
      console.log('❌ Directorio uploads no encontrado');
      return;
    }

    if (!fs.existsSync(playlistsFile)) {
      console.log('❌ Archivo de playlists no encontrado');
      return;
    }

    // 2. Leer archivos existentes
    const existingFiles = fs.readdirSync(uploadsDir).filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.mp4', '.webm', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);
    });

    console.log(`📁 Archivos encontrados: ${existingFiles.length}`);
    existingFiles.forEach(file => console.log(`   📄 ${file}`));

    // 3. Leer playlists
    const playlistsData = JSON.parse(fs.readFileSync(playlistsFile, 'utf8'));
    console.log(`\n📋 Playlists encontradas: ${playlistsData.length}`);

    let totalChanges = 0;

    // 4. Procesar cada playlist
    for (const playlist of playlistsData) {
      console.log(`\n📋 Procesando playlist: "${playlist.name}"`);
      
      const originalItemCount = playlist.items.length;
      console.log(`   Items originales: ${originalItemCount}`);

      // 4.1. Remover items que no existen
      const validItems = [];
      for (const item of playlist.items) {
        const fileName = item.url.replace('/uploads/', '');
        if (existingFiles.includes(fileName)) {
          validItems.push(item);
          console.log(`   ✅ Válido: ${item.name}`);
        } else {
          console.log(`   ❌ Removiendo: ${item.name} (archivo no encontrado)`);
          totalChanges++;
        }
      }
      
      playlist.items = validItems;

      // 4.2. Agregar archivos huérfanos
      const usedFiles = playlist.items.map(item => item.url.replace('/uploads/', ''));
      const orphanFiles = existingFiles.filter(file => !usedFiles.includes(file));

      console.log(`   📁 Archivos huérfanos: ${orphanFiles.length}`);
      
      orphanFiles.forEach(file => {
        const newItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          name: file,
          url: `/uploads/${file}`,
          type: file.match(/\.(mp4|webm)$/i) ? 'video' : 'image',
          duration: 10
        };
        
        playlist.items.push(newItem);
        console.log(`   ✅ Agregado: ${file}`);
        totalChanges++;
      });

      console.log(`   📊 Items finales: ${playlist.items.length}`);
    }

    // 5. Guardar cambios
    if (totalChanges > 0) {
      fs.writeFileSync(playlistsFile, JSON.stringify(playlistsData, null, 2));
      console.log(`\n✅ Cambios guardados: ${totalChanges} modificaciones`);
      
      // 6. Crear evento de refresh
      const refreshFile = path.join('data', 'refresh-events.json');
      let events = [];
      
      if (fs.existsSync(refreshFile)) {
        try {
          events = JSON.parse(fs.readFileSync(refreshFile, 'utf8'));
        } catch (error) {
          console.log('⚠️ Error leyendo eventos de refresh, creando nuevo archivo');
          events = [];
        }
      }

      events.push({
        type: 'content-updated',
        timestamp: Date.now(),
        data: { reason: 'Reparación automática de contenido', changes: totalChanges }
      });

      // Mantener solo los últimos 50 eventos
      if (events.length > 50) {
        events = events.slice(-50);
      }

      fs.writeFileSync(refreshFile, JSON.stringify(events, null, 2));
      console.log('📢 Evento de refresh creado');
      
    } else {
      console.log('\n✅ No se necesitaron cambios');
    }

    console.log('\n🎉 Reparación completada');
    
  } catch (error) {
    console.error('❌ Error durante la reparación:', error);
    process.exit(1);
  }
}

// Ejecutar la reparación
fixMissingContent();
