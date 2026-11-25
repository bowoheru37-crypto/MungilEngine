package com.example.engine

object BytecodeOpcodes {
    const val NOP = 0x0
    const val SET = 0x1
    const val ADD = 0x2
    const val SUB = 0x3
    const val SAY = 0x4
    const val SPAWN = 0x5
    const val END = 0xF
}

data class CompiledBytecode(
    val instructions: IntArray,
    val errors: List<String>
)

data class BytecodeVmResult(
    val halted: Boolean,
    val steps: Int,
    val registers: IntArray,
    val log: List<String>
)

data class SeedWorldTile(val x: Int, val y: Int, val kind: String)
data class SeedWorldResult(val seed: Int, val biome: String, val difficulty: Int, val tiles: List<SeedWorldTile>)

data class RlePackResult(
    val header: String,
    val originalBytes: Int,
    val packedBytes: Int,
    val ratioPct: Int,
    val bytes: ByteArray
)

object BytecodeVm {
    fun compileBytecode(source: String): CompiledBytecode {
        val lines = source.lines().map { it.trim() }.filter { it.isNotEmpty() && !it.startsWith("#") && !it.startsWith("//") }
        val words = ArrayList<Int>(lines.size)
        val errors = ArrayList<String>()

        for ((idx, line) in lines.withIndex()) {
            val parts = line.split(Regex("\\s+"))
            val opName = parts[0].uppercase()
            val arg = parts.getOrNull(1)?.toIntOrNull() ?: 0
            if (arg < 0 || arg > 0x0FFF) {
                errors.add("Line ${idx + 1}: operand $arg out of 12-bit range (0..4095)")
                continue
            }
            val opCode = when (opName) {
                "NOP" -> BytecodeOpcodes.NOP
                "SET" -> BytecodeOpcodes.SET
                "ADD" -> BytecodeOpcodes.ADD
                "SUB" -> BytecodeOpcodes.SUB
                "SAY" -> BytecodeOpcodes.SAY
                "SPAWN" -> BytecodeOpcodes.SPAWN
                "END", "HALT" -> BytecodeOpcodes.END
                else -> {
                    errors.add("Line ${idx + 1}: unknown opcode $opName")
                    continue
                }
            }
            words.add(((opCode and 0xF) shl 12) or (arg and 0x0FFF))
        }
        return CompiledBytecode(words.toIntArray(), errors)
    }

    fun runBytecodeVm(instructions: IntArray, maxSteps: Int = 256): BytecodeVmResult {
        val regs = IntArray(16)
        val log = ArrayList<String>()
        var pc = 0
        var steps = 0
        var halted = false

        while (pc < instructions.size && steps < maxSteps) {
            val word = instructions[pc++]
            val op = (word ushr 12) and 0xF
            val arg = word and 0x0FFF
            steps++
            when (op) {
                BytecodeOpcodes.NOP -> {}
                BytecodeOpcodes.SET -> regs[0] = arg
                BytecodeOpcodes.ADD -> regs[0] += arg
                BytecodeOpcodes.SUB -> regs[0] -= arg
                BytecodeOpcodes.SAY -> {
                    regs[1] = arg
                    log.add("SAY #$arg (R0=${regs[0]})")
                }
                BytecodeOpcodes.SPAWN -> {
                    regs[2] += arg
                    log.add("SPAWN entity x$arg (total R2=${regs[2]})")
                }
                BytecodeOpcodes.END -> {
                    halted = true
                    break
                }
            }
        }
        return BytecodeVmResult(halted, steps, regs, log)
    }

    fun createSeedRng(seed: Int): () -> Float {
        var state = if (seed == 0) 0x6D2B79F5 else seed
        return {
            state = state xor (state shl 13)
            state = state xor (state ushr 17)
            state = state xor (state shl 5)
            ((state.toLong() and 0xFFFFFFFFL).toDouble() / 4294967296.0).toFloat()
        }
    }

    fun generateSeedWorld(seed: Int): SeedWorldResult {
        val rng = createSeedRng(seed)
        val biomes = listOf("Desa Fajar", "Jembatan Badai", "Menara Kala")
        val biome = biomes[(rng() * biomes.size).toInt().coerceIn(0, 2)]
        val difficulty = 1 + (rng() * 5).toInt()
        val tiles = (0 until 12).map { i ->
            val kind = when {
                i == 0 -> "spawn"
                i == 11 -> "gate"
                rng() < 0.28f -> "shard"
                rng() < 0.55f -> "enemy"
                else -> "platform"
            }
            SeedWorldTile(i * 64, 180 + (rng() * 90).toInt(), kind)
        }
        return SeedWorldResult(seed, biome, difficulty, tiles)
    }

    fun computeChecksum(text: String): String {
        var hash = 0x811c9dc5u
        val bytes = text.encodeToByteArray()
        for (b in bytes) {
            hash = hash xor (b.toUInt() and 0xFFu)
            hash *= 0x01000193u
        }
        return hash.toString(16).padStart(8, '0')
    }

    fun packRleBytes(input: String): RlePackResult {
        val raw = input.encodeToByteArray()
        val out = ArrayList<Byte>(raw.size + 16)
        "MPAK7".encodeToByteArray().forEach { out.add(it) }
        var i = 0
        while (i < raw.size) {
            val b = raw[i]
            var run = 1
            while (i + run < raw.size && raw[i + run] == b && run < 255) {
                run++
            }
            out.add(run.toByte())
            out.add(b)
            i += run
        }
        val packed = out.toByteArray()
        val ratio = if (raw.isEmpty()) 100 else ((packed.size * 100f) / raw.size).toInt()
        return RlePackResult("MPAK7", raw.size, packed.size, ratio, packed)
    }

    fun unpackRleBytes(packed: ByteArray): String {
        if (packed.size < 5) return ""
        val magic = String(packed.copyOfRange(0, 5), Charsets.UTF_8)
        if (magic != "MPAK7") return ""
        val out = ArrayList<Byte>(packed.size * 2)
        var i = 5
        while (i + 1 < packed.size) {
            val count = packed[i].toInt() and 0xFF
            val value = packed[i + 1]
            repeat(count) { out.add(value) }
            i += 2
        }
        return out.toByteArray().toString(Charsets.UTF_8)
    }
}

object MungilEngineApi {
    fun runCommandSummary(command: String): String {
        val trimmed = command.trim()
        return when {
            trimmed.startsWith("E.create") -> "Spawned entity via $trimmed"
            trimmed.startsWith("E.move") -> "Displaced actor via $trimmed"
            trimmed.startsWith("E.on") -> "Bound No-Code event rule via $trimmed"
            trimmed.startsWith("E.playSound") -> "Triggered AudioTrack SFX via $trimmed"
            trimmed.startsWith("E.setMode") -> "Switched render pipeline via $trimmed"
            trimmed.startsWith("E.setPhysics") -> "Applied physics profile via $trimmed"
            trimmed.startsWith("E.cameraShake") -> "Queued camera impulse via $trimmed"
            else -> "Executed MungilE command: $trimmed"
        }
    }
}
