package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class MosaicoItem(
    val id: String,
    val name: String,
    val url: String,
    val type: String, // "image" o "video"
    val position: Int, // 1 para Mosaico 1, 2 para Mosaico 2
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