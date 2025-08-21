package com.uct.tvcontentviewer.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.uct.tvcontentviewer.R
import com.uct.tvcontentviewer.data.model.PlaylistItem
import com.uct.tvcontentviewer.databinding.ItemPlaylistContentBinding

class PlaylistContentAdapter(
    private val onItemClick: (PlaylistItem) -> Unit
) : ListAdapter<PlaylistItem, PlaylistContentAdapter.ContentViewHolder>(ContentDiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ContentViewHolder {
        val binding = ItemPlaylistContentBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ContentViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ContentViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ContentViewHolder(
        private val binding: ItemPlaylistContentBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: PlaylistItem) {
            binding.apply {
                tvContentName.text = item.name
                
                // Tipo de contenido
                if (item.isVideo()) {
                    ivContentType.setImageResource(R.drawable.ic_play_arrow)
                    tvContentType.text = "Video"
                    ivContentType.isSelected = false
                } else {
                    ivContentType.setImageResource(R.drawable.ic_image)
                    tvContentType.text = "Imagen"
                    ivContentType.isSelected = true
                }
                
                // Duración
                if (item.isVideo()) {
                    tvDuration.text = "Video"
                } else {
                    val duration = item.duration ?: 5
                    tvDuration.text = "${duration}s"
                }
                
                // Click listener
                root.setOnClickListener {
                    onItemClick(item)
                }
            }
        }
    }

    private class ContentDiffCallback : DiffUtil.ItemCallback<PlaylistItem>() {
        override fun areItemsTheSame(oldItem: PlaylistItem, newItem: PlaylistItem): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: PlaylistItem, newItem: PlaylistItem): Boolean {
            return oldItem == newItem
        }
    }
}
