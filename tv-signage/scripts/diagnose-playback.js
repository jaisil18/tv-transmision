#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🎬 Diagnóstico de problemas de reproducción...\n');

async function testUrl(url) {
  try {
    const { stdout } = await execAsync(`curl -s -I "${url}"`);
    const statusLine = stdout.split('\n')[0];
    const statusCode = statusLine.match(/HTTP\/[\d.]+\s+(\d+)/)?.[1];
    
    if (statusCode === '200') {
      const contentType = stdout.match(/Content-Type:\s*([^\r\n]+)/i)?.[1];
      const contentLength = stdout.match(/Content-Length:\s*(\d+)/i)?.[1];
      return {
        status: 'OK',
        statusCode,
        contentType,
        contentLength: contentLength ? parseInt(contentLength) : 0
      };
    } else {
      return {
        status: 'ERROR',
        statusCode,
        error: `HTTP ${statusCode}`
      };
    }
  } catch (error) {
    return {
      status: 'ERROR',
      error: error.message
    };
  }
}

async function diagnosePlayback() {
  const playlistsPath = path.join(process.cwd(), 'data', 'playlists.json');
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  console.log('📋 Verificando playlists y accesibilidad de archivos...\n');

  try {
    // Leer playlists
    const playlistsData = JSON.parse(fs.readFileSync(playlistsPath, 'utf8'));
    
    for (const playlist of playlistsData) {
      console.log(`📋 Playlist: "${playlist.name}"`);
      console.log(`   📱 Pantallas asignadas: ${playlist.screens.length}`);
      console.log(`   📁 Items: ${playlist.items.length}\n`);

      for (let i = 0; i < playlist.items.length; i++) {
        const item = playlist.items[i];
        console.log(`   ${i + 1}. ${item.name}`);
        console.log(`      🔗 URL: ${item.url}`);
        console.log(`      📝 Tipo: ${item.type}`);
        
        // Verificar archivo local
        const fileName = item.url.replace('/uploads/', '');
        const localPath = path.join(uploadsDir, fileName);
        
        if (fs.existsSync(localPath)) {
          const stats = fs.statSync(localPath);
          const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`      📁 Archivo local: ✅ Existe (${sizeInMB} MB)`);
        } else {
          console.log(`      📁 Archivo local: ❌ No existe`);
        }

        // Probar accesibilidad web
        console.log(`      🌐 Probando acceso web...`);
        
        const testResults = await Promise.all([
          testUrl(`http://localhost:3000${item.url}`),
          testUrl(`http://172.16.31.17:3000${item.url}`)
        ]);

        console.log(`      🏠 Localhost: ${testResults[0].status === 'OK' ? '✅' : '❌'} ${testResults[0].status === 'OK' ? testResults[0].contentType : testResults[0].error}`);
        console.log(`      🌍 IP Externa: ${testResults[1].status === 'OK' ? '✅' : '❌'} ${testResults[1].status === 'OK' ? testResults[1].contentType : testResults[1].error}`);
        
        console.log('');
      }
      
      console.log('─'.repeat(60));
    }

    // Verificar configuración del navegador
    console.log('\n🌐 Recomendaciones para problemas de reproducción:');
    console.log('─'.repeat(60));
    console.log('1. 🔄 Reiniciar servicio si se agregaron archivos nuevos:');
    console.log('   npm run service-restart');
    console.log('');
    console.log('2. 🧹 Limpiar cache del navegador:');
    console.log('   - Ctrl+F5 (forzar recarga)');
    console.log('   - Borrar cache y cookies del sitio');
    console.log('');
    console.log('3. 🎬 Verificar formato de video:');
    console.log('   - Usar MP4 con codec H.264');
    console.log('   - Evitar codecs propietarios');
    console.log('');
    console.log('4. 🔊 Verificar configuración de audio:');
    console.log('   - Los videos inician en mute por defecto');
    console.log('   - Verificar que el navegador permita autoplay');
    console.log('');
    console.log('5. 🌍 Verificar conectividad de red:');
    console.log('   - Ping entre dispositivos');
    console.log('   - Verificar firewall');
    console.log('');
    console.log('6. 📱 URLs de prueba:');
    console.log('   - Página de pantalla: http://172.16.31.17:3000/screen/[ID]');
    console.log('   - Diagnóstico de videos: http://172.16.31.17:3000/debug-videos');
    console.log('   - Admin panel: http://172.16.31.17:3000/admin');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

diagnosePlayback();
