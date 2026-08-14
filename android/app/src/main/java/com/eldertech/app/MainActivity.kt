package com.eldertech.app

import android.content.Context
import android.content.res.Configuration
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  // "Texto en negrita" de Accesibilidad (Android 12+, Configuration.fontWeightAdjustment)
  // choca con un bug conocido, sin fix oficial, de React Native con New
  // Architecture/Fabric en Android: el texto se MIDE con el peso normal pero
  // se DIBUJA con el peso ajustado (más ancho), y lo que no entra en el
  // ancho medido se corta en vez de desbordar — confirmado con reportes
  // reales (ej. "Hola" se veía "Hol"). No depende de textBreakStrategy ni de
  // lineHeight porque no es un problema de salto de línea, es un desfasaje
  // medición-vs-dibujo. La única forma confiable de evitarlo es que la app
  // ignore ese ajuste del sistema acá, a nivel nativo — un fix en JS/OTA no
  // alcanza para esto. Ver https://github.com/facebook/react-native/issues/52895.
  override fun attachBaseContext(newBase: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      val config = Configuration(newBase.resources.configuration)
      config.fontWeightAdjustment = 0
      super.attachBaseContext(newBase.createConfigurationContext(config))
    } else {
      super.attachBaseContext(newBase)
    }
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}
