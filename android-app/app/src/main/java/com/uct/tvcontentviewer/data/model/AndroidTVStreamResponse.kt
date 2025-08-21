package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class AndroidTVStreamResponse(
    @SerializedName("screenId")
    val screenId: String,
    
    @SerializedName("playlistName")
    val playlistName: String,
    
    @SerializedName("currentItem")
    val currentItem: TVStreamItem?,
    
    @SerializedName("nextItem")
    val nextItem: TVStreamItem?,
    
    @SerializedName("totalItems")
    val totalItems: Int,
    
    @SerializedName("currentIndex")
    val currentIndex: Int,
    
    @SerializedName("isLooping")
    val isLooping: Boolean,
    
    @SerializedName("streamingOptimized")
    val streamingOptimized: Boolean,
    
    @SerializedName("androidTVConfig")
    val androidTVConfig: AndroidTVConfig?,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("error")
    val error: String?
)

data class TVStreamItem(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("streamUrl")
    val streamUrl: String,
    
    @SerializedName("type")
    val type: String,
    
    @SerializedName("duration")
    val duration: Int,
    
    @SerializedName("folder")
    val folder: String,
    
    @SerializedName("fileSize")
    val fileSize: Long,
    
    @SerializedName("mimeType")
    val mimeType: String,
    
    @SerializedName("preload")
    val preload: String,
    
    @SerializedName("priority")
    val priority: String
) {
    fun isVideo(): Boolean = type == "video"
    fun isImage(): Boolean = type == "image"
    
    fun getDurationInMillis(): Long = duration * 1000L
}

data class AndroidTVConfig(
    @SerializedName("bufferSize")
    val bufferSize: String,
    
    @SerializedName("preloadStrategy")
    val preloadStrategy: String,
    
    @SerializedName("memoryManagement")
    val memoryManagement: String,
    
    @SerializedName("autoAdvance")
    val autoAdvance: Boolean,
    
    @SerializedName("crossfade")
    val crossfade: Boolean
)
