package com.example.engine

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFormat
import android.media.AudioTrack
import android.speech.tts.TextToSpeech
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.Locale
import kotlin.math.PI
import kotlin.math.sin
import kotlin.random.Random

data class LevelTrackConfig(
    val level: Int,
    val title: String,
    val bpm: Int,
    val leadWave: String,
    val bassWave: String,
    val lead: List<Float>,
    val bass: List<Float>,
    val perc: List<Int>
)

object SoundEngine {
    private const val SAMPLE_RATE = 22050
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    @Volatile private var muted = false
    @Volatile private var bgmEnabled = true
    @Volatile private var suspended = false
    @Volatile private var duckUntilMs = 0L

    private var activeLevel = 1
    private var customTrack: LevelTrackConfig? = null
    private var bgmJob: Job? = null
    private var bgmStep = 0
    private var lastUiHoverMs = 0L
    private var tts: TextToSpeech? = null
    private var ttsReady = false

    val LEVEL_TRACKS: Map<Int, LevelTrackConfig> = mapOf(
        1 to LevelTrackConfig(
            1, "Dawn Village Breeze", 118, "triangle", "sine",
            listOf(261.63f, 329.63f, 392f, 523.25f, 440f, 392f, 329.63f, 293.66f, 261.63f, 329.63f, 392f, 440f, 523.25f, 440f, 392f, 329.63f),
            listOf(130.81f, 0f, 130.81f, 164.81f, 196f, 0f, 146.83f, 164.81f, 130.81f, 0f, 174.61f, 0f, 196f, 0f, 146.83f, 0f),
            listOf(1, 0, 2, 0, 1, 0, 2, 1, 1, 0, 2, 0, 1, 2, 1, 2)
        ),
        2 to LevelTrackConfig(
            2, "Storm Bridge Pulse", 136, "square", "triangle",
            listOf(220f, 261.63f, 329.63f, 440f, 392f, 349.23f, 329.63f, 293.66f, 220f, 293.66f, 349.23f, 440f, 493.88f, 440f, 392f, 329.63f),
            listOf(110f, 110f, 0f, 146.83f, 164.81f, 0f, 130.81f, 146.83f, 110f, 110f, 0f, 174.61f, 196f, 0f, 164.81f, 146.83f),
            listOf(1, 2, 1, 2, 1, 0, 1, 2, 1, 2, 1, 2, 1, 2, 1, 1)
        ),
        3 to LevelTrackConfig(
            3, "Menara Kala — Three Shadows", 150, "sawtooth", "sawtooth",
            listOf(196f, 207.65f, 293.66f, 392f, 369.99f, 311.13f, 293.66f, 233.08f, 196f, 261.63f, 311.13f, 392f, 466.16f, 415.3f, 392f, 293.66f),
            listOf(98f, 98f, 130.81f, 98f, 116.54f, 98f, 146.83f, 130.81f, 98f, 98f, 155.56f, 130.81f, 146.83f, 116.54f, 98f, 87.31f),
            listOf(1, 2, 1, 1, 1, 2, 1, 2, 1, 2, 1, 1, 1, 2, 1, 2)
        )
    )

    fun initTts(context: Context) {
        if (tts != null) return
        tts = TextToSpeech(context.applicationContext) { status ->
            ttsReady = status == TextToSpeech.SUCCESS
        }
    }

    fun speakText(text: String, langCode: String = "id", pitch: Float = 1f, rate: Float = 1f) {
        if (muted || !ttsReady) return
        val engine = tts ?: return
        engine.language = Locale.forLanguageTag(if (langCode == "id") "id-ID" else langCode)
        engine.setPitch(pitch.coerceIn(0.6f, 1.6f))
        engine.setSpeechRate(rate.coerceIn(0.6f, 1.6f))
        engine.speak(text, TextToSpeech.QUEUE_FLUSH, null, "mungil_dub_${System.currentTimeMillis()}")
    }

    fun getTrackConfig(level: Int): LevelTrackConfig = LEVEL_TRACKS[level.coerceIn(1, 3)] ?: LEVEL_TRACKS.getValue(1)

    fun setMuted(value: Boolean) {
        muted = value
        if (value) stopTracker()
    }

    fun isMuted(): Boolean = muted

    fun setBgmEnabled(enabled: Boolean) {
        bgmEnabled = enabled
        if (!enabled) stopTracker()
    }

    fun suspend() {
        suspended = true
        stopTracker()
    }

    fun resume() {
        suspended = false
    }

    fun startTracker(level: Int) {
        val clamped = level.coerceIn(1, 3)
        val changed = activeLevel != clamped
        activeLevel = clamped
        customTrack = null
        if (muted || !bgmEnabled || suspended) return
        if (changed) stopTracker()
        if (bgmJob?.isActive == true) return
        launchTrackerLoop()
    }

    fun playCustomTrack(spec: GeneratedTrackSpec) {
        stopTracker()
        customTrack = LevelTrackConfig(
            level = 1,
            title = spec.title,
            bpm = spec.bpm,
            leadWave = when (spec.scale) {
                "phrygian" -> "sawtooth"
                "dorian" -> "square"
                else -> "triangle"
            },
            bassWave = "triangle",
            lead = spec.leadNotes,
            bass = spec.bassNotes,
            perc = spec.percHits
        )
        if (!muted && bgmEnabled && !suspended) {
            launchTrackerLoop()
        }
    }

    fun stopTracker() {
        bgmJob?.cancel()
        bgmJob = null
    }

    private fun launchTrackerLoop() {
        bgmStep = 0
        bgmJob = scope.launch {
            while (isActive) {
                if (muted || !bgmEnabled || suspended) break
                val track = customTrack ?: getTrackConfig(activeLevel)
                val idx = bgmStep % track.lead.size
                val nowMs = System.currentTimeMillis()
                val duck = if (nowMs < duckUntilMs) 0.35f else 1f

                val leadFreq = track.lead[idx]
                val bassFreq = track.bass[idx % track.bass.size]
                val percCode = track.perc[idx % track.perc.size]
                playMixedStep(leadFreq, track.leadWave, bassFreq, track.bassWave, percCode, duck)

                bgmStep = (bgmStep + 1) % track.lead.size
                val stepMs = maxOf(115L, ((60_000f / track.bpm) / 2f).toLong())
                delay(stepMs)
            }
        }
    }

    private fun playMixedStep(
        leadFreq: Float,
        leadWave: String,
        bassFreq: Float,
        bassWave: String,
        percCode: Int,
        duck: Float
    ) {
        val durSec = 0.16f
        val samples = (SAMPLE_RATE * durSec).toInt()
        val pcm = ShortArray(samples)
        var leadPhase = 0f
        var bassPhase = 0f
        var kickPhase = 0f
        var hatPhase = 0f
        for (i in 0 until samples) {
            val t = i.toFloat() / samples
            val env = (1f - t) * (1f - t)
            var v = 0f
            if (leadFreq > 0f) {
                leadPhase += leadFreq / SAMPLE_RATE
                v += waveSample(leadWave, leadPhase) * 0.09f * env * duck
            }
            if (bassFreq > 0f) {
                bassPhase += bassFreq / SAMPLE_RATE
                v += waveSample(bassWave, bassPhase) * 0.10f * env * duck
            }
            if (percCode == 1 && t < 0.45f) {
                val f = 115f * (1f - t * 1.4f).coerceAtLeast(0.35f)
                kickPhase += f / SAMPLE_RATE
                v += waveSample("sine", kickPhase) * 0.11f * (1f - t * 2f).coerceAtLeast(0f) * duck
            } else if (percCode == 2 && t < 0.22f) {
                val f = 980f - 520f * t
                hatPhase += f / SAMPLE_RATE
                v += waveSample("triangle", hatPhase) * 0.05f * (1f - t * 4f).coerceAtLeast(0f) * duck
            }
            pcm[i] = (v.coerceIn(-0.95f, 0.95f) * Short.MAX_VALUE).toInt().toShort()
        }
        writePcmStatic(pcm)
    }

    fun playCustomSfx(spec: GeneratedSfxSpec) {
        if (muted || suspended) return
        scope.launch {
            playTone(
                startFreq = spec.freqStart.coerceAtLeast(40f),
                endFreq = spec.freqEnd.coerceAtLeast(35f),
                durationSec = spec.durationSec.coerceIn(0.03f, 0.5f),
                wave = spec.wave,
                volume = spec.volume.coerceIn(0.05f, 0.35f)
            )
        }
    }

