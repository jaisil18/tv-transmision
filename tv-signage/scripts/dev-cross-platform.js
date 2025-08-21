const { spawn } = require('child_process');
const os = require('os');
const path = require('path');

// Detectar sistema operativo
const platform = os.platform();
const isWindows = platform === 'win32';
const isLinux = platform === 'linux';

console.log(`🖥️ Sistema operativo detectado: ${platform} (${isWindows ? 'Windows' : isLinux ? 'Linux/Ubuntu' : 'Otro'})`);

// Función para iniciar desarrollo en Windows
function startWindowsDev() {
  console.log('🪟 Iniciando desarrollo en Windows...');
  
  const nextProcess = spawn('node', ['./node_modules/next/dist/bin/next', 'dev', '--hostname', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  handleProcessEvents(nextProcess);
}

// Función para iniciar desarrollo en Linux/Ubuntu
function startLinuxDev() {
  console.log('🐧 Iniciando desarrollo en Linux/Ubuntu...');
  
  const nextProcess = spawn('npx', ['next', 'dev', '--hostname', '0.0.0.0'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_ENV: 'development'
    }
  });
  
  handleProcessEvents(nextProcess);
}

// Función para manejar eventos del proceso
function handleProcessEvents(process) {
  // Manejar señales de terminación
  global.process.on('SIGINT', () => {
    console.log('\n🛑 Deteniendo servidor de desarrollo...');
    process.kill('SIGINT');
  });

  global.process.on('SIGTERM', () => {
    console.log('\n🛑 Deteniendo servidor de desarrollo...');
    process.kill('SIGTERM');
  });

  process.on('close', (code) => {
    console.log(`\n🏁 Servidor de desarrollo terminado con código: ${code}`);
    global.process.exit(code);
  });

  process.on('error', (error) => {
    console.error('❌ Error al iniciar servidor de desarrollo:', error);
    global.process.exit(1);
  });
}

// Iniciar el servidor de desarrollo según el sistema operativo
async function startDev() {
  try {
    if (isWindows) {
      startWindowsDev();
    } else if (isLinux) {
      startLinuxDev();
    } else {
      console.log(`⚠️ Sistema operativo no reconocido: ${platform}`);
      console.log('🔄 Intentando iniciar con configuración genérica...');
      
      // Intentar con configuración genérica
      const nextProcess = spawn('npx', ['next', 'dev', '--hostname', '0.0.0.0'], {
        stdio: 'inherit',
        shell: true
      });
      
      handleProcessEvents(nextProcess);
    }
  } catch (error) {
    console.error('❌ Error al iniciar el servidor de desarrollo:', error);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  startDev();
}

module.exports = { startDev };