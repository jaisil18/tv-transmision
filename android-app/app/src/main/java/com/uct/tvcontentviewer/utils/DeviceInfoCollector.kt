package com.uct.tvcontentviewer.utils

import android.content.Context
import android.hardware.display.DisplayManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.wifi.WifiManager
import android.os.Build
import android.provider.Settings
import android.util.DisplayMetrics
import android.view.Display
import android.view.WindowManager
import androidx.annotation.RequiresApi
import java.net.NetworkInterface
import java.util.*

class DeviceInfoCollector(private val context: Context) {
    
    fun getDeviceInfo(): Map<String, Any> {
        return mapOf(
            "deviceModel" to getDeviceModel(),
            "manufacturer" to getManufacturer(),
            "androidVersion" to getAndroidVersion(),
            "screenResolution" to getScreenResolution(),
            "networkType" to getNetworkType(),
            "ipAddress" to getIPAddress(),
            "macAddress" to getMacAddress(),
            "deviceId" to getDeviceId(),
            "timestamp" to System.currentTimeMillis()
        )
    }
    
    private fun getDeviceModel(): String {
        return "${Build.MANUFACTURER} ${Build.MODEL}"
    }
    
    private fun getManufacturer(): String {
        return Build.MANUFACTURER
    }
    
    private fun getAndroidVersion(): String {
        return "Android ${Build.VERSION.RELEASE} (API ${Build.VERSION.SDK_INT})"
    }
    
    private fun getScreenResolution(): String {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getScreenResolutionModern()
        } else {
            getScreenResolutionLegacy()
        }
    }
    
    @RequiresApi(Build.VERSION_CODES.R)
    private fun getScreenResolutionModern(): String {
        val displayManager = context.getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val display = displayManager.getDisplay(Display.DEFAULT_DISPLAY)
        val displayMetrics = DisplayMetrics()
        display.getRealMetrics(displayMetrics)
        return "${displayMetrics.widthPixels}x${displayMetrics.heightPixels}"
    }
    
    @Suppress("DEPRECATION")
    private fun getScreenResolutionLegacy(): String {
        val windowManager = context.getSystemService(Context.WINDOW_SERVICE) as WindowManager
        val displayMetrics = DisplayMetrics()
        windowManager.defaultDisplay.getMetrics(displayMetrics)
        return "${displayMetrics.widthPixels}x${displayMetrics.heightPixels}"
    }
    
    private fun getNetworkType(): String {
        val connectivityManager = context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val network = connectivityManager.activeNetwork
            val capabilities = connectivityManager.getNetworkCapabilities(network)
            
            return when {
                capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) == true -> "WiFi"
                capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) == true -> "Cellular"
                capabilities?.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) == true -> "Ethernet"
                else -> "Unknown"
            }
        } else {
            @Suppress("DEPRECATION")
            val networkInfo = connectivityManager.activeNetworkInfo
            @Suppress("DEPRECATION")
            return networkInfo?.typeName ?: "Unknown"
        }
    }
    
    private fun getIPAddress(): String {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            for (networkInterface in interfaces) {
                val addresses = networkInterface.inetAddresses
                for (address in addresses) {
                    if (!address.isLoopbackAddress && address.hostAddress?.contains(":") == false) {
                        return address.hostAddress ?: "Unknown"
                    }
                }
            }
        } catch (e: Exception) {
            // Fallback para versiones anteriores a Android 10
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
                return getIPAddressLegacy()
            }
        }
        return "Unknown"
    }
    
    @Suppress("DEPRECATION")
    private fun getIPAddressLegacy(): String {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val ipAddress = wifiManager.connectionInfo.ipAddress
            String.format(
                Locale.getDefault(),
                "%d.%d.%d.%d",
                ipAddress and 0xff,
                ipAddress shr 8 and 0xff,
                ipAddress shr 16 and 0xff,
                ipAddress shr 24 and 0xff
            )
        } catch (ex: Exception) {
            "Unknown"
        }
    }
    
    private fun getMacAddress(): String {
        // A partir de Android 6.0 (API 23), el acceso a la dirección MAC está restringido
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            // Para Android 6.0+, la dirección MAC real no está disponible por razones de privacidad
            "02:00:00:00:00:00" // Dirección MAC aleatorizada estándar
        } else {
            getMacAddressLegacy()
        }
    }
    
    @Suppress("DEPRECATION")
    private fun getMacAddressLegacy(): String {
        return try {
            val wifiManager = context.applicationContext.getSystemService(Context.WIFI_SERVICE) as WifiManager
            val wifiInfo = wifiManager.connectionInfo
            wifiInfo.macAddress ?: "Unknown"
        } catch (e: Exception) {
            "Unknown"
        }
    }
    
    private fun getDeviceId(): String {
        return try {
            Settings.Secure.getString(context.contentResolver, Settings.Secure.ANDROID_ID)
        } catch (e: Exception) {
            "Unknown"
        }
    }
}