const http = require('http');
const path = require('path');
const fs = require('fs').promises;

async function checkServer() {
  console.log('🔍 Verificando el estado del servidor...\n');

  // 1. Verificar archivos de datos
  console.log('📁 Verificando archivos de datos:');
  try {
    const dataDir = path.join(process.cwd(), 'data');
    
    // Verificar directorio data
    try {
      await fs.access(dataDir);
      console.log('  ✅ Directorio data/ existe');
    } catch {
      console.log('  ❌ Directorio data/ no existe');
      await fs.mkdir(dataDir, { recursive: true });
      console.log('  ✅ Directorio data/ creado');
    }

    // Verificar screens.json
    const screensPath = path.join(dataDir, 'screens.json');
    try {
      await fs.access(screensPath);
      const content = await fs.readFile(screensPath, 'utf-8');
      JSON.parse(content); // Verificar que es JSON válido
      console.log('  ✅ screens.json existe y es válido');
    } catch {
      console.log('  ❌ screens.json no existe o es inválido');
      await fs.writeFile(screensPath, JSON.stringify([], null, 2));
      console.log('  ✅ screens.json creado');
    }

    // Verificar playlists.json
    const playlistsPath = path.join(dataDir, 'playlists.json');
    try {
      await fs.access(playlistsPath);
      const content = await fs.readFile(playlistsPath, 'utf-8');
      JSON.parse(content); // Verificar que es JSON válido
      console.log('  ✅ playlists.json existe y es válido');
    } catch {
      console.log('  ❌ playlists.json no existe o es inválido');
      await fs.writeFile(playlistsPath, JSON.stringify([], null, 2));
      console.log('  ✅ playlists.json creado');
    }

    // Verificar directorio uploads
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await fs.access(uploadsDir);
      console.log('  ✅ Directorio public/uploads/ existe');
    } catch {
      console.log('  ❌ Directorio public/uploads/ no existe');
      await fs.mkdir(uploadsDir, { recursive: true });
      console.log('  ✅ Directorio public/uploads/ creado');
    }

  } catch (error) {
    console.log('  ❌ Error al verificar archivos:', error.message);
  }

  // 2. Verificar conectividad del servidor
  console.log('\n🌐 Verificando conectividad del servidor:');
  
  const ports = [3000, 3001, 8080];
  let serverRunning = false;
  
  for (const port of ports) {
    try {
      await checkPort(port);
      console.log(`  ✅ Servidor detectado en puerto ${port}`);
      serverRunning = true;
      
      // Probar endpoint de API
      try {
        await testApiEndpoint(port);
        console.log(`  ✅ API /api/screens responde correctamente en puerto ${port}`);
      } catch (apiError) {
        console.log(`  ⚠️  API /api/screens no responde en puerto ${port}: ${apiError.message}`);
      }
      
      break;
    } catch {
      console.log(`  ❌ No hay servidor en puerto ${port}`);
    }
  }

  if (!serverRunning) {
    console.log('\n❌ No se detectó ningún servidor ejecutándose.');
    console.log('💡 Para iniciar el servidor, ejecuta:');
    console.log('   npm run dev    (modo desarrollo)');
    console.log('   npm run build && npm start    (modo producción)');
  }

  console.log('\n🔧 Diagnóstico completado.');
}

function checkPort(port) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/',
      method: 'GET',
      timeout: 2000
    }, (res) => {
      resolve(res);
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

function testApiEndpoint(port) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: port,
      path: '/api/screens',
      method: 'GET',
      timeout: 5000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            JSON.parse(data);
            resolve(data);
          } catch {
            reject(new Error('Respuesta no es JSON válido'));
          }
        } else {
          reject(new Error(`Status ${res.statusCode}`));
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => reject(new Error('Timeout')));
    req.end();
  });
}

// Ejecutar verificación
checkServer().catch(console.error);
