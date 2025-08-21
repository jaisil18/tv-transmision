package com.uct.tvcontentviewer.data.model

import com.google.gson.annotations.SerializedName

data class ScreenContent(
    @SerializedName("screenId")
    val screenId: String,

    @SerializedName("playlistName")
    val playlistName: String?,

    @SerializedName("items")
    val items: List<AndroidPlaylistItem>?,

    @SerializedName("totalItems")
    val totalItems: Int,

    @SerializedName("message")
    val message: String?,

    @SerializedName("error")
    val error: String?
)

data class AndroidPlaylistItem(
    @SerializedName("id")
    val id: String,

    @SerializedName("name")
    val name: String,

    @SerializedName("url")
    val url: String,

    @SerializedName("type")
    val type: String,

    @SerializedName("duration")
    val duration: Int?,

    @SerializedName("folder")
    val folder: String?
)


