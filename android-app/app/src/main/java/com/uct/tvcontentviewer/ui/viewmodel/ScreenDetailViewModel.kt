package com.uct.tvcontentviewer.ui.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.uct.tvcontentviewer.data.model.ScreenState
import com.uct.tvcontentviewer.data.repository.ContentRepository
import com.uct.tvcontentviewer.data.model.Playlist
import com.uct.tvcontentviewer.data.model.PlaylistItem
import kotlinx.coroutines.launch

class ScreenDetailViewModel : ViewModel() {
    
    private val repository = ContentRepository.getInstance()
    
    private val _screenState = MutableLiveData<ScreenState>()
    val screenState: LiveData<ScreenState> = _screenState
    
    fun loadScreenDetail(screenId: String) {
        _screenState.value = ScreenState(isLoading = true)
        
        viewModelScope.launch {
            try {
                val screenResult = repository.getScreen(screenId)
                val contentResult = repository.getScreenContent(screenId)

                if (screenResult.isSuccess) {
                    val screen = screenResult.getOrNull()
                    val content = if (contentResult.isSuccess) {
                        contentResult.getOrNull()
                    } else null

                    // Convertir ScreenContent a Playlist para compatibilidad
                    val playlist = content?.let { screenContent ->
                        if (screenContent.totalItems > 0 && !screenContent.items.isNullOrEmpty()) {
                            Playlist(
                                id = "content_${screenId}",
                                name = screenContent.playlistName ?: "Contenido de ${screen?.name}",
                                items = screenContent.items.map { item ->
                                    PlaylistItem(
                                        id = item.id,
                                        name = item.name,
                                        url = item.url,
                                        type = item.type,
                                        duration = item.duration ?: 30
                                    )
                                },
                                screens = listOf(screenId),
                                createdAt = System.currentTimeMillis(),
                                updatedAt = System.currentTimeMillis()
                            )
                        } else {
                            // Si no hay contenido, mostrar el mensaje de error del servidor
                            if (!screenContent.error.isNullOrEmpty()) {
                                val currentState = _screenState.value
                                currentState?.let { state ->
                                    _screenState.value = state.copy(
                                        error = screenContent.error
                                    )
                                }
                            }
                            null
                        }
                    }

                    _screenState.value = ScreenState(
                        isLoading = false,
                        screen = screen,
                        playlist = playlist,
                        error = null
                    )
                } else {
                    val error = screenResult.exceptionOrNull()?.message ?: "Error desconocido"
                    _screenState.value = ScreenState(
                        isLoading = false,
                        error = error
                    )
                }
            } catch (e: Exception) {
                _screenState.value = ScreenState(
                    isLoading = false,
                    error = e.message ?: "Error de conexión"
                )
            }
        }
    }
    
    fun refreshScreenDetail(screenId: String) {
        loadScreenDetail(screenId)
    }
}
