package expo.modules.androidspeech

import android.content.Context
import android.media.AudioManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Sent when another app takes audio focus for good while speech holds it. */
const val AUDIO_FOCUS_LOST_EVENT = "onAudioFocusLost"

/**
 * What expo-speech leaves out on Android: audio focus while speaking, so other
 * apps duck as they do under iOS's duck-others session (and speech stops when
 * another app takes focus for good), and whether each voice is installed and
 * works offline.
 */
class AndroidSpeechModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val focus by lazy {
    SpeechAudioFocus(context.getSystemService(Context.AUDIO_SERVICE) as AudioManager) {
      sendEvent(AUDIO_FOCUS_LOST_EVENT)
    }
  }

  override fun definition() = ModuleDefinition {
    Name("AndroidSpeech")

    Events(AUDIO_FOCUS_LOST_EVENT)

    AsyncFunction("requestDuckingFocus") {
      focus.request()
    }

    AsyncFunction("abandonFocus") {
      focus.abandon()
    }

    AsyncFunction("getVoiceDetails") { promise: Promise ->
      VoiceDetails.load(context) { details -> promise.resolve(details) }
    }

    OnDestroy {
      focus.abandon()
    }
  }
}
