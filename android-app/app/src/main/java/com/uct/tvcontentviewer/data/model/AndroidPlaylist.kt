package com.uct.tvcontentviewer.data.model

data class AndroidPlaylist(
    val screenId: String,
    val playlistName: String,
    val items: List<PlaylistItem>,
    val totalItems: Int,
    val currentIndex: Int,
    val isLooping: Boolean,
    val optimizedForAndroid: Boolean,
    val playbackInstructions: PlaybackInstructions? = null,
    val error: String? = null
)



data class PlaybackInstructions(
    val autoplay: Boolean,
    val muted: Boolean,
    val controls: Boolean,
    val preload: String,
    val crossOrigin: String
)
