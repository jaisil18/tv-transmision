#!/usr/bin/env node

/**
 * Script para actualizar automáticamente la configuración de red
 * Detecta la IP actual del sistema y actualiza todos los archivos de configuración
 * 
 * Uso:
 *   node scripts/update-network-config.js
 *   npm run update-network
 */

const { detectNetworkInterfaces, getBestServerIP, updateSettings, createNetworkConfig } = require('./setup-network-access.js');
const fs = require('fs');
const path = require('path');

console.log('🔄 [Network Update] Actualizando configuración de red automáticamente...\n');

function updateNextConfig(serverIP) {
  const nextConfigPath = path.join(process.cwd(), 'next.config.js');
  
  try {
    let content = fs.readFileSync(nextConfigPath, 'utf-8');
    
    // Buscar y reemplazar la IP en allowedDevOrigins
    content = content.replace(
      /(allowedDevOrigins:\s*\[\s*['"])([^'"]+)(['"]),?\s*\/\/[^\n]*/,
      `$1${serverIP}$3, // IP actual detectada automáticamente`
    );
    
    // Buscar y reemplazar la IP en remotePatterns
    content = content.replace(
      /(hostname:\s*['"])([^'"]+)(['"]),?\s*\/\/[^\n]*IP actual[^\n]*/,
      `$1${serverIP}$3, // IP actual detectada automáticamente`
    );
    
    fs.writeFileSync(nextConfigPath, content);
    console.log(`✅ next.config.js actualizado con IP: ${serverIP}`);
    return true;
  } catch (error) {
    console.error(`❌ Error al actualizar next.config.js: ${error.message}`);
    return false;
  }
}

function main() {
  try {
    // Detectar interfaces de red
    const interfaces = detectNetworkInterfaces();
    
    if (interfaces.length === 0) {
      console.error('❌ No se encontraron interfaces de red válidas');
      process.exit(1);
    }

    // Determinar la mejor IP
    const bestInterface = getBestServerIP(interfaces);
    const serverIP = bestInterface.address;
    
    console.log(`🎯 IP detectada: ${serverIP} (${bestInterface.name})`);

    // Actualizar todas las configuraciones
    const settingsUpdated = updateSettings(serverIP);
    const networkConfigUpdated = createNetworkConfig(serverIP, interfaces);
    const nextConfigUpdated = updateNextConfig(serverIP);

    if (settingsUpdated && networkConfigUpdated && nextConfigUpdated) {
      console.log('\n✅ [Éxito] Configuración de red actualizada completamente');
      console.log('\n📋 Archivos actualizados:');
      console.log('   • data/settings.json');
      console.log('   • data/network-config.json');
      console.log('   • public/data/network-config.json');
      console.log('   • next.config.js');
      
      console.log('\n🚀 [Siguiente Paso]');
      console.log('   Reinicia el servidor para aplicar los cambios:');
      console.log('   npm run dev');
      
      console.log('\n🌐 URLs actualizadas:');
      console.log(`   • Web: http://${serverIP}:3000`);
      console.log(`   • Admin: http://${serverIP}:3000/admin`);
      console.log(`   • API: http://${serverIP}:3000/api`);
      
    } else {
      console.error('❌ Error al actualizar la configuración de red');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error en actualización de red:', error.message);
    process.exit(1);
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main();
}

module.exports = {
  updateNextConfig,
  main
};