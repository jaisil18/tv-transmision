package com.uct.tvcontentviewer.ui

import android.content.Context
import android.content.SharedPreferences
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.widget.ImageButton
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.ui.AspectRatioFrameLayout
import com.uct.tvcontentviewer.R
import com.uct.tvcontentviewer.data.model.PlaylistItem
import com.uct.tvcontentviewer.data.model.TVStreamItem
import com.uct.tvcontentviewer.data.repository.ContentRepository
import com.uct.tvcontentviewer.databinding.ActivityTvPlayerBinding
import com.uct.tvcontentviewer.utils.DeviceInfoCollector
import com.uct.tvcontentviewer.utils.WebSocketManager
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

class TVPlayerActivity : AppCompatActivity() {
    
    companion object {
        const val EXTRA_SCREEN_ID = "extra_screen_id"
        const val EXTRA_SCREEN_NAME = "extra_screen_name"
        private const val TAG = "TVPlayerActivity"
        private const val NO_CONTENT_CHECK_INTERVAL = 10000L // 10 segundos
        private const val CONTENT_CHECK_INTERVAL = 60000L // 1 minuto
        private const val INITIAL_CONTENT_CHECK_INTERVAL = 5000L // 5 segundos
        private const val VIDEO_TRANSITION_DELAY = 500L
        private const val ERROR_RETRY_DELAY = 3000L
        private const val MAX_RETRIES = 3
        private const val PREFS_NAME = "TVContentViewerPrefs"
        private const val KEY_ORIENTATION = "orientation_vertical"
    }
    
    private lateinit var binding: ActivityTvPlayerBinding
    private var exoPlayer: ExoPlayer? = null
    private var screenId: String = ""
    private var screenName: String = ""
    private var currentVideoIndex = 0
    private var totalItems = 0
    private val repository = ContentRepository.getInstance()
    private val handler = Handler(Looper.getMainLooper())
    private var isLoading = false
    private var retryCount = 0
    private var lastContentCheckTime = 0L
    private lateinit var deviceInfoCollector: DeviceInfoCollector
    private lateinit var webSocketManager: WebSocketManager
    
    // Buffer para videos precargados
    private val videoBuffer = mutableListOf<TVStreamItem>()
    private var isBuffering = false
    private var hasWebSocketUpdate = false
    
    // Variables para orientación
    private lateinit var orientationToggleButton: ImageButton
    private lateinit var sharedPreferences: SharedPreferences
    private var isVerticalOrientation = false
    
    override fun onCreate(savedInstanceState: Bundle?) {
        try {
            super.onCreate(savedInstanceState)
            
            Log.d(TAG, "🚀 Iniciando TVPlayerActivity")
            
            // Inicializar binding de forma segura
            try {
                binding = ActivityTvPlayerBinding.inflate(layoutInflater)
                setContentView(binding.root)
            } catch (e: Exception) {
                Log.e(TAG, "Error inicializando binding: ${e.message}", e)
                finish()
                return
            }
            
            // Ocultar barra de navegación y estado para experiencia de TV completa
            try {
                hideSystemUI()
            } catch (e: Exception) {
                Log.e(TAG, "Error ocultando UI del sistema: ${e.message}", e)
            }

            // Obtener datos del intent
            try {
                getIntentData()
            } catch (e: Exception) {
                Log.e(TAG, "Error obteniendo datos del intent: ${e.message}", e)
            }
            
            // Inicializar reproductor
            try {
                initializePlayer()
            } catch (e: Exception) {
                Log.e(TAG, "Error inicializando player: ${e.message}", e)
            }
            
            // Configurar manejo del botón de retroceso
            try {
                setupBackPressedHandler()
            } catch (e: Exception) {
                Log.e(TAG, "Error configurando botón de retroceso: ${e.message}", e)
            }
            
            // Iniciar reproducción
            try {
                startTVPlayback()
            } catch (e: Exception) {
                Log.e(TAG, "Error iniciando reproducción: ${e.message}", e)
            }
            
            // Inicializar colector de información del dispositivo
            try {
                deviceInfoCollector = DeviceInfoCollector(this)
            } catch (e: Exception) {
                Log.e(TAG, "Error inicializando DeviceInfoCollector: ${e.message}", e)
            }
            
            // Inicializar WebSocket para actualizaciones en tiempo real
            try {
                initializeWebSocket()
            } catch (e: Exception) {
                Log.e(TAG, "Error inicializando WebSocket: ${e.message}", e)
            }
            
            // Enviar información del dispositivo al conectarse
            try {
                sendDeviceInfoToServer()
            } catch (e: Exception) {
                Log.e(TAG, "Error enviando info del dispositivo: ${e.message}", e)
            }
            
            // Inicializar orientación
            try {
                initializeOrientation()
            } catch (e: Exception) {
                Log.e(TAG, "Error inicializando orientación: ${e.message}", e)
            }
            
            Log.d(TAG, "🚀 TVPlayerActivity iniciada correctamente")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error crítico en onCreate: ${e.message}", e)
            // En caso de error crítico, cerrar la actividad
            finish()
        }
    }
    
