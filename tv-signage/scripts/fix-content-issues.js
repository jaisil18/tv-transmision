#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

console.log('🔧 Solucionando problemas de contenido...\n');

async function fixContentIssues() {
  try {
    console.log('1️⃣ Limpiando playlists de archivos inexistentes...');
    await execAsync('node scripts/clean-playlists.js');
    console.log('✅ Playlists limpiadas\n');

    console.log('2️⃣ Sincronizando archivos huérfanos...');
    await execAsync('node scripts/sync-content.js');
    console.log('✅ Contenido sincronizado\n');

    console.log('3️⃣ Regenerando miniaturas...');
    await execAsync('node scripts/regenerate-thumbnails.js');
    console.log('✅ Miniaturas regeneradas\n');

    console.log('4️⃣ Reiniciando servicio para aplicar cambios...');
    await execAsync('systemctl restart tv-signage.service');
    console.log('✅ Servicio reiniciado\n');

    console.log('5️⃣ Esperando que el servicio esté listo...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('6️⃣ Verificando estado del servicio...');
    const { stdout } = await execAsync('systemctl is-active tv-signage.service');
    if (stdout.trim() === 'active') {
      console.log('✅ Servicio activo y funcionando\n');
    } else {
      console.log('⚠️  Servicio no está activo, verificar manualmente\n');
    }

    console.log('7️⃣ Ejecutando diagnóstico final...');
    await execAsync('node scripts/diagnose-playback.js');

    console.log('\n🎉 ¡Proceso completado!');
    console.log('─'.repeat(50));
    console.log('✅ Playlists limpiadas y sincronizadas');
    console.log('✅ Miniaturas regeneradas');
    console.log('✅ Servicio reiniciado');
    console.log('✅ Diagnóstico ejecutado');
    console.log('\n🔄 Las pantallas deberían actualizarse automáticamente');
    console.log('📱 Si no se actualizan, recarga la página (Ctrl+F5)');
    console.log('\n🌐 URLs para verificar:');
    console.log('   • Admin: http://172.16.31.17:3000/admin/content');
    console.log('   • Pantalla: http://172.16.31.17:3000/screen/1750095404499');
    console.log('   • Diagnóstico: http://172.16.31.17:3000/debug-videos');

  } catch (error) {
    console.error('❌ Error durante el proceso:', error.message);
    console.log('\n🔧 Pasos manuales para solucionar:');
    console.log('1. npm run clean-playlists');
    console.log('2. npm run sync-content');
    console.log('3. npm run regenerate-thumbnails');
    console.log('4. npm run service-restart');
    console.log('5. npm run diagnose-playback');
    process.exit(1);
  }
}

fixContentIssues();
