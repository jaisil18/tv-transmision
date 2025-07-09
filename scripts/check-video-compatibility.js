const fs = require('fs');
const path = require('path');

console.log('🎬 [Video Check] Verificando compatibilidad de videos...\n');

// Verificar archivos de video en uploads
const uploadsDir = path.join('public', 'uploads');
const videoExtensions = ['.mp4', '.webm', '.ogg', '.avi', '.mov'];

if (!fs.existsSync(uploadsDir)) {
  console.log('❌ Directorio uploads no encontrado');
  process.exit(1);
}

const files = fs.readdirSync(uploadsDir);
const videoFiles = files.filter(file => 
  videoExtensions.includes(path.extname(file).toLowerCase())
);

console.log(`📁 Videos encontrados: ${videoFiles.length}`);

videoFiles.forEach((file, index) => {
  const filePath = path.join(uploadsDir, file);
  const stats = fs.statSync(filePath);
  const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
  
  console.log(`\n${index + 1}. 🎬 ${file}`);
  console.log(`   📏 Tamaño: ${sizeInMB} MB`);
  console.log(`   📅 Modificado: ${stats.mtime.toLocaleString()}`);
  console.log(`   🔗 URL: http://localhost:3000/uploads/${file}`);
  
  // Verificar si el archivo está en la playlist
  const playlistsPath = path.join('data', 'playlists.json');
  if (fs.existsSync(playlistsPath)) {
    const playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    const inPlaylist = playlists.some(playlist => 
      playlist.items.some(item => item.url === `/uploads/${file}`)
    );
    console.log(`   📋 En playlist: ${inPlaylist ? '✅ Sí' : '❌ No'}`);
  }
});

// Verificar playlist actual
console.log('\n📋 [Playlist] Verificando contenido actual...');
const playlistsPath = path.join('data', 'playlists.json');

if (fs.existsSync(playlistsPath)) {
  const playlists = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
  
  playlists.forEach((playlist, index) => {
    console.log(`\n${index + 1}. 📋 Playlist: ${playlist.name}`);
    console.log(`   📺 Pantallas: ${playlist.screens.join(', ')}`);
    console.log(`   📊 Elementos: ${playlist.items.length}`);
    
    playlist.items.forEach((item, itemIndex) => {
      console.log(`\n   ${itemIndex + 1}. ${item.type === 'video' ? '🎬' : '🖼️'} ${item.name}`);
      console.log(`      🔗 URL: ${item.url}`);
      console.log(`      ⏱️ Duración: ${item.duration || 'auto'}s`);
      
      // Verificar si el archivo existe
      const filePath = path.join('public', item.url);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`      ✅ Archivo existe (${sizeInMB} MB)`);
      } else {
        console.log(`      ❌ Archivo NO existe: ${filePath}`);
      }
    });
  });
} else {
  console.log('❌ Archivo de playlists no encontrado');
}

// Sugerencias para solucionar problemas
console.log('\n🔧 [Soluciones] Si un video no se reproduce:');
console.log('');
console.log('1. 🌐 Verificar acceso directo:');
videoFiles.forEach(file => {
  console.log(`   curl -I http://localhost:3000/uploads/${file}`);
});

console.log('\n2. 🎬 Verificar compatibilidad del navegador:');
console.log('   - MP4 con H.264: ✅ Compatible con todos los navegadores');
console.log('   - WebM: ✅ Compatible con Chrome, Firefox');
console.log('   - AVI, MOV: ❌ Puede no ser compatible');

console.log('\n3. 🔍 Verificar en herramientas de desarrollador:');
console.log('   - Abre F12 > Console para ver errores de JavaScript');
console.log('   - Ve a Network para ver si el video se descarga');
console.log('   - Verifica que no haya errores de CORS');

console.log('\n4. 🎯 Posibles problemas:');
console.log('   - Codec no compatible (usar H.264 para MP4)');
console.log('   - Archivo corrupto o incompleto');
console.log('   - Permisos de archivo incorrectos');
console.log('   - Autoplay bloqueado por el navegador');

console.log('\n5. 🛠️ Comandos útiles:');
console.log('   npm run dev                    # Reiniciar servidor');
console.log('   node scripts/create-test-content.js  # Crear contenido de prueba');
console.log('   ffmpeg -i video.mp4            # Verificar información del video');

console.log('\n✅ Verificación completada!');
