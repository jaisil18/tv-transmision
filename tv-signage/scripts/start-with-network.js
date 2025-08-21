#!/usr/bin/env node

const { spawn } = require('child_process');
const { setupNetworkAccess } = require('./setup-network-access');

console.log('🚀 [Start] Iniciando servidor con configuración de red automática...\n');

async function startWithNetwork() {
  try {
    // 1. Configurar acceso de red automáticamente
    console.log('🌐 [Start] Configurando acceso de red...');
    const { detectNetworkInterfaces, getBestServerIP, updateSettings, createNetworkConfig } = require('./setup-network-access');
    
    const interfaces = detectNetworkInterfaces();
    if (interfaces.length === 0) {
      console.warn('⚠️ [Start] No se encontraron interfaces de red, usando localhost');
    } else {
      const bestInterface = getBestServerIP(interfaces);
      const serverIP = bestInterface.address;
      
      console.log(`🎯 [Start] Configurando servidor para IP: ${serverIP}`);
      
      updateSettings(serverIP);
      createNetworkConfig(serverIP, interfaces);
      
      console.log(`✅ [Start] Red configurada exitosamente`);
      console.log(`📡 [Start] Servidor accesible en: http://${serverIP}:3000`);
      console.log(`📱 [Start] Pantallas: http://${serverIP}:3000/screen/[SCREEN_ID]`);
    }

    // 2. Iniciar el servidor Next.js
    console.log('\n🚀 [Start] Iniciando servidor Next.js...');
    
    const nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true,
      env: {
        ...process.env,
        NODE_ENV: 'development'
      }
    });

    // Manejar señales de terminación
    process.on('SIGINT', () => {
      console.log('\n🛑 [Start] Deteniendo servidor...');
      nextProcess.kill('SIGINT');
      process.exit(0);
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 [Start] Deteniendo servidor...');
      nextProcess.kill('SIGTERM');
      process.exit(0);
    });

    nextProcess.on('close', (code) => {
      console.log(`\n🏁 [Start] Servidor terminado con código: ${code}`);
      process.exit(code);
    });

    nextProcess.on('error', (error) => {
      console.error('❌ [Start] Error al iniciar servidor:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ [Start] Error en configuración inicial:', error);
    
    // Intentar iniciar sin configuración de red
    console.log('🔄 [Start] Iniciando servidor sin configuración automática...');
    const nextProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'inherit',
      shell: true
    });

    nextProcess.on('close', (code) => {
      process.exit(code);
    });
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  startWithNetwork();
}

module.exports = { startWithNetwork };
