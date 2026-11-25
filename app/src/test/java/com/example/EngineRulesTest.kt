package com.example

import com.example.engine.*
import org.junit.Assert.*
import org.junit.Test

class EngineRulesTest {
    @Test
    fun `three level simulation unlocks gate and defeats boss kala`() {
        val w1 = GameSimulation.createLevelWorld(1)
        assertEquals(2, w1.shards.size)
        assertFalse(w1.gateUnlocked)
        w1.shards.forEach { sh ->
            w1.player.x = sh.x - w1.player.w * 0.5f
            w1.player.y = sh.y - w1.player.h * 0.5f
            GameSimulation.stepGameWorld(w1, SimInput(), 0.016f, SimConfig())
        }
        assertEquals(2, w1.shardsTotal)
        assertTrue(w1.gateUnlocked)

        val w3 = GameSimulation.createLevelWorld(3)
        val boss = w3.enemies.first { it.archetype == "boss_kala" }
        assertEquals(210, boss.maxHp)
        boss.hp = 10
        w3.switches.forEach { it.active = true }
        w3.shards.forEach { it.collected = true }
        w3.shardsTotal = w3.shards.size
        w3.player.x = boss.x - 10f
        w3.player.y = boss.y - 10f
        GameSimulation.stepGameWorld(w3, SimInput(attackPressed = true), 0.016f, SimConfig())
        assertTrue(boss.dead)
        assertTrue(w3.gateUnlocked)
        w3.player.x = w3.def.gate.x + 8f
        w3.player.y = w3.def.gate.y + 8f
        GameSimulation.stepGameWorld(w3, SimInput(), 0.04f, SimConfig())
        GameSimulation.stepGameWorld(w3, SimInput(), 0.016f, SimConfig())
        assertEquals("victory", w3.status)
    }

    @Test
    fun `bytecode vm compiles runs and mpak7 roundtrips losslessly`() {
        val compiled = BytecodeVm.compileBytecode("SET 10\nADD 5\nSPAWN 2\nSAY 99\nEND")
        assertTrue(compiled.errors.isEmpty())
        val result = BytecodeVm.runBytecodeVm(compiled.instructions)
        assertTrue(result.halted)
        assertEquals(15, result.registers[0])
        assertEquals(99, result.registers[1])
        assertEquals(2, result.registers[2])

        val sample = "{\"engine\":\"Mungil-V7\",\"tiles\":[1,1,1,1,1,1,0,0,0,0,0,0]}"
        val pak = BytecodeVm.packRleBytes(sample)
        assertEquals("MPAK7", pak.header)
        assertEquals(sample, BytecodeVm.unpackRleBytes(pak.bytes))
    }

    @Test
    fun `qolbu 8 stage audit and 2000 event security fuzz pass`() {
        val report = QolbuCore.runQolbu8StageAudit(drawCalls = 18, heapMb = 22.0f)
        assertTrue(report.allPassed)
        assertEquals(2000, report.fuzzEventsTested)
        assertEquals(2000, report.fuzzBlockedCount)
    }

    @Test
    fun `qolbu space 3d lookat lod and origin rebasing work cleanly`() {
        assertEquals(0, QolbuSpace3DMath.evaluateCullAndLod(8f, true, false))
        assertEquals(1, QolbuSpace3DMath.evaluateCullAndLod(18f, true, false))
        assertEquals(2, QolbuSpace3DMath.evaluateCullAndLod(30f, true, false))
        assertEquals(-1, QolbuSpace3DMath.evaluateCullAndLod(42f, true, false))

        val rebase = QolbuSpace3DMath.evaluateOriginRebase(620f, -540f, 0f, 0f)
        assertTrue(rebase.rebased)
        assertEquals(500f, rebase.shiftX, 0.01f)
        assertEquals(-1000f, rebase.shiftZ, 0.01f)

        val space = QolbuSpace3D()
        space.setEntity(0, 0f, 0f, 0f)
        space.setEntity(1, 0f, 0f, -120f)
        val counts = space.updateAll(360f, 640f)
        assertEquals(1, counts.visible)
        assertEquals(1, counts.culled)
    }

    @Test
    fun `scene hierarchy grouping overlap detection and lowpoly mesh budget pass`() {
        val base = SceneHierarchy.createDefaultSceneEntities(1)
        val (grouped, containerId) = SceneHierarchy.groupEntitiesIntoContainer(
            base,
            listOf("ent_bowo", "ent_luma"),
            "Hero Squad"
        )
        assertNotNull(containerId)
        val ungrouped = SceneHierarchy.ungroupContainer(grouped, containerId!!)
        assertEquals(base.size, ungrouped.size)

        val moved = SceneHierarchy.updateEntityTransform(base, "ent_luma", newX = 92f, newY = 148f)
        val overlaps = SceneHierarchy.detectEntityOverlaps(moved)
        assertTrue(overlaps.any { it.aId == "ent_bowo" || it.bId == "ent_bowo" })

        val mesh = MeshAndBlueprintGenerators.generateMesh3DFromPrompt(123, "Guardian")
        assertTrue(mesh.budgetOk)
        assertTrue(mesh.triangles.size <= Space3DConstants.CHAR_TRIS_LIMIT)

        val bp = MeshAndBlueprintGenerators.generateCompleteGameBlueprint(321, "Isometric Quest")
        assertTrue(bp.budgetReport.passesA70)
    }
}
