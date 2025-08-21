package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

// Clase genérica para respuestas de error de la API
data class ApiError(
    @SerializedName("error")
    val error: String
)

// Clase para manejar el estado de la aplicación
data class AppState(
    val isLoading: Boolean = false,
    val error: String? = null,
    val screens: List<Screen> = emptyList(),
    val playlists: List<Playlist> = emptyList()
)