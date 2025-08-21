#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 [VLAN Config] Configurando acceso entre VLANs...\n');

// Función para ejecutar comando y capturar salida
function executeCommand(command, args = []) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args, { shell: true });
    let output = '';
    let error = '';

    process.stdout.on('data', (data) => {
      output += data.toString();
    });

    process.stderr.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(output);
      } else {
        reject(new Error(`Command failed: ${error || output}`));
      }
    });
  });
}

// Función para verificar si es Windows
function isWindows() {
  return process.platform === 'win32';
}

// Función para configurar firewall en Windows
async function configureWindowsFirewall() {
  console.log('🔥 [Windows] Configurando firewall...');
  
  try {
    // Verificar si la regla ya existe
    try {
      await executeCommand('netsh', ['advfirewall', 'firewall', 'show', 'rule', 'name="UCT TV System"']);
      console.log('   ℹ️ Regla de firewall ya existe');
    } catch (error) {
      // La regla no existe, crearla
      console.log('   ➕ Creando regla de firewall...');
      await executeCommand('netsh', [
        'advfirewall', 'firewall', 'add', 'rule',
        'name="UCT TV System"',
        'dir=in',
        'action=allow',
        'protocol=TCP',
        'localport=3000'
      ]);
      console.log('   ✅ Regla de firewall creada exitosamente');
    }

    // Crear regla adicional para todas las interfaces
    try {
      await executeCommand('netsh', [
        'advfirewall', 'firewall', 'add', 'rule',
        'name="UCT TV System - All Interfaces"',
        'dir=in',
        'action=allow',
        'protocol=TCP',
        'localport=3000',
        'interfacetype=any'
      ]);
      console.log('   ✅ Regla adicional para todas las interfaces creada');
    } catch (error) {
      console.log('   ℹ️ Regla adicional ya existe o no se pudo crear');
    }

    return true;
  } catch (error) {
    console.error('   ❌ Error configurando firewall:', error.message);
    return false;
  }
}

// Función para verificar configuración de red
async function checkNetworkConfiguration() {
  console.log('🌐 [Network] Verificando configuración de red...');
  
  try {
    // Verificar interfaces de red
    const netshOutput = await executeCommand('netsh', ['interface', 'show', 'interface']);
    console.log('   ✅ Interfaces de red detectadas');

    // Verificar routing
    const routeOutput = await executeCommand('route', ['print']);
    console.log('   ✅ Tabla de routing obtenida');

    // Verificar si el servidor está escuchando en el puerto correcto
    const netstatOutput = await executeCommand('netstat', ['-an']);
    const isListening = netstatOutput.includes(':3000') || netstatOutput.includes('0.0.0.0:3000');
    
    if (isListening) {
      console.log('   ✅ Servidor escuchando en puerto 3000');
    } else {
      console.log('   ⚠️ Servidor no detectado en puerto 3000');
    }

    return true;
  } catch (error) {
    console.error('   ❌ Error verificando configuración de red:', error.message);
    return false;
  }
}

// Función para crear script de diagnóstico
function createDiagnosticScript() {
  console.log('📝 [Script] Creando script de diagnóstico...');
  
  const diagnosticScript = `@echo off
echo ========================================
echo UCT TV System - Diagnostico de Red
echo ========================================
echo.

echo 1. Verificando conectividad basica...
ping -n 3 192.168.101.3
echo.

echo 2. Verificando puerto 3000...
telnet 192.168.101.3 3000
echo.

echo 3. Verificando reglas de firewall...
netsh advfirewall firewall show rule name="UCT TV System"
echo.

echo 4. Verificando procesos en puerto 3000...
netstat -ano | findstr :3000
echo.

echo 5. Probando API publica...
curl http://192.168.101.3:3000/api/public/settings
echo.

echo ========================================
echo Diagnostico completado
echo ========================================
pause
`;

  const scriptPath = path.join(process.cwd(), 'diagnose-vlan.bat');
  fs.writeFileSync(scriptPath, diagnosticScript);
  console.log(`   ✅ Script creado: ${scriptPath}`);
  
  return scriptPath;
}

// Función para crear configuración de Next.js optimizada
function createNextConfig() {
  console.log('⚙️ [Next.js] Optimizando configuración...');
  
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  let currentConfig = '';
  
  try {
    currentConfig = fs.readFileSync(nextConfigPath, 'utf-8');
  } catch (error) {
    console.log('   ℹ️ No se encontró next.config.js existente');
  }

  // Verificar si ya tiene la configuración de hostname
  if (currentConfig.includes('hostname:') || currentConfig.includes('0.0.0.0')) {
    console.log('   ✅ Configuración de hostname ya presente');
    return;
  }

  // Backup del archivo actual
  if (currentConfig) {
    fs.writeFileSync(nextConfigPath + '.backup', currentConfig);
    console.log('   💾 Backup creado: next.config.js.backup');
  }

  // Crear nueva configuración
  const newConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para acceso desde otras VLANs
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static']
  },
  
  // Configuración de red
  server: {
    hostname: '0.0.0.0',
    port: 3000
  },

  // Headers para CORS
  async headers() {
    return [
      {
        source: '/api/public/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, POST, PUT, DELETE, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        source: '/api/events',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'no-cache' },
        ],
      },
    ];
  },

  // Configuración de imágenes
  images: {
    unoptimized: true,
    domains: ['localhost', '192.168.101.3'],
    remotePatterns: [
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },

  // Configuración de webpack
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push('ffmpeg-static');
    }
    return config;
  },
};

module.exports = nextConfig;
`;

  fs.writeFileSync(nextConfigPath, newConfig);
  console.log('   ✅ Configuración de Next.js actualizada');
}

// Función principal
async function configureVLANAccess() {
  console.log('🚀 Iniciando configuración para acceso entre VLANs...\n');

  let success = true;

  // 1. Configurar firewall (solo Windows por ahora)
  if (isWindows()) {
    const firewallSuccess = await configureWindowsFirewall();
    success = success && firewallSuccess;
  } else {
    console.log('🐧 [Linux/Mac] Configuración manual de firewall requerida');
    console.log('   Ejecuta: sudo ufw allow 3000/tcp');
  }

  // 2. Verificar configuración de red
  const networkSuccess = await checkNetworkConfiguration();
  success = success && networkSuccess;

  // 3. Crear script de diagnóstico
  const scriptPath = createDiagnosticScript();

  // 4. Optimizar configuración de Next.js
  createNextConfig();

  // 5. Mostrar resumen
  console.log('\n📋 RESUMEN DE CONFIGURACIÓN:');
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (success) {
    console.log('✅ Configuración completada exitosamente');
    console.log('');
    console.log('🎯 URLs para acceso desde otras VLANs:');
    console.log('   📱 Pantalla: http://192.168.101.3:3000/screen/1750056135868');
    console.log('   🔧 Admin: http://192.168.101.3:3000/admin');
    console.log('   🔍 Test: http://192.168.101.3:3000/test-connectivity');
    console.log('');
    console.log('🔧 Herramientas de diagnóstico:');
    console.log(`   📝 Script: ${scriptPath}`);
    console.log('   🌐 Página de prueba: http://192.168.101.3:3000/test-connectivity');
    console.log('');
    console.log('🚀 Siguiente paso:');
    console.log('   1. Reinicia el servidor: npm run dev');
    console.log('   2. Prueba desde otro dispositivo/VLAN');
    console.log('   3. Si no funciona, ejecuta el script de diagnóstico');
  } else {
    console.log('⚠️ Configuración completada con advertencias');
    console.log('   Revisa los errores anteriores y configura manualmente si es necesario');
  }
  
  console.log('═══════════════════════════════════════════════════════════════');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  configureVLANAccess().catch(error => {
    console.error('❌ Error en configuración:', error);
    process.exit(1);
  });
}

module.exports = { configureVLANAccess };
