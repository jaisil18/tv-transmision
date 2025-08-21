package com.uct.tvcontentviewer.utils

import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.asSharedFlow

/**
 * EventBus moderno para reemplazar LocalBroadcastManager deprecado
 * Usa Kotlin Coroutines SharedFlow para comunicación entre componentes
 */
object EventBus {
    
    // Eventos disponibles
    sealed class Event {
        object ForcePlaylistRefresh : Event()
        data class PlaylistUpdated(val screenId: String, val itemCount: Int) : Event()
        data class ConnectionStatusChanged(val isConnected: Boolean) : Event()
    }
    
    private val _events = MutableSharedFlow<Event>(
        replay = 0, // No replay events
        extraBufferCapacity = 1 // Buffer para evitar suspensión
    )
    
    val events: SharedFlow<Event> = _events.asSharedFlow()
    
    /**
     * Emite un evento al bus
     */
    fun emit(event: Event) {
        _events.tryEmit(event)
    }
    
    /**
     * Método de conveniencia para forzar actualización de playlist
     */
    fun forcePlaylistRefresh() {
        emit(Event.ForcePlaylistRefresh)
    }
    
    /**
     * Método de conveniencia para notificar actualización de playlist
     */
    fun notifyPlaylistUpdated(screenId: String, itemCount: Int) {
        emit(Event.PlaylistUpdated(screenId, itemCount))
    }
    
    /**
     * Método de conveniencia para notificar cambio de estado de conexión
     */
    fun notifyConnectionStatusChanged(isConnected: Boolean) {
        emit(Event.ConnectionStatusChanged(isConnected))
    }
}