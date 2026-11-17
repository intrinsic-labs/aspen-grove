package expo.modules.androidspeech

import android.content.Context
import android.speech.tts.TextToSpeech
import android.util.Log

private const val TAG = "AndroidSpeech"

/**
 * Reads the default TTS engine's voices (the engine expo-speech speaks with)
 * with what expo-speech drops: whether the voice's data is installed, whether
 * it needs the network, and its raw quality (100 very low to 500 very high).
 */
object VoiceDetails {
  fun load(context: Context, onLoaded: (List<Map<String, Any>>) -> Unit) {
    var tts: TextToSpeech? = null
    tts = TextToSpeech(context) { status ->
      val engine = tts
      val details = if (status == TextToSpeech.SUCCESS && engine != null) {
        read(engine)
      } else {
        emptyList()
      }
      engine?.shutdown()
      Log.i(TAG, "voice details: ${details.size} voices")
      onLoaded(details)
    }
  }

  private fun read(engine: TextToSpeech): List<Map<String, Any>> =
    try {
      engine.voices.orEmpty().map { voice ->
        mapOf(
          "name" to voice.name,
          "quality" to voice.quality,
          "requiresNetwork" to voice.isNetworkConnectionRequired,
          "installed" to
            !voice.features.orEmpty().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)
        )
      }
    } catch (error: Exception) {
      Log.w(TAG, "could not read voices", error)
      emptyList()
    }
}