    private fun initializeWebSocket() {
        webSocketManager = WebSocketManager.getInstance()
        
        // Configurar la URL base del WebSocket (misma que la API)
        val baseUrl = "http://172.16.31.17:3000/"
        webSocketManager.initialize(screenId, baseUrl)
        
        // Configurar callbacks
        webSocketManager.onContentUpdateReceived = {
            Log.i(TAG, "🎉 Actualización de contenido recibida vía WebSocket!")
            hasWebSocketUpdate = true
            
            // Ejecutar en el hilo principal
            runOnUiThread {
                showStatus("¡Contenido actualizado! Cargando nuevo contenido...")
                
                // Resetear índice y cargar nuevo contenido inmediatamente
                currentVideoIndex = 0
                retryCount = 0
                loadNextVideoFromServer()
            }
        }
        
        webSocketManager.onConnectionStatusChanged = { isConnected ->
            Log.d(TAG, "🔌 Estado WebSocket: ${if (isConnected) "Conectado" else "Desconectado"}")
            
            runOnUiThread {
                if (isConnected) {
                    showStatus("Conectado - Actualizaciones en tiempo real activas")
                } else {
                    showStatus("Modo offline - Verificación periódica activa")
                }
            }
        }
        
        // Conectar WebSocket
        webSocketManager.connect()
    }
    
    private fun sendDeviceInfoToServer() {
        lifecycleScope.launch {
            try {
                val deviceInfo = deviceInfoCollector.getDeviceInfo()
                val response = repository.sendDeviceInfo(screenId, deviceInfo)
                
                if (response.isSuccessful) {
                    Log.d(TAG, "✅ Información del dispositivo enviada exitosamente")
                } else {
                    Log.w(TAG, "⚠️ Error al enviar información del dispositivo: ${response.code()}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "❌ Error al enviar información del dispositivo", e)
            }
        }
    }
    
    private fun getIntentData() {
        screenId = intent.getStringExtra(EXTRA_SCREEN_ID) ?: "1750193301502" // ID por defecto
        screenName = intent.getStringExtra(EXTRA_SCREEN_NAME) ?: "Pantalla TV"

        Log.d(TAG, "Iniciando reproductor para pantalla: $screenName (ID: $screenId)")
    }

    private fun hideSystemUI() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // API 30+ (Android 11+)
            window.insetsController?.let { controller ->
                controller.hide(WindowInsets.Type.statusBars() or WindowInsets.Type.navigationBars())
                controller.systemBarsBehavior = WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            // API < 30 (Android 10 y anteriores)
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }
    
    private fun initializePlayer() {
        try {
            Log.d(TAG, "🎬 Inicializando ExoPlayer")
            
            exoPlayer = ExoPlayer.Builder(this).build().apply {
                
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        try {
                            when (playbackState) {
                                Player.STATE_ENDED -> {
                                    Log.d(TAG, "Video terminado, pasando al siguiente")
                                    playNextVideo()
                                }
                                Player.STATE_READY -> {
                                    Log.d(TAG, "Video listo para reproducir")
                                    runOnUiThread {
                                        try {
                                            binding.loadingIndicator.visibility = View.GONE
                                        } catch (e: Exception) {
                                            Log.e(TAG, "Error ocultando indicador de carga: ${e.message}", e)
                                        }
                                    }

                                    // Iniciar precarga temprana para Android TV
                                    try {
                                        startEarlyPreload()
                                    } catch (e: Exception) {
                                        Log.e(TAG, "Error iniciando precarga: ${e.message}", e)
                                    }
                                }
                                Player.STATE_BUFFERING -> {
                                    Log.d(TAG, "Video cargando...")
                                    runOnUiThread {
                                        try {
                                            binding.loadingIndicator.visibility = View.VISIBLE
                                        } catch (e: Exception) {
                                            Log.e(TAG, "Error mostrando indicador de carga: ${e.message}", e)
                                        }
                                    }
                                }
                                Player.STATE_IDLE -> {
                                    Log.d(TAG, "Player en estado idle")
                                }
                            }
                        } catch (e: Exception) {
                            Log.e(TAG, "Error en onPlaybackStateChanged: ${e.message}", e)
                        }
                    }
                    
                    override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                        Log.e(TAG, "Error de reproducción: ${error.message}", error)
                        try {
                            handlePlaybackError()
                        } catch (e: Exception) {
                            Log.e(TAG, "Error manejando error de reproducción: ${e.message}", e)
                        }
                    }
                })
            }
            
