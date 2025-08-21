package com.uct.tvcontentviewer.ui

import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.ActivityInfo
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import com.uct.tvcontentviewer.databinding.ActivityScreenDetailBinding
import com.uct.tvcontentviewer.ui.viewmodel.ScreenDetailViewModel

class ScreenDetailActivity : AppCompatActivity() {
    
    companion object {
        const val EXTRA_SCREEN_ID = "SCREEN_ID"
        const val EXTRA_SCREEN_NAME = "SCREEN_NAME"
    }
    
    private lateinit var binding: ActivityScreenDetailBinding
    private val viewModel: ScreenDetailViewModel by viewModels()
    private var screenId: String = ""
    private var screenName: String = ""
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityScreenDetailBinding.inflate(layoutInflater)
        setContentView(binding.root)
        
        // Aplicar orientación global
        applyGlobalOrientation()
        
        getIntentData()
        setupToolbar()
        setupButtons()
        observeViewModel()
        
        viewModel.loadScreenDetail(screenId)
    }
    
    private fun getIntentData() {
        screenId = intent.getStringExtra(EXTRA_SCREEN_ID) ?: ""
        screenName = intent.getStringExtra(EXTRA_SCREEN_NAME) ?: ""
        
        if (screenId.isEmpty()) {
            Toast.makeText(this, "Error: ID de pantalla no válido", Toast.LENGTH_SHORT).show()
            finish()
        }
    }
    
    private fun setupToolbar() {
        setSupportActionBar(binding.toolbar)
        supportActionBar?.apply {
            title = screenName
            setDisplayHomeAsUpEnabled(true)
        }
        
        binding.toolbar.setNavigationOnClickListener {
            onBackPressedDispatcher.onBackPressed()
        }
    }
    
    private fun setupButtons() {
        binding.btnPlayContent.setOnClickListener {
            val intent = Intent(this, TVPlayerActivity::class.java).apply {
                putExtra(TVPlayerActivity.EXTRA_SCREEN_ID, screenId)
                putExtra(TVPlayerActivity.EXTRA_SCREEN_NAME, screenName)
            }
            startActivity(intent)
        }
    }
    
    private fun observeViewModel() {
        viewModel.screenState.observe(this) { state ->
            if (state.isLoading) {
                binding.progressBar.visibility = View.VISIBLE
                binding.errorText.visibility = View.GONE
            } else {
                binding.progressBar.visibility = View.GONE
                
                if (state.error != null) {
                    binding.errorText.text = state.error
                    binding.errorText.visibility = View.VISIBLE
                } else {
                    binding.errorText.visibility = View.GONE
                    
                    state.playlist?.let { playlist ->
                        binding.playlistInfo.text = "${playlist.name} (${playlist.items.size} videos)"
                        binding.playlistInfo.visibility = View.VISIBLE
                    }
                }
            }
        }
    }
    
    private fun applyGlobalOrientation() {
        val sharedPreferences: SharedPreferences = getSharedPreferences("TVContentViewerPrefs", MODE_PRIVATE)
        val isVertical = sharedPreferences.getBoolean("orientation_vertical", false)
        
        requestedOrientation = if (isVertical) {
            ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else {
            ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE
        }
    }
}
