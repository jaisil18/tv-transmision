const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const { wsManager } = require('./utils/websocket-server.js');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Preparar la aplicación Next.js
const app = next({ 
  dev, 
  hostname, 
  port,
  // Configuración para HMR en servidor personalizado
  customServer: true
});
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      // Parsear la URL de la solicitud
      const parsedUrl = parse(req.url, true);
      
      // Permitir que Next.js maneje todas las rutas, incluyendo HMR
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Inicializar WebSocket
  wsManager.initialize(server);
  console.log('🔌 [Server] WebSocket inicializado');

  server
    .once('error', (err) => {
      console.error('❌ [Server] Error:', err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 [Server] Servidor iniciado en http://${hostname}:${port}`);
      console.log(`🔌 [WebSocket] WebSocket disponible en ws://${hostname}:${port}/ws`);
    });
});

// Manejo de señales para cierre limpio
process.on('SIGTERM', () => {
  console.log('🛑 [Server] Cerrando servidor...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 [Server] Cerrando servidor...');
  process.exit(0);
});