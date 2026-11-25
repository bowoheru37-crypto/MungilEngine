package com.example.engine

import android.content.Context
import android.content.SharedPreferences
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

class StorageRepository(context: Context) {
    private val prefs: SharedPreferences = context.getSharedPreferences("mungil_v7_prefs", Context.MODE_PRIVATE)
    private val json = Json { ignoreUnknownKeys = true; encodeDefaults = true }

    companion object {
        private const val KEY_SAVE_PREFIX = "mungil_v7_save_"
        private const val KEY_TOUCH = "mungil_v7_touch"
        private const val KEY_ANALYTICS = "mungil_v7_analytics"
        private const val KEY_AUTH = "mungil_v7_auth"
        private const val KEY_PIXEL_GRID = "mungil_v7_pixel_grid"
        private const val KEY_TILEMAP = "mungil_v7_tilemap"
        private const val KEY_EVENT_RULES = "mungil_v7_event_rules"
        private const val KEY_WIZARD_GAMES = "mungil_v7_wizard_games"
    }

    private fun nowIso(): String = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US).format(Date())

    fun buildSavePayload(
        slotId: String,
        gameTitle: String,
        level: Int,
        hp: Int,
        energy: Int,
        coins: Int,
        shards: Int,
        score: Int,
        kills: Int,
        potions: Int,
        styleId: ArtStyleId,
        worldState: WorldSaveProgress? = null
    ): SaveSlotData {
        val clampedLevel = level.coerceIn(1, 3)
        val clampedHp = hp.coerceIn(0, 100)
        val clampedEnergy = energy.coerceIn(0, 100)
        val clampedCoins = coins.coerceIn(0, 9999)
        val clampedShards = shards.coerceIn(0, 7)
        val clampedPotions = potions.coerceIn(0, 9)
        val raw = SaveSlotData(
            version = "7.0.0",
            slotId = slotId,
            updatedAt = nowIso(),
            gameTitle = gameTitle.take(64).ifBlank { "Bowo: Penjaga Cahaya" },
            level = clampedLevel,
            hp = clampedHp,
            energy = clampedEnergy,
            coins = clampedCoins,
            shards = clampedShards,
            score = score.coerceAtLeast(0),
            kills = kills.coerceAtLeast(0),
            potions = clampedPotions,
            styleId = styleId.id,
            checksum = "",
            worldState = worldState
        )
        val sum = BytecodeVm.computeChecksum("${raw.version}|${raw.slotId}|${raw.level}|${raw.hp}|${raw.coins}|${raw.shards}|${raw.score}")
        return raw.copy(checksum = sum)
    }

    data class ParsedSaveResult(
        val data: SaveSlotData,
        val migrated: Boolean,
        val checksumValid: Boolean
    )

    fun parseAndMigrateSave(rawJson: String, fallbackSlotId: String = "1"): ParsedSaveResult {
        val obj = Json.parseToJsonElement(rawJson).jsonObject
        val ver = obj["version"]?.jsonPrimitive?.content ?: "6.1.0"
        val migrated = !ver.startsWith("7.")
        if (migrated) {
            val chapter = (obj["chapter"]?.jsonPrimitive?.intOrNull ?: obj["level"]?.jsonPrimitive?.intOrNull ?: 1).coerceIn(1, 3)
            val hp = (obj["hp"]?.jsonPrimitive?.intOrNull ?: 100).coerceIn(0, 100)
            val coins = (obj["coins"]?.jsonPrimitive?.intOrNull ?: 0).coerceIn(0, 9999)
            val shards = (obj["shards"]?.jsonPrimitive?.intOrNull ?: 0).coerceIn(0, 7)
            val score = (obj["score"]?.jsonPrimitive?.intOrNull ?: 0).coerceAtLeast(0)
            val converted = buildSavePayload(
                slotId = fallbackSlotId,
                gameTitle = "Bowo: Penjaga Cahaya",
                level = chapter,
                hp = hp,
                energy = 100,
                coins = coins,
                shards = shards,
                score = score,
                kills = 0,
                potions = 2,
                styleId = ArtStyleId.PIXEL
            )
            return ParsedSaveResult(converted, migrated = true, checksumValid = true)
        }
        val decoded = json.decodeFromString<SaveSlotData>(rawJson)
        val expected = BytecodeVm.computeChecksum("${decoded.version}|${decoded.slotId}|${decoded.level}|${decoded.hp}|${decoded.coins}|${decoded.shards}|${decoded.score}")
        val valid = decoded.checksum == expected
        val clamped = decoded.copy(
            level = decoded.level.coerceIn(1, 3),
            hp = decoded.hp.coerceIn(0, 100),
            energy = decoded.energy.coerceIn(0, 100),
            coins = decoded.coins.coerceIn(0, 9999),
            shards = decoded.shards.coerceIn(0, 7),
            potions = decoded.potions.coerceIn(0, 9),
            score = decoded.score.coerceAtLeast(0)
        )
        return ParsedSaveResult(clamped, migrated = false, checksumValid = valid)
    }

    fun saveSlotLocal(slotId: String, payload: SaveSlotData): Pair<Boolean, Int> {
        val text = json.encodeToString(payload)
        prefs.edit().putString("$KEY_SAVE_PREFIX$slotId", text).apply()
        return true to text.encodeToByteArray().size
    }

    fun loadSlotLocal(slotId: String): ParsedSaveResult? {
        val raw = prefs.getString("$KEY_SAVE_PREFIX$slotId", null) ?: return null
        return try {
            parseAndMigrateSave(raw, slotId)
        } catch (_: Throwable) {
            null
        }
    }

    fun deleteSlotLocal(slotId: String) {
        prefs.edit().remove("$KEY_SAVE_PREFIX$slotId").apply()
    }

    fun exportSlotJson(slotId: String): String? = prefs.getString("$KEY_SAVE_PREFIX$slotId", null)

    fun listSaveSummaries(): List<SaveSlotSummary> = listOf("auto", "1", "2", "3").map { id ->
        val loaded = loadSlotLocal(id)
        if (loaded == null) {
            SaveSlotSummary(id = id, exists = false)
        } else {
            val d = loaded.data
            SaveSlotSummary(
                id = id,
                exists = true,
                updatedAt = d.updatedAt,
                level = d.level,
                hp = d.hp,
                score = d.score,
                coins = d.coins,
                gameTitle = d.gameTitle
            )
        }
    }

    fun getLatestSaveSlot(): SaveSlotSummary? {
        return listSaveSummaries().filter { it.exists }.maxByOrNull { it.updatedAt }
    }

    fun loadTouchConfig(): TouchControlConfig {
        val raw = prefs.getString(KEY_TOUCH, null) ?: return TouchControlConfig()
        return try {
            json.decodeFromString(raw)
        } catch (_: Throwable) {
            TouchControlConfig()
        }
    }

    fun saveTouchConfig(cfg: TouchControlConfig) {
        prefs.edit().putString(KEY_TOUCH, json.encodeToString(cfg)).apply()
    }

    fun loadAnalytics(): AnalyticsSummary {
        val raw = prefs.getString(KEY_ANALYTICS, null) ?: return AnalyticsSummary()
        return try {
            json.decodeFromString(raw)
        } catch (_: Throwable) {
            AnalyticsSummary()
        }
    }

    fun saveAnalytics(summary: AnalyticsSummary) {
        prefs.edit().putString(KEY_ANALYTICS, json.encodeToString(summary)).apply()
    }

    fun loadAuthProfile(): AuthProfile {
        val raw = prefs.getString(KEY_AUTH, null) ?: return AuthProfile()
        return try {
            json.decodeFromString(raw)
        } catch (_: Throwable) {
            AuthProfile()
        }
    }

    fun saveAuthProfile(profile: AuthProfile) {
        prefs.edit().putString(KEY_AUTH, json.encodeToString(profile)).apply()
    }

    fun loadEventRules(): List<EventRuleSpec> {
        val raw = prefs.getString(KEY_EVENT_RULES, null)
        if (raw != null) {
            try {
                return json.decodeFromString(raw)
            } catch (_: Throwable) {}
        }
        return listOf(
            EventRuleSpec("r1", "shard_collect", "score_100", true),
            EventRuleSpec("r2", "enemy_defeated", "heal_10", true),
            EventRuleSpec("r3", "switch_activated", "play_gate", true)
        )
    }

    fun saveEventRules(rules: List<EventRuleSpec>) {
        prefs.edit().putString(KEY_EVENT_RULES, json.encodeToString(rules)).apply()
    }

    fun loadWizardGames(): List<WizardGameSpec> {
        val raw = prefs.getString(KEY_WIZARD_GAMES, null)
        if (raw != null) {
            try {
                val list = json.decodeFromString<List<WizardGameSpec>>(raw)
                if (list.isNotEmpty()) return list
            } catch (_: Throwable) {}
        }
        return AiMcpAgent.STARTER_WIZARD_GAMES
    }

    fun saveWizardGames(games: List<WizardGameSpec>) {
        prefs.edit().putString(KEY_WIZARD_GAMES, json.encodeToString(games)).apply()
    }

    fun loadPixelGrid(size: Int = 16): List<Int> {
        val raw = prefs.getString(KEY_PIXEL_GRID, null)
        if (raw != null) {
            val parts = raw.split(",").mapNotNull { it.toIntOrNull() }
            if (parts.size == size * size) return parts
        }
        return List(size * size) { idx ->
            val x = idx % size
            val y = idx / size
            if (x in 5..10 && y in 4..11) 1 else 0
        }
    }

    fun savePixelGrid(grid: List<Int>) {
        prefs.edit().putString(KEY_PIXEL_GRID, grid.joinToString(",")).apply()
    }

    fun loadTilemap(): List<Int> {
        val raw = prefs.getString(KEY_TILEMAP, null)
        if (raw != null) {
            val parts = raw.split(",").mapNotNull { it.toIntOrNull() }
            if (parts.size == 12 * 8) return parts
        }
        return List(12 * 8) { idx ->
            val y = idx / 12
            val x = idx % 12
            when {
                y == 7 -> 1
                y == 5 && x in 3..5 -> 2
                y == 6 && x == 9 -> 3
                else -> 0
            }
        }
    }

    fun saveTilemap(tiles: List<Int>) {
        prefs.edit().putString(KEY_TILEMAP, tiles.joinToString(",")).apply()
    }
}
