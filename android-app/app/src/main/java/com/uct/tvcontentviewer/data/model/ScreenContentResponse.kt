package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class ScreenContentResponse(
    @SerializedName("screenId")
    val screenId: String,
    
    @SerializedName("content")
    val content: ScreenContent?,
    
    @SerializedName("lastUpdated")
    val lastUpdated: String?,
    
    @SerializedName("message")
    val message: String?,
    
    @SerializedName("error")
    val error: String?
)