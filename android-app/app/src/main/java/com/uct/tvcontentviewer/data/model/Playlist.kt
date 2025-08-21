package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class Playlist(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("items")
    val items: List<PlaylistItem>,
    
    @SerializedName("screens")
    val screens: List<String>, // IDs de las pantallas asignadas
    
    @SerializedName("folder")
    val folder: String? = null,
    
    @SerializedName("createdAt")
    val createdAt: Long,
    
    @SerializedName("updatedAt")
    val updatedAt: Long
) {
    fun isEmpty(): Boolean = items.isEmpty()
    
    fun hasVideos(): Boolean = items.any { it.isVideo() }

    fun hasImages(): Boolean = items.any { it.isImage() }
    
    fun getItemCount(): Int = items.size
    
    fun getFormattedCreatedDate(): String {
        val date = java.util.Date(createdAt)
        val formatter = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault())
        return formatter.format(date)
    }
    
    fun getFormattedUpdatedDate(): String {
        val date = java.util.Date(updatedAt)
        val formatter = java.text.SimpleDateFormat("dd/MM/yyyy HH:mm", java.util.Locale.getDefault())
        return formatter.format(date)
    }
}
