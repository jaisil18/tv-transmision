const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { wsManager } = require('./utils/websocket-server.ts');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

// Detectar sistema operativo
const platform = os.platform();
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';

console.log(`🖥️ Sistema operativo detectado: ${platform} (${isWindows ? 'Windows' : isLinux ? 'Linux/Ubuntu' : 'Otro'})`);

// Preparar la aplicación Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // Crear servidor HTTP
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Inicializar WebSocket
  wsManager.initialize(server);

  server.listen(port, hostname, (err) => {
    if (err) throw err;
    console.log(`🚀 Servidor listo en http://${hostname}:${port}`);
    console.log(`🔌 WebSocket disponible en ws://${hostname}:${port}/ws`);
    
    // Mostrar información específica según el sistema operativo
    if (isWindows) {
      console.log('🪟 Ejecutando en Windows');
      console.log('📋 Para iniciar en modo producción: npm run start');
      console.log('📋 Para iniciar en modo desarrollo: npm run dev:network');
    } else if (isLinux) {
      console.log('🐧 Ejecutando en Linux/Ubuntu');
      console.log('📋 Para iniciar como servicio: sudo systemctl start tv-signage.service');
      console.log('📋 Para ver logs: sudo journalctl -u tv-signage.service -f');
    }
  });

  // Manejar señales de terminación
  process.on('SIGINT', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Cerrando servidor...');
    server.close(() => {
      console.log('✅ Servidor cerrado');
      process.exit(0);
    });
  });
});
