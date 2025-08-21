const fs = require('fs');
const path = require('path');

console.log('🔍 [Video Diagnosis] Diagnosticando reproducción de video...\n');

// 1. Verificar archivos de datos
console.log('1. 📋 Verificando archivos de datos...');

const dataFiles = [
  'data/screens.json',
  'data/playlists.json',
  'data/settings.json'
];

dataFiles.forEach(file => {
  if (fs.existsSync(file)) {
    try {
      const content = JSON.parse(fs.readFileSync(file, 'utf8'));
      console.log(`   ✅ ${file}: ${Array.isArray(content) ? content.length : 'OK'} elementos`);
      
      if (file === 'data/playlists.json') {
        content.forEach(playlist => {
          console.log(`      📋 Playlist: ${playlist.name} (${playlist.items.length} elementos)`);
          playlist.items.forEach((item, index) => {
            console.log(`         ${index + 1}. ${item.name} (${item.type})`);
            console.log(`            URL: ${item.url}`);
            
            // Verificar si el archivo existe
            const filePath = path.join('public', item.url);
            if (fs.existsSync(filePath)) {
              const stats = fs.statSync(filePath);
              console.log(`            ✅ Archivo existe (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
            } else {
              console.log(`            ❌ Archivo NO existe: ${filePath}`);
            }
          });
          
          if (playlist.screens) {
            console.log(`      📺 Asignado a pantallas: ${playlist.screens.join(', ')}`);
          }
        });
      }
      
      if (file === 'data/screens.json') {
        content.forEach(screen => {
          console.log(`      📺 Pantalla: ${screen.name} (ID: ${screen.id})`);
          console.log(`         Estado: ${screen.status || 'unknown'}`);
          console.log(`         Muted: ${screen.muted !== undefined ? screen.muted : 'undefined'}`);
        });
      }
      
    } catch (error) {
      console.log(`   ❌ ${file}: Error al parsear - ${error.message}`);
    }
  } else {
    console.log(`   ❌ ${file}: No encontrado`);
  }
});

// 2. Verificar directorio de uploads
console.log('\n2. 📁 Verificando directorio de uploads...');
const uploadsDir = 'public/uploads';

if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  console.log(`   📁 Archivos en uploads: ${files.length}`);
  
  files.forEach(file => {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);
    const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
    const extension = path.extname(file).toLowerCase();
    
    let type = '📄';
    if (['.mp4', '.webm', '.ogg', '.avi', '.mov'].includes(extension)) {
      type = '🎬';
    } else if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
      type = '🖼️';
    }
    
    console.log(`      ${type} ${file} (${sizeInMB} MB)`);
  });
} else {
  console.log('   ❌ Directorio uploads no encontrado');
}

// 3. Verificar configuraciones del sistema
console.log('\n3. ⚙️ Verificando configuraciones del sistema...');
const settingsFile = 'data/settings.json';

if (fs.existsSync(settingsFile)) {
  try {
    const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    console.log(`   ✅ Configuraciones cargadas`);
    console.log(`      Sistema: ${settings.systemName || 'No definido'}`);
    console.log(`      Tiempo de transición: ${settings.transitionTime || 'No definido'}s`);
    console.log(`      Horario de funcionamiento: ${settings.operatingHours ? 'Configurado' : 'No configurado'}`);
    
    if (settings.operatingHours) {
      console.log(`         Inicio: ${settings.operatingHours.start}`);
      console.log(`         Fin: ${settings.operatingHours.end}`);
      console.log(`         Días: ${settings.operatingHours.days.join(', ')}`);
    }
  } catch (error) {
    console.log(`   ❌ Error al leer configuraciones: ${error.message}`);
  }
} else {
  console.log('   ❌ Archivo de configuraciones no encontrado');
}

// 4. Verificar URLs de acceso
console.log('\n4. 🌐 URLs de acceso...');
const { networkInterfaces } = require('os');
const nets = networkInterfaces();

for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
    if (net.family === 'IPv4' && !net.internal) {
      console.log(`   📡 ${name}: ${net.address}`);
      console.log(`      🌍 Pantalla: http://${net.address}:3000/screen/1749482276744`);
      console.log(`      📺 HLS: http://${net.address}:3000/api/hls/1749482276744`);
      console.log(`      📡 RTSP: rtsp://${net.address}:8554/live/screen_1749482276744`);
      console.log(`      🎬 Video directo: http://${net.address}:3000/uploads/video-talleres-30-segundos-1749919427625-1749919427625.mp4`);
    }
  }
}

// 5. Verificar APIs críticas
console.log('\n5. 🔧 APIs críticas a verificar...');
console.log('   Ejecuta estos comandos para probar las APIs:');
console.log('   curl http://localhost:3000/api/public/settings');
console.log('   curl http://localhost:3000/api/screens/1749482276744/content');
console.log('   curl http://localhost:3000/api/public/screens/1749482276744/mute');

// 6. Posibles problemas y soluciones
console.log('\n6. 🚨 Posibles problemas y soluciones...');
console.log('   ❓ Si el video no se reproduce:');
console.log('      1. Verifica que el archivo de video existe y es accesible');
console.log('      2. Abre las herramientas de desarrollador del navegador (F12)');
console.log('      3. Ve a la pestaña Console para ver errores de JavaScript');
console.log('      4. Ve a la pestaña Network para ver si las APIs responden');
console.log('      5. Verifica que el autoplay esté permitido en el navegador');
console.log('');
console.log('   🔧 Comandos útiles:');
console.log('      npm run reset-password  # Resetear contraseña de admin');
console.log('      npm run check-streaming # Verificar configuración de streaming');
console.log('      npm run dev            # Iniciar en modo desarrollo');
console.log('');
console.log('   🌐 Para probar en Android:');
console.log('      1. Conecta el dispositivo a la misma red WiFi');
console.log('      2. Usa una de las IPs mostradas arriba');
console.log('      3. Abre Chrome en Android');
console.log('      4. Visita la URL de la pantalla');
console.log('      5. Permite autoplay si es necesario');

console.log('\n✅ Diagnóstico completado!');
console.log('💡 Si el problema persiste, revisa los logs del navegador (F12 > Console)');
