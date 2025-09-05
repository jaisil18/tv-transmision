#!/usr/bin/env node

/**
 * Script de configuración automática de rutas para TV Signage
 * Detecta el sistema operativo y usuario actual, configura las rutas automáticamente
 */

const { homedir, userInfo, platform } = require('os');
const { join, resolve } = require('path');
const { existsSync, mkdirSync, writeFileSync, readFileSync } = require('fs');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60));
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Función principal
async function setupPaths() {
  try {
    logHeader('🚀 CONFIGURACIÓN AUTOMÁTICA DE TV SIGNAGE');
    
    // 1. Detectar información del sistema
    logInfo('Detectando información del sistema...');
    
    const systemInfo = {
      platform: platform(),
      user: userInfo().username,
      homeDir: homedir(),
      projectDir: process.cwd()
    };
    
    log(`💻 Plataforma: ${systemInfo.platform}`, 'cyan');
    log(`👤 Usuario: ${systemInfo.user}`, 'cyan');
    log(`🏠 Directorio home: ${systemInfo.homeDir}`, 'cyan');
    log(`📁 Directorio del proyecto: ${systemInfo.projectDir}`, 'cyan');
    
    // 2. Calcular ruta base recomendada
    logInfo('Calculando ruta base recomendada...');
    
    let recommendedPath;
    if (systemInfo.platform === 'win32') {
      recommendedPath = join(systemInfo.homeDir, 'Music', 'tv-signage-media');
    } else {
      recommendedPath = join(systemInfo.homeDir, 'Música', 'tv-signage-media');
    }
    
    log(`📂 Ruta recomendada: ${recommendedPath}`, 'magenta');
    
    // 3. Verificar si ya existe configuración
    const envPath = join(systemInfo.projectDir, '.env');
    const envExamplePath = join(systemInfo.projectDir, '.env.example');
    
    let existingConfig = null;
    if (existsSync(envPath)) {
      logWarning('Archivo .env ya existe');
      try {
        const envContent = readFileSync(envPath, 'utf8');
        const mediaPathMatch = envContent.match(/TV_SIGNAGE_MEDIA_PATH=(.+)/);
        if (mediaPathMatch) {
          existingConfig = mediaPathMatch[1].trim();
          log(`📁 Configuración actual: ${existingConfig}`, 'yellow');
        }
      } catch (error) {
        logWarning('No se pudo leer la configuración existente');
      }
    }
    
    // 4. Crear directorio de media
    logInfo('Creando directorio de media...');
    
    const targetPath = existingConfig || recommendedPath;
    
    try {
      if (!existsSync(targetPath)) {
        mkdirSync(targetPath, { recursive: true });
        logSuccess(`Directorio creado: ${targetPath}`);
      } else {
        logSuccess(`Directorio ya existe: ${targetPath}`);
      }
      
      // Crear subdirectorios de ejemplo
      const subDirs = ['videos', 'imagenes', 'playlists'];
      for (const subDir of subDirs) {
        const subDirPath = join(targetPath, subDir);
        if (!existsSync(subDirPath)) {
          mkdirSync(subDirPath, { recursive: true });
          logSuccess(`Subdirectorio creado: ${subDir}`);
        }
      }
      
    } catch (error) {
      logError(`Error al crear directorio: ${error.message}`);
      
      // Fallback: usar carpeta del proyecto
      const fallbackPath = join(systemInfo.projectDir, 'media-storage');
      logWarning(`Usando directorio fallback: ${fallbackPath}`);
      
      try {
        if (!existsSync(fallbackPath)) {
          mkdirSync(fallbackPath, { recursive: true });
          logSuccess(`Directorio fallback creado: ${fallbackPath}`);
        }
      } catch (fallbackError) {
        logError(`Error crítico: No se pudo crear ningún directorio`);
        process.exit(1);
      }
    }
    
    // 5. Generar archivo .env si no existe
    if (!existsSync(envPath)) {
      logInfo('Generando archivo .env...');
      
      const envContent = `# Configuración automática generada por setup-paths.js
# Generado el: ${new Date().toISOString()}
# Usuario: ${systemInfo.user}
# Plataforma: ${systemInfo.platform}

# Ruta de archivos de media
TV_SIGNAGE_MEDIA_PATH=${targetPath}

# Configuración del servidor
PORT=3000
HOST=localhost

# Modo de desarrollo
NODE_ENV=development
`;
      
      try {
        writeFileSync(envPath, envContent, 'utf8');
        logSuccess('Archivo .env generado correctamente');
      } catch (error) {
        logError(`Error al generar .env: ${error.message}`);
      }
    } else {
      logInfo('Archivo .env ya existe, no se sobrescribirá');
    }
    
    // 6. Verificar configuración final
    logInfo('Verificando configuración final...');
    
    try {
      // Importar y verificar la configuración
      const pathConfigPath = require('path').resolve(__dirname, '../lib/path-config.js');
      delete require.cache[pathConfigPath];
      const { verifyPathConfiguration } = require(pathConfigPath);
      
      const verification = verifyPathConfiguration();
      
      if (verification.success) {
        logSuccess('Configuración verificada correctamente');
        console.log('\n📊 Detalles de la configuración:');
        console.log(JSON.stringify(verification.details, null, 2));
      } else {
        logWarning('Problemas en la verificación:');
        console.log(verification.details);
      }
      
    } catch (error) {
      logWarning(`No se pudo verificar la configuración: ${error.message}`);
    }
    
    // 7. Mostrar instrucciones finales
    logHeader('🎉 CONFIGURACIÓN COMPLETADA');
    
    logSuccess('La configuración de rutas se ha completado exitosamente');
    console.log('\n📋 Próximos pasos:');
    log('1. Ejecuta "npm run dev" para iniciar el servidor', 'cyan');
    log('2. Visita http://localhost:3000 en tu navegador', 'cyan');
    log('3. Ve a la sección "Gestión de Archivos" para subir contenido', 'cyan');
    log('4. Si necesitas cambiar la ruta, edita el archivo .env', 'cyan');
    
    console.log('\n🔧 Comandos útiles:');
    log('- npm run verify-paths: Verificar configuración de rutas', 'blue');
    log('- npm run setup-paths: Ejecutar este script nuevamente', 'blue');
    
  } catch (error) {
    logError(`Error durante la configuración: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  setupPaths();
}

module.exports = { setupPaths };