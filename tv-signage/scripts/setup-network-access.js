#!/usr/bin/env node

const { networkInterfaces } = require('os');
const fs = require('fs');
const path = require('path');

console.log('🌐 [Network Setup] Configurando acceso desde otras VLANs...\n');

// Función para detectar interfaces de red
function detectNetworkInterfaces() {
  const nets = networkInterfaces();
  const interfaces = [];

  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        interfaces.push({
          name,
          address: net.address,
          netmask: net.netmask,
          cidr: net.cidr,
          isPrivate: isPrivateIP(net.address)
        });
      }
    }
  }

  return interfaces;
}

// Función para verificar si es IP privada
function isPrivateIP(ip) {
  return (
    ip.startsWith('192.168.') ||
    ip.startsWith('10.') ||
    (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)
  );
}

// Función para determinar la mejor IP
function getBestServerIP(interfaces) {
  // Priorizar IPs privadas comunes
  const priorities = [
    (ip) => ip.startsWith('192.168.'), // Redes domésticas/oficina
    (ip) => ip.startsWith('10.'),      // Redes corporativas
    (ip) => ip.startsWith('172.'),     // Redes Docker/VPN
  ];

  for (const priority of priorities) {
    const found = interfaces.find(iface => priority(iface.address));
    if (found) return found;
  }

  // Si no encuentra ninguna, usar la primera disponible
  return interfaces[0];
}

// Función para actualizar configuración
function updateSettings(serverIP) {
  const settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  
  try {
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    }

    // Actualizar URL del servidor
    settings.serverUrl = `http://${serverIP}`;
    settings.serverPort = 3000;
    settings.lastNetworkUpdate = new Date().toISOString();

    // Escribir configuración actualizada
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`✅ Configuración actualizada en: ${settingsPath}`);
    
    return settings;
  } catch (error) {
    console.error(`❌ Error al actualizar configuración: ${error.message}`);
    return null;
  }
}

// Función para crear configuración de red
function createNetworkConfig(serverIP, interfaces) {
  const networkConfigPath = path.join(process.cwd(), 'data', 'network-config.json');
  const publicNetworkConfigPath = path.join(process.cwd(), 'public', 'data', 'network-config.json');
  
  const networkConfig = {
    serverIP,
    serverPort: 3000,
    rtspPort: 8554,
    interfaces: interfaces.map(iface => ({
      name: iface.name,
      address: iface.address,
      isPrivate: iface.isPrivate
    })),
    urls: {
      web: `http://${serverIP}:3000`,
      admin: `http://${serverIP}:3000/admin`,
      api: `http://${serverIP}:3000/api`,
      hls: `http://${serverIP}:3000/api/hls`,
      rtsp: `rtsp://${serverIP}:8554`
    },
    accessInstructions: {
      sameNetwork: `http://${serverIP}:3000/screen/[SCREEN_ID]`,
      differentVLAN: `Asegúrate de que el puerto 3000 esté abierto en el firewall`,
      mobile: `Conecta tu móvil a la misma red y usa: http://${serverIP}:3000/screen/[SCREEN_ID]`
    },
    lastUpdated: new Date().toISOString()
  };

  try {
    // Crear directorio público si no existe
    const publicDataDir = path.dirname(publicNetworkConfigPath);
    if (!fs.existsSync(publicDataDir)) {
      fs.mkdirSync(publicDataDir, { recursive: true });
    }

    // Escribir en ambas ubicaciones
    fs.writeFileSync(networkConfigPath, JSON.stringify(networkConfig, null, 2));
    fs.writeFileSync(publicNetworkConfigPath, JSON.stringify(networkConfig, null, 2));

    console.log(`✅ Configuración de red creada en: ${networkConfigPath}`);
    console.log(`✅ Configuración pública creada en: ${publicNetworkConfigPath}`);
    return networkConfig;
  } catch (error) {
    console.error(`❌ Error al crear configuración de red: ${error.message}`);
    return null;
  }
}

// Función para mostrar información de acceso
function showAccessInfo(networkConfig) {
  console.log('\n📋 [Información de Acceso]');
  console.log('═══════════════════════════════════════════════════════════════');
  
  console.log(`\n🌐 Servidor Principal: ${networkConfig.urls.web}`);
  console.log(`🔧 Panel Admin: ${networkConfig.urls.admin}`);
  
  console.log('\n📱 URLs para Pantallas:');
  console.log(`   Pantalla de ejemplo: ${networkConfig.urls.web}/screen/1750056135868`);
  console.log(`   Formato general: ${networkConfig.urls.web}/screen/[SCREEN_ID]`);
  
  console.log('\n🎬 URLs de Streaming:');
  console.log(`   HLS: ${networkConfig.urls.hls}/[SCREEN_ID]`);
  console.log(`   RTSP: ${networkConfig.urls.rtsp}/live/screen_[SCREEN_ID]`);
  
  console.log('\n🌍 Interfaces de Red Detectadas:');
  networkConfig.interfaces.forEach(iface => {
    console.log(`   📡 ${iface.name}: ${iface.address} ${iface.isPrivate ? '(Privada)' : '(Pública)'}`);
  });
  
  console.log('\n📋 Instrucciones de Acceso:');
  console.log('   • Misma red: Usa las URLs mostradas arriba');
  console.log('   • Otra VLAN: Asegúrate de que el puerto 3000 esté abierto');
  console.log('   • Móvil: Conecta a la misma red WiFi y usa las URLs');
  console.log('   • TV/Android: Usa el navegador con las URLs mostradas');
  
  console.log('\n🔧 Solución de Problemas:');
  console.log('   • Si no puedes acceder desde otra VLAN:');
  console.log('     1. Verifica que el firewall permita el puerto 3000');
  console.log('     2. Verifica que no haya restricciones de VLAN');
  console.log('     3. Prueba hacer ping a la IP del servidor');
  console.log(`     4. Prueba: curl http://${networkConfig.serverIP}:3000/api/public/settings`);
  
  console.log('\n═══════════════════════════════════════════════════════════════');
}

// Función principal
function main() {
  try {
    // Detectar interfaces de red
    const interfaces = detectNetworkInterfaces();
    
    if (interfaces.length === 0) {
      console.error('❌ No se encontraron interfaces de red válidas');
      process.exit(1);
    }

    console.log('🔍 Interfaces de red detectadas:');
    interfaces.forEach(iface => {
      console.log(`   📡 ${iface.name}: ${iface.address} ${iface.isPrivate ? '(Privada)' : '(Pública)'}`);
    });

    // Determinar la mejor IP
    const bestInterface = getBestServerIP(interfaces);
    const serverIP = bestInterface.address;
    
    console.log(`\n🎯 IP seleccionada para el servidor: ${serverIP}`);
    console.log(`   Interface: ${bestInterface.name}`);
    console.log(`   Tipo: ${bestInterface.isPrivate ? 'Red Privada' : 'Red Pública'}`);

    // Actualizar configuraciones
    const settings = updateSettings(serverIP);
    const networkConfig = createNetworkConfig(serverIP, interfaces);

    if (settings && networkConfig) {
      showAccessInfo(networkConfig);
      
      console.log('\n🚀 [Siguiente Paso]');
      console.log('   Reinicia el servidor para aplicar los cambios:');
      console.log('   npm run dev');
      console.log('');
      console.log('   Luego prueba el acceso desde otra VLAN con:');
      console.log(`   http://${serverIP}:3000/screen/1750056135868`);
      
    } else {
      console.error('❌ Error al configurar el acceso de red');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error en configuración de red:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = {
  detectNetworkInterfaces,
  getBestServerIP,
  updateSettings,
  createNetworkConfig
};