    fun playSfx(kind: String, panOffsetX: Float = 0f) {
        if (muted || suspended) return
        val nowMs = System.currentTimeMillis()
        if (kind == "ui_hover") {
            if (nowMs - lastUiHoverMs < 70L) return
            lastUiHoverMs = nowMs
        }
        val isUi = kind.startsWith("ui_")
        if (!isUi && kind != "footstep") {
            duckUntilMs = nowMs + 240L
        }
        val jitter = if (isUi) 1f else 0.92f + Random.nextFloat() * 0.16f
        val atten = if (isUi) 1f else (1f - (kotlin.math.abs(panOffsetX) / 480f).coerceIn(0f, 1f) * 0.55f).coerceAtLeast(0.35f)

        scope.launch {
            when (kind) {
                "footstep" -> playTone(145f * jitter, 82f * jitter, 0.045f, "triangle", 0.09f * atten)
                "land" -> playTone(135f * jitter, 58f * jitter, 0.08f, "sine", 0.14f * atten)
                "jump" -> playTone(310f * jitter, 560f * jitter, 0.11f, "triangle", 0.18f * atten)
                "dash" -> playTone(540f * jitter, 210f * jitter, 0.12f, "triangle", 0.16f * atten)
                "attack" -> playTone(420f * jitter, 190f * jitter, 0.09f, "square", 0.14f * atten)
                "hit" -> playTone(190f * jitter, 85f * jitter, 0.11f, "sawtooth", 0.20f * atten)
                "parry" -> playTone(760f * jitter, 1180f * jitter, 0.16f, "triangle", 0.22f * atten)
                "potion" -> {
                    playTone(440f, 880f, 0.14f, "sine", 0.18f)
                    delay(50)
                    playTone(660f, 1180f, 0.13f, "triangle", 0.14f)
                }
                "coin" -> playTone(680f * jitter, 1020f * jitter, 0.10f, "sine", 0.18f * atten)
                "shard" -> playTone(520f * jitter, 1040f * jitter, 0.20f, "triangle", 0.22f * atten)
                "switch" -> playTone(380f * jitter, 620f * jitter, 0.14f, "square", 0.16f * atten)
                "gate" -> playTone(280f * jitter, 740f * jitter, 0.25f, "triangle", 0.22f * atten)
                "burst" -> playTone(220f * jitter, 880f * jitter, 0.24f, "sawtooth", 0.22f * atten)
                "hurt" -> playTone(170f * jitter, 75f * jitter, 0.16f, "sawtooth", 0.22f * atten)
                "boss_phase" -> {
                    playTone(130f, 260f, 0.24f, "sawtooth", 0.22f)
                    delay(70)
                    playTone(196f, 392f, 0.20f, "square", 0.14f)
                }
                "level_clear" -> {
                    playTone(392f, 523.25f, 0.13f, "triangle", 0.20f)
                    delay(90)
                    playTone(523.25f, 659.25f, 0.15f, "triangle", 0.20f)
                    delay(90)
                    playTone(659.25f, 783.99f, 0.20f, "triangle", 0.22f)
                }
                "victory" -> {
                    playTone(523.25f, 587.33f, 0.13f, "triangle", 0.22f)
                    delay(100)
                    playTone(659.25f, 783.99f, 0.14f, "triangle", 0.22f)
                    delay(100)
                    playTone(783.99f, 1046.5f, 0.26f, "triangle", 0.24f)
                }
                "gameover" -> {
                    playTone(293.66f, 220f, 0.16f, "sawtooth", 0.20f)
                    delay(130)
                    playTone(220f, 146.83f, 0.20f, "sawtooth", 0.20f)
                    delay(130)
                    playTone(146.83f, 88f, 0.28f, "triangle", 0.18f)
                }
                "ui_tab" -> playTone(480f, 680f, 0.05f, "triangle", 0.11f)
                "ui_toggle" -> playTone(420f, 620f, 0.045f, "sine", 0.11f)
                "ui_error" -> playTone(210f, 140f, 0.11f, "square", 0.13f)
                else -> playTone(620f, 440f, 0.04f, "sine", 0.11f)
            }
        }
    }

    private fun playTone(
        startFreq: Float,
        endFreq: Float,
        durationSec: Float,
        wave: String,
        volume: Float
    ) {
        val count = (SAMPLE_RATE * durationSec).toInt().coerceAtLeast(256)
        val pcm = ShortArray(count)
        var phase = 0f
        for (i in 0 until count) {
            val t = i.toFloat() / count
            val freq = startFreq + (endFreq - startFreq) * t
            phase += freq / SAMPLE_RATE
            val env = (1f - t) * (1f - t)
            val s = waveSample(wave, phase) * volume * env
            pcm[i] = (s.coerceIn(-0.95f, 0.95f) * Short.MAX_VALUE).toInt().toShort()
        }
        writePcmStatic(pcm)
    }

    private fun waveSample(wave: String, phase: Float): Float {
        val p = phase - kotlin.math.floor(phase)
        return when (wave) {
            "square" -> if (p < 0.5f) 0.85f else -0.85f
            "sawtooth" -> (2f * p - 1f) * 0.8f
            "triangle" -> 1f - 4f * kotlin.math.abs(p - 0.5f)
            else -> sin(p * 2f * PI.toFloat())
        }
    }

    private fun writePcmStatic(pcm: ShortArray) {
        try {
            val byteSize = pcm.size * 2
            val track = AudioTrack.Builder()
                .setAudioAttributes(
                    AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_GAME)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build()
                )
                .setAudioFormat(
                    AudioFormat.Builder()
                        .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                        .setSampleRate(SAMPLE_RATE)
                        .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                        .build()
                )
                .setBufferSizeInBytes(byteSize)
                .setTransferMode(AudioTrack.MODE_STATIC)
                .build()
            track.write(pcm, 0, pcm.size)
            track.play()
            scope.launch {
                delay((pcm.size * 1000L / SAMPLE_RATE) + 40L)
                try {
                    track.stop()
                    track.release()
                } catch (_: Throwable) {}
            }
        } catch (_: Throwable) {
            // AudioTrack unavailable on headless JVM unit test environment
        }
    }
}
