package com.uct.tvcontentviewer.data.api

import com.uct.tvcontentviewer.data.model.AndroidPlaylistResponse
import com.uct.tvcontentviewer.data.model.AndroidTVStreamResponse
import com.uct.tvcontentviewer.data.model.Screen
import com.uct.tvcontentviewer.data.model.ScreenContentResponse
import com.uct.tvcontentviewer.data.model.ScreenStatusResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

interface ApiService {
    
    @GET("api/public/screens")
    suspend fun getScreens(): Response<List<Screen>>
    
    @GET("api/public/android-playlist/{screenId}")
    suspend fun getAndroidPlaylist(
        @Path("screenId") screenId: String,
        @Query("index") index: Int = 0
    ): Response<AndroidPlaylistResponse>
    
    @GET("api/public/android-tv-stream/{screenId}")
    suspend fun getAndroidTVStream(
        @Path("screenId") screenId: String,
        @Query("index") index: Int = 0
    ): Response<AndroidTVStreamResponse>
    
    @GET("api/screens/{screenId}/content")
    suspend fun getScreenContent(
        @Path("screenId") screenId: String
    ): Response<ScreenContentResponse>
    
    @GET("api/screens/{screenId}/status")
    suspend fun getScreenStatus(
        @Path("screenId") screenId: String
    ): Response<ScreenStatusResponse>
    
    @POST("api/screens/{screenId}/device-info")
    suspend fun sendDeviceInfo(
        @Path("screenId") screenId: String,
        @Body deviceInfo: Map<String, Any>
    ): Response<Unit>
}
