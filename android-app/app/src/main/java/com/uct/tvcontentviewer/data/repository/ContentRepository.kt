package com.uct.tvcontentviewer.data.repository

import android.util.Log
import com.uct.tvcontentviewer.data.api.RetrofitClient
import com.uct.tvcontentviewer.data.model.AndroidTVStreamResponse
import com.uct.tvcontentviewer.data.model.Screen
import com.uct.tvcontentviewer.data.model.AndroidPlaylist
import com.uct.tvcontentviewer.data.model.ScreenContent
import com.uct.tvcontentviewer.data.model.PlaylistItem
import com.uct.tvcontentviewer.data.model.PlaybackInstructions
import com.uct.tvcontentviewer.data.model.AndroidPlaylistItem
import retrofit2.Response

class ContentRepository private constructor() {
    
    private val apiService = RetrofitClient.getApiService()
    
    companion object {
        private const val TAG = "ContentRepository"
        
        @Volatile
        private var INSTANCE: ContentRepository? = null
        
        fun getInstance(): ContentRepository {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: ContentRepository().also { INSTANCE = it }
            }
        }
    }
    
    private fun getErrorMessage(code: Int): String {
        return when (code) {
            404 -> "Contenido no encontrado"
            500 -> "Error interno del servidor"
            503 -> "Servicio no disponible"
            in 400..499 -> "Error de solicitud"
            in 500..599 -> "Servidor desconectado"
            else -> "Servidor desconectado"
        }
    }
    
    suspend fun getScreens(): Result<List<Screen>> {
        return try {
            val response = apiService.getScreens()
            if (response.isSuccessful) {
                val screens = response.body() ?: emptyList()
                Result.success(screens)
            } else {
                Result.failure(Exception(getErrorMessage(response.code())))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo pantallas", e)
            Result.failure(Exception("Servidor desconectado"))
        }
    }
    
    suspend fun getScreen(screenId: String): Result<Screen> {
        return try {
            val response = apiService.getScreens()
            if (response.isSuccessful) {
                val screens = response.body() ?: emptyList()
                val screen = screens.find { it.id == screenId }
                if (screen != null) {
                    Result.success(screen)
                } else {
                    Result.failure(Exception("Pantalla no encontrada"))
                }
            } else {
                Result.failure(Exception(getErrorMessage(response.code())))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo pantalla", e)
            Result.failure(Exception("Servidor desconectado"))
        }
    }
    
    suspend fun getScreenContent(screenId: String): Result<ScreenContent> {
        return try {
            val response = apiService.getScreenContent(screenId)
            if (response.isSuccessful) {
                val contentResponse = response.body()
                if (contentResponse?.content != null) {
                    Result.success(contentResponse.content)
                } else {
                    Result.failure(Exception(contentResponse?.error ?: "Contenido no encontrado"))
                }
            } else {
                Result.failure(Exception("Error ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo contenido de pantalla", e)
            Result.failure(e)
        }
    }
    
    suspend fun getAndroidPlaylist(screenId: String): Result<AndroidPlaylist> {
        return try {
            val response = apiService.getAndroidPlaylist(screenId)
            if (response.isSuccessful) {
                val playlistResponse = response.body()
                if (playlistResponse != null) {
                    // Convertir AndroidPlaylistResponse a AndroidPlaylist
                    val playlist = AndroidPlaylist(
                        screenId = playlistResponse.screenId,
                        playlistName = playlistResponse.playlistName,
                        items = playlistResponse.items.map { item ->
                            PlaylistItem(
                                id = item.id,
                                name = item.name,
                                url = item.url,
                                type = item.type,
                                duration = item.duration ?: 30
                            )
                        },
                        totalItems = playlistResponse.totalItems,
                        currentIndex = playlistResponse.currentIndex ?: 0,
                        isLooping = playlistResponse.isLooping ?: true,
                        optimizedForAndroid = playlistResponse.optimizedForAndroid ?: true,
                        playbackInstructions = playlistResponse.playbackInstructions?.let { instructions ->
                            PlaybackInstructions(
                                autoplay = instructions.autoplay ?: true,
                                muted = instructions.muted ?: false,
                                controls = instructions.controls ?: true,
                                preload = instructions.preload ?: "auto",
                                crossOrigin = instructions.crossOrigin ?: "anonymous"
                            )
                        },
                        error = playlistResponse.error
                    )
                    Result.success(playlist)
                } else {
                    Result.failure(Exception("Playlist no encontrada"))
                }
            } else {
                Result.failure(Exception(getErrorMessage(response.code())))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo playlist de Android", e)
            Result.failure(Exception("Servidor desconectado"))
        }
    }
    
    suspend fun getAndroidTVStream(screenId: String, index: Int): Result<AndroidTVStreamResponse> {
        return try {
            val response = apiService.getAndroidTVStream(screenId, index)
            if (response.isSuccessful) {
                val streamResponse = response.body()
                if (streamResponse != null) {
                    Result.success(streamResponse)
                } else {
                    Result.failure(Exception("Respuesta vacía del servidor"))
                }
            } else {
                Result.failure(Exception("Error ${response.code()}: ${response.message()}"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error obteniendo stream de Android TV", e)
            Result.failure(e)
        }
    }
    
    suspend fun sendDeviceInfo(screenId: String, deviceInfo: Map<String, Any>): Response<Unit> {
        return try {
            apiService.sendDeviceInfo(screenId, deviceInfo)
        } catch (e: Exception) {
            Log.e(TAG, "Error sending device info", e)
            throw e
        }
    }
}