            // Configurar PlayerView de forma segura
            runOnUiThread {
                try {
                    binding.playerView.player = exoPlayer
                    binding.playerView.useController = false // Sin controles para TV
                    Log.d(TAG, "🎬 ExoPlayer inicializado correctamente")
                } catch (e: Exception) {
                    Log.e(TAG, "Error configurando PlayerView: ${e.message}", e)
                }
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error general inicializando ExoPlayer: ${e.message}", e)
            // Intentar reinicializar después de un delay
            handler.postDelayed({
                try {
                    initializePlayer()
                } catch (retryError: Exception) {
                    Log.e(TAG, "Error en reintento de inicialización: ${retryError.message}", retryError)
                }
            }, 2000)
        }
    }
    
    private fun startTVPlayback() {
        showStatus("Iniciando reproducción para $screenName...")
        loadNextVideoFromServer()

        // Iniciar verificación periódica de contenido nuevo
        startPeriodicContentCheck()
    }

    private fun startPeriodicContentCheck() {
        // Determinar el intervalo basado en si tenemos contenido, WebSocket y actualizaciones recientes
        val checkInterval = when {
            hasWebSocketUpdate -> {
                // Si acabamos de recibir una actualización por WebSocket, esperar más tiempo
                hasWebSocketUpdate = false
                CONTENT_CHECK_INTERVAL * 2 // Reducir frecuencia después de actualización WebSocket
            }
            webSocketManager.isConnected() && totalItems > 0 -> {
                // Si WebSocket está conectado y tenemos contenido, verificar menos frecuentemente
                CONTENT_CHECK_INTERVAL * 3 // Verificación muy espaciada con WebSocket activo
            }
            totalItems == 0 -> NO_CONTENT_CHECK_INTERVAL // Verificar más frecuentemente si no hay contenido
            totalItems > 0 -> CONTENT_CHECK_INTERVAL // Verificación normal si ya hay contenido
            else -> INITIAL_CONTENT_CHECK_INTERVAL // Verificación inicial muy frecuente
        }

        handler.postDelayed({
            val currentTime = System.currentTimeMillis()
            val shouldCheck = when {
                totalItems == 0 -> true // Siempre verificar si no hay contenido
                currentTime - lastContentCheckTime > checkInterval -> true
                else -> false
            }

            if (shouldCheck) {
                Log.d(TAG, "Verificando contenido disponible... (Total actual: $totalItems)")

                // Verificar contenido desde el índice 0 para detectar cambios
                lifecycleScope.launch {
                    try {
                        val result = repository.getAndroidTVStream(screenId, 0)
                        if (result.isSuccess) {
                            val streamResponse = result.getOrNull()
                            streamResponse?.let {
                                Log.d(TAG, "Respuesta del servidor: totalItems=${it.totalItems}, playlistName='${it.playlistName}'")

                                // Detectar cambios en el contenido
                                val hasNewContent = it.totalItems != totalItems && it.totalItems > 0
                                val hadNoContentNowHas = totalItems == 0 && it.totalItems > 0

                                if (hasNewContent || hadNoContentNowHas) {
                                    Log.i(TAG, "🎉 CONTENIDO NUEVO DETECTADO! Total items: ${it.totalItems} (anterior: $totalItems)")
                                    showStatus("¡Contenido nuevo detectado! Cargando...")

                                    totalItems = it.totalItems
                                    currentVideoIndex = 0
                                    retryCount = 0
                                    loadNextVideoFromServer()
                                } else if (totalItems == 0 && it.totalItems == 0) {
                                    Log.d(TAG, "Sin contenido asignado aún para pantalla $screenName")
                                    showStatus("Esperando asignación de contenido...")
                                }
                            }
                        } else {
                            Log.w(TAG, "Error al verificar contenido: ${result.exceptionOrNull()?.message}")
                            if (totalItems == 0) {
                                showStatus("Verificando contenido disponible...")
                            }
                        }
                    } catch (e: Exception) {
                        Log.w(TAG, "Error en verificación periódica: ${e.message}")
                        if (totalItems == 0) {
                            showStatus("Error verificando contenido. Reintentando...")
                        }
                    }
                }

                lastContentCheckTime = currentTime
            }

            // Programar la siguiente verificación con intervalo dinámico
            startPeriodicContentCheck()
        }, checkInterval)
    }
    
    private fun loadNextVideoFromServer() {
        if (isLoading) return
    
        isLoading = true
        binding.loadingIndicator.visibility = View.VISIBLE
    
        lifecycleScope.launch {
            try {
                Log.d(TAG, "Solicitando video $currentVideoIndex del servidor usando android-tv-stream")
                val result = repository.getAndroidTVStream(screenId, currentVideoIndex)
    
                if (result.isSuccess) {
                    val streamResponse = result.getOrNull()
                    streamResponse?.let {
                        totalItems = it.totalItems
                        
                        // Verificar si hay contenido disponible
                        if (it.totalItems == 0) {
                            // Mostrar mensaje del servidor si está disponible
                            val message = it.message ?: "Esta pantalla (ID: $screenId) no tiene contenido asignado. Por favor, asigne una playlist desde el panel de administración."
                            showError(message)
                            Log.e(TAG, "Pantalla sin contenido: $screenId, Mensaje: ${it.message}")
                        } else if (it.currentItem != null) {
                            val currentVideo = it.currentItem

                            Log.d(TAG, "Reproduciendo video: ${currentVideo.name} (${it.currentIndex + 1}/${it.totalItems})")
                            playTVVideo(currentVideo)

                            // Actualizar información en pantalla
                            showStatus("${currentVideo.name} (${it.currentIndex + 1}/${it.totalItems})")

                            // Actualizar el índice actual basado en la respuesta del servidor
                            currentVideoIndex = it.currentIndex

                            // Resetear contador de reintentos al tener éxito
                            retryCount = 0
                            lastContentCheckTime = System.currentTimeMillis()

                            // Iniciar precarga de próximos videos
                            bufferNextVideos()
                        } else {
                            showError("Error: No se pudo obtener el video actual del servidor")
                        }
                    }
                } else {
                    val error = result.exceptionOrNull()
                    Log.e(TAG, "Error del servidor: ${error?.message}")
                    showError("Error al cargar contenido del servidor: ${error?.message ?: "Error desconocido"}")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error al cargar video: ${e.message}")
                showError("Error de conexión: ${e.message}")
            } finally {
                isLoading = false
            }
        }
    }
    
    private fun playVideo(video: PlaylistItem) {
        try {
            val mediaItem = MediaItem.fromUri(Uri.parse(video.url))
            exoPlayer?.setMediaItem(mediaItem)
            exoPlayer?.prepare()
            exoPlayer?.play()

            Log.d(TAG, "Iniciando reproducción de: ${video.url}")
        } catch (e: Exception) {
            Log.e(TAG, "Error al reproducir video: ${e.message}")
            handlePlaybackError()
        }
    }

    private fun playTVVideo(video: TVStreamItem) {
        try {
            val mediaItem = MediaItem.fromUri(Uri.parse(video.streamUrl))
            exoPlayer?.setMediaItem(mediaItem)
            exoPlayer?.prepare()
            exoPlayer?.play()

            Log.d(TAG, "Iniciando reproducción de TV stream: ${video.streamUrl}")
        } catch (e: Exception) {
            Log.e(TAG, "Error al reproducir video de TV: ${e.message}")
            handlePlaybackError()
        }
    }
    
    private fun playNextVideo() {
        currentVideoIndex++

        // Si llegamos al final y hay totalItems, hacer loop
        if (totalItems > 0 && currentVideoIndex >= totalItems) {
            currentVideoIndex = 0
            Log.d(TAG, "Reiniciando playlist desde el inicio")
        }

        Log.d(TAG, "Avanzando al video $currentVideoIndex")

        // Intentar usar video del buffer primero
        val bufferedVideo = getNextVideoFromBuffer()
        if (bufferedVideo != null) {
            // Reproducir video del buffer inmediatamente
            playTVVideo(bufferedVideo)
            showStatus("${bufferedVideo.name} (${currentVideoIndex + 1}/${totalItems}) [Buffer]")

            // Continuar precargando más videos
            bufferNextVideos()
        } else {
            // Fallback: cargar desde servidor con pequeña pausa
            handler.postDelayed({
                loadNextVideoFromServer()
            }, VIDEO_TRANSITION_DELAY)
        }
    }
    
    private fun handlePlaybackError() {
        retryCount++
        Log.w(TAG, "Manejando error de reproducción (intento $retryCount/$MAX_RETRIES)")

        if (retryCount <= MAX_RETRIES) {
            showError("Error de reproducción, reintentando... ($retryCount/$MAX_RETRIES)")

            // Reintentar después de un delay progresivo
            val delay = ERROR_RETRY_DELAY * retryCount
            handler.postDelayed({
                // Resetear índice en caso de que el contenido haya cambiado
                if (retryCount > 2) {
                    currentVideoIndex = 0
                    Log.d(TAG, "Reseteando índice de video por múltiples errores")
                }
                loadNextVideoFromServer()
            }, delay)
        } else {
            showError("Error persistente al cargar contenido. Verifica que la pantalla tenga contenido asignado.")
            Log.e(TAG, "Máximo de reintentos alcanzado")

            // Después de 30 segundos, intentar una vez más desde el inicio
            handler.postDelayed({
                retryCount = 0
                currentVideoIndex = 0
                Log.d(TAG, "Reintentando desde el inicio después de pausa larga")
                loadNextVideoFromServer()
            }, 30000L)
        }
    }
    
    private fun showStatus(message: String) {
        binding.statusText.text = message
        binding.statusText.visibility = View.VISIBLE
        
        // Ocultar el mensaje después de 3 segundos
        handler.postDelayed({
            binding.statusText.visibility = View.GONE
        }, 3000)
    }
    
    override fun onDestroy() {
        try {
            Log.d(TAG, "🔄 Destruyendo actividad")
            
            // Limpiar recursos de forma segura
            try {
                webSocketManager.disconnect()
            } catch (e: Exception) {
                Log.e(TAG, "Error desconectando WebSocket: ${e.message}", e)
            }
            
            try {
                exoPlayer?.release()
            } catch (e: Exception) {
                Log.e(TAG, "Error liberando ExoPlayer: ${e.message}", e)
            }
            
            try {
                handler.removeCallbacksAndMessages(null)
            } catch (e: Exception) {
                Log.e(TAG, "Error limpiando handler: ${e.message}", e)
            }
            
            try {
                videoBuffer.clear()
            } catch (e: Exception) {
                Log.e(TAG, "Error limpiando buffer: ${e.message}", e)
            }
            
        } catch (e: Exception) {
            Log.e(TAG, "Error general en onDestroy: ${e.message}", e)
        } finally {
            super.onDestroy()
        }
    }
    
    override fun onPause() {
        try {
            Log.d(TAG, "⏸️ Pausando actividad")
            
            // Pausar reproductor de forma segura
            try {
                exoPlayer?.pause()
                Log.d(TAG, "⏸️ ExoPlayer pausado correctamente")
            } catch (e: Exception) {
                Log.e(TAG, "Error pausando ExoPlayer: ${e.message}", e)
            }
            
            Log.d(TAG, "⏸️ Actividad pausada - WebSocket mantiene conexión")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error general en onPause: ${e.message}", e)
        } finally {
            super.onPause()
        }
    }
    
    override fun onResume() {
        try {
            Log.d(TAG, "▶️ Reanudando actividad")
            
            // Ocultar UI del sistema de forma segura
            try {
                hideSystemUI()
            } catch (e: Exception) {
                Log.e(TAG, "Error ocultando UI del sistema: ${e.message}", e)
            }
            
            // Reanudar reproductor de forma segura
            try {
                exoPlayer?.play()
                Log.d(TAG, "▶️ ExoPlayer reanudado correctamente")
            } catch (e: Exception) {
                Log.e(TAG, "Error reanudando ExoPlayer: ${e.message}", e)
            }
            
            // Reconectar WebSocket si es necesario
            try {
                if (!webSocketManager.isConnected()) {
                    Log.d(TAG, "🔄 Reconectando WebSocket en onResume")
                    webSocketManager.connect()
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error reconectando WebSocket: ${e.message}", e)
            }
            
            Log.d(TAG, "▶️ Actividad reanudada correctamente")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error general en onResume: ${e.message}", e)
        } finally {
            super.onResume()
        }
    }
    
    private fun showError(message: String) {
        binding.errorText.text = message
        binding.errorText.visibility = View.VISIBLE
        binding.loadingIndicator.visibility = View.GONE
        
        // Añadir un estilo más amigable para mensajes específicos
        if (message.contains("No hay contenido disponible") || 
            message.contains("no tiene contenido asignado")) {
            binding.errorText.setBackgroundResource(android.R.color.holo_blue_dark)
            binding.errorText.setPadding(32, 16, 32, 16)
        } else {
            binding.errorText.setBackgroundResource(android.R.color.holo_red_dark)
            binding.errorText.setPadding(16, 8, 16, 8)
        }

        Log.e(TAG, message)
    }

    /**
     * Precarga los próximos 5 videos para Android TV (más buffer para Wi-Fi lento)
     * Solo precarga metadata y URLs, no los archivos de video completos
     */
    private fun bufferNextVideos() {
        if (isBuffering || totalItems <= 1) return

        isBuffering = true
        lifecycleScope.launch {
            try {
                videoBuffer.clear()
                Log.d(TAG, "🔄 Iniciando precarga de próximos videos para Android TV...")

                // Aumentar buffer para Android TV (5 videos en lugar de 3)
                for (i in 1..5) {
                    val nextIndex = (currentVideoIndex + i) % totalItems
                    Log.d(TAG, "Precargando video índice: $nextIndex")

                    val result = repository.getAndroidTVStream(screenId, nextIndex)
                    result.getOrNull()?.currentItem?.let { videoItem ->
                        videoBuffer.add(videoItem)
                        Log.d(TAG, "✅ Video precargado: ${videoItem.name}")
                    }

                    // Pausa más larga para Android TV con Wi-Fi lento
                    delay(300)
                }

                Log.d(TAG, "🎉 Precarga completada. Videos en buffer: ${videoBuffer.size}")
            } catch (e: Exception) {
                Log.w(TAG, "Error en precarga de videos: ${e.message}")
            } finally {
                isBuffering = false
            }
        }
    }

    /**
     * Inicia precarga temprana cuando el video alcanza el 50% para Android TV
     */
    private fun startEarlyPreload() {
        handler.postDelayed({
            exoPlayer?.let { player ->
                val currentPosition = player.currentPosition
                val duration = player.duration

                if (duration > 0) {
                    val progress = (currentPosition.toFloat() / duration.toFloat()) * 100

                    // Precargar cuando llegue al 50% del video
                    if (progress >= 50f && videoBuffer.size < 3) {
                        Log.d(TAG, "📺 Precarga temprana activada al ${progress.toInt()}% del video")
                        bufferNextVideos()
                    } else if (progress < 90f) {
                        // Continuar verificando hasta el 90%
                        startEarlyPreload()
                    }
                }
            }
        }, 2000) // Verificar cada 2 segundos
    }

    /**
     * Obtiene el próximo video del buffer si está disponible
     * Optimizado para Android TV - mantiene buffer más lleno
     */
    private fun getNextVideoFromBuffer(): TVStreamItem? {
        return if (videoBuffer.isNotEmpty()) {
            val nextVideo = videoBuffer.removeAt(0)
            Log.d(TAG, "📦 Usando video del buffer: ${nextVideo.name} (Quedan: ${videoBuffer.size})")

            // Si el buffer se está agotando, recargar inmediatamente
            if (videoBuffer.size <= 2) {
                Log.d(TAG, "⚠️ Buffer bajo en Android TV, recargando...")
                bufferNextVideos()
            }

            nextVideo
        } else {
            Log.w(TAG, "📦 Buffer vacío en Android TV, cargando desde servidor")
            null
        }
    }
    

    
    private fun setupBackPressedHandler() {
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Mostrar confirmación antes de salir
                Toast.makeText(this@TVPlayerActivity, "Presiona nuevamente para salir", Toast.LENGTH_SHORT).show()
                
                // Deshabilitar temporalmente para permitir salida en segunda pulsación
                isEnabled = false
                handler.postDelayed({
                    isEnabled = true
                }, 2000)
            }
        })
    }
    
    /**
     * Inicializa la funcionalidad de orientación
     */
    private fun initializeOrientation() {
        try {
            // Inicializar SharedPreferences
            sharedPreferences = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            
            // Obtener el botón de orientación
            orientationToggleButton = binding.orientationToggleButton
            
            // Cargar la orientación guardada
            isVerticalOrientation = sharedPreferences.getBoolean(KEY_ORIENTATION, false)
            
            // Aplicar la orientación inicial
            applyOrientation()
            
            // Configurar el listener del botón
            orientationToggleButton.setOnClickListener {
                toggleOrientation()
            }
            
            Log.d(TAG, "✅ Orientación inicializada. Modo vertical: $isVerticalOrientation")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error inicializando orientación: ${e.message}", e)
        }
    }
    
    /**
     * Alterna entre orientación vertical y horizontal
     */
    private fun toggleOrientation() {
        try {
            isVerticalOrientation = !isVerticalOrientation
            
            // Guardar la preferencia
            sharedPreferences.edit()
                .putBoolean(KEY_ORIENTATION, isVerticalOrientation)
                .apply()
            
            // Aplicar la nueva orientación
            applyOrientation()
            
            // Mostrar indicador visual
            val message = if (isVerticalOrientation) {
                "Modo vertical activado"
            } else {
                "Modo horizontal activado"
            }
            Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
            
            Log.d(TAG, "🔄 Orientación cambiada a: ${if (isVerticalOrientation) "Vertical" else "Horizontal"}")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error alternando orientación: ${e.message}", e)
        }
    }
    
    /**
     * Aplica la orientación programáticamente
     */
    private fun applyOrientation() {
        try {
            if (isVerticalOrientation) {
                // Modo vertical (9:16)
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
                orientationToggleButton.setImageResource(R.drawable.ic_orientation_vertical)
                
                // Configurar PlayerView para modo vertical con recorte inteligente
                configurePlayerForVertical()
                
            } else {
                // Modo horizontal (16:9)
                requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
                orientationToggleButton.setImageResource(R.drawable.ic_orientation_horizontal)
                
                // Configurar PlayerView para modo horizontal
                configurePlayerForHorizontal()
            }
            
            Log.d(TAG, "📱 Orientación aplicada: ${if (isVerticalOrientation) "Portrait" else "Landscape"}")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error aplicando orientación: ${e.message}", e)
        }
    }
    
    /**
     * Configura el PlayerView para modo vertical (9:16)
     * Implementa recorte inteligente para videos horizontales
     */
    private fun configurePlayerForVertical() {
        try {
            // Para modo vertical, usar ZOOM para llenar la pantalla
            // Esto implementa el "recorte inteligente" manteniendo el centro del video
            binding.playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_ZOOM
            
            // Ajustar el layout del PlayerView para relación 9:16
            val layoutParams = binding.playerView.layoutParams
            layoutParams.width = ViewGroup.LayoutParams.MATCH_PARENT
            layoutParams.height = ViewGroup.LayoutParams.MATCH_PARENT
            binding.playerView.layoutParams = layoutParams
            
            Log.d(TAG, "📱 PlayerView configurado para modo vertical (9:16) con recorte inteligente")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error configurando PlayerView para vertical: ${e.message}", e)
        }
    }
    
    /**
     * Configura el PlayerView para modo horizontal (16:9)
     */
    private fun configurePlayerForHorizontal() {
        try {
            // Para modo horizontal, usar FIT para mostrar el video completo
            binding.playerView.resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
            
            // Ajustar el layout del PlayerView para relación 16:9
            val layoutParams = binding.playerView.layoutParams
            layoutParams.width = ViewGroup.LayoutParams.MATCH_PARENT
            layoutParams.height = ViewGroup.LayoutParams.MATCH_PARENT
            binding.playerView.layoutParams = layoutParams
            
            Log.d(TAG, "📱 PlayerView configurado para modo horizontal (16:9)")
            
        } catch (e: Exception) {
            Log.e(TAG, "Error configurando PlayerView para horizontal: ${e.message}", e)
        }
    }
}