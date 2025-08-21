#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Leer configuración de red
const networkConfigPath = path.join(process.cwd(), 'data', 'network-config.json');
let port = 3000;

try {
  if (fs.existsSync(networkConfigPath)) {
    const networkConfig = JSON.parse(fs.readFileSync(networkConfigPath, 'utf-8'));
    if (networkConfig.serverPort && networkConfig.requiresRestart) {
      port = networkConfig.serverPort;
      console.log(`🔧 Puerto configurado detectado: ${port}`);
      
      // Marcar como aplicado
      networkConfig.requiresRestart = false;
      fs.writeFileSync(networkConfigPath, JSON.stringify(networkConfig, null, 2));
      console.log(`✅ Configuración de puerto aplicada`);
    }
  }
} catch (error) {
  console.log(`⚠️  Error leyendo configuración de red, usando puerto por defecto: ${port}`);
}

// Obtener puerto de argumentos de línea de comandos si se proporciona
const args = process.argv.slice(2);
const portArg = args.find(arg => arg.startsWith('--port='));
if (portArg) {
  port = parseInt(portArg.split('=')[1]);
}

console.log(`🚀 Iniciando UCT TV CODECRAFT en puerto ${port}...`);

// Iniciar el servidor de desarrollo
const child = spawn('npm', ['run', 'dev', '--', '--port', port.toString()], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error(`❌ Error iniciando el servidor: ${error.message}`);
  process.exit(1);
});

child.on('close', (code) => {
  console.log(`🛑 Servidor terminado con código: ${code}`);
  process.exit(code);
});

// Manejar señales de terminación
process.on('SIGINT', () => {
  console.log('\n🛑 Deteniendo servidor...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Deteniendo servidor...');
  child.kill('SIGTERM');
});
