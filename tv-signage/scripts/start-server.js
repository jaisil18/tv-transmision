const { networkInterfaces, platform } = require('os');

// Detectar sistema operativo
const isWindows = platform() === 'win32';
const isLinux = platform() === 'linux';

// Configuración del puerto
const port = process.env.PORT || 3000;

// Obtener todas las interfaces de red IPv4 no internas
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

// Mostrar información de las interfaces disponibles
console.log('\n🌐 Interfaces de red disponibles:');
interfaces.forEach(({ name, address }) => {
  console.log(`\n${name}:`);
  console.log(`  🌍 Web: http://${address}:${port}`);
  console.log(`  📺 HLS: http://${address}:${port}/api/hls/[screenId]`);
  console.log(`  📡 RTSP: rtsp://${address}:8554/live/screen_[screenId]`);
});

console.log('\n🚀 Servidor iniciado en todas las interfaces');
console.log(`📡 Puerto HTTP: ${port}`);
console.log(`📺 Puerto RTSP: 8554`);
console.log(`🎬 Streaming HLS y RTSP disponible`);
console.log(`📱 Compatible con Android y navegadores web`);

// Iniciar el servidor Next.js
const { spawn } = require('child_process');

// Iniciar el servidor Next.js directamente en modo producción
let command, args;

// Usar la ruta directa al ejecutable de Next.js para mayor compatibilidad
if (isWindows) {
  console.log('🪟 Detectado Windows, usando ruta directa a Next.js');
  command = 'node';
  args = ['./node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', port.toString()];
} else {
  console.log('🐧 Detectado Linux/Ubuntu, usando npx para Next.js');
  command = 'npx';
  args = ['next', 'start', '-H', '0.0.0.0', '-p', port.toString()];
}


const server = spawn(command, args, {
  stdio: 'inherit',
  shell: true,
  cwd: process.cwd()
});

// Manejar señales para cerrar correctamente
process.on('SIGTERM', () => {
  console.log('\n🛑 Recibida señal SIGTERM, cerrando servidor...');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT, cerrando servidor...');
  server.kill('SIGINT');
});

// Manejar cuando el servidor se cierra
server.on('close', (code) => {
  console.log(`\n📴 Servidor cerrado con código: ${code}`);
  process.exit(code);
});
