package com.uct.tvcontentviewer

import android.app.Application
import com.uct.tvcontentviewer.data.api.RetrofitClient

class TVContentViewerApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        RetrofitClient.initialize(this)
    }
}