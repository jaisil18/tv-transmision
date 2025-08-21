const { spawn } = require('child_process');
const { existsSync, readFileSync } = require('fs');
const path = require('path');

console.log('🔍 [Streaming Check] Verificando configuración de streaming...\n');

// 1. Verificar FFmpeg
console.log('1. 🎥 Verificando FFmpeg...');
try {
  const ffmpegCheck = spawn('ffmpeg', ['-version'], { stdio: 'pipe' });
  
  ffmpegCheck.on('spawn', () => {
    console.log('   ✅ FFmpeg encontrado en el sistema');
  });
  
  ffmpegCheck.on('error', (error) => {
    console.log('   ❌ FFmpeg no encontrado en el sistema');
    console.log('   💡 Instala FFmpeg o usa: npm run install-ffmpeg');
  });
} catch (error) {
  console.log('   ❌ Error al verificar FFmpeg');
}

// 2. Verificar dependencias
console.log('\n2. 📦 Verificando dependencias...');
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
  const dependencies = packageJson.dependencies || {};
  
  const requiredDeps = [
    'hls.js',
    '@ffmpeg-installer/ffmpeg',
    'ffmpeg-static',
    'node-rtsp-stream'
  ];
  
  requiredDeps.forEach(dep => {
    if (dependencies[dep]) {
      console.log(`   ✅ ${dep}: ${dependencies[dep]}`);
    } else {
      console.log(`   ❌ ${dep}: No instalado`);
    }
  });
} catch (error) {
  console.log('   ❌ Error al leer package.json');
}

// 3. Verificar archivos de configuración
console.log('\n3. ⚙️ Verificando archivos de configuración...');

const configFiles = [
  'data/streaming-config.json',
  'data/screens.json',
  'data/playlists.json',
  'data/settings.json'
];

configFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
    
    // Verificar contenido básico
    try {
      const content = JSON.parse(readFileSync(file, 'utf8'));
      if (file === 'data/streaming-config.json') {
        console.log(`      - HLS habilitado: ${content.enableHLS ? '✅' : '❌'}`);
        console.log(`      - RTSP habilitado: ${content.enableRTSP ? '✅' : '❌'}`);
        console.log(`      - Auto-inicio: ${content.autoStart ? '✅' : '❌'}`);
      }
    } catch (error) {
      console.log(`   ⚠️ ${file}: Error al parsear JSON`);
    }
  } else {
    console.log(`   ❌ ${file}: No encontrado`);
  }
});

// 4. Verificar estructura de directorios
console.log('\n4. 📁 Verificando estructura de directorios...');

const requiredDirs = [
  'public/hls',
  'public/uploads',
  'data',
  'lib',
  'components',
  'app/api/hls',
  'app/api/streaming'
];

requiredDirs.forEach(dir => {
  if (existsSync(dir)) {
    console.log(`   ✅ ${dir}/`);
  } else {
    console.log(`   ❌ ${dir}/: No encontrado`);
  }
});

// 5. Verificar archivos de implementación
console.log('\n5. 🔧 Verificando archivos de implementación...');

const implementationFiles = [
  'lib/hls-server.ts',
  'lib/streaming-init.ts',
  'components/HLSPlayer.tsx',
  'hooks/useHLSStreaming.ts',
  'app/api/hls/[screenId]/route.ts',
  'app/api/hls/segments/[...path]/route.ts',
  'app/api/streaming/[screenId]/route.ts',
  'app/api/streaming/status/route.ts',
  'app/api/network/detect/route.ts'
];

implementationFiles.forEach(file => {
  if (existsSync(file)) {
    console.log(`   ✅ ${file}`);
  } else {
    console.log(`   ❌ ${file}: No encontrado`);
  }
});

// 6. Verificar puertos
console.log('\n6. 🌐 Verificando configuración de puertos...');

const { networkInterfaces } = require('os');
const nets = networkInterfaces();
const interfaces = [];

for (const name of Object.keys(nets)) {
  for (const net of nets[name] || []) {
    if (net.family === 'IPv4' && !net.internal) {
      interfaces.push({
        name,
        address: net.address
      });
    }
  }
}

console.log('   Interfaces de red disponibles:');
interfaces.forEach(({ name, address }) => {
  console.log(`   📡 ${name}: ${address}`);
  console.log(`      - HTTP: http://${address}:3000`);
  console.log(`      - HLS: http://${address}:3000/api/hls/[screenId]`);
  console.log(`      - RTSP: rtsp://${address}:8554/live/screen_[screenId]`);
});

// 7. Resumen y recomendaciones
console.log('\n7. 📋 Resumen y recomendaciones...');

console.log('\n🚀 Para iniciar el servidor con streaming:');
console.log('   npm run start');
console.log('   # o');
console.log('   npm run dev');

console.log('\n📱 Para probar en Android:');
console.log('   1. Conecta tu dispositivo a la misma red');
console.log('   2. Usa una de las IPs mostradas arriba');
console.log('   3. Abre: http://[IP]:3000/screen/[screenId]');

console.log('\n🎬 Para probar HLS directamente:');
console.log('   1. Inicia el servidor');
console.log('   2. Visita: http://[IP]:3000/api/streaming/status');
console.log('   3. Inicia streaming: POST http://[IP]:3000/api/streaming/[screenId]');
console.log('   4. Reproduce: http://[IP]:3000/api/hls/[screenId]');

console.log('\n✅ Verificación completada!');
console.log('💡 Si hay errores, revisa la documentación o ejecuta: npm run setup');
