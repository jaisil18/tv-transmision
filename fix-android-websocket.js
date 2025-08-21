const fs = require('fs');
const path = require('path');

console.log('🔧 CORRIGIENDO ANDROIDPLAYERACTIVITY');
console.log('===================================\n');

const androidPlayerPath = 'android-app/app/src/main/java/com/uct/tvcontentviewer/ui/AndroidPlayerActivity.kt';

try {
    if (!fs.existsSync(androidPlayerPath)) {
        console.log('❌ No se encontró AndroidPlayerActivity.kt');
        process.exit(1);
    }

    console.log('📖 Leyendo AndroidPlayerActivity.kt...');
    let content = fs.readFileSync(androidPlayerPath, 'utf8');

    // Verificar si ya tiene WebSocket
    if (content.includes('WebSocketManager')) {
        console.log('✅ AndroidPlayerActivity ya tiene WebSocket configurado');
        process.exit(0);
    }

    console.log('🔄 Agregando WebSocket a AndroidPlayerActivity...');

    // 1. Agregar import de WebSocketManager
    const importSection = content.match(/(import.*\n)+/);
    if (importSection) {
        const lastImport = importSection[0];
        const webSocketImport = 'import com.uct.tvcontentviewer.utils.WebSocketManager\n';
        
        if (!content.includes(webSocketImport.trim())) {
            content = content.replace(lastImport, lastImport + webSocketImport);
            console.log('✅ Import de WebSocketManager agregado');
        }
    }

    // 2. Agregar variable de WebSocketManager
    const repositoryLine = 'private val repository = ContentRepository.getInstance()';
    if (content.includes(repositoryLine)) {
        const webSocketManagerVar = `    private lateinit var webSocketManager: WebSocketManager
    private var hasWebSocketUpdate = false`;
        
        content = content.replace(
            repositoryLine,
            repositoryLine + '\n' + webSocketManagerVar
        );
        console.log('✅ Variable WebSocketManager agregada');
    }

    // 3. Agregar inicialización de WebSocket en onCreate
    const loadAndroidPlaylistCall = 'loadAndroidPlaylist()';
    if (content.includes(loadAndroidPlaylistCall)) {
        const webSocketInit = `        
        // Inicializar WebSocket para actualizaciones en tiempo real
        try {
            initializeWebSocket()
        } catch (e: Exception) {
            Log.e(TAG, "Error inicializando WebSocket: \${e.message}", e)
        }`;
        
        content = content.replace(
            loadAndroidPlaylistCall,
            loadAndroidPlaylistCall + webSocketInit
        );
        console.log('✅ Inicialización de WebSocket agregada en onCreate');
    }

    // 4. Agregar método initializeWebSocket
    const enableFullScreenMethod = content.match(/private fun enableFullScreen\(\) \{[\s\S]*?\n    \}/);
    if (enableFullScreenMethod) {
        const webSocketInitMethod = `
    private fun initializeWebSocket() {
        webSocketManager = WebSocketManager.getInstance()
        
        // Configurar la URL base del WebSocket (misma que la API)
        val baseUrl = "http://172.16.31.17:3000/"
        webSocketManager.initialize(screenId, baseUrl)
        
        // Configurar callback para actualizaciones de contenido
        webSocketManager.onContentUpdateReceived = {
            Log.i(TAG, "🎉 Actualización de contenido recibida vía WebSocket!")
            hasWebSocketUpdate = true
            
            // Recargar playlist inmediatamente
            runOnUiThread {
                checkForPlaylistUpdates()
            }
        }
        
        // Configurar callback para cambios de estado de conexión
        webSocketManager.onConnectionStatusChanged = { isConnected ->
            Log.d(TAG, "🔌 Estado WebSocket: \${if (isConnected) "Conectado" else "Desconectado"}")
            
            runOnUiThread {
                // Opcional: mostrar indicador de estado de conexión
                // binding.connectionStatus.text = if (isConnected) "Conectado" else "Desconectado"
            }
        }
        
        // Conectar WebSocket
        webSocketManager.connect()
    }`;
        
        content = content.replace(
            enableFullScreenMethod[0],
            enableFullScreenMethod[0] + webSocketInitMethod
        );
        console.log('✅ Método initializeWebSocket agregado');
    }

    // 5. Modificar el intervalo de auto-refresh para ser más inteligente
    const autoRefreshIntervalLine = 'private const val AUTO_REFRESH_INTERVAL = 10000L // 10 segundos';
    if (content.includes(autoRefreshIntervalLine)) {
        content = content.replace(
            autoRefreshIntervalLine,
            'private const val AUTO_REFRESH_INTERVAL = 30000L // 30 segundos (reducido porque WebSocket maneja actualizaciones inmediatas)'
        );
        console.log('✅ Intervalo de auto-refresh optimizado');
    }

    // 6. Agregar desconexión de WebSocket en onDestroy
    const onDestroyMethod = content.match(/override fun onDestroy\(\) \{[\s\S]*?\n    \}/);
    if (onDestroyMethod) {
        const webSocketDisconnect = `        // Desconectar WebSocket
        try {
            webSocketManager.disconnect()
        } catch (e: Exception) {
            Log.e(TAG, "Error desconectando WebSocket: \${e.message}", e)
        }
        `;
        
        content = content.replace(
            'super.onDestroy()',
            webSocketDisconnect + 'super.onDestroy()'
        );
        console.log('✅ Desconexión de WebSocket agregada en onDestroy');
    }

    // 7. Agregar reconexión de WebSocket en onResume
    const onResumeMethod = content.match(/override fun onResume\(\) \{[\s\S]*?\n    \}/);
    if (onResumeMethod) {
        const webSocketReconnect = `        
        // Reconectar WebSocket si es necesario
        try {
            if (!webSocketManager.isConnected()) {
                Log.d(TAG, "🔄 Reconectando WebSocket en onResume")
                webSocketManager.connect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reconectando WebSocket: \${e.message}", e)
        }`;
        
        content = content.replace(
            'startAutoRefresh()',
            'startAutoRefresh()' + webSocketReconnect
        );
        console.log('✅ Reconexión de WebSocket agregada en onResume');
    }

    // 8. Optimizar checkForPlaylistUpdates para considerar WebSocket
    const checkForPlaylistUpdatesMethod = content.match(/private fun checkForPlaylistUpdates\(\) \{[\s\S]*?Log\.d\(TAG, "Verificando actualizaciones de playlist\.\.\."\)/);
    if (checkForPlaylistUpdatesMethod) {
        const optimizedCheck = `private fun checkForPlaylistUpdates() {
        lifecycleScope.launch {
            try {
                // Si acabamos de recibir una actualización por WebSocket, resetear el flag
                if (hasWebSocketUpdate) {
                    hasWebSocketUpdate = false
                    Log.d(TAG, "Verificando actualizaciones de playlist (triggered by WebSocket)...")
                } else {
                    Log.d(TAG, "Verificando actualizaciones de playlist (scheduled check)...")
                }`;
        
        content = content.replace(
            checkForPlaylistUpdatesMethod[0],
            optimizedCheck
        );
        console.log('✅ Método checkForPlaylistUpdates optimizado para WebSocket');
    }

    // Guardar el archivo modificado
    console.log('💾 Guardando AndroidPlayerActivity.kt modificado...');
    fs.writeFileSync(androidPlayerPath, content, 'utf8');

    console.log('\n✅ ANDROIDPLAYERACTIVITY CORREGIDO EXITOSAMENTE');
    console.log('===============================================');
    console.log('Cambios realizados:');
    console.log('1. ✅ Import de WebSocketManager agregado');
    console.log('2. ✅ Variables de WebSocket agregadas');
    console.log('3. ✅ Inicialización de WebSocket en onCreate');
    console.log('4. ✅ Método initializeWebSocket implementado');
    console.log('5. ✅ Intervalo de auto-refresh optimizado (30s)');
    console.log('6. ✅ Desconexión de WebSocket en onDestroy');
    console.log('7. ✅ Reconexión de WebSocket en onResume');
    console.log('8. ✅ checkForPlaylistUpdates optimizado');

    console.log('\n🔧 PRÓXIMOS PASOS:');
    console.log('1. Compilar la aplicación Android');
    console.log('2. Instalar en el dispositivo');
    console.log('3. Probar actualizaciones en tiempo real');
    console.log('4. Verificar logs para confirmar conexión WebSocket');

} catch (error) {
    console.log(`❌ Error: ${error.message}`);
    process.exit(1);
}