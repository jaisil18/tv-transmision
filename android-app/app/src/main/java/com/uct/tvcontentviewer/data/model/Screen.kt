package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class Screen(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("status")
    val status: String, // "active" or "inactive"
    
    @SerializedName("lastSeen")
    val lastSeen: Long,
    
    @SerializedName("currentContent")
    val currentContent: String? = null,
    
    @SerializedName("isRepeating")
    val isRepeating: Boolean? = false,
    
    @SerializedName("muted")
    val muted: Boolean? = true
) {
    fun isActive(): Boolean = status == "active"
    
    fun getFormattedLastSeen(): String {
        val currentTime = System.currentTimeMillis()
        val timeDiff = currentTime - lastSeen
        
        return when {
            timeDiff < 60000 -> "Hace menos de 1 minuto"
            timeDiff < 3600000 -> "Hace ${timeDiff / 60000} minutos"
            timeDiff < 86400000 -> "Hace ${timeDiff / 3600000} horas"
            else -> "Hace ${timeDiff / 86400000} días"
        }
    }
}
