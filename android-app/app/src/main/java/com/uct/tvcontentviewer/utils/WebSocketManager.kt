package com.uct.tvcontentviewer.utils

import android.util.Log
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.CancellationException
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener
import okio.ByteString
import org.json.JSONObject
import java.util.concurrent.TimeUnit

class WebSocketManager private constructor() {
    
    companion object {
        private const val TAG = "WebSocketManager"
        private const val RECONNECT_DELAY = 5000L // 5 segundos
        private const val MAX_RECONNECT_ATTEMPTS = 10
        private const val HEARTBEAT_INTERVAL = 30000L // 30 segundos
        
        @Volatile
        private var INSTANCE: WebSocketManager? = null
        
        fun getInstance(): WebSocketManager {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: WebSocketManager().also { INSTANCE = it }
            }
        }
    }
    
    private var webSocket: WebSocket? = null
    private var client: OkHttpClient? = null
    private var isConnected = false
    private var reconnectAttempts = 0
    private var screenId: String? = null
    private var baseUrl: String? = null
    private var heartbeatJob: Job? = null
    private val coroutineScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    
    // Callback para notificar actualizaciones de contenido
    var onContentUpdateReceived: (() -> Unit)? = null
    var onConnectionStatusChanged: ((Boolean) -> Unit)? = null
    
    fun initialize(screenId: String, baseUrl: String) {
        this.screenId = screenId
        this.baseUrl = baseUrl
        
        client = OkHttpClient.Builder()
            .connectTimeout(10, TimeUnit.SECONDS)
            .readTimeout(0, TimeUnit.SECONDS) // Sin timeout para WebSocket
            .writeTimeout(10, TimeUnit.SECONDS)
            .build()
            
        Log.d(TAG, "WebSocketManager inicializado para pantalla $screenId")
    }
    
    fun connect() {
        if (isConnected || screenId == null || baseUrl == null) {
            Log.d(TAG, "WebSocket ya conectado o configuración incompleta")
            return
        }
        
        try {
            val wsUrl = baseUrl!!.replace("http://", "ws://").replace("https://", "wss://")
            val fullWsUrl = "${wsUrl}ws?screenId=$screenId&type=android-tv"
            
            Log.d(TAG, "Conectando WebSocket a: $fullWsUrl")
            
            val request = Request.Builder()
                .url(fullWsUrl)
                .build()
                
            webSocket = client!!.newWebSocket(request, object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    Log.d(TAG, "✅ WebSocket conectado exitosamente")
                    isConnected = true
                    reconnectAttempts = 0
                    
                    // Notificar cambio de estado
                    onConnectionStatusChanged?.invoke(true)
                    
                    // Iniciar heartbeat
                    startHeartbeat()
                    
                    // Enviar mensaje de identificación
                    sendIdentificationMessage()
                }
                
                override fun onMessage(webSocket: WebSocket, text: String) {
                    Log.d(TAG, "📨 Mensaje WebSocket recibido: $text")
                    handleWebSocketMessage(text)
                }
                
                override fun onMessage(webSocket: WebSocket, bytes: ByteString) {
                    Log.d(TAG, "📨 Mensaje binario WebSocket recibido")
                }
                
                override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                    Log.w(TAG, "🔄 WebSocket cerrándose: $code - $reason")
                }
                
                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.w(TAG, "❌ WebSocket cerrado: $code - $reason")
                    handleDisconnection()
                }
                
                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "💥 Error en WebSocket: ${t.message}", t)
                    handleDisconnection()
                }
            })
            
        } catch (e: Exception) {
            Log.e(TAG, "Error al conectar WebSocket: ${e.message}", e)
            handleDisconnection()
        }
    }
    
    private fun sendIdentificationMessage() {
        try {
            val identificationMessage = JSONObject().apply {
                put("type", "identification")
                put("screenId", screenId)
                put("deviceType", "android-tv")
                put("timestamp", System.currentTimeMillis())
            }
            
            webSocket?.send(identificationMessage.toString())
            Log.d(TAG, "📤 Mensaje de identificación enviado")
        } catch (e: Exception) {
            Log.e(TAG, "Error enviando identificación: ${e.message}", e)
        }
    }
    
    private fun startHeartbeat() {
        heartbeatJob?.cancel()
        heartbeatJob = coroutineScope.launch {
            while (isConnected) {
                try {
                    val heartbeatMessage = JSONObject().apply {
                        put("type", "heartbeat")
                        put("screenId", screenId)
                        put("timestamp", System.currentTimeMillis())
                    }
                    
                    webSocket?.send(heartbeatMessage.toString())
                    Log.d(TAG, "💓 Heartbeat enviado")
                    
                    delay(HEARTBEAT_INTERVAL)
                } catch (e: CancellationException) {
                    Log.d(TAG, "💓 Heartbeat cancelado correctamente")
                    break
                } catch (e: Exception) {
                    Log.e(TAG, "Error en heartbeat: ${e.message}", e)
                    // Continuar con el siguiente heartbeat en lugar de romper el bucle
                    try {
                        delay(HEARTBEAT_INTERVAL)
                    } catch (ce: CancellationException) {
                        Log.d(TAG, "💓 Heartbeat cancelado durante delay")
                        break
                    }
                }
            }
            Log.d(TAG, "💓 Heartbeat terminado")
        }
    }
    
    private fun handleWebSocketMessage(message: String) {
        try {
            val json = JSONObject(message)
            val type = json.optString("type")
            
            when (type) {
                "content-updated" -> {
                    Log.i(TAG, "🎉 Actualización de contenido recibida vía WebSocket")
                    // Ejecutar en el hilo principal para evitar problemas de concurrencia
                    coroutineScope.launch(Dispatchers.Main) {
                        try {
                            onContentUpdateReceived?.invoke()
                        } catch (e: Exception) {
                            Log.e(TAG, "Error ejecutando callback de actualización: ${e.message}", e)
                        }
                    }
                }
                "refresh" -> {
                    Log.i(TAG, "🔄 Comando de refresh recibido vía WebSocket")
                    // Ejecutar en el hilo principal para evitar problemas de concurrencia
                    coroutineScope.launch(Dispatchers.Main) {
                        try {
                            onContentUpdateReceived?.invoke()
                        } catch (e: Exception) {
                            Log.e(TAG, "Error ejecutando callback de refresh: ${e.message}", e)
                        }
                    }
                }
                "heartbeat" -> {
                    Log.d(TAG, "💓 Heartbeat recibido del servidor")
                }
                "connected" -> {
                    Log.d(TAG, "✅ Confirmación de conexión recibida")
                }
                else -> {
                    Log.d(TAG, "📨 Mensaje WebSocket no manejado: $type")
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error procesando mensaje WebSocket: ${e.message}", e)
        }
    }
    
    private fun handleDisconnection() {
        synchronized(this) {
            if (!isConnected) return // Evitar múltiples llamadas
            
            isConnected = false
            heartbeatJob?.cancel() // Esto cancelará el heartbeat correctamente
        }
        
        // Notificar cambio de estado en el hilo principal
        coroutineScope.launch(Dispatchers.Main) {
            try {
                onConnectionStatusChanged?.invoke(false)
            } catch (e: Exception) {
                Log.e(TAG, "Error notificando desconexión: ${e.message}", e)
            }
        }
        
        // Intentar reconectar si no hemos excedido el límite
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++
            Log.w(TAG, "🔄 Intentando reconectar WebSocket (intento $reconnectAttempts/$MAX_RECONNECT_ATTEMPTS)")
            
            coroutineScope.launch(Dispatchers.IO) {
                try {
                    delay(RECONNECT_DELAY * reconnectAttempts) // Delay progresivo
                    connect()
                } catch (e: CancellationException) {
                    Log.d(TAG, "🔄 Reconexión cancelada")
                } catch (e: Exception) {
                    Log.e(TAG, "Error en reconexión: ${e.message}", e)
                }
            }
        } else {
            Log.e(TAG, "❌ Máximo de intentos de reconexión alcanzado")
        }
    }
    
    fun disconnect() {
        Log.d(TAG, "🔌 Desconectando WebSocket")
        
        synchronized(this) {
            isConnected = false
            heartbeatJob?.cancel() // Cancelar heartbeat antes de cerrar
            webSocket?.close(1000, "Desconexión normal")
            webSocket = null
        }
        
        // Notificar cambio de estado en el hilo principal
        coroutineScope.launch(Dispatchers.Main) {
            try {
                onConnectionStatusChanged?.invoke(false)
            } catch (e: Exception) {
                Log.e(TAG, "Error notificando desconexión manual: ${e.message}", e)
            }
        }
    }
    
    fun isConnected(): Boolean {
        return isConnected
    }
    
    fun getConnectionStatus(): String {
        return when {
            isConnected -> "Conectado"
            reconnectAttempts > 0 -> "Reconectando... ($reconnectAttempts/$MAX_RECONNECT_ATTEMPTS)"
            else -> "Desconectado"
        }
    }
}