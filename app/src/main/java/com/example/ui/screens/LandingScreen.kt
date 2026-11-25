package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Tune
import androidx.compose.material.icons.filled.Terminal
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.canvas.GameCanvasRenderers
import kotlinx.coroutines.delay
import kotlin.math.sin

private val DEMO_POSES = listOf(
    CharacterAnimState.IDLE,
    CharacterAnimState.WALK,
    CharacterAnimState.JUMP,
    CharacterAnimState.ATTACK,
    CharacterAnimState.DASH
)

@Composable
fun LandingScreen(
    state: AppUiState,
    onSelectLevel: (Int) -> Unit,
    onStartPlay: () -> Unit,
    onContinueSaved: () -> Unit,
    onOpenTitleStage: () -> Unit,
    onOpenStudioTab: (StudioTab) -> Unit,
    onChangeLanguage: (LanguageCode) -> Unit,
    onToggleTheme: () -> Unit,
    onToggleMute: () -> Unit
) {
    val tr = I18n.t(state.lang)
    var preview3D by remember { mutableStateOf(true) }
    var poseIdx by remember { mutableIntStateOf(0) }
    var animTime by remember { mutableFloatStateOf(0f) }

    LaunchedEffect(Unit) {
        while (true) {
            delay(65L)
            animTime += 0.065f
        }
    }

    val style = remember(state.styleId, state.customPalettes) {
        ArtStyles.getStyleSpec(state.styleId, state.customPalettes)
    }

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        containerColor = MaterialTheme.colorScheme.background,
        contentWindowInsets = WindowInsets.safeDrawing,
        topBar = {
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 2.dp
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Mungil Engine",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface
                        )
                        Text(
                            text = "${if (state.isOnline) tr.onlineBadge else tr.offlineBadge} · ${state.deviceProfile.activeTier.id.uppercase()} (${state.deviceProfile.targetFps} FPS)",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        IconButton(
                            onClick = {
                                SoundEngine.playSfx("ui_toggle")
                                onToggleMute()
                            },
                            modifier = Modifier
                                .minimumInteractiveComponentSize()
                                .testTag("landing_mute_button")
                        ) {
                            Icon(
                                imageVector = if (state.muted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
                                contentDescription = stringResource(R.string.cd_sound_toggle)
                            )
                        }
                        Button(
                            onClick = {
                                SoundEngine.playSfx("ui_click")
                                onStartPlay()
                            },
                            modifier = Modifier
                                .minimumInteractiveComponentSize()
                                .testTag("landing_topbar_play_button")
                        ) {
                            Icon(Icons.Default.PlayArrow, contentDescription = null)
                            Spacer(Modifier.width(4.dp))
                            Text(tr.playGame)
                        }
                    }
                }
            }
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Banner + Backdrop Art
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(18.dp)
                ) {
                    Column {
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(160.dp)
                        ) {
                            Image(
                                painter = painterResource(id = R.drawable.img_hero_stage),
                                contentDescription = stringResource(R.string.cd_hero_illustration),
                                contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize()
                            )
                            Box(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .background(
                                        Brush.verticalGradient(
                                            listOf(Color.Transparent, MaterialTheme.colorScheme.surface.copy(alpha = 0.96f))
                                        )
                                    )
                            )
                            Column(
                                modifier = Modifier
                                    .align(Alignment.BottomStart)
                                    .padding(14.dp)
                            ) {
                                Text(
                                    text = "${tr.appSubtitle} · Mobile Pseudo-3D Studio",
                                    style = MaterialTheme.typography.headlineSmall,
                                    color = MaterialTheme.colorScheme.onSurface
                                )
                                Text(
                                    text = "Zero-GC SoA ECS · Itel A70 Optimized · 12 Art Styles · 16 Genres",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.primary
                                )
                            }
                        }

                        Column(
                            modifier = Modifier.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            Text(
                                text = "Lightweight 2D, 2.5D, and Fake-3D game engine for low-entry Android phones. Play all 3 chapters or generate characters, music, SFX, cutscenes, and terrains offline.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )

                            // Level Quick Picker
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                listOf(1, 2, 3).forEach { lvl ->
                                    val selected = state.activeLevel == lvl
                                    FilterChip(
                                        selected = selected,
                                        onClick = {
                                            SoundEngine.playSfx("ui_click")
                                            onSelectLevel(lvl)
                                        },
                                        label = { Text("${tr.levelLabel} $lvl") },
                                        modifier = Modifier
                                            .weight(1f)
                                            .minimumInteractiveComponentSize()
                                            .testTag("level_chip_$lvl")
                                    )
                                }
                            }

                            // Primary CTAs
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Button(
                                    onClick = {
                                        SoundEngine.playSfx("ui_click")
                                        onStartPlay()
                                    },
                                    modifier = Modifier
                                        .weight(1.2f)
                                        .minimumInteractiveComponentSize()
                                        .testTag("hero_play_button")
                                ) {
                                    Icon(Icons.Default.PlayArrow, contentDescription = null)
                                    Spacer(Modifier.width(4.dp))
                                    Text(tr.playGame)
                                }
                                OutlinedButton(
                                    onClick = {
                                        SoundEngine.playSfx("ui_tab")
                                        onOpenStudioTab(StudioTab.GENERATORS)
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .minimumInteractiveComponentSize()
                                        .testTag("hero_generators_button")
                                ) {
                                    Icon(Icons.Default.AutoAwesome, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text("Generators")
                                }
                                OutlinedButton(
                                    onClick = {
                                        SoundEngine.playSfx("ui_tab")
                                        onOpenStudioTab(StudioTab.PLAY)
                                    },
                                    modifier = Modifier
                                        .weight(1f)
                                        .minimumInteractiveComponentSize()
                                        .testTag("hero_studio_button")
                                ) {
                                    Icon(Icons.Default.Build, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(tr.openStudio)
                                }
                            }

                            // Continue Saved Banner
                            if (state.latestSave?.exists == true) {
                                val sv = state.latestSave
                                OutlinedCard(
                                    onClick = {
                                        SoundEngine.playSfx("ui_click")
                                        onContinueSaved()
                                    },
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .testTag("continue_saved_button"),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.secondary.copy(alpha = 0.14f))
                                ) {
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = "${tr.continueSaved} (${if (sv.id == "auto") tr.autoSaveLabel else "${tr.slotLabel} ${sv.id}"})",
                                            style = MaterialTheme.typography.labelLarge,
                                            color = MaterialTheme.colorScheme.secondary
                                        )
                                        Text(
                                            text = "Lv.${sv.level} · HP ${sv.hp} · ${tr.scoreLabel} ${sv.score}",
                                            style = MaterialTheme.typography.labelSmall
                                        )
                                    }
                                }
                            }

                            // Quick Studio Shortcuts
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                FilledTonalButton(
                                    onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.AGENT) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("quick_agent_button")
                                ) { Text("Qolbu AI") }
                                FilledTonalButton(
                                    onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.ARENA) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("quick_arena_button")
                                ) { Text("Arena AI") }
                                FilledTonalButton(
                                    onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.SCENE) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("quick_scene_button")
                                ) { Text("Scene") }
                            }
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                OutlinedButton(
                                    onClick = { SoundEngine.playSfx("ui_click"); onOpenTitleStage() },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("quick_title_stage_button")
                                ) { Text("Title Stage") }
                                OutlinedButton(
                                    onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.CONTROLS) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("quick_controls_button")
                                ) {
                                    Icon(Icons.Default.Tune, contentDescription = null, modifier = Modifier.size(16.dp))
                                    Spacer(Modifier.width(4.dp))
                                    Text(tr.controlsBtn)
                                }
                            }
                        }
                    }
                }
            }

            // Live Interactive Stage Preview
            item {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                    shape = RoundedCornerShape(18.dp)
                ) {
                    Column(
                        modifier = Modifier.padding(14.dp),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text(
                            text = "Live Engine Preview Stage",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Canvas(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(190.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, MaterialTheme.colorScheme.outline, RoundedCornerShape(12.dp))
                        ) {
                            val w = size.width
                            val h = size.height
                            val skyTop = ArtStyles.applyStyleTint(if (state.activeLevel == 3) "#0A0714" else if (state.activeLevel == 2) "#0F172A" else style.palette[0], state.styleOverrides)
                            val skyBot = ArtStyles.applyStyleTint(if (state.activeLevel == 3) "#1E1133" else if (state.activeLevel == 2) "#1E3A5F" else "#D9F2FF", state.styleOverrides)
                            drawRect(Brush.verticalGradient(listOf(skyTop, skyBot)), Offset.Zero, size)
                            GameCanvasRenderers.drawMode7Horizon(this, w, h - 68f, h - 34f, animTime * 48f, style, state.activeLevel, state.styleOverrides)
                            GameCanvasRenderers.drawGroundTile(this, 0f, h - 36f, w, 36f, style, state.activeLevel, state.styleOverrides)
                            GameCanvasRenderers.drawTreeAsset(this, 68f, h - 36f, 0.9f, style, state.styleOverrides)
                            GameCanvasRenderers.drawGateAsset(this, w - 76f, h - 102f, 40f, 66f, true, style, animTime, state.styleOverrides)
                            GameCanvasRenderers.drawBowoCharacter(
                                scope = this,
                                cx = w * 0.36f,
                                cy = h - 56f,
                                size = 28f,
                                style = style,
                                pose = DEMO_POSES[poseIdx % DEMO_POSES.size],
                                facing = 1,
                                timeSec = animTime,
                                rig3d = preview3D,
                                yawRad = if (preview3D) sin(animTime * 1.4f) * 0.48f else 0.32f,
                                overrides = state.styleOverrides,
                                customChar = state.customCharacter
                            )
                            GameCanvasRenderers.drawEnemyEntity(
                                scope = this,
                                archetype = if (state.activeLevel == 3) "boss_kala" else "slime",
                                cx = w * 0.64f,
                                cy = h - (if (state.activeLevel == 3) 62f else 50f),
                                r = if (state.activeLevel == 3) 22f else 14f,
                                style = style,
                                timeSec = animTime,
                                flash = 0f,
                                telegraphRatio = if (sin(animTime * 2f) > 0.4f) 0.5f else 0f,
                                koProgress = 0f,
                                bossPhase = 2,
                                overrides = state.styleOverrides
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            FilledTonalButton(
                                onClick = {
                                    SoundEngine.playSfx("ui_toggle")
                                    preview3D = !preview3D
                                },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("toggle_preview_rig_button")
                            ) {
                                Text(if (preview3D) "Rig: 3D-Stack" else "Rig: 2D")
                            }
                            FilledTonalButton(
                                onClick = {
                                    SoundEngine.playSfx("ui_click")
                                    poseIdx = (poseIdx + 1) % DEMO_POSES.size
                                },
                                modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("cycle_pose_button")
                            ) {
                                Text("Pose: ${DEMO_POSES[poseIdx % DEMO_POSES.size].id}")
                            }
                            OutlinedButton(
                                onClick = {
                                    SoundEngine.playSfx("ui_toggle")
                                    onToggleTheme()
                                },
                                modifier = Modifier.minimumInteractiveComponentSize().testTag("landing_theme_button")
                            ) {
                                Text(if (state.darkTheme) "Dark" else "Light")
                            }
                        }

                        // Language Switcher
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            LanguageCode.entries.forEach { lc ->
                                FilterChip(
                                    selected = state.lang == lc,
                                    onClick = {
                                        SoundEngine.playSfx("ui_toggle")
                                        onChangeLanguage(lc)
                                    },
                                    label = { Text(lc.code.uppercase()) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("lang_chip_${lc.code}")
                                )
                            }
                        }
                    }
                }
            }

            // 01. Three-Chapter Loop
            item {
                SectionCard(
                    title = "01. Three-Chapter Action RPG Loop",
                    subtitle = "30-60 FPS · Coyote Time · Parry · 3 AudioTrack BGM Tracks"
                ) {
                    listOf(
                        Triple("Level 1 · Dawn Village", "Desa Fajar", "Collect 2 Light Shards across platforms, defeat Slime patrols, and unlock the East Gate."),
                        Triple("Level 2 · Storm Bridge", "Jembatan Badai", "Trigger 2 storm floor switches, reflect Wisp bolts with Dash Parry, and defeat Sentinels."),
                        Triple("Level 3 · Boss Battle", "Menara Kala", "Battle 3-phase Boss Kala with multi-orb spreads, hitstop combos, and dynamic camera shake.")
                    ).forEach { (meta, name, desc) ->
                        Surface(
                            color = MaterialTheme.colorScheme.surfaceVariant,
                            shape = RoundedCornerShape(12.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(meta, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
                                Text(name, style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.Bold)
                                Text(desc, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                            }
                        }
                    }
                }
            }

            // 02 & 03 & 04 Summary Cards
            item {
                SectionCard(
                    title = "02. Generators, Pseudo-3D DNA & AI Skills",
                    subtitle = "25 Top-5 open-source architectural patterns + multi-LLM packs"
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.LAB) },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("landing_lab_button")
                        ) { Text("Inspect Engine Lab") }
                        Button(
                            onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.SKILLS) },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("landing_skills_button")
                        ) {
                            Icon(Icons.Default.Terminal, contentDescription = null, modifier = Modifier.size(16.dp))
                            Spacer(Modifier.width(4.dp))
                            Text("AI Skills")
                        }
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        OutlinedButton(
                            onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.ASSETS) },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("landing_assets_button")
                        ) { Text("Asset Manager") }
                        OutlinedButton(
                            onClick = { SoundEngine.playSfx("ui_tab"); onOpenStudioTab(StudioTab.EXPORT) },
                            modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("landing_export_button")
                        ) { Text("Export & Docs") }
                    }
                }
            }
        }
    }
}

@Composable
private fun SectionCard(
    title: String,
    subtitle: String,
    content: @Composable ColumnScope.() -> Unit
) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        shape = RoundedCornerShape(18.dp)
    ) {
        Column(
            modifier = Modifier.padding(14.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(subtitle, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
            content()
        }
    }
}
