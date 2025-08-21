package com.uct.tvcontentviewer.data.model

data class ScreenState(
    val isLoading: Boolean = false,
    val screen: Screen? = null,
    val playlist: Playlist? = null,
    val error: String? = null
)