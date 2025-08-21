package com.uct.tvcontentviewer.data.api

import android.content.Context
import android.util.Log
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    private const val TAG = "RetrofitClient"
    private var retrofit: Retrofit? = null
    private var context: Context? = null
    
    fun initialize(appContext: Context) {
        context = appContext.applicationContext
        Log.d(TAG, "RetrofitClient inicializado")
    }
    
    private fun getRetrofit(): Retrofit {
        if (retrofit == null) {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            
            val client = OkHttpClient.Builder()
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(30, TimeUnit.SECONDS)
                .writeTimeout(30, TimeUnit.SECONDS)
                .build()
            
            retrofit = Retrofit.Builder()
                .baseUrl(ApiConfig.PRIMARY_BASE_URL)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
        }
        return retrofit!!
    }
    
    fun getApiService(): ApiService {
        return getRetrofit().create(ApiService::class.java)
    }
    
    fun updateBaseUrl(newBaseUrl: String) {
        Log.d(TAG, "Actualizando URL base a: $newBaseUrl")
        
        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }
        
        val client = OkHttpClient.Builder()
            .addInterceptor(logging)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
        
        retrofit = Retrofit.Builder()
            .baseUrl(if (newBaseUrl.endsWith("/")) newBaseUrl else "$newBaseUrl/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }
    
    fun switchToFallback() {
        Log.w(TAG, "Cambiando a URL de respaldo: ${ApiConfig.FALLBACK_BASE_URL}")
        updateBaseUrl(ApiConfig.FALLBACK_BASE_URL)
    }
    
    fun switchToPrimary() {
        Log.i(TAG, "Cambiando a URL primaria: ${ApiConfig.PRIMARY_BASE_URL}")
        updateBaseUrl(ApiConfig.PRIMARY_BASE_URL)
    }
}
