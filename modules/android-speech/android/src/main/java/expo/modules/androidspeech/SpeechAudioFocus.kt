package expo.modules.androidspeech

import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import android.util.Log

private const val TAG = "AndroidSpeech"

/**
 * Transient, may-duck audio focus for one stretch of speech: other apps lower
 * their volume (or the system ducks them) until it is abandoned.
 */
class SpeechAudioFocus(private val audioManager: AudioManager) {
  private val listener = AudioManager.OnAudioFocusChangeListener { change ->
    Log.i(TAG, "audio focus changed: $change")
  }

  private val request: AudioFocusRequest? =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
        .setAudioAttributes(
          AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_MEDIA)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        )
        .setOnAudioFocusChangeListener(listener)
        .build()
    } else {
      null
    }

  private var held = false

  /** True when focus was granted (or is already held). */
  @Synchronized
  fun request(): Boolean {
    if (held) {
      return true
    }
    val result = if (request != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioManager.requestAudioFocus(request)
    } else {
      @Suppress("DEPRECATION")
      audioManager.requestAudioFocus(
        listener,
        AudioManager.STREAM_MUSIC,
        AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK
      )
    }
    held = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
    Log.i(TAG, "audio focus requested (transient, may duck): granted=$held")
    return held
  }

  @Synchronized
  fun abandon() {
    if (!held) {
      return
    }
    if (request != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      audioManager.abandonAudioFocusRequest(request)
    } else {
      @Suppress("DEPRECATION")
      audioManager.abandonAudioFocus(listener)
    }
    held = false
    Log.i(TAG, "audio focus abandoned")
  }
}
