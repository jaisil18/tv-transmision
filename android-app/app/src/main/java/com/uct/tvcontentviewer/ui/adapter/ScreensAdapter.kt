package com.uct.tvcontentviewer.ui.adapter

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.lifecycle.LifecycleCoroutineScope
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.uct.tvcontentviewer.R
import com.uct.tvcontentviewer.data.model.Screen
import com.uct.tvcontentviewer.data.repository.ContentRepository
import com.uct.tvcontentviewer.databinding.ItemScreenBinding
import kotlinx.coroutines.launch

class ScreensAdapter(
    private val onScreenClick: (Screen) -> Unit,
    private val lifecycleScope: LifecycleCoroutineScope
) : ListAdapter<Screen, ScreensAdapter.ScreenViewHolder>(ScreenDiffCallback()) {

    private val repository = ContentRepository.getInstance()

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ScreenViewHolder {
        val binding = ItemScreenBinding.inflate(
            LayoutInflater.from(parent.context),
            parent,
            false
        )
        return ScreenViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ScreenViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ScreenViewHolder(
        private val binding: ItemScreenBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(screen: Screen) {
            binding.apply {
                tvScreenName.text = screen.name
                tvLastSeen.text = screen.getFormattedLastSeen()
                
                // Estado de la pantalla
                if (screen.isActive()) {
                    tvStatus.text = root.context.getString(R.string.status_active)
                    tvStatus.background = ContextCompat.getDrawable(
                        root.context, 
                        R.drawable.status_background
                    )
                    tvStatus.isSelected = true
                } else {
                    tvStatus.text = root.context.getString(R.string.status_inactive)
                    tvStatus.background = ContextCompat.getDrawable(
                        root.context, 
                        R.drawable.status_background
                    )
                    tvStatus.isSelected = false
                }
                
                // Estado de audio
                if (screen.muted == true) {
                    ivMuteStatus.setImageResource(R.drawable.ic_volume_off)
                    ivMuteStatus.contentDescription = root.context.getString(R.string.muted)
                } else {
                    ivMuteStatus.setImageResource(R.drawable.ic_volume_up)
                    ivMuteStatus.contentDescription = root.context.getString(R.string.unmuted)
                }
                
                // Contenido actual - cargar dinámicamente
                tvCurrentContent.text = "Cargando contenido..."
                loadContentInfo(screen.id)
                
                // Click listener
                root.setOnClickListener {
                    onScreenClick(screen)
                }
            }
        }

        private fun loadContentInfo(screenId: String) {
            lifecycleScope.launch {
                try {
                    val result = repository.getAndroidTVStream(screenId, 0)
                    if (result.isSuccess) {
                        val streamResponse = result.getOrNull()
                        streamResponse?.let {
                            val currentItem = it.currentItem
                            val totalItems = it.totalItems
                            val playlistName = it.playlistName

                            if (currentItem != null) {
                                binding.tvCurrentContent.text = when {
                                    totalItems == 0 -> "⏳ Sin contenido asignado"
                                    totalItems == 1 -> "📹 1 elemento: ${currentItem.name}"
                                    else -> "📋 $totalItems elementos (${playlistName})"
                                }
                            }
                        }
                    } else {
                        // Verificar si es un error 404 (sin contenido) o un error real
                        val errorMessage = result.exceptionOrNull()?.message ?: "Error desconocido"
                        binding.tvCurrentContent.text = if (errorMessage.contains("404")) {
                            "⏳ Esperando asignación de contenido"
                        } else {
                            "❌ Error: $errorMessage"
                        }
                    }
                } catch (e: Exception) {
                    binding.tvCurrentContent.text = "⚠️ Sin conexión al servidor"
                }
            }
        }
    }

    private class ScreenDiffCallback : DiffUtil.ItemCallback<Screen>() {
        override fun areItemsTheSame(oldItem: Screen, newItem: Screen): Boolean {
            return oldItem.id == newItem.id
        }

        override fun areContentsTheSame(oldItem: Screen, newItem: Screen): Boolean {
            return oldItem == newItem
        }
    }
}
