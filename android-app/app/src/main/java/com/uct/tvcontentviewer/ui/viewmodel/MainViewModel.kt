package com.uct.tvcontentviewer.ui.viewmodel

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.uct.tvcontentviewer.data.model.AppState
import com.uct.tvcontentviewer.data.model.Screen
import com.uct.tvcontentviewer.data.repository.ContentRepository
import kotlinx.coroutines.launch

class MainViewModel : ViewModel() {
    
    private val repository = ContentRepository.getInstance()
    
    private val _appState = MutableLiveData<AppState>()
    val appState: LiveData<AppState> = _appState
    
    init {
        loadScreens()
    }
    
    fun loadScreens() {
        _appState.value = _appState.value?.copy(isLoading = true) ?: AppState(isLoading = true)
        
        viewModelScope.launch {
            try {
                val screensResult = repository.getScreens()

                if (screensResult.isSuccess) {
                    val screens = screensResult.getOrNull() ?: emptyList()

                    _appState.value = AppState(
                        isLoading = false,
                        screens = screens,
                        playlists = emptyList(), // Por ahora no cargamos playlists
                        error = null
                    )
                } else {
                    val error = screensResult.exceptionOrNull()?.message ?: "Error desconocido"

                    _appState.value = AppState(
                        isLoading = false,
                        error = error
                    )
                }
            } catch (e: Exception) {
                _appState.value = AppState(
                    isLoading = false,
                    error = e.message ?: "Error de conexión"
                )
            }
        }
    }
    
    fun refreshScreens() {
        loadScreens()
    }
}
