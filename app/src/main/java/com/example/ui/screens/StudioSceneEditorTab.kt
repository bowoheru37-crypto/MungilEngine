package com.example.ui.screens

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.engine.*
import com.example.ui.AppUiState
import com.example.ui.MainViewModel
import kotlin.math.hypot
import kotlin.math.roundToInt

@Composable
fun StudioSceneEditorTab(
    state: AppUiState,
    viewModel: MainViewModel
) {
    val entities = state.sceneEntities
    var selectedId by remember(entities) { mutableStateOf(entities.firstOrNull()?.id ?: "") }
    var multiSelectedIds by remember { mutableStateOf(setOf<String>()) }
    var groupName by remember { mutableStateOf("Squad Container") }

    val selected = entities.find { it.id == selectedId } ?: entities.firstOrNull()
    val overlaps = remember(entities) { SceneHierarchy.detectEntityOverlaps(entities) }

    LazyColumn(
        modifier = Modifier.fillMaxSize().padding(horizontal = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        contentPadding = PaddingValues(vertical = 14.dp)
    ) {
        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Collision Shape & Hierarchy Canvas (Drag Entities)", style = MaterialTheme.typography.titleMedium)
                    Canvas(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(210.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF070D19))
                            .testTag("scene_editor_canvas")
                            .pointerInput(entities) {
                                detectTapGestures { tap ->
                                    val sx = 360f / size.width.coerceAtLeast(1)
                                    val sy = 240f / size.height.coerceAtLeast(1)
                                    val wx = tap.x * sx
                                    val wy = tap.y * sy
                                    val hit = entities.minByOrNull { hypot(it.x - wx, it.y - wy) }
                                    if (hit != null && hypot(hit.x - wx, hit.y - wy) < 42f) {
                                        selectedId = hit.id
                                    }
                                }
                            }
                            .pointerInput(entities, selectedId) {
                                detectDragGestures { change, drag ->
                                    change.consume()
                                    val targetId = selectedId.ifEmpty { return@detectDragGestures }
                                    val node = entities.find { it.id == targetId } ?: return@detectDragGestures
                                    val dx = drag.x * (360f / size.width.coerceAtLeast(1))
                                    val dy = drag.y * (240f / size.height.coerceAtLeast(1))
                                    val updated = SceneHierarchy.updateEntityTransform(
                                        entities,
                                        targetId,
                                        newX = node.x + dx,
                                        newY = node.y + dy
                                    )
                                    viewModel.updateSettings { it.copy(sceneEntities = updated) }
                                }
                            }
                    ) {
                        val sx = size.width / 360f
                        val sy = size.height / 240f
                        // Grid
                        for (gx in 1 until 9) {
                            drawLine(Color(0xFF1E293B), Offset(gx * 40f * sx, 0f), Offset(gx * 40f * sx, size.height), 1f)
                        }
                        for (gy in 1 until 6) {
                            drawLine(Color(0xFF1E293B), Offset(0f, gy * 40f * sy), Offset(size.width, gy * 40f * sy), 1f)
                        }

                        entities.filter { it.visible }.forEach { ent ->
                            val cx = ent.x * sx
                            val cy = ent.y * sy
                            val isSel = ent.id == selected?.id
                            val isOverlapping = overlaps.any { !it.near && (it.aId == ent.id || it.bId == ent.id) }
                            val strokeCol = when {
                                isOverlapping -> Color(0xFFF43F5E)
                                isSel -> Color(0xFFFBBF24)
                                ent.physics.isTrigger -> Color(0xFF38BDF8)
                                else -> Color(0xFF34D399)
                            }
                            when (ent.collider.kind) {
                                ColliderShapeKind.CIRCLE -> {
                                    val rad = ent.collider.radius * ent.scaleX * sx
                                    drawCircle(strokeCol.copy(alpha = 0.2f), rad, Offset(cx, cy))
                                    drawCircle(strokeCol, rad, Offset(cx, cy), style = Stroke(if (isSel) 3f else 2f))
                                }
                                ColliderShapeKind.POLYGON -> {
                                    val poly = Path()
                                    ent.collider.polygonPoints.forEachIndexed { idx, pt ->
                                        val px = cx + pt.first * ent.scaleX * sx
                                        val py = cy + pt.second * ent.scaleY * sy
                                        if (idx == 0) poly.moveTo(px, py) else poly.lineTo(px, py)
                                    }
                                    poly.close()
                                    drawPath(poly, strokeCol.copy(alpha = 0.22f))
                                    drawPath(poly, strokeCol, style = Stroke(if (isSel) 3f else 2f))
                                }
                                ColliderShapeKind.BOX -> {
                                    val bw = ent.collider.width * ent.scaleX * sx
                                    val bh = ent.collider.height * ent.scaleY * sy
                                    drawRect(strokeCol.copy(alpha = 0.18f), Offset(cx - bw * 0.5f, cy - bh * 0.5f), Size(bw, bh))
                                    drawRect(strokeCol, Offset(cx - bw * 0.5f, cy - bh * 0.5f), Size(bw, bh), style = Stroke(if (isSel) 3f else 2f))
                                }
                            }
                            drawCircle(if (isSel) Color(0xFFFBBF24) else Color.White, 4f, Offset(cx, cy))
                        }
                    }

                    if (overlaps.isEmpty()) {
                        Text("Status Kolisi: Aman (tidak ada overlap)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
                    } else {
                        overlaps.forEach { ov ->
                            Text(
                                text = if (ov.near) "Dekat (<8px): ${ov.aName} <-> ${ov.bName}"
                                else "Overlap (${ov.penetrationPx.roundToInt()}px${if (ov.isTriggerOverlap) " Trigger" else ""}): ${ov.aName} <-> ${ov.bName}",
                                style = MaterialTheme.typography.labelMedium,
                                color = if (ov.near) Color(0xFFFBBF24) else Color(0xFFF43F5E)
                            )
                        }
                    }
                }
            }
        }

        item {
            Card(shape = RoundedCornerShape(16.dp)) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text("Scene Hierarchy & Group Container", style = MaterialTheme.typography.titleMedium)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                        OutlinedTextField(
                            value = groupName,
                            onValueChange = { groupName = it },
                            label = { Text("Container Name") },
                            singleLine = true,
                            modifier = Modifier.weight(1f).testTag("scene_group_name_input")
                        )
                        Button(
                            onClick = {
                                val (next, newId) = SceneHierarchy.groupEntitiesIntoContainer(entities, multiSelectedIds.toList(), groupName)
                                if (newId != null) {
                                    viewModel.updateSettings { it.copy(sceneEntities = next) }
                                    selectedId = newId
                                    multiSelectedIds = emptySet()
                                    viewModel.showBanner("Grouped into $groupName")
                                }
                            },
                            enabled = multiSelectedIds.size >= 2,
                            modifier = Modifier.minimumInteractiveComponentSize().testTag("scene_group_btn")
                        ) { Text("Group (${multiSelectedIds.size})") }
                    }

                    entities.forEach { node ->
                        val isSel = node.id == selected?.id
                        val checked = node.id in multiSelectedIds
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(10.dp))
                                .background(if (isSel) MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.45f) else Color.Transparent)
                                .clickable { selectedId = node.id }
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            if (node.kind != "container") {
                                Checkbox(
                                    checked = checked,
                                    onCheckedChange = { on ->
                                        multiSelectedIds = if (on) multiSelectedIds + node.id else multiSelectedIds - node.id
                                    },
                                    modifier = Modifier.testTag("scene_chk_${node.id}")
                                )
                            }
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = (if (node.parentId != null) "↳ " else "") + node.name,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = if (isSel) FontWeight.Bold else FontWeight.Normal
                                )
                                Text(
                                    text = "${node.kind.uppercase()} · (${node.x.toInt()}, ${node.y.toInt()}) · ${node.physics.presetId.label} · ${node.collider.kind.id.uppercase()}",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (node.kind == "container") {
                                TextButton(
                                    onClick = {
                                        val next = SceneHierarchy.ungroupContainer(entities, node.id)
                                        viewModel.updateSettings { it.copy(sceneEntities = next) }
                                    },
                                    modifier = Modifier.minimumInteractiveComponentSize().testTag("scene_ungroup_${node.id}")
                                ) { Text("Ungroup") }
                            }
                        }
                    }
                }
            }
        }

        if (selected != null) {
            item {
                Card(shape = RoundedCornerShape(16.dp)) {
                    Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text("Inspector: ${selected.name}", style = MaterialTheme.typography.titleMedium)

                        Text("Transform: X=${selected.x.toInt()} · Y=${selected.y.toInt()} · Scale=${String.format("%.2f", selected.scaleX)} · Rot=${selected.rotationDeg.toInt()}°", style = MaterialTheme.typography.bodySmall)
                        Slider(
                            value = selected.x,
                            onValueChange = { nx ->
                                val next = SceneHierarchy.updateEntityTransform(entities, selected.id, newX = nx)
                                viewModel.updateSettings { it.copy(sceneEntities = next) }
                            },
                            valueRange = 16f..344f
                        )
                        Slider(
                            value = selected.y,
                            onValueChange = { ny ->
                                val next = SceneHierarchy.updateEntityTransform(entities, selected.id, newY = ny)
                                viewModel.updateSettings { it.copy(sceneEntities = next) }
                            },
                            valueRange = 16f..224f
                        )
                        Slider(
                            value = selected.scaleX,
                            onValueChange = { ns ->
                                val next = SceneHierarchy.updateEntityTransform(entities, selected.id, newScaleX = ns, newScaleY = ns)
                                viewModel.updateSettings { it.copy(sceneEntities = next) }
                            },
                            valueRange = 0.5f..2.2f
                        )

                        Text("6 Physics Presets (1-Tap)", style = MaterialTheme.typography.labelLarge)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            PhysicsPresetId.entries.take(3).forEach { preset ->
                                FilterChip(
                                    selected = selected.physics.presetId == preset,
                                    onClick = {
                                        val next = SceneHierarchy.applyPhysicsPreset(entities, selected.id, preset)
                                        viewModel.updateSettings { it.copy(sceneEntities = next) }
                                    },
                                    label = { Text(preset.label) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("preset_${preset.id}")
                                )
                            }
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            PhysicsPresetId.entries.drop(3).forEach { preset ->
                                FilterChip(
                                    selected = selected.physics.presetId == preset,
                                    onClick = {
                                        val next = SceneHierarchy.applyPhysicsPreset(entities, selected.id, preset)
                                        viewModel.updateSettings { it.copy(sceneEntities = next) }
                                    },
                                    label = { Text(preset.label) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("preset_${preset.id}")
                                )
                            }
                        }

                        Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                            Text("Sensor Trigger (Pass-Through)", style = MaterialTheme.typography.bodyMedium)
                            Switch(
                                checked = selected.physics.isTrigger,
                                onCheckedChange = { trg ->
                                    val next = entities.map {
                                        if (it.id == selected.id) it.copy(physics = it.physics.copy(isTrigger = trg)) else it
                                    }
                                    viewModel.updateSettings { it.copy(sceneEntities = next) }
                                },
                                modifier = Modifier.testTag("scene_trigger_switch")
                            )
                        }

                        Text("Collider Shape", style = MaterialTheme.typography.labelLarge)
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp), modifier = Modifier.fillMaxWidth()) {
                            ColliderShapeKind.entries.forEach { kind ->
                                FilterChip(
                                    selected = selected.collider.kind == kind,
                                    onClick = {
                                        val next = SceneHierarchy.updateEntityCollider(entities, selected.id, kind = kind)
                                        viewModel.updateSettings { it.copy(sceneEntities = next) }
                                    },
                                    label = { Text(kind.id.uppercase()) },
                                    modifier = Modifier.weight(1f).minimumInteractiveComponentSize().testTag("collider_${kind.id}")
                                )
                            }
                        }
                        if (selected.collider.kind == ColliderShapeKind.CIRCLE) {
                            Text("Radius: ${selected.collider.radius.toInt()}px", style = MaterialTheme.typography.bodySmall)
                            Slider(
                                value = selected.collider.radius,
                                onValueChange = { r ->
                                    val next = SceneHierarchy.updateEntityCollider(entities, selected.id, radius = r)
                                    viewModel.updateSettings { it.copy(sceneEntities = next) }
                                },
                                valueRange = 10f..72f
                            )
                        } else {
                            Text("Width ${selected.collider.width.toInt()}px · Height ${selected.collider.height.toInt()}px", style = MaterialTheme.typography.bodySmall)
                            Slider(
                                value = selected.collider.width,
                                onValueChange = { w ->
                                    val next = SceneHierarchy.updateEntityCollider(entities, selected.id, width = w)
                                    viewModel.updateSettings { it.copy(sceneEntities = next) }
                                },
                                valueRange = 14f..260f
                            )
                            Slider(
                                value = selected.collider.height,
                                onValueChange = { h ->
                                    val next = SceneHierarchy.updateEntityCollider(entities, selected.id, height = h)
                                    viewModel.updateSettings { it.copy(sceneEntities = next) }
                                },
                                valueRange = 14f..140f
                            )
                        }
                    }
                }
            }
        }
    }
}
