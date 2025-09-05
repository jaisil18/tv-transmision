#!/usr/bin/env node

/**
 * Script de verificación de configuración de rutas para TV Signage
 * Verifica que las rutas estén configuradas correctamente y sean accesibles
 */

const { existsSync, accessSync, constants, statSync } = require('fs');
const { join } = require('path');

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

// Función para verificar permisos de directorio
function checkDirectoryPermissions(path) {
  const permissions = {
    exists: false,
    readable: false,
    writable: false,
    executable: false
  };
  
  try {
    if (existsSync(path)) {
      permissions.exists = true;
      
      try {
        accessSync(path, constants.R_OK);
        permissions.readable = true;
      } catch {}
      
      try {
        accessSync(path, constants.W_OK);
        permissions.writable = true;
      } catch {}
      
      try {
        accessSync(path, constants.X_OK);
        permissions.executable = true;
      } catch {}
    }
  } catch (error) {
    // El directorio no existe o no es accesible
  }
  
  return permissions;
}

// Función para obtener información del directorio
function getDirectoryInfo(path) {
  try {
    if (!existsSync(path)) {
      return null;
    }
    
    const stats = statSync(path);
    return {
      isDirectory: stats.isDirectory(),
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      accessed: stats.atime
    };
  } catch (error) {
    return null;
  }
}

// Función principal de verificación
async function verifyPaths() {
  try {
    logHeader('🔍 VERIFICACIÓN DE CONFIGURACIÓN DE RUTAS');
    
    // 1. Verificar configuración del módulo path-config
    logInfo('Verificando configuración del módulo path-config...');
    
    let pathConfig;
    try {
      const pathConfigPath = require('path').resolve(__dirname, '../lib/path-config.js');
      pathConfig = require(pathConfigPath);
      logSuccess('Módulo path-config cargado correctamente');
    } catch (error) {
      logError(`Error al cargar path-config: ${error.message}`);
      return;
    }
    
    // 2. Obtener información de configuración
    const verification = pathConfig.verifyPathConfiguration();
    
    if (verification.success) {
      logSuccess('Configuración básica verificada');
    } else {
      logError('Problemas en la configuración básica');
      console.log(verification.details);
    }
    
    // 3. Verificar ruta base
    logInfo('Verificando ruta base...');
    
    const basePath = pathConfig.BASE_PATH;
    log(`📁 Ruta base: ${basePath}`, 'cyan');
    
    const basePermissions = checkDirectoryPermissions(basePath);
    const baseInfo = getDirectoryInfo(basePath);
    
    if (basePermissions.exists) {
      logSuccess('La ruta base existe');
      
      if (baseInfo && baseInfo.isDirectory) {
        logSuccess('Es un directorio válido');
      } else {
        logError('La ruta existe pero no es un directorio');
      }
      
      if (basePermissions.readable) {
        logSuccess('Permisos de lectura: OK');
      } else {
        logError('Sin permisos de lectura');
      }
      
      if (basePermissions.writable) {
        logSuccess('Permisos de escritura: OK');
      } else {
        logError('Sin permisos de escritura');
      }
      
      if (basePermissions.executable) {
        logSuccess('Permisos de ejecución: OK');
      } else {
        logWarning('Sin permisos de ejecución (puede afectar navegación)');
      }
      
    } else {
      logError('La ruta base no existe');
    }
    
    // 4. Verificar archivo .env
    logInfo('Verificando archivo .env...');
    
    const envPath = join(process.cwd(), '.env');
    if (existsSync(envPath)) {
      logSuccess('Archivo .env encontrado');
      
      try {
        const envContent = require('fs').readFileSync(envPath, 'utf8');
        const mediaPathMatch = envContent.match(/TV_SIGNAGE_MEDIA_PATH=(.+)/);
        
        if (mediaPathMatch) {
          const configuredPath = mediaPathMatch[1].trim();
          log(`📂 Ruta configurada en .env: ${configuredPath}`, 'magenta');
          
          if (configuredPath === basePath) {
            logSuccess('La ruta en .env coincide con la ruta activa');
          } else {
            logWarning('La ruta en .env difiere de la ruta activa');
            log(`   Activa: ${basePath}`, 'yellow');
            log(`   .env: ${configuredPath}`, 'yellow');
          }
        } else {
          logWarning('No se encontró TV_SIGNAGE_MEDIA_PATH en .env');
        }
      } catch (error) {
        logError(`Error al leer .env: ${error.message}`);
      }
    } else {
      logWarning('Archivo .env no encontrado');
      logInfo('Ejecuta "npm run setup-paths" para crear la configuración');
    }
    
    // 5. Verificar subdirectorios comunes
    logInfo('Verificando subdirectorios...');
    
    const commonSubDirs = ['videos', 'imagenes', 'playlists'];
    for (const subDir of commonSubDirs) {
      const subDirPath = join(basePath, subDir);
      const subPermissions = checkDirectoryPermissions(subDirPath);
      
      if (subPermissions.exists) {
        logSuccess(`Subdirectorio '${subDir}': OK`);
      } else {
        logWarning(`Subdirectorio '${subDir}': No existe`);
      }
    }
    
    // 6. Probar creación de carpeta de prueba
    logInfo('Probando creación de carpeta...');
    
    try {
      const testFolderName = `test-${Date.now()}`;
      const testFolderPath = pathConfig.getFolderPath(testFolderName);
      
      if (existsSync(testFolderPath)) {
        logSuccess('Prueba de creación de carpeta: OK');
        
        // Limpiar carpeta de prueba
        try {
          require('fs').rmdirSync(testFolderPath);
          logInfo('Carpeta de prueba eliminada');
        } catch {}
      } else {
        logError('Falló la creación de carpeta de prueba');
      }
    } catch (error) {
      logError(`Error en prueba de creación: ${error.message}`);
    }
    
    // 7. Mostrar resumen
    logHeader('📊 RESUMEN DE VERIFICACIÓN');
    
    const summary = {
      basePath,
      exists: basePermissions.exists,
      readable: basePermissions.readable,
      writable: basePermissions.writable,
      hasEnvFile: existsSync(envPath),
      configurationValid: verification.success
    };
    
    console.log(JSON.stringify(summary, null, 2));
    
    if (summary.exists && summary.readable && summary.writable && summary.configurationValid) {
      logSuccess('✨ Configuración completamente funcional');
    } else {
      logWarning('⚠️  Se encontraron algunos problemas');
      
      console.log('\n🔧 Soluciones recomendadas:');
      
      if (!summary.exists) {
        log('- Ejecuta "npm run setup-paths" para crear los directorios', 'blue');
      }
      
      if (!summary.writable) {
        log('- Verifica los permisos del directorio', 'blue');
        log('- Considera usar una ruta diferente en el archivo .env', 'blue');
      }
      
      if (!summary.hasEnvFile) {
        log('- Ejecuta "npm run setup-paths" para generar .env', 'blue');
      }
    }
    
  } catch (error) {
    logError(`Error durante la verificación: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  verifyPaths();
}

module.exports = { verifyPaths };