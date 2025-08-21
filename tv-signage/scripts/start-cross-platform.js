#!/usr/bin/env node

const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

// Detectar sistema operativo
const platform = os.platform();
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';

console.log(`🖥️ Sistema operativo detectado: ${platform} (${isWindows ? 'Windows' : isLinux ? 'Linux/Ubuntu' : 'Otro'})`);

// Configuración del puerto
const port = process.env.PORT || 3000;

// Función para iniciar el servidor en Windows
async function startWindowsServer() {
  console.log('🪟 Iniciando servidor en Windows...');
  
  // Verificar si estamos en modo desarrollo o producción
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    console.log('🛠️ Iniciando en modo desarrollo...');
    // Usar la ruta directa al ejecutable de Next.js para mayor compatibilidad
    const nextProcess = spawn('node', ['./node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });
    
    handleProcessEvents(nextProcess);
  } else {
    console.log('🚀 Iniciando en modo producción...');
    // Primero ejecutar el script start-server.js
    await runCommand('node', ['scripts/start-server.js']);
    
    // Luego iniciar next start con la ruta directa al ejecutable para mayor compatibilidad
    const nextProcess = spawn('node', ['./node_modules/next/dist/bin/next', 'start', '-H', '0.0.0.0', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    handleProcessEvents(nextProcess);
  }
}

// Función para iniciar el servidor en Linux/Ubuntu
async function startLinuxServer() {
  console.log('🐧 Iniciando servidor en Linux/Ubuntu...');
  
  // Verificar si estamos en modo desarrollo o producción
  const isDev = process.env.NODE_ENV !== 'production';
  
  if (isDev) {
    console.log('🛠️ Iniciando en modo desarrollo...');
    const nextProcess = spawn('npx', ['next', 'dev', '--hostname', '0.0.0.0'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });
    
    handleProcessEvents(nextProcess);
  } else {
    console.log('🚀 Iniciando en modo producción...');
    // Primero ejecutar el script start-server.js
    await runCommand('node', ['scripts/start-server.js']);
    
    // Luego iniciar next start
    const nextProcess = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'production'
      }
    });
    
    handleProcessEvents(nextProcess);
  }
}

// Función para ejecutar un comando y esperar a que termine
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    
    process.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`El comando ${command} ${args.join(' ')} falló con código ${code}`));
      }
    });
    
    process.on('error', (err) => {
      reject(err);
    });
  });
}

// Función para manejar eventos del proceso
function handleProcessEvents(process) {
  // Manejar señales de terminación
  global.process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor...');
    process.kill('SIGINT');
  });

  global.process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo servidor...');
    process.kill('SIGTERM');
  });

  process.on('close', (code) => {
    console.log(`\n🏁 Servidor terminado con código: ${code}`);
    global.process.exit(code);
  });

  process.on('error', (error) => {
    console.error('❌ Error al iniciar servidor:', error);
    global.process.exit(1);
  });
}

// Iniciar el servidor según el sistema operativo
async function startServer() {
  try {
    if (isWindows) {
      await startWindowsServer();
    } else if (isLinux) {
      await startLinuxServer();
    } else {
      console.log(`⚠️ Sistema operativo no reconocido: ${platform}`);
      console.log('🔄 Intentando iniciar con configuración genérica...');
      
      // Intentar con configuración genérica
      const nextProcess = spawn('npx', ['next', 'start', '-H', '0.0.0.0', '-p', port.toString()], {
        stdio: 'inherit',
        shell: true
      });
      
      handleProcessEvents(nextProcess);
    }
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  startServer();
}

module.exports = { startServer };