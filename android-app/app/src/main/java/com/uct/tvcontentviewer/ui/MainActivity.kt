package com.uct.tvcontentviewer.ui

import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.View
import android.widget.ImageButton
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.GridLayoutManager
import com.uct.tvcontentviewer.R
import com.uct.tvcontentviewer.data.model.Screen
import com.uct.tvcontentviewer.databinding.ActivityMainBinding
import com.uct.tvcontentviewer.ui.adapter.ScreensAdapter
import com.uct.tvcontentviewer.ui.viewmodel.MainViewModel
import com.uct.tvcontentviewer.data.api.RetrofitClient
import com.uct.tvcontentviewer.utils.EventBus

class MainActivity : AppCompatActivity() {
    
    private lateinit var binding: ActivityMainBinding
    private val viewModel: MainViewModel by viewModels()
    private lateinit var adapter: ScreensAdapter
    
    private val handler = Handler(Looper.getMainLooper())
    private var autoRefreshRunnable: Runnable? = null
    
    // Variables para orientación visual global
    private lateinit var orientationToggleButton: ImageButton
    private lateinit var sharedPreferences: SharedPreferences
    private var isGlobalVerticalRotation = false
    
    companion object {
        private const val AUTO_REFRESH_INTERVAL = 60000L // 1 minuto
        private const val PREFS_NAME = "TVContentViewerPrefs"
        private const val KEY_GLOBAL_ROTATION = "global_visual_rotation"
    }
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Eliminar esta línea, ya está inicializado en TVContentViewerApplication
        // RetrofitClient.initialize(this)
        
        setupRecyclerView()
        setupSwipeRefresh()
        setupOrientationToggle()
        initializeOrientation()
        observeViewModel()
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.title = getString(R.string.screens_title)
    }
    
    private fun setupRecyclerView() {
        adapter = ScreensAdapter({ screen ->
            openScreenDetail(screen)
        }, lifecycleScope)
        
        binding.recyclerViewScreens.apply {
            layoutManager = GridLayoutManager(this@MainActivity, 3)
            adapter = this@MainActivity.adapter
        }
    }
    
    private fun setupSwipeRefresh() {
        binding.swipeRefreshLayout.setOnRefreshListener {
            refreshAll()
        }

        // Configurar botón de actualizar con animación
        binding.btnRefresh.setOnClickListener { view ->
            // Animación de presión del botón
            view.animate()
                .scaleX(0.9f)
                .scaleY(0.9f)
                .setDuration(100)
                .withEndAction {
                    view.animate()
                        .scaleX(1.0f)
                        .scaleY(1.0f)
                        .setDuration(100)
                        .start()
                }
                .start()
            
            // Ejecutar actualización completa
            refreshAll()
        }
    }
    
    private fun refreshAll() {
        // Actualizar lista de pantallas
        viewModel.refreshScreens()
        
        // Usar EventBus para notificar actualización de playlist
        EventBus.forcePlaylistRefresh()
        
        // Mostrar mensaje de confirmación
        Toast.makeText(this, "Actualizando contenido...", Toast.LENGTH_SHORT).show()
    }
    
    private fun observeViewModel() {
        viewModel.appState.observe(this) { state ->
            binding.swipeRefreshLayout.isRefreshing = false
            
            if (state.isLoading) {
                showLoading(true)
                hideEmptyState()
            } else {
                showLoading(false)
                
                if (state.error != null) {
                    showError(state.error)
                    if (state.screens.isEmpty()) {
                        showEmptyState()
                    }
                } else {
                    if (state.screens.isEmpty()) {
                        showEmptyState()
                    } else {
                        hideEmptyState()
                        adapter.submitList(state.screens)
                    }
                }
            }
        }
    }
    
    private fun showLoading(show: Boolean) {
        binding.progressBar.visibility = if (show) View.VISIBLE else View.GONE
    }
    
    private fun showEmptyState() {
        binding.tvEmptyState.visibility = View.VISIBLE
        binding.recyclerViewScreens.visibility = View.GONE
    }
    
    private fun hideEmptyState() {
        binding.tvEmptyState.visibility = View.GONE
        binding.recyclerViewScreens.visibility = View.VISIBLE
    }
    
    private fun showError(error: String) {
        Toast.makeText(this, error, Toast.LENGTH_LONG).show()
    }
    
    private fun startAutoRefresh() {
        stopAutoRefresh() // Detener cualquier refresh anterior

        autoRefreshRunnable = Runnable {
            // Actualizar la lista de pantallas para detectar cambios en contenido
            viewModel.refreshScreens()

            // Programar la siguiente actualización
            startAutoRefresh()
        }

        handler.postDelayed(autoRefreshRunnable!!, AUTO_REFRESH_INTERVAL)
    }

    private fun stopAutoRefresh() {
        autoRefreshRunnable?.let { runnable ->
            handler.removeCallbacks(runnable)
            autoRefreshRunnable = null
        }
    }

    override fun onResume() {
        super.onResume()
        startAutoRefresh()
    }

    override fun onPause() {
        super.onPause()
        stopAutoRefresh()
    }

    private fun setupOrientationToggle() {
        orientationToggleButton = binding.orientationToggleButton
        sharedPreferences = getSharedPreferences(PREFS_NAME, MODE_PRIVATE)
        
        orientationToggleButton.setOnClickListener {
            toggleOrientation()
        }
    }
    
    private fun initializeOrientation() {
        // Leer preferencia guardada para rotación visual global
        isGlobalVerticalRotation = sharedPreferences.getBoolean(KEY_GLOBAL_ROTATION, false)
        
        // Mantener orientación landscape fija
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        
        // Aplicar transformación visual global
        applyGlobalVisualRotation()
        
        // Actualizar icono del botón
        updateOrientationIcon()
    }
    
    private fun toggleOrientation() {
        isGlobalVerticalRotation = !isGlobalVerticalRotation
        
        // Guardar preferencia
        sharedPreferences.edit()
            .putBoolean(KEY_GLOBAL_ROTATION, isGlobalVerticalRotation)
            .apply()
        
        // Aplicar nueva transformación visual global
        applyGlobalVisualRotation()
        
        // Actualizar icono
        updateOrientationIcon()
        
        // Mostrar mensaje
        val message = if (isGlobalVerticalRotation) {
            "Vista rotada a vertical (simulada)"
        } else {
            "Vista en horizontal normal"
        }
        Toast.makeText(this, message, Toast.LENGTH_SHORT).show()
    }
    
    private fun applyGlobalVisualRotation() {
        val rootView = binding.root
        
        if (isGlobalVerticalRotation) {
            // Aplicar rotación de 90° con escalado apropiado para evitar expansión
            val displayMetrics = resources.displayMetrics
            val screenWidth = displayMetrics.widthPixels.toFloat()
            val screenHeight = displayMetrics.heightPixels.toFloat()
            
            // Calcular el centro de la pantalla para el pivot
            val pivotX = screenWidth / 2f
            val pivotY = screenHeight / 2f
            
            // Calcular factor de escala para que el contenido rotado encaje en la pantalla
            // Cuando rotamos 90°, el ancho se convierte en alto y viceversa
            // Necesitamos escalar para que el contenido rotado no se salga de los límites
            val scaleFactorX = screenHeight / screenWidth  // Nuevo ancho disponible / ancho original
            val scaleFactorY = screenWidth / screenHeight   // Nuevo alto disponible / alto original
            
            // Usar el menor factor de escala para asegurar que todo encaje
            val scaleFactor = minOf(scaleFactorX, scaleFactorY) * 0.85f // 0.85f para margen de seguridad
            
            rootView.apply {
                // Rotar 90° en sentido horario
                rotation = 90f
                this.pivotX = pivotX
                this.pivotY = pivotY
                
                // Aplicar escalado para evitar expansión
                scaleX = scaleFactor
                scaleY = scaleFactor
                
                // Sin traslación adicional (el pivot se encarga del centrado)
                translationX = 0f
                translationY = 0f
            }
            
        } else {
            // Resetear transformaciones para vista horizontal normal
            rootView.apply {
                rotation = 0f
                scaleX = 1f
                scaleY = 1f
                translationX = 0f
                translationY = 0f
                pivotX = width / 2f
                pivotY = height / 2f
            }
        }
    }
    
    private fun updateOrientationIcon() {
        val iconRes = if (isGlobalVerticalRotation) {
            R.drawable.ic_orientation_horizontal // Muestra el icono de la orientación a la que cambiará
        } else {
            R.drawable.ic_orientation_vertical
        }
        orientationToggleButton.setImageResource(iconRes)
    }

    private fun openScreenDetail(screen: Screen) {
        // Ir directamente al reproductor Android para todas las pantallas
        val intent = Intent(this, AndroidPlayerActivity::class.java).apply {
            putExtra(AndroidPlayerActivity.EXTRA_SCREEN_ID, screen.id)
            putExtra(AndroidPlayerActivity.EXTRA_SCREEN_NAME, screen.name)
        }
        startActivity(intent)
    }
}
