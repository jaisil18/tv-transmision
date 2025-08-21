const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 COMPILANDO APLICACIÓN ANDROID');
console.log('================================\n');

const androidAppPath = 'android-app';

// Verificar que existe el proyecto Android
if (!fs.existsSync(androidAppPath)) {
    console.log('❌ No se encontró la carpeta android-app');
    process.exit(1);
}

// Verificar que existe gradlew
const gradlewPath = path.join(androidAppPath, 'gradlew.bat');
if (!fs.existsSync(gradlewPath)) {
    console.log('❌ No se encontró gradlew.bat');
    process.exit(1);
}

console.log('📋 Información del proyecto:');
console.log(`   📁 Ruta: ${path.resolve(androidAppPath)}`);
console.log(`   🔧 Gradle: ${path.resolve(gradlewPath)}`);

// Función para ejecutar comandos de Gradle
function runGradleCommand(command, description) {
    return new Promise((resolve, reject) => {
        console.log(`\n🔄 ${description}...`);
        console.log(`   Comando: gradlew ${command}`);
        
        const gradleProcess = spawn('gradlew.bat', command.split(' '), {
            cwd: androidAppPath,
            stdio: 'pipe',
            shell: true
        });
        
        let output = '';
        let errorOutput = '';
        
        gradleProcess.stdout.on('data', (data) => {
            const text = data.toString();
            output += text;
            
            // Mostrar progreso importante
            if (text.includes('BUILD SUCCESSFUL') || 
                text.includes('BUILD FAILED') ||
                text.includes('> Task :') ||
                text.includes('FAILURE') ||
                text.includes('ERROR')) {
                process.stdout.write(text);
            }
        });
        
        gradleProcess.stderr.on('data', (data) => {
            const text = data.toString();
            errorOutput += text;
            
            // Mostrar errores importantes
            if (text.includes('error:') || 
                text.includes('Error:') ||
                text.includes('FAILURE') ||
                text.includes('Exception')) {
                process.stderr.write(text);
            }
        });
        
        gradleProcess.on('close', (code) => {
            if (code === 0) {
                console.log(`✅ ${description} completado exitosamente`);
                resolve({ success: true, output, errorOutput });
            } else {
                console.log(`❌ ${description} falló (código: ${code})`);
                reject({ success: false, code, output, errorOutput });
            }
        });
        
        gradleProcess.on('error', (error) => {
            console.log(`❌ Error ejecutando ${description}: ${error.message}`);
            reject({ success: false, error: error.message, output, errorOutput });
        });
    });
}

async function buildApp() {
    try {
        // 1. Limpiar proyecto
        await runGradleCommand('clean', 'Limpiando proyecto');
        
        // 2. Compilar proyecto
        await runGradleCommand('assembleDebug', 'Compilando aplicación (Debug)');
        
        // 3. Verificar que se generó el APK
        const apkPath = path.join(androidAppPath, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
        
        if (fs.existsSync(apkPath)) {
            const stats = fs.statSync(apkPath);
            const fileSizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            
            console.log('\n🎉 COMPILACIÓN EXITOSA');
            console.log('=====================');
            console.log(`📱 APK generado: ${path.resolve(apkPath)}`);
            console.log(`📏 Tamaño: ${fileSizeMB} MB`);
            console.log(`📅 Fecha: ${stats.mtime.toLocaleString()}`);
            
            console.log('\n📲 INSTALACIÓN:');
            console.log('Para instalar en un dispositivo Android:');
            console.log('1. Habilitar "Depuración USB" en el dispositivo');
            console.log('2. Conectar el dispositivo por USB');
            console.log('3. Ejecutar: gradlew installDebug');
            console.log('4. O transferir manualmente el APK al dispositivo');
            
            console.log('\n🔧 COMANDOS ÚTILES:');
            console.log(`   Instalar: cd ${androidAppPath} && gradlew installDebug`);
            console.log(`   Desinstalar: cd ${androidAppPath} && gradlew uninstallDebug`);
            console.log(`   Ver logs: adb logcat | findstr "AndroidPlayerActivity"`);
            
        } else {
            console.log('❌ No se encontró el APK generado');
            console.log(`   Ruta esperada: ${apkPath}`);
        }
        
    } catch (error) {
        console.log('\n💥 ERROR EN LA COMPILACIÓN');
        console.log('==========================');
        
        if (error.output) {
            // Buscar errores específicos en la salida
            const output = error.output + error.errorOutput;
            
            if (output.includes('WebSocketManager')) {
                console.log('❌ Error relacionado con WebSocketManager');
                console.log('   Posible solución: Verificar que el import sea correcto');
            }
            
            if (output.includes('Unresolved reference')) {
                console.log('❌ Referencias no resueltas detectadas');
                console.log('   Posible solución: Verificar imports y dependencias');
            }
            
            if (output.includes('Compilation failed')) {
                console.log('❌ Error de compilación de Kotlin');
                console.log('   Revisar sintaxis y tipos de datos');
            }
        }
        
        console.log('\n🔍 PASOS PARA DEPURAR:');
        console.log('1. Revisar los errores mostrados arriba');
        console.log('2. Verificar que WebSocketManager.kt existe');
        console.log('3. Verificar imports en AndroidPlayerActivity.kt');
        console.log('4. Ejecutar: gradlew build --info para más detalles');
        
        process.exit(1);
    }
}

// Ejecutar compilación
buildApp();