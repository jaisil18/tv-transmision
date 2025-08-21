const fs = require('fs');
const path = require('path');

console.log('🔍 DIAGNÓSTICO DE LA APLICACIÓN ANDROID');
console.log('=====================================\n');

// 1. Verificar configuración de IP
console.log('1️⃣ VERIFICANDO CONFIGURACIÓN DE IP...');
const apiConfigPath = 'android-app/app/src/main/java/com/uct/tvcontentviewer/data/api/ApiConfig.kt';

try {
    if (fs.existsSync(apiConfigPath)) {
        const apiConfig = fs.readFileSync(apiConfigPath, 'utf8');
        const primaryUrlMatch = apiConfig.match(/PRIMARY_BASE_URL = "([^"]+)"/);
        const fallbackUrlMatch = apiConfig.match(/FALLBACK_BASE_URL = "([^"]+)"/);
        
        if (primaryUrlMatch) {
            console.log(`✅ URL Primaria configurada: ${primaryUrlMatch[1]}`);
        }
        if (fallbackUrlMatch) {
            console.log(`✅ URL de Respaldo configurada: ${fallbackUrlMatch[1]}`);
        }
    } else {
        console.log('❌ No se encontró el archivo ApiConfig.kt');
    }
} catch (error) {
    console.log(`❌ Error leyendo ApiConfig.kt: ${error.message}`);
}

// 2. Verificar diferencias entre AndroidPlayerActivity y TVPlayerActivity
console.log('\n2️⃣ VERIFICANDO DIFERENCIAS ENTRE REPRODUCTORES...');

const androidPlayerPath = 'android-app/app/src/main/java/com/uct/tvcontentviewer/ui/AndroidPlayerActivity.kt';
const tvPlayerPath = 'android-app/app/src/main/java/com/uct/tvcontentviewer/ui/TVPlayerActivity.kt';

try {
    if (fs.existsSync(androidPlayerPath) && fs.existsSync(tvPlayerPath)) {
        const androidPlayer = fs.readFileSync(androidPlayerPath, 'utf8');
        const tvPlayer = fs.readFileSync(tvPlayerPath, 'utf8');
        
        // Verificar WebSocket en AndroidPlayer
        const androidHasWebSocket = androidPlayer.includes('WebSocketManager');
        const tvHasWebSocket = tvPlayer.includes('WebSocketManager');
        
        console.log(`📱 AndroidPlayerActivity tiene WebSocket: ${androidHasWebSocket ? '✅ SÍ' : '❌ NO'}`);
        console.log(`📺 TVPlayerActivity tiene WebSocket: ${tvHasWebSocket ? '✅ SÍ' : '❌ NO'}`);
        
        if (!androidHasWebSocket && tvHasWebSocket) {
            console.log('⚠️  PROBLEMA DETECTADO: AndroidPlayerActivity no tiene WebSocket pero TVPlayerActivity sí');
            console.log('   Esto significa que las pantallas Android no reciben actualizaciones en tiempo real');
        }
        
        // Verificar intervalos de actualización
        const androidRefreshMatch = androidPlayer.match(/AUTO_REFRESH_INTERVAL = (\d+)L/);
        const tvRefreshMatch = tvPlayer.match(/CONTENT_CHECK_INTERVAL = (\d+)L/);
        
        if (androidRefreshMatch) {
            const androidInterval = parseInt(androidRefreshMatch[1]) / 1000;
            console.log(`📱 AndroidPlayer actualiza cada: ${androidInterval} segundos`);
        }
        
        if (tvRefreshMatch) {
            const tvInterval = parseInt(tvRefreshMatch[1]) / 1000;
            console.log(`📺 TVPlayer actualiza cada: ${tvInterval} segundos`);
        }
        
    } else {
        console.log('❌ No se encontraron los archivos de los reproductores');
    }
} catch (error) {
    console.log(`❌ Error comparando reproductores: ${error.message}`);
}

// 3. Verificar permisos en AndroidManifest
console.log('\n3️⃣ VERIFICANDO PERMISOS EN ANDROIDMANIFEST...');

const manifestPath = 'android-app/app/src/main/AndroidManifest.xml';

try {
    if (fs.existsSync(manifestPath)) {
        const manifest = fs.readFileSync(manifestPath, 'utf8');
        
        const requiredPermissions = [
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE',
            'android.permission.ACCESS_WIFI_STATE',
            'android.permission.WAKE_LOCK'
        ];
        
        console.log('Permisos requeridos:');
        requiredPermissions.forEach(permission => {
            const hasPermission = manifest.includes(permission);
            console.log(`  ${hasPermission ? '✅' : '❌'} ${permission}`);
        });
        
        // Verificar usesCleartextTraffic
        const allowsCleartext = manifest.includes('android:usesCleartextTraffic="true"');
        console.log(`  ${allowsCleartext ? '✅' : '❌'} usesCleartextTraffic habilitado`);
        
    } else {
        console.log('❌ No se encontró AndroidManifest.xml');
    }
} catch (error) {
    console.log(`❌ Error leyendo AndroidManifest.xml: ${error.message}`);
}

// 4. Verificar dependencias en build.gradle
console.log('\n4️⃣ VERIFICANDO DEPENDENCIAS...');

const buildGradlePath = 'android-app/app/build.gradle';

try {
    if (fs.existsSync(buildGradlePath)) {
        const buildGradle = fs.readFileSync(buildGradlePath, 'utf8');
        
        const requiredDeps = [
            'retrofit',
            'okhttp',
            'media3-exoplayer',
            'kotlinx-coroutines'
        ];
        
        console.log('Dependencias críticas:');
        requiredDeps.forEach(dep => {
            const hasDep = buildGradle.includes(dep);
            console.log(`  ${hasDep ? '✅' : '❌'} ${dep}`);
        });
        
    } else {
        console.log('❌ No se encontró build.gradle');
    }
} catch (error) {
    console.log(`❌ Error leyendo build.gradle: ${error.message}`);
}

// 5. Generar reporte de problemas y soluciones
console.log('\n5️⃣ REPORTE DE PROBLEMAS Y SOLUCIONES');
console.log('=====================================');

const problems = [];
const solutions = [];

// Verificar si AndroidPlayerActivity necesita WebSocket
try {
    if (fs.existsSync(androidPlayerPath)) {
        const androidPlayer = fs.readFileSync(androidPlayerPath, 'utf8');
        if (!androidPlayer.includes('WebSocketManager')) {
            problems.push('AndroidPlayerActivity no tiene WebSocket configurado');
            solutions.push('Agregar WebSocketManager a AndroidPlayerActivity para actualizaciones en tiempo real');
        }
    }
} catch (error) {
    problems.push(`Error verificando AndroidPlayerActivity: ${error.message}`);
}

if (problems.length > 0) {
    console.log('\n❌ PROBLEMAS DETECTADOS:');
    problems.forEach((problem, index) => {
        console.log(`   ${index + 1}. ${problem}`);
    });
    
    console.log('\n💡 SOLUCIONES RECOMENDADAS:');
    solutions.forEach((solution, index) => {
        console.log(`   ${index + 1}. ${solution}`);
    });
} else {
    console.log('\n✅ No se detectaron problemas críticos en la configuración');
}

// 6. Generar URLs de prueba
console.log('\n6️⃣ URLS DE PRUEBA PARA ANDROID');
console.log('==============================');

try {
    if (fs.existsSync(apiConfigPath)) {
        const apiConfig = fs.readFileSync(apiConfigPath, 'utf8');
        const primaryUrlMatch = apiConfig.match(/PRIMARY_BASE_URL = "([^"]+)"/);
        
        if (primaryUrlMatch) {
            const baseUrl = primaryUrlMatch[1].replace(/\/$/, '');
            console.log('\nURLs para probar en el navegador del dispositivo Android:');
            console.log(`📱 API de pantallas: ${baseUrl}/api/screens`);
            console.log(`📱 API de playlist CAS: ${baseUrl}/api/android/CAS`);
            console.log(`📱 API de playlist TOPICO: ${baseUrl}/api/android/TOPICO`);
            console.log(`📱 Panel de administración: ${baseUrl}/admin`);
            console.log(`📱 WebSocket URL: ${baseUrl.replace('http://', 'ws://')}/ws?screenId=CAS&type=android-tv`);
        }
    }
} catch (error) {
    console.log(`❌ Error generando URLs de prueba: ${error.message}`);
}

console.log('\n🔧 PRÓXIMOS PASOS RECOMENDADOS:');
console.log('1. Probar las URLs en el navegador del dispositivo Android');
console.log('2. Verificar que el dispositivo esté en la misma red que el servidor');
console.log('3. Si las URLs no funcionan, verificar la configuración de red');
console.log('4. Considerar agregar WebSocket a AndroidPlayerActivity');
console.log('5. Compilar y reinstalar la aplicación Android');

console.log('\n✅ Diagnóstico completado');