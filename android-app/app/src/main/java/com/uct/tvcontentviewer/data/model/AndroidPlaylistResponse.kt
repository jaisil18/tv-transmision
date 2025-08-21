package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class AndroidPlaylistResponse(
    @SerializedName("screenId")
    val screenId: String,
    
    @SerializedName("playlistName")
    val playlistName: String,
    
    @SerializedName("items")
    val items: List<AndroidPlaylistItem> = emptyList(),
    
    @SerializedName("currentItem")
    val currentItem: AndroidPlaylistItem?,
    
    @SerializedName("nextItem")
    val nextItem: AndroidPlaylistItem?,
    
    @SerializedName("totalItems")
    val totalItems: Int,
    
    @SerializedName("currentIndex")
    val currentIndex: Int? = 0,
    
    @SerializedName("isLooping")
    val isLooping: Boolean? = true,
    
    @SerializedName("optimizedForAndroid")
    val optimizedForAndroid: Boolean? = true,
    
    @SerializedName("playbackInstructions")
    val playbackInstructions: AndroidPlaybackInstructions?,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("error")
    val error: String?
)

data class AndroidPlaybackInstructions(
    @SerializedName("autoplay")
    val autoplay: Boolean? = true,
    
    @SerializedName("muted")
    val muted: Boolean? = false,
    
    @SerializedName("controls")
    val controls: Boolean? = true,
    
    @SerializedName("preload")
    val preload: String? = "auto",
    
    @SerializedName("crossOrigin")
    val crossOrigin: String? = "anonymous"
)