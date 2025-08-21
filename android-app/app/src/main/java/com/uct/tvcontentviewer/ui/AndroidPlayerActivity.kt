package com.uct.tvcontentviewer.ui

import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.Toast
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import com.uct.tvcontentviewer.data.model.AndroidPlaylist
import com.uct.tvcontentviewer.data.model.MosaicoItem
import com.uct.tvcontentviewer.data.repository.ContentRepository
import com.uct.tvcontentviewer.databinding.ActivityAndroidPlayerBinding
import kotlinx.coroutines.launch
import kotlinx.coroutines.flow.launchIn
import kotlinx.coroutines.flow.onEach
import java.io.File
import com.uct.tvcontentviewer.utils.WebSocketManager
import com.uct.tvcontentviewer.utils.EventBus
// Imports eliminados: FloatingActionButton, ObjectAnimator, AccelerateDecelerateInterpolator
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.common.VideoSize
// Imports eliminados: TextureView, Matrix, RectF, KeyEvent

class AndroidPlayerActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityAndroidPlayerBinding
    private var exoPlayer: ExoPlayer? = null
    private var mosaico1Player: ExoPlayer? = null
    private var mosaico2Player: ExoPlayer? = null
    private var screenId: String = ""
    private var screenName: String = ""
    private var androidPlaylist: AndroidPlaylist? = null
    private var currentVideoIndex = 0
    private val repository = ContentRepository.getInstance()
    private lateinit var webSocketManager: WebSocketManager
    private var hasWebSocketUpdate = false
    
    // Variables eliminadas: videoRotateButton, videoRotationDegrees, autoRotationApplied, videoSharedPreferences
    
    // Variables para rotación visual global - eliminadas para TV vertical fijo
    // private lateinit var globalSharedPreferences: SharedPreferences
    // private var isGlobalVerticalRotation = false
    
    // Carpeta para los mosaicos
    private val mosaicoFolderPath = "C:\\Users\\Dev-Uct\\Music\\Mosaico"
    private var mosaico1Items: List<MosaicoItem> = emptyList()
    private var mosaico2Items: List<MosaicoItem> = emptyList()
    private var currentMosaico1Index = 0
    private var currentMosaico2Index = 0
    
    // Auto-refresh para sincronización de playlist
    private val handler = Handler(Looper.getMainLooper())
    private var autoRefreshRunnable: Runnable? = null
    
    companion object {
        const val EXTRA_SCREEN_ID = "extra_screen_id"
        const val EXTRA_SCREEN_NAME = "extra_screen_name"
        private const val TAG = "AndroidPlayerActivity"
        private const val AUTO_REFRESH_INTERVAL = 30000L // 30 segundos (reducido porque WebSocket maneja actualizaciones inmediatas)
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityAndroidPlayerBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Aplicar rotación visual global
        applyGlobalVisualRotation()
        
        // Configurar pantalla completa automáticamente
        enableFullScreen()
        
        getIntentData()
        // setupToolbar() // Removido para ocultar la toolbar
        initializePlayer()
        // initializeMosaicoPlayers() // Comentado para ocultar mosaicos
        loadAndroidPlaylist()        
        // Inicializar WebSocket para actualizaciones en tiempo real
        try {
            initializeWebSocket()
        } catch (e: Exception) {
            Log.e(TAG, "Error inicializando WebSocket: ${e.message}", e)
        }
        // loadMosaicoItems() // Comentado para ocultar mosaicos
        
        // Suscribirse a eventos del EventBus
        setupEventBusSubscription()
    }
    
    private fun setupEventBusSubscription() {
        EventBus.events
            .onEach { event ->
                when (event) {
                    is EventBus.Event.ForcePlaylistRefresh -> {
                        Log.d(TAG, "📢 Recibido evento de actualización forzada desde MainActivity")
                        forcePlaylistRefresh()
                    }
                    is EventBus.Event.PlaylistUpdated -> {
                        Log.d(TAG, "📢 Playlist actualizada: ${event.screenId} con ${event.itemCount} elementos")
                    }
                    is EventBus.Event.ConnectionStatusChanged -> {
                        Log.d(TAG, "📢 Estado de conexión cambiado: ${event.isConnected}")
                    }
                }
            }
            .launchIn(lifecycleScope)
        
        Log.d(TAG, "📡 Suscripción a EventBus configurada")
    }
    
    private fun getIntentData() {
        screenId = intent.getStringExtra(EXTRA_SCREEN_ID) ?: ""
        screenName = intent.getStringExtra(EXTRA_SCREEN_NAME) ?: ""
        
        if (screenId.isEmpty()) {
            Toast.makeText(this, "Error: ID de pantalla no válido", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            title = "Reproductor Android - $screenName"
            setDisplayHomeAsUpEnabled(true)
        }
        
        binding.toolbar.setNavigationOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }
    }
    
    private fun initializePlayer() {
        exoPlayer = ExoPlayer.Builder(this).build()
        binding.playerView.player = exoPlayer
        
        // Configurar listener para cuando termine un video
        exoPlayer?.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_ENDED -> {
                        playNextVideo()
                    }
                    Player.STATE_READY -> {
                        Log.d(TAG, "Video listo para reproducir")
                    }
                    Player.STATE_BUFFERING -> {
                        Log.d(TAG, "Video cargando...")
                    }
                }
            }
            
            override fun onVideoSizeChanged(videoSize: VideoSize) {
                super.onVideoSizeChanged(videoSize)
                // Lógica de detección automática eliminada - TV vertical fijo
                Log.d(TAG, "Video cargado: ${videoSize.width}x${videoSize.height}")
            }
            
            override fun onRenderedFirstFrame() {
                super.onRenderedFirstFrame()
                // Lógica de detección automática eliminada - TV vertical fijo
                Log.d(TAG, "Primer frame renderizado")
            }
        })
    }
    
    private fun initializeMosaicoPlayers() {
        // Función comentada - elementos de mosaico no están disponibles en el layout actual
        // TODO: Implementar cuando se agreguen los elementos de mosaico al layout
    }
    
    private fun loadMosaicoItems() {
        val mosaicoFolder = File(mosaicoFolderPath)
        if (!mosaicoFolder.exists() || !mosaicoFolder.isDirectory) {
            Log.e(TAG, "La carpeta de mosaicos no existe: $mosaicoFolderPath")
            return
        }
        
        val files = mosaicoFolder.listFiles() ?: return
        
        val mosaico1List = mutableListOf<MosaicoItem>()
        val mosaico2List = mutableListOf<MosaicoItem>()
        
        files.forEach { file ->
            val fileName = file.name.lowercase()
            val isVideo = fileName.endsWith(".mp4") || fileName.endsWith(".webm") || fileName.endsWith(".mkv")
            val isImage = fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png")
            
            if (isVideo || isImage) {
                val type = if (isVideo) "video" else "image"
                val fileUri = Uri.fromFile(file).toString()
                
                // Determinar si es para mosaico 1 o 2 basado en el nombre del archivo
                if (fileName.contains("mosaico1")) {
                    mosaico1List.add(
                        MosaicoItem(
                            id = file.name,
                            name = file.name,
                            url = fileUri,
                            type = type,
                            position = 1,
                            duration = 30 // 30 segundos por defecto
                        )
                    )
                } else if (fileName.contains("mosaico2")) {
                    mosaico2List.add(
                        MosaicoItem(
                            id = file.name,
                            name = file.name,
                            url = fileUri,
                            type = type,
                            position = 2,
                            duration = 30 // 30 segundos por defecto
                        )
                    )
                }
            }
        }
        
        mosaico1Items = mosaico1List
        mosaico2Items = mosaico2List
        
        Log.d(TAG, "Mosaico 1 items: ${mosaico1Items.size}")
        Log.d(TAG, "Mosaico 2 items: ${mosaico2Items.size}")
        
        // Iniciar reproducción de mosaicos si hay elementos
        if (mosaico1Items.isNotEmpty()) {
            currentMosaico1Index = 0
            playCurrentMosaico1()
        }
        
        if (mosaico2Items.isNotEmpty()) {
            currentMosaico2Index = 0
            playCurrentMosaico2()
        }
    }
    
    private fun loadAndroidPlaylist() {
        lifecycleScope.launch {
            try {
                binding.progressBar.visibility = android.view.View.VISIBLE
                binding.errorText.visibility = android.view.View.GONE
                
                val result = repository.getAndroidPlaylist(screenId)
                
                if (result.isSuccess) {
                    androidPlaylist = result.getOrNull()
                    androidPlaylist?.let { playlist ->
                        if (playlist.items.isNotEmpty()) {
                            Log.d(TAG, "Playlist cargada: ${playlist.playlistName} con ${playlist.items.size} videos")
                            currentVideoIndex = 0
                            playCurrentVideo()
                        } else {
                            showError("No hay videos disponibles en la playlist")
                        }
                    }
                } else {
                    val error = result.exceptionOrNull()?.message ?: "Error desconocido"
                    showError("Error al cargar playlist: $error")
                }
            } catch (e: Exception) {
                showError("Error de conexión: ${e.message}")
            } finally {
                binding.progressBar.visibility = android.view.View.GONE
            }
        }
    }
    
    private fun playCurrentVideo() {
        androidPlaylist?.let { playlist ->
            if (currentVideoIndex < playlist.items.size) {
                val currentVideo = playlist.items[currentVideoIndex]
                Log.d(TAG, "Reproduciendo video: ${currentVideo.name}")
                
                // Información en pantalla oculta para reproducción limpia
                // binding.videoInfo.text = "Video ${currentVideoIndex + 1}/${playlist.items.size}: ${currentVideo.name}"
                
                // Crear MediaItem y reproducir
                val mediaItem = MediaItem.fromUri(Uri.parse(currentVideo.url))
                exoPlayer?.setMediaItem(mediaItem)
                exoPlayer?.prepare()
                exoPlayer?.play()
            }
        }
    }
    
    private fun playNextVideo() {
        androidPlaylist?.let { playlist ->
            currentVideoIndex++
            
            // Si llegamos al final y está en loop, volver al inicio
            if (currentVideoIndex >= playlist.items.size) {
                if (playlist.isLooping) {
                    currentVideoIndex = 0
                    playCurrentVideo()
                } else {
                    showError("Playlist terminada")
                }
            } else {
                playCurrentVideo()
            }
        }
    }
    
    private fun showError(message: String) {
        binding.errorText.text = message
        binding.errorText.visibility = android.view.View.VISIBLE
        Log.e(TAG, message)
    }
    
    private fun playCurrentMosaico1() {
        // Función comentada - elementos de mosaico no están disponibles en el layout actual
        // TODO: Implementar cuando se agreguen los elementos de mosaico al layout
        Log.d(TAG, "playCurrentMosaico1() - función deshabilitada")
    }
    
    private fun playNextMosaico1() {
        // Función comentada - elementos de mosaico no están disponibles en el layout actual
        // TODO: Implementar cuando se agreguen los elementos de mosaico al layout
        Log.d(TAG, "playNextMosaico1() - función deshabilitada")
    }
    
    private fun playCurrentMosaico2() {
        // Función comentada - elementos de mosaico no están disponibles en el layout actual
        // TODO: Implementar cuando se agreguen los elementos de mosaico al layout
        Log.d(TAG, "playCurrentMosaico2() - función deshabilitada")
    }
    
    private fun playNextMosaico2() {
        // Función comentada - elementos de mosaico no están disponibles en el layout actual
        // TODO: Implementar cuando se agreguen los elementos de mosaico al layout
        Log.d(TAG, "playNextMosaico2() - función deshabilitada")
    }
    
    private fun enableFullScreen() {
        // Ocultar la barra de estado y la barra de navegación
        WindowCompat.setDecorFitsSystemWindows(window, false)
        
        val windowInsetsController = WindowCompat.getInsetsController(window, window.decorView)
        windowInsetsController?.let {
            // Ocultar barras del sistema
            it.hide(WindowInsetsCompat.Type.systemBars())
            // Configurar comportamiento de las barras del sistema
            it.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
        
        // Mantener la pantalla encendida
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        
        // La toolbar ya está oculta en el layout XML
        
        Log.d(TAG, "Pantalla completa activada automáticamente")
    }
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
            Log.d(TAG, "🔌 Estado WebSocket: ${if (isConnected) "Conectado" else "Desconectado"}")
            
            runOnUiThread {
                // Opcional: mostrar indicador de estado de conexión
                // binding.connectionStatus.text = if (isConnected) "Conectado" else "Desconectado"
            }
        }
        
        // Conectar WebSocket
        webSocketManager.connect()
    }
    
    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
        super.onConfigurationChanged(newConfig)
        // Mantener la reproducción continua al cambiar orientación
        Log.d(TAG, "Cambio de orientación detectado - manteniendo reproducción y rotación")
        
        // Reconfigurar pantalla completa después del cambio de orientación
        enableFullScreen()
        
        // Aplicar configuración fija para TV vertical
        applyGlobalVisualRotation()
    }
    
    override fun onDestroy() {
        // Desconectar WebSocket
        try {
            webSocketManager.disconnect()
        } catch (e: Exception) {
            Log.e(TAG, "Error desconectando WebSocket: ${e.message}", e)
        }
        super.onDestroy()
        stopAutoRefresh()
        exoPlayer?.release()
        exoPlayer = null
        mosaico1Player?.release()
        mosaico1Player = null
        mosaico2Player?.release()
        mosaico2Player = null
    }
    
    override fun onPause() {
        super.onPause()
        exoPlayer?.pause()
        mosaico1Player?.pause()
        mosaico2Player?.pause()
        stopAutoRefresh()
    }
    
    override fun onResume() {
        super.onResume()
        exoPlayer?.play()
        mosaico1Player?.play()
        mosaico2Player?.play()
        startAutoRefresh()        
        // Reconectar WebSocket si es necesario
        try {
            if (!webSocketManager.isConnected()) {
                Log.d(TAG, "🔄 Reconectando WebSocket en onResume")
                webSocketManager.connect()
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reconectando WebSocket: ${e.message}", e)
        }
    }
    
    private fun startAutoRefresh() {
        stopAutoRefresh() // Detener cualquier refresh anterior
        
        autoRefreshRunnable = Runnable {
            // Verificar si hay cambios en la playlist
            checkForPlaylistUpdates()
            
            // Programar la siguiente actualización
            startAutoRefresh()
        }
        
        handler.postDelayed(autoRefreshRunnable!!, AUTO_REFRESH_INTERVAL)
        Log.d(TAG, "Auto-refresh iniciado cada ${AUTO_REFRESH_INTERVAL/1000} segundos")
    }
    
    private fun stopAutoRefresh() {
        autoRefreshRunnable?.let { runnable ->
            handler.removeCallbacks(runnable)
            autoRefreshRunnable = null
        }
        Log.d(TAG, "Auto-refresh detenido")
    }
    
    private fun checkForPlaylistUpdates() {
        lifecycleScope.launch {
            try {
                // Si acabamos de recibir una actualización por WebSocket, resetear el flag
                if (hasWebSocketUpdate) {
                    hasWebSocketUpdate = false
                    Log.d(TAG, "Verificando actualizaciones de playlist (triggered by WebSocket/MainActivity)...")
                } else {
                    Log.d(TAG, "Verificando actualizaciones de playlist (scheduled check)...")
                }
                val result = repository.getAndroidPlaylist(screenId)
                
                if (result.isSuccess) {
                    val newPlaylist = result.getOrNull()
                    newPlaylist?.let { playlist ->
                        // Comparar si hay cambios en la playlist
                        val currentTotalItems = androidPlaylist?.totalItems ?: 0
                        val newTotalItems = playlist.totalItems
                        
                        // También verificar si los elementos han cambiado (no solo el total)
                        val currentItems = androidPlaylist?.items?.map { it.id } ?: emptyList()
                        val newItems = playlist.items.map { it.id }
                        val itemsChanged = currentItems != newItems
                        
                        // Verificar también si las URLs han cambiado (para detectar actualizaciones de archivos)
                        val currentUrls = androidPlaylist?.items?.map { it.url } ?: emptyList()
                        val newUrls = playlist.items.map { it.url }
                        val urlsChanged = currentUrls != newUrls
                        
                        if (newTotalItems != currentTotalItems || itemsChanged || urlsChanged) {
                            Log.d(TAG, "Cambios detectados en playlist: $currentTotalItems -> $newTotalItems elementos")
                            Log.d(TAG, "Items changed: $itemsChanged, URLs changed: $urlsChanged")
                            
                            // Guardar el video actual que se está reproduciendo
                            val currentVideoId = androidPlaylist?.items?.getOrNull(currentVideoIndex)?.id
                            
                            // Actualizar la playlist
                            androidPlaylist = playlist
                            
                            // Intentar mantener el video actual si aún existe en la nueva playlist
                            if (currentVideoId != null) {
                                val newIndex = playlist.items.indexOfFirst { it.id == currentVideoId }
                                if (newIndex >= 0) {
                                    currentVideoIndex = newIndex
                                    Log.d(TAG, "Manteniendo video actual en nuevo índice: $newIndex")
                                } else {
                                    // El video actual ya no existe, ir al inicio
                                    currentVideoIndex = 0
                                    Log.d(TAG, "Video actual eliminado, reiniciando desde el inicio")
                                    
                                    // Reproducir el nuevo primer video inmediatamente
                                    runOnUiThread {
                                        if (newTotalItems > 0) {
                                            playCurrentVideo()
                                        }
                                    }
                                }
                            } else {
                                // Si no había playlist anterior, empezar desde el inicio
                                currentVideoIndex = 0
                                runOnUiThread {
                                    if (newTotalItems > 0) {
                                        playCurrentVideo()
                                    }
                                }
                            }
                            
                            // Mostrar notificación al usuario
                            runOnUiThread {
                                Toast.makeText(this@AndroidPlayerActivity, 
                                    "Playlist actualizada: $newTotalItems elementos", 
                                    Toast.LENGTH_SHORT).show()
                            }
                            
                            // Notificar a través del EventBus
                            EventBus.notifyPlaylistUpdated(screenId, newTotalItems)
                        } else {
                            Log.d(TAG, "No hay cambios en la playlist ($newTotalItems elementos)")
                        }
                    }
                } else {
                    Log.w(TAG, "Error al verificar actualizaciones: ${result.exceptionOrNull()?.message}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error en verificación automática de playlist", e)
            }
        }
    }
    
    // Método público para forzar actualización de playlist (llamado desde MainActivity)
    fun forcePlaylistRefresh() {
        Log.d(TAG, "🔄 Forzando actualización de playlist desde MainActivity")
        
        // Mostrar indicador visual de que se está actualizando
        runOnUiThread {
            Toast.makeText(this, "Actualizando playlist...", Toast.LENGTH_SHORT).show()
        }
        
        // Forzar verificación inmediata
        hasWebSocketUpdate = true // Marcar como actualización forzada
        checkForPlaylistUpdates()
    }
    
    private fun applyGlobalVisualRotation() {
        // Configuración fija para TV vertical - siempre aplicar rotación de 90°
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        
        val rootView = binding.root
        val playerView = binding.playerView
        
        // Aplicar rotación fija de 90° para orientación vertical del TV
        val displayMetrics = resources.displayMetrics
        val screenWidth = displayMetrics.widthPixels.toFloat()
        val screenHeight = displayMetrics.heightPixels.toFloat()
        
        // Calcular el centro de la pantalla para el pivot
        val pivotX = screenWidth / 2f
        val pivotY = screenHeight / 2f
        
        rootView.apply {
            // Rotar 90° en sentido antihorario para TV vertical
            rotation = -90f
            this.pivotX = pivotX
            this.pivotY = pivotY
            
            // Mantener escala 1.0 para mostrar contenido completo
            scaleX = 1.0f
            scaleY = 1.0f
            
            // Sin traslación para evitar que el contenido se corte
            // El pivot ya centra la rotación correctamente
            translationX = 0f
            translationY = 0f
        }
        
        // Configurar PlayerView para ocupar toda la pantalla con RESIZE_MODE_FIXED_HEIGHT
        playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIXED_HEIGHT
        
        // Asegurar que el PlayerView ocupe toda la pantalla disponible
        playerView.layoutParams = playerView.layoutParams.apply {
            width = ViewGroup.LayoutParams.MATCH_PARENT
            height = ViewGroup.LayoutParams.MATCH_PARENT
        }
        
        // Ajustar contenedor principal para optimizar el uso del espacio
        val mainContainer = binding.mainContentContainer
        mainContainer.layoutParams = mainContainer.layoutParams.apply {
            width = ViewGroup.LayoutParams.MATCH_PARENT
            height = ViewGroup.LayoutParams.MATCH_PARENT
        }
        
        // Solicitar nuevo layout para aplicar cambios
        playerView.requestLayout()
        mainContainer.requestLayout()
        
        Log.d(TAG, "TV vertical: Rotación fija de 90° aplicada con RESIZE_MODE_FIXED_HEIGHT")
    }
    
    // Función setupVideoRotation eliminada - no necesaria para TV vertical fijo
    
    // Función rotateVideoLeft eliminada - no necesaria para TV vertical fijo
    
    // Función applyVideoRotation eliminada - no necesaria para TV vertical fijo
    
    // Función applyTextureViewRotation eliminada - no necesaria para TV vertical fijo
    
    // Función onKeyDown eliminada - no necesaria para TV vertical fijo
    // Las teclas de rotación ya no son necesarias
    
    // Función animateRotateButton eliminada - no necesaria para TV vertical fijo
}
