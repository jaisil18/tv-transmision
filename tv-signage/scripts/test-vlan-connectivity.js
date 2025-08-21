#!/usr/bin/env node

const { networkInterfaces } = require('os');
const http = require('http');
const { spawn } = require('child_process');

console.log('🔍 [VLAN Test] Diagnosticando conectividad entre VLANs...\n');

// Función para obtener interfaces de red
function getNetworkInterfaces() {
  const nets = networkInterfaces();
  const interfaces = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        interfaces.push({
          name,
          address: net.address,
          netmask: net.netmask,
          cidr: net.cidr
        });
      }
    }
  }

  return interfaces;
}

// Función para probar conectividad HTTP
function testHTTPConnectivity(ip, port) {
  return new Promise((resolve) => {
    const options = {
      hostname: ip,
      port: port,
      path: '/api/public/settings',
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          success: true,
          status: res.statusCode,
          data: data.length > 0 ? 'OK' : 'Empty'
        });
      });
    });

    req.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        success: false,
        error: 'Timeout'
      });
    });

    req.end();
  });
}

// Función para probar ping
function testPing(ip) {
  return new Promise((resolve) => {
    const isWindows = process.platform === 'win32';
    const pingCmd = isWindows ? 'ping' : 'ping';
    const pingArgs = isWindows ? ['-n', '3', ip] : ['-c', '3', ip];

    const ping = spawn(pingCmd, pingArgs, { stdio: 'pipe' });
    
    let output = '';
    ping.stdout.on('data', (data) => output += data.toString());
    ping.stderr.on('data', (data) => output += data.toString());

    ping.on('close', (code) => {
      resolve({
        success: code === 0,
        output: output
      });
    });

    ping.on('error', (error) => {
      resolve({
        success: false,
        error: error.message
      });
    });

    // Timeout después de 10 segundos
    setTimeout(() => {
      ping.kill();
      resolve({
        success: false,
        error: 'Ping timeout'
      });
    }, 10000);
  });
}

// Función para verificar puertos
function testPort(ip, port) {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      resolve({
        success: false,
        error: 'Port timeout'
      });
    }, 3000);

    socket.connect(port, ip, () => {
      clearTimeout(timeout);
      socket.destroy();
      resolve({
        success: true,
        message: 'Port open'
      });
    });

    socket.on('error', (error) => {
      clearTimeout(timeout);
      resolve({
        success: false,
        error: error.message
      });
    });
  });
}

// Función principal de diagnóstico
async function runDiagnostics() {
  const interfaces = getNetworkInterfaces();
  const serverPort = 3000;
  
  console.log('📡 Interfaces de red detectadas:');
  interfaces.forEach(iface => {
    console.log(`   ${iface.name}: ${iface.address}/${iface.cidr}`);
  });
  console.log('');

  if (interfaces.length === 0) {
    console.log('❌ No se encontraron interfaces de red válidas');
    return;
  }

  const serverIP = interfaces[0].address;
  console.log(`🎯 Probando conectividad para servidor: ${serverIP}:${serverPort}\n`);

  // 1. Probar ping
  console.log('1. 🏓 Probando conectividad básica (ping)...');
  const pingResult = await testPing(serverIP);
  if (pingResult.success) {
    console.log('   ✅ Ping exitoso');
  } else {
    console.log(`   ❌ Ping falló: ${pingResult.error}`);
    console.log('   💡 Esto indica problemas de conectividad de red básica');
  }
  console.log('');

  // 2. Probar puerto
  console.log(`2. 🔌 Probando puerto ${serverPort}...`);
  const portResult = await testPort(serverIP, serverPort);
  if (portResult.success) {
    console.log('   ✅ Puerto accesible');
  } else {
    console.log(`   ❌ Puerto no accesible: ${portResult.error}`);
    console.log('   💡 El servidor puede no estar ejecutándose o el firewall bloquea el puerto');
  }
  console.log('');

  // 3. Probar HTTP
  console.log('3. 🌐 Probando conectividad HTTP...');
  const httpResult = await testHTTPConnectivity(serverIP, serverPort);
  if (httpResult.success) {
    console.log(`   ✅ HTTP exitoso (Status: ${httpResult.status})`);
  } else {
    console.log(`   ❌ HTTP falló: ${httpResult.error}`);
  }
  console.log('');

  // 4. Generar reporte
  console.log('📋 REPORTE DE DIAGNÓSTICO:');
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (pingResult.success && portResult.success && httpResult.success) {
    console.log('✅ ESTADO: Servidor accesible desde la red local');
    console.log('');
    console.log('🎯 URLs para compartir:');
    console.log(`   📱 Pantalla: http://${serverIP}:${serverPort}/screen/1750056135868`);
    console.log(`   🔧 Admin: http://${serverIP}:${serverPort}/admin`);
    console.log('');
    console.log('💡 Si otros dispositivos no pueden acceder:');
    console.log('   1. Verifica que estén en la misma red o VLAN');
    console.log('   2. Verifica configuración de firewall');
    console.log('   3. Verifica routing entre VLANs');
  } else {
    console.log('❌ ESTADO: Problemas de conectividad detectados');
    console.log('');
    console.log('🔧 SOLUCIONES RECOMENDADAS:');
    
    if (!pingResult.success) {
      console.log('');
      console.log('🏓 PROBLEMA DE PING:');
      console.log('   • Verifica conectividad de red básica');
      console.log('   • Verifica configuración de IP');
      console.log('   • Verifica cables de red/WiFi');
    }
    
    if (!portResult.success) {
      console.log('');
      console.log('🔌 PROBLEMA DE PUERTO:');
      console.log('   • Verifica que el servidor esté ejecutándose');
      console.log('   • Verifica configuración de firewall:');
      console.log('     Windows: netsh advfirewall firewall add rule name="UCT TV" dir=in action=allow protocol=TCP localport=3000');
      console.log('     Linux: sudo ufw allow 3000/tcp');
      console.log('   • Verifica que no haya otros servicios usando el puerto 3000');
    }
    
    if (!httpResult.success) {
      console.log('');
      console.log('🌐 PROBLEMA HTTP:');
      console.log('   • Verifica que el servidor Next.js esté ejecutándose');
      console.log('   • Verifica configuración de CORS');
      console.log('   • Verifica que el servidor escuche en 0.0.0.0');
    }
  }
  
  console.log('');
  console.log('🔍 COMANDOS DE VERIFICACIÓN MANUAL:');
  console.log(`   ping ${serverIP}`);
  console.log(`   telnet ${serverIP} ${serverPort}`);
  console.log(`   curl http://${serverIP}:${serverPort}/api/public/settings`);
  console.log('');
  console.log('📞 PRUEBA DESDE OTRO DISPOSITIVO:');
  console.log(`   curl -v http://${serverIP}:${serverPort}/api/public/settings`);
  console.log(`   wget http://${serverIP}:${serverPort}/api/public/settings`);
  
  console.log('═══════════════════════════════════════════════════════════════');
}

// Ejecutar diagnósticos
if (require.main === module) {
  runDiagnostics().catch(error => {
    console.error('❌ Error en diagnósticos:', error);
    process.exit(1);
  });
}

module.exports = { runDiagnostics, testHTTPConnectivity, testPing, testPort };
