package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class ScreenStatusResponse(
    @SerializedName("screenId")
    val screenId: String,
    
    @SerializedName("status")
    val status: String,
    
    @SerializedName("isOnline")
    val isOnline: Boolean,
    
    @SerializedName("lastSeen")
    val lastSeen: String?,
    
    @SerializedName("currentContent")
    val currentContent: String?,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("error")
    val error: String?
)