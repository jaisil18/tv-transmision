const fs = require('fs');
const path = require('path');
const { networkInterfaces } = require('os');

console.log('🎯 [Auto Screen Guide] Generando guía automática de pantallas...\n');

// Obtener información de red
function getNetworkInfo() {
  const nets = networkInterfaces();
  const networkInfo = [];
  
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        networkInfo.push({
          interface: name,
          ip: net.address
        });
      }
    }
  }
  
  return networkInfo;
}

// Leer pantallas actuales
function getCurrentScreens() {
  const screensPath = path.join('data', 'screens.json');
  
  if (!fs.existsSync(screensPath)) {
    console.log('❌ Archivo de pantallas no encontrado');
    return [];
  }
  
  try {
    const screens = JSON.parse(fs.readFileSync(screensPath, 'utf8'));
    return Array.isArray(screens) ? screens : [];
  } catch (error) {
    console.log('❌ Error al leer pantallas:', error.message);
    return [];
  }
}

// Leer playlists actuales
function getCurrentPlaylists() {
  const playlistsPath = path.join('data', 'playlists.json');
  
  if (!fs.existsSync(playlistsPath)) {
    console.log('❌ Archivo de playlists no encontrado');
    return [];
  }
  
  try {
    const playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    return Array.isArray(playlists) ? playlists : [];
  } catch (error) {
    console.log('❌ Error al leer playlists:', error.message);
    return [];
  }
}

// Generar guía automática
function generateAutoGuide() {
  const screens = getCurrentScreens();
  const playlists = getCurrentPlaylists();
  const networkInfo = getNetworkInfo();
  
  console.log('📺 PANTALLAS DETECTADAS:');
  console.log('=' .repeat(50));
  
  if (screens.length === 0) {
    console.log('❌ No hay pantallas configuradas');
    console.log('\n🔧 PASOS PARA AGREGAR UNA PANTALLA:');
    console.log('1. Ve a http://localhost:3000/admin/screens');
    console.log('2. Haz clic en "Agregar Pantalla"');
    console.log('3. Completa el formulario');
    console.log('4. Ejecuta este script nuevamente');
    return;
  }
  
  screens.forEach((screen, index) => {
    console.log(`\n${index + 1}. 📺 ${screen.name} (ID: ${screen.id})`);
    console.log(`   Estado: ${screen.status === 'active' ? '✅ Activa' : '❌ Inactiva'}`);
    console.log(`   Audio: ${screen.muted !== false ? '🔇 Silenciado' : '🔊 Activado'}`);
    console.log(`   Repetir: ${screen.isRepeating ? '🔄 Activado' : '⏹️ Desactivado'}`);
    
    // Buscar playlist asignada
    const assignedPlaylist = playlists.find(p => p.screens && p.screens.includes(screen.id));
    if (assignedPlaylist) {
      console.log(`   📋 Playlist: "${assignedPlaylist.name}" (${assignedPlaylist.items.length} elementos)`);
    } else {
      console.log(`   ⚠️ Sin playlist asignada`);
    }
    
    console.log('\n   🌐 URLs PARA ESTA PANTALLA:');

    // URLs locales
    console.log('   📍 Local:');
    console.log(`      🌍 Web: http://localhost:3000/screen/${screen.id}`);
    console.log(`      📱 Android: http://localhost:3000/api/public/android-playlist/${screen.id}`);

    // URLs de red
    if (networkInfo.length > 0) {
      console.log('\n   📡 Red (para dispositivos remotos):');
      networkInfo.forEach(net => {
        console.log(`      ${net.interface}:`);
        console.log(`         🌍 Web: http://${net.ip}:3000/screen/${screen.id}`);
        console.log(`         📱 Android: http://${net.ip}:3000/api/public/android-playlist/${screen.id}`);
      });
    }
    
    // Recomendaciones específicas
    console.log('\n   💡 RECOMENDACIONES:');
    if (screen.status !== 'active') {
      console.log('      ⚠️ Pantalla inactiva - actívala desde el tablero');
    }
    if (!assignedPlaylist) {
      console.log('      ⚠️ Sin contenido - asigna una playlist desde el tablero');
    }
    if (screen.muted !== false) {
      console.log('      🔇 Audio silenciado - actívalo desde el tablero si necesitas sonido');
    }
    
    console.log('   📱 Para Android: Usa la URL Web de red');
    console.log('   🖥️ Para navegadores: Usa cualquier URL Web');
    console.log('   📺 Para apps nativas: Usa URL RTSP');
  });
  
  // Resumen de playlists
  console.log('\n\n📋 PLAYLISTS DISPONIBLES:');
  console.log('=' .repeat(50));
  
  if (playlists.length === 0) {
    console.log('❌ No hay playlists configuradas');
    console.log('\n🔧 PASOS PARA CREAR UNA PLAYLIST:');
    console.log('1. Ve a http://localhost:3000/admin/playlists');
    console.log('2. Haz clic en "Nueva Playlist"');
    console.log('3. Agrega contenido');
    console.log('4. Asigna a pantallas');
  } else {
    playlists.forEach((playlist, index) => {
      console.log(`\n${index + 1}. 📋 ${playlist.name}`);
      console.log(`   📊 Elementos: ${playlist.items.length}`);
      console.log(`   📺 Pantallas asignadas: ${playlist.screens ? playlist.screens.length : 0}`);
      
      if (playlist.screens && playlist.screens.length > 0) {
        playlist.screens.forEach(screenId => {
          const screen = screens.find(s => s.id === screenId);
          console.log(`      - ${screen ? screen.name : screenId}`);
        });
      }
    });
  }
  
  // Guía de solución de problemas
  console.log('\n\n🔧 SOLUCIÓN DE PROBLEMAS:');
  console.log('=' .repeat(50));
  console.log('❓ Si la pantalla sale negra:');
  console.log('   1. Verifica que la pantalla esté activa');
  console.log('   2. Verifica que tenga una playlist asignada');
  console.log('   3. Haz clic en "▶️ Iniciar Pantalla" si aparece');
  console.log('   4. Abre F12 > Console para ver errores');
  
  console.log('\n❓ Si cambias pantallas:');
  console.log('   1. El tablero se actualiza automáticamente cada 30 segundos');
  console.log('   2. Las URLs se generan automáticamente');
  console.log('   3. Copia las nuevas URLs desde el tablero');
  console.log('   4. No necesitas editar código manualmente');
  
  console.log('\n❓ Para usar en Android:');
  console.log('   1. Conecta el dispositivo a la misma WiFi');
  console.log('   2. Usa las URLs de red (no localhost)');
  console.log('   3. Abre Chrome en Android');
  console.log('   4. Permite autoplay si es necesario');
  
  console.log('\n✅ ESTADO DEL SISTEMA:');
  console.log(`   📺 Pantallas: ${screens.length}`);
  console.log(`   📋 Playlists: ${playlists.length}`);
  console.log(`   🌐 Interfaces de red: ${networkInfo.length}`);
  console.log(`   🔄 Auto-refresh: Activado (30s)`);
}

// Ejecutar guía
generateAutoGuide();

console.log('\n🎯 Guía generada automáticamente!');
console.log('💡 Ejecuta este script cuando agregues/elimines pantallas para obtener las URLs actualizadas.');
