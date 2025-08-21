#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔄 Actualizando servicio del sistema UCT TV...');

// Función para ejecutar comandos con manejo de errores
function runCommand(command, description) {
  try {
    console.log(`📋 ${description}...`);
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    console.log(`✅ ${description} completado`);
    return output;
  } catch (error) {
    console.error(`❌ Error en ${description}:`, error.message);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    return null;
  }
}

// Función para verificar si PM2 está instalado
function checkPM2() {
  try {
    execSync('pm2 --version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Función principal
async function updateSystemService() {
  try {
    // 1. Verificar si estamos en el directorio correcto
    const packageJsonPath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      console.error('❌ No se encontró package.json. Ejecuta este script desde el directorio raíz del proyecto.');
      process.exit(1);
    }

    // 2. Verificar PM2
    if (!checkPM2()) {
      console.log('⚠️ PM2 no está instalado. Instalando PM2...');
      runCommand('npm install -g pm2', 'Instalación de PM2');
    }

    // 3. Construir el proyecto
    console.log('🏗️ Construyendo el proyecto...');
    const buildResult = runCommand('npm run build', 'Build del proyecto');
    if (!buildResult && buildResult !== '') {
      console.error('❌ Error en el build. Abortando actualización.');
      process.exit(1);
    }

    // 4. Verificar si el servicio ya existe
    let serviceExists = false;
    try {
      const pmList = execSync('pm2 list', { encoding: 'utf8', stdio: 'pipe' });
      serviceExists = pmList.includes('uct-tv-system');
    } catch (error) {
      console.log('📋 No se pudo verificar servicios existentes, continuando...');
    }

    // 5. Actualizar o crear el servicio
    if (serviceExists) {
      console.log('🔄 Servicio existente encontrado. Actualizando...');
      
      // Recargar la configuración
      runCommand('pm2 reload ecosystem.config.js --env production', 'Recarga del servicio');
      
      // Reiniciar el servicio
      runCommand('pm2 restart uct-tv-system', 'Reinicio del servicio');
    } else {
      console.log('🆕 Creando nuevo servicio...');
      
      // Iniciar el servicio por primera vez
      runCommand('pm2 start ecosystem.config.js --env production', 'Inicio del servicio');
    }

    // 6. Guardar la configuración de PM2
    runCommand('pm2 save', 'Guardado de configuración PM2');

    // 7. Configurar inicio automático (si no está configurado)
    try {
      runCommand('pm2 startup', 'Configuración de inicio automático');
    } catch (error) {
      console.log('⚠️ No se pudo configurar el inicio automático automáticamente.');
      console.log('💡 Ejecuta manualmente: sudo pm2 startup');
    }

    // 8. Mostrar estado del servicio
    console.log('\n📊 Estado actual del servicio:');
    runCommand('pm2 status', 'Estado del servicio');

    // 9. Mostrar logs recientes
    console.log('\n📝 Logs recientes:');
    try {
      const logs = execSync('pm2 logs uct-tv-system --lines 10 --nostream', { encoding: 'utf8', stdio: 'pipe' });
      console.log(logs);
    } catch (error) {
      console.log('⚠️ No se pudieron obtener los logs');
    }

    console.log('\n✅ ¡Actualización del servicio completada exitosamente!');
    console.log('\n📋 Comandos útiles:');
    console.log('  - Ver estado: pm2 status');
    console.log('  - Ver logs: pm2 logs uct-tv-system');
    console.log('  - Reiniciar: pm2 restart uct-tv-system');
    console.log('  - Parar: pm2 stop uct-tv-system');
    console.log('  - Monitorear: pm2 monit');

  } catch (error) {
    console.error('❌ Error durante la actualización:', error.message);
    process.exit(1);
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  updateSystemService();
}

module.exports = { updateSystemService };
