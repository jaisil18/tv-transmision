package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class PlaylistItem(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("url")
    val url: String,
    
    @SerializedName("type")
    val type: String, // "image" or "video"
    
    @SerializedName("duration")
    val duration: Int? = null // duración en segundos para imágenes
) {
    fun isVideo(): Boolean = type == "video"
    fun isImage(): Boolean = type == "image"
    
    fun getFullUrl(baseUrl: String): String {
        return if (url.startsWith("http")) {
            url
        } else {
            "$baseUrl$url"
        }
    }
    
    fun getDurationInMillis(): Long {
        return (duration ?: 5) * 1000L // Default 5 segundos para imágenes
    }
}
