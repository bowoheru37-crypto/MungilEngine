# T3D GAME ENGINE — ARSITEKTUR KOMPREHENSIF UNIFIED
## Fully Customized & Optimized for Android 5+ Low-Entry Devices
### Version: 1.0.0 | Architecture: Layered-Modular-Hybrid
### Target: Android API 21+ (Android 5.0 Lollipop) | RAM Budget: 512MB Mobile / 2GB PC
### Binary Format: Custom T3D Binary (.t3d, .t3pak, .t3mesh, .t3tex)
### Assembly Core: ARMv7-A / ARM64-v8a / x86 / x86_64

---

# DAFTAR ISI

1. LAYER 0: FOUNDATION / RUNTIME CORE
2. LAYER 1: DATA & ASSET PIPELINE
3. LAYER 2: WORLD & SIMULATION
4. LAYER 3: GAMEPLAY SYSTEMS
5. LAYER 4: AI SYSTEMS
6. LAYER 5: RENDERING SYSTEMS
7. LAYER 6: AUDIO SYSTEMS
8. LAYER 7: NETWORK & MULTIPLAYER
9. LAYER 8: EDITOR & TOOLS
10. LAYER 9: LIVEOPS & BUSINESS
11. BINARY & ASSEMBLY SYSTEM DESIGN
12. SECURITY & ANTI-TAMPER
13. OPTIMIZATION MATRIX
14. INTEGRATION SPECIFICATIONS

---

# LAYER 0: FOUNDATION / RUNTIME CORE
## "Ini jantungnya. Tanpa ini semua crash."

### 0.1 PLATFORM ABSTRACTION LAYER (PAL)
**File:** `t3d_platform.c` | `t3d_platform.h` | `t3d_platform_android.cpp`

#### 0.1.1 Arsitektur & Struktur
```
PAL/
├── t3d_platform.h          # Interface abstrak (C header)
├── t3d_platform_win32.c    # Windows implementation
├── t3d_platform_linux.c    # Linux/X11 implementation
├── t3d_platform_android.cpp # Android NDK implementation
├── t3d_platform_ios.mm     # iOS Objective-C++ implementation
├── t3d_platform_web.c      # Emscripten/WebGL implementation
└── t3d_platform_console.c  # Console SDK abstraction
```

#### 0.1.2 Komponen & Modul Detail

**A. INPUT SUBSYSTEM**
```c
typedef enum T3D_INPUT_TYPE {
    T3D_INPUT_KEYBOARD = 0x01,
    T3D_INPUT_MOUSE = 0x02,
    T3D_INPUT_TOUCH = 0x04,
    T3D_INPUT_GAMEPAD = 0x08,
    T3D_INPUT_GYROSCOPE = 0x10,
    T3D_INPUT_ACCELEROMETER = 0x20,
    T3D_INPUT_PROXIMITY = 0x40
} T3D_INPUT_TYPE;

typedef struct T3D_InputEvent {
    uint32_t device_id;
    uint32_t button_id;
    float axis_value[4];        // x, y, z, w
    float pressure;             // 0.0 - 1.0 (touch pressure)
    uint64_t timestamp_ns;      // Nanosecond precision
    uint8_t type;               // PRESS, HOLD, RELEASE, MOTION
    uint8_t modifiers;          // SHIFT, CTRL, ALT, META
} T3D_InputEvent;

typedef struct T3D_InputState {
    T3D_InputEvent events[T3D_MAX_INPUT_EVENTS];  // Ring buffer: 256 events
    uint32_t head;
    uint32_t tail;
    uint8_t key_state[T3D_MAX_KEYS];              // 512 keys
    float axis_state[T3D_MAX_AXES];               // 64 axes
    T3D_TouchPoint touches[T3D_MAX_TOUCH];        // 10 multi-touch
} T3D_InputState;
```

**Keyboard Mapping (Android 5+):**
- `AKEYCODE_*` mapping ke T3D virtual keycodes
- Soft keyboard detection via `InputMethodManager`
- Hardware keyboard support via `KeyEvent`
- Back button = `T3D_KEY_ANDROID_BACK` (special handling)
- Menu/Recent = intercepted untuk pause/resume

**Touch System (Android Optimized):**
```c
typedef struct T3D_TouchPoint {
    int32_t id;                 // Pointer ID (Android MotionEvent)
    float x, y;                 // Screen coordinates (0.0 - 1.0 normalized)
    float raw_x, raw_y;         // Raw pixel coordinates
    float pressure;
    float size;
    float tilt_x, tilt_y;       // Stylus support (API 24+)
    uint64_t down_time;
    uint64_t event_time;
    uint8_t phase;              // BEGAN, MOVED, STATIONARY, ENDED, CANCELLED
} T3D_TouchPoint;

// Android NDK Implementation:
// - AInputEvent_getType() == AINPUT_EVENT_TYPE_MOTION
// - AMotionEvent_getAction() & AMOTION_EVENT_ACTION_MASK
// - AMotionEvent_getPointerCount() up to 10 fingers
// - AMotionEvent_getHistorical*() untuk sub-frame precision
```

**Gamepad (Android 5+ API 21+):**
```c
typedef struct T3D_GamepadState {
    uint32_t device_id;
    char name[64];
    uint8_t buttons;            // Bitmask: A,B,X,Y,L1,R1,L2,R2,Start,Select,LS,RS
    float left_stick[2];        // -1.0 to 1.0 with deadzone
    float right_stick[2];
    float left_trigger;
    float right_trigger;
    float deadzone;             // Configurable: default 0.15
    uint8_t is_connected;
    uint8_t has_vibration;      // API 26+ vibrator support
} T3D_GamepadState;

// Android Implementation:
// - AInputEvent_getSource() & AINPUT_SOURCE_GAMEPAD
// - KeyEvent: KEYCODE_BUTTON_A through KEYCODE_BUTTON_R2
// - MotionEvent: AXIS_X, AXIS_Y (left stick), AXIS_Z, AXIS_RZ (right stick)
// - AXIS_LTRIGGER, AXIS_RTRIGGER
// - InputDevice.getVibrator() untuk haptic feedback (API 26+)
```

**Sensor Integration (Android):**
```c
typedef struct T3D_SensorState {
    float gyro[3];              // rad/s (ASENSOR_TYPE_GYROSCOPE)
    float accel[3];             // m/s^2 (ASENSOR_TYPE_ACCELEROMETER)
    float magnet[3];            // uT (ASENSOR_TYPE_MAGNETIC_FIELD)
    float gravity[3];           // m/s^2 (ASENSOR_TYPE_GRAVITY - fused)
    float rotation[4];          // Quaternion (ASENSOR_TYPE_ROTATION_VECTOR)
    float light;                // lux (ASENSOR_TYPE_LIGHT)
    float proximity;            // cm (ASENSOR_TYPE_PROXIMITY)
    float step_count;           // ASENSOR_TYPE_STEP_COUNTER (API 19+)
} T3D_SensorState;

// Implementation:
// - ASensorManager* mgr = ASensorManager_getInstance();
// - ASensorEventQueue* queue = ASensorManager_createEventQueue();
// - Polling rate: 60Hz (GAME) untuk gyro, 30Hz untuk others
// - Sensor fusion untuk rotation vector jika tidak tersedia
```

**B. WINDOW & DISPLAY SUBSYSTEM**
```c
typedef struct T3D_WindowConfig {
    uint32_t width;
    uint32_t height;
    uint32_t refresh_rate;      // Target: 60fps mobile
    uint8_t fullscreen;
    uint8_t vsync;              // 1 = enabled, 0 = disabled
    uint8_t color_format;       // RGBA8888, RGB565 (low-end)
    uint8_t depth_format;       // DEPTH24, DEPTH16 (low-end)
    uint8_t multisample;        // 0, 2, 4, 8 (0 for low-end)
    uint8_t orientation;        // PORTRAIT, LANDSCAPE, AUTO
} T3D_WindowConfig;

// Android ANativeWindow:
// - ANativeWindow_setBuffersGeometry() untuk format control
// - ANativeWindow_getWidth/Height() untuk size query
// - Surface rotation handling via nativeWindow transform
// - Safe area insets untuk notch/display cutout (API 28+)
```

**C. FILE SYSTEM SUBSYSTEM**
```c
typedef struct T3D_FileHandle {
    int32_t fd;
    uint64_t size;
    uint64_t position;
    uint8_t mode;               // READ, WRITE, APPEND
    char path[T3D_MAX_PATH];
} T3D_FileHandle;

// Android File Paths:
// - Internal: /data/data/<package>/files/ (persistent, private)
// - External: /sdcard/Android/data/<package>/files/ (persistent, shared)
// - OBB: /sdcard/Android/obb/<package>/ (expansion files)
// - APK Asset: via AAssetManager_open()
// - Content URI: via ContentResolver (API 19+ untuk external files)

typedef enum T3D_FILE_LOCATION {
    T3D_FILE_INTERNAL = 0,
    T3D_FILE_EXTERNAL,
    T3D_FILE_APK_ASSET,
    T3D_FILE_OBB,
    T3D_FILE_CACHE
} T3D_FILE_LOCATION;

// Optimized read untuk Android:
// - AAsset* asset = AAssetManager_open(mgr, path, AASSET_MODE_STREAMING);
// - AAsset_getLength(), AAsset_read(), AAsset_close()
// - Memory mapping: AASSET_MODE_BUFFER untuk small files (<1MB)
// - Streaming: AASSET_MODE_STREAMING untuk large files (>1MB)
```

**D. THREAD SUBSYSTEM**
```c
typedef struct T3D_Thread {
    pthread_t handle;
    uint32_t id;
    char name[16];
    uint8_t priority;           // 0-255 (Android: nice value mapping)
    uint8_t affinity;           // CPU core mask
    void* stack_base;
    size_t stack_size;          // Default: 1MB, Min: 256KB
} T3D_Thread;

// Android Threading:
// - pthread_create() dengan custom stack size
// - pthread_setname_np() untuk debugging
// - sched_setaffinity() untuk core pinning
// - setpriority(PRIO_PROCESS, 0, nice) untuk priority
// - Thread pools: 4 worker threads untuk quad-core (Android 5 typical)
```

#### 0.1.3 Logika & Algoritma

**Input Polling Algorithm:**
```c
void T3D_PollInput(T3D_InputState* state) {
    AInputEvent* event = NULL;
    while (AInputQueue_getEvent(inputQueue, &event) >= 0) {
        int32_t type = AInputEvent_getType(event);

        if (type == AINPUT_EVENT_TYPE_KEY) {
            T3D_ProcessKeyEvent(state, event);
        } else if (type == AINPUT_EVENT_TYPE_MOTION) {
            int32_t source = AInputEvent_getSource(event);
            if (source & AINPUT_SOURCE_TOUCHSCREEN) {
                T3D_ProcessTouchEvent(state, event);
            } else if (source & (AINPUT_SOURCE_GAMEPAD | AINPUT_SOURCE_JOYSTICK)) {
                T3D_ProcessGamepadEvent(state, event);
            }
        }
        AInputQueue_finishEvent(inputQueue, event, 1);
    }
}
```

**Touch Gesture Recognition:**
```c
typedef enum T3D_GESTURE {
    T3D_GESTURE_NONE = 0,
    T3D_GESTURE_TAP,
    T3D_GESTURE_DOUBLE_TAP,
    T3D_GESTURE_LONG_PRESS,
    T3D_GESTURE_SWIPE_LEFT,
    T3D_GESTURE_SWIPE_RIGHT,
    T3D_GESTURE_SWIPE_UP,
    T3D_GESTURE_SWIPE_DOWN,
    T3D_GESTURE_PINCH_IN,
    T3D_GESTURE_PINCH_OUT,
    T3D_GESTURE_PAN
} T3D_GESTURE;

// Algorithm:
// - Tap: touch down + up within 200ms, movement < 20px
// - Double Tap: two taps within 300ms
// - Long Press: touch down > 500ms, movement < 20px
// - Swipe: velocity > threshold, direction determined by delta
// - Pinch: distance between two touches changes > threshold
```

#### 0.1.4 Implementasi Android 5+ Spesifik

**Lifecycle Management:**
```c
// Android Activity Lifecycle mapping:
// onCreate()    -> T3D_Init()
// onStart()     -> T3D_ResumeAudio()
// onResume()    -> T3D_Resume(), ANativeActivity_setWindowFlags()
// onPause()     -> T3D_Pause(), save state
// onStop()      -> T3D_Suspend(), release resources
// onDestroy()   -> T3D_Shutdown()
// onSaveInstanceState() -> T3D_SerializeState()

// Window focus handling:
// - onWindowFocusChanged(true) -> resume rendering
// - onWindowFocusChanged(false) -> pause rendering, show pause UI
```

**Memory Pressure Handling:**
```c
// onTrimMemory() callbacks:
// TRIM_MEMORY_RUNNING_MODERATE -> Reduce texture quality
// TRIM_MEMORY_RUNNING_LOW -> Unload distant chunks
// TRIM_MEMORY_RUNNING_CRITICAL -> Pause non-essential systems
// TRIM_MEMORY_UI_HIDDEN -> Aggressive resource cleanup
// TRIM_MEMORY_COMPLETE -> Emergency state save & exit
```

---

### 0.2 MEMORY MANAGER
**Files:** `t3d_memory.h` | `t3d_allocator.c` | `t3d_pool.c` | `t3d_arena.c`

#### 0.2.1 Arsitektur & Struktur
```
Memory/
├── t3d_memory.h              # Public API
├── t3d_allocator.c           # General purpose allocator
├── t3d_pool.c                # Fixed-size object pool
├── t3d_arena.c               # Linear/stack allocator
├── t3d_stack.c               # Stack allocator (LIFO)
├── t3d_bump.c                # Bump allocator (frame-based)
├── t3d_leak_detector.c       # Debug leak tracking
└── t3d_budget.c              # RAM budget enforcement
```

#### 0.2.2 Komponen & Modul Detail

**A. CUSTOM ALLOCATOR (No GC)**
```c
// Design Philosophy: Zero fragmentation, predictable allocation,
// manual memory management dengan safety checks

typedef struct T3D_Allocator {
    void* heap_base;
    size_t heap_size;
    size_t used;
    size_t peak;

    // Free list untuk variable-size allocations
    T3D_FreeBlock* free_list;

    // Allocation tracking (debug builds only)
    #ifdef T3D_DEBUG
    T3D_AllocationInfo* allocations;
    uint32_t alloc_count;
    uint32_t alloc_capacity;
    #endif
} T3D_Allocator;

// Allocation strategy: Best-fit dengan splitting
// - Minimum block size: 16 bytes (alignment)
// - Alignment: 8 bytes (ARM32), 16 bytes (ARM64)
// - Coalescing: automatic saat free

typedef struct T3D_FreeBlock {
    size_t size;
    struct T3D_FreeBlock* next;
    uint32_t magic;             // 0xDEADBEEF untuk corruption detection
} T3D_FreeBlock;

void* T3D_Alloc(T3D_Allocator* alloc, size_t size, uint32_t alignment) {
    // 1. Align size up to alignment boundary
    size = T3D_AlignUp(size, alignment);

    // 2. Find best-fit block
    T3D_FreeBlock* best = NULL;
    T3D_FreeBlock** best_prev = NULL;
    size_t best_size = SIZE_MAX;

    T3D_FreeBlock** current = &alloc->free_list;
    while (*current) {
        if ((*current)->size >= size && (*current)->size < best_size) {
            best = *current;
            best_prev = current;
            best_size = (*current)->size;
        }
        current = &(*current)->next;
    }

    // 3. Split block jika cukup besar
    if (best && best->size >= size + sizeof(T3D_FreeBlock) + 16) {
        T3D_FreeBlock* remaining = (T3D_FreeBlock*)((uint8_t*)best + size);
        remaining->size = best->size - size;
        remaining->next = best->next;
        remaining->magic = 0xDEADBEEF;
        *best_prev = remaining;
    } else if (best) {
        *best_prev = best->next;
    }

    // 4. Return block
    if (best) {
        alloc->used += size;
        if (alloc->used > alloc->peak) alloc->peak = alloc->used;
        #ifdef T3D_DEBUG
        T3D_TrackAllocation(alloc, best, size, __FILE__, __LINE__);
        #endif
        return best;
    }

    return NULL;  // Out of memory
}
```

**B. OBJECT POOL**
```c
// Untuk frequently allocated/deallocated objects:
// - Particles, bullets, audio sources, UI elements

typedef struct T3D_Pool {
    void* memory;
    size_t object_size;
    size_t object_count;
    size_t alignment;

    // Free list menggunakan index (cache friendly)
    uint32_t* free_indices;
    uint32_t free_count;
    uint32_t capacity;

    // Bitmask untuk fast allocation status (1 bit per object)
    uint64_t* usage_mask;

    // Generation counter untuk handle validation
    uint16_t* generations;
} T3D_Pool;

// Pool Handle: 32-bit
// - Bits 0-15: Index
// - Bits 16-31: Generation
// - 0 = invalid handle

typedef uint32_t T3D_PoolHandle;

#define T3D_POOL_HANDLE_INDEX(h) ((h) & 0xFFFF)
#define T3D_POOL_HANDLE_GENERATION(h) (((h) >> 16) & 0xFFFF)
#define T3D_POOL_MAKE_HANDLE(index, gen) (((gen) << 16) | (index))

T3D_PoolHandle T3D_PoolAlloc(T3D_Pool* pool) {
    if (pool->free_count == 0) return 0;  // Pool exhausted

    uint32_t index = pool->free_indices[--pool->free_count];
    uint32_t word = index / 64;
    uint32_t bit = index % 64;
    pool->usage_mask[word] |= (1ULL << bit);
    pool->generations[index]++;

    return T3D_POOL_MAKE_HANDLE(index, pool->generations[index]);
}

void T3D_PoolFree(T3D_Pool* pool, T3D_PoolHandle handle) {
    uint32_t index = T3D_POOL_HANDLE_INDEX(handle);
    uint16_t gen = T3D_POOL_HANDLE_GENERATION(handle);

    // Validate handle
    if (index >= pool->capacity) return;
    if (pool->generations[index] != gen) return;  // Double-free atau stale handle

    uint32_t word = index / 64;
    uint32_t bit = index % 64;
    pool->usage_mask[word] &= ~(1ULL << bit);
    pool->free_indices[pool->free_count++] = index;
    // Generation TIDAK di-increment saat free (hanya saat alloc)
}
```

**C. ARENA ALLOCATOR (Frame-Based)**
```c
// Untuk allocations yang lifetime-nya 1 frame:
// - Temporary strings, collision queries, debug draws

typedef struct T3D_Arena {
    uint8_t* base;
    size_t size;
    size_t offset;
    size_t marker;              // Save/restore point
} T3D_Arena;

void* T3D_ArenaPush(T3D_Arena* arena, size_t size, uint32_t alignment) {
    size_t aligned_offset = T3D_AlignUp(arena->offset, alignment);
    if (aligned_offset + size > arena->size) {
        // Fallback: allocate dari general heap (slow path)
        return T3D_Alloc(arena->fallback, size, alignment);
    }
    void* ptr = arena->base + aligned_offset;
    arena->offset = aligned_offset + size;
    return ptr;
}

void T3D_ArenaReset(T3D_Arena* arena) {
    arena->offset = 0;
    arena->marker = 0;
}

// Frame Arena (double buffered):
// - Arena A: current frame
// - Arena B: previous frame (untuk deferred operations)
// - Swap setiap frame end
```

**D. MEMORY BUDGET SYSTEM**
```c
// RAM Budget: 512MB untuk mobile low-end
// Breakdown:
// - Engine overhead: 32MB
// - Assets (textures, meshes, audio): 256MB
// - Runtime (entities, physics, AI): 128MB
// - Frame buffers & render targets: 64MB
// - Audio buffers: 16MB
// - Reserve: 16MB

typedef struct T3D_MemoryBudget {
    size_t total;
    size_t used;
    size_t categories[T3D_BUDGET_COUNT];

    struct {
        size_t limit;
        size_t current;
        size_t peak;
    } categories_detail[T3D_BUDGET_COUNT];
} T3D_MemoryBudget;

// Budget categories:
// T3D_BUDGET_TEXTURES = 0
// T3D_BUDGET_MESHES = 1
// T3D_BUDGET_AUDIO = 2
// T3D_BUDGET_ENTITIES = 3
// T3D_BUDGET_PHYSICS = 4
// T3D_BUDGET_AI = 5
// T3D_BUDGET_UI = 6
// T3D_BUDGET_RENDER = 7
// T3D_BUDGET_STREAMING = 8

void T3D_BudgetAlloc(T3D_MemoryBudget* budget, int category, size_t size) {
    if (budget->categories_detail[category].current + size > 
        budget->categories_detail[category].limit) {
        // Trigger budget exceeded:
        // 1. Unload LRU assets dari category tersebut
        // 2. Reduce quality (texture LOD, mesh LOD)
        // 3. If still exceeded: pause streaming
        T3D_BudgetHandleOverflow(budget, category, size);
    }
    budget->categories_detail[category].current += size;
}
```

**E. LEAK DETECTOR (Debug Builds)**
```c
typedef struct T3D_AllocationInfo {
    void* ptr;
    size_t size;
    const char* file;
    int line;
    const char* function;
    uint64_t timestamp;
    uint32_t stack_trace[8];    // Call stack (jika tersedia)
} T3D_AllocationInfo;

// Report format:
// [LEAK] 0x7f8a3b2c: 1024 bytes allocated at
//        t3d_texture.c:245 (LoadTexture)
//        Stack: LoadTexture -> LoadAsset -> AssetThread
//        Age: 3600 seconds
```

#### 0.2.3 Android 5+ Optimizations

**Low Memory Killer Awareness:**
```c
// Android menggunakan LMK (Low Memory Killer) dengan OOM scores
// - Foreground app: oom_score_adj = 0
// - Background app: oom_score_adj = 1000 (killed first)

// Strategy:
// 1. Monitor /proc/self/oom_score_adj
// 2. Jika score meningkat (app ke background), immediately:
//    - Save game state
//    - Release non-essential textures
//    - Pause audio
//    - Reduce physics tick rate

// 3. Jika score = 0 (foreground), restore full operation
```

**Ashmem (Anonymous Shared Memory):**
```c
// Untuk large buffer sharing antara native dan Java:
// - Texture data streaming
// - Audio buffer sharing
// - IPC antara game process dan service process

// API: android/os/SharedMemory (API 27+) atau ashmem directly
// - ashmem_create_region(name, size)
// - mmap() untuk mapping
// - ashmem_set_pin_region() untuk pinning
```

**ION Memory Allocator:**
```c
// Untuk zero-copy GPU buffer sharing:
// - ION allocates contiguous physical memory
// - Shared antara CPU dan GPU (avoid copy)
// - Essential untuk texture streaming performance

// Implementation via libion atau gralloc
// - ion_alloc(fd, len, align, heap_id_mask, flags)
// - ion_map(fd, len, prot, flags, handle, ptr)
```

---

### 0.3 JOB SYSTEM
**Files:** `t3d_job.h` | `t3d_threadpool.c` | `t3d_fiber.c` | `t3d_taskgraph.c`

#### 0.3.1 Arsitektur & Struktur
```
JobSystem/
├── t3d_job.h                 # Job API
├── t3d_threadpool.c          # Worker thread management
├── t3d_fiber.c               # Fiber/coroutine implementation
├── t3d_taskgraph.c           # Dependency graph execution
├── t3d_workstealing.c        # Work-stealing queue
└── t3d_job_profiler.c        # Job timing & profiling
```

#### 0.3.2 Komponen & Modul Detail

**A. THREAD POOL**
```c
// Android 5+ typical hardware: 4-core ARM Cortex-A53
// - 1 main thread (rendering, logic)
// - 3 worker threads (physics, AI, streaming)
// - 1 IO thread (file operations, network)

#define T3D_MAX_WORKERS 8
#define T3D_MAX_JOBS 1024

typedef struct T3D_ThreadPool {
    T3D_Thread workers[T3D_MAX_WORKERS];
    uint32_t worker_count;

    // Job queues (per worker untuk cache locality)
    T3D_JobQueue local_queues[T3D_MAX_WORKERS];

    // Global queue untuk overflow
    T3D_JobQueue global_queue;

    // Synchronization
    pthread_mutex_t global_mutex;
    pthread_cond_t work_available;

    // Atomic counters
    atomic_uint job_count;
    atomic_uint completed_count;

    // Running flag
    atomic_int running;
} T3D_ThreadPool;

// Job definition:
typedef struct T3D_Job {
    uint32_t id;
    void (*function)(void* data);
    void* data;
    uint32_t data_size;         // Inline data untuk cache locality

    // Dependencies
    uint32_t dependency_count;
    uint32_t dependencies[8];   // Job IDs yang harus selesai dulu
    atomic_int dependency_remaining;

    // Continuation (job yang dijalankan setelah ini selesai)
    uint32_t continuation;

    // Priority: 0 = highest, 255 = lowest
    uint8_t priority;

    // Affinity: which worker can execute (0xFF = any)
    uint8_t affinity;

    // Label untuk profiling
    const char* label;
} T3D_Job;
```

**B. WORK-STEALING QUEUE**
```c
// Lock-free work-stealing queue (Chase-Lev algorithm)
// - Push/Pop oleh owner thread (bottom)
// - Steal oleh other threads (top)

typedef struct T3D_JobQueue {
    T3D_Job* jobs;
    atomic_size_t top;          // Steal index
    atomic_size_t bottom;       // Push/Pop index
    size_t capacity;            // Power of 2
} T3D_JobQueue;

void T3D_QueuePush(T3D_JobQueue* q, T3D_Job* job) {
    size_t b = atomic_load_explicit(&q->bottom, memory_order_relaxed);
    q->jobs[b & (q->capacity - 1)] = *job;
    atomic_thread_fence(memory_order_release);
    atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
}

T3D_Job* T3D_QueuePop(T3D_JobQueue* q) {
    size_t b = atomic_load_explicit(&q->bottom, memory_order_relaxed) - 1;
    atomic_store_explicit(&q->bottom, b, memory_order_relaxed);
    atomic_thread_fence(memory_order_seq_cst);
    size_t t = atomic_load_explicit(&q->top, memory_order_relaxed);

    if (t <= b) {
        T3D_Job* job = &q->jobs[b & (q->capacity - 1)];
        if (t == b) {
            // Last item, race dengan stealers
            if (!atomic_compare_exchange_strong(&q->top, &t, t + 1)) {
                atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
                return NULL;
            }
            atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
        }
        return job;
    }
    atomic_store_explicit(&q->bottom, b + 1, memory_order_relaxed);
    return NULL;
}

T3D_Job* T3D_QueueSteal(T3D_JobQueue* q) {
    size_t t = atomic_load_explicit(&q->top, memory_order_acquire);
    atomic_thread_fence(memory_order_seq_cst);
    size_t b = atomic_load_explicit(&q->bottom, memory_order_acquire);

    if (t < b) {
        T3D_Job* job = &q->jobs[t & (q->capacity - 1)];
        if (atomic_compare_exchange_strong(&q->top, &t, t + 1)) {
            return job;
        }
    }
    return NULL;
}
```

**C. TASK GRAPH**
```c
// Directed Acyclic Graph (DAG) untuk job dependencies
// Contoh: Physics -> AI -> Rendering (sequential dependencies)
//         Physics jobs 1-100 (parallel) -> Physics sync -> AI jobs 1-100 (parallel)

typedef struct T3D_TaskGraph {
    T3D_Job* jobs;
    uint32_t job_count;
    uint32_t capacity;

    // Adjacency list
    uint32_t* edges;            // [from_index, to_index, from, to, ...]
    uint32_t edge_count;

    // Reverse edges (untuk unload)
    uint32_t* reverse_edges;

    // Load order (topological sort result)
    uint32_t* load_order;
} T3D_TaskGraph;

// Build phases via topological sort:
// 1. Calculate in-degree untuk setiap job
// 2. Queue jobs dengan in-degree = 0 (no dependencies)
// 3. Process queue: decrement in-degree of dependents
// 4. Jobs dengan in-degree = 0 masuk phase berikutnya
// 5. Repeat until all jobs processed

// Example frame graph:
// Phase 0: [InputPoll, AudioUpdate, NetworkReceive]
// Phase 1: [PhysicsStep1, PhysicsStep2, ...] (parallel)
// Phase 2: [PhysicsSync]
// Phase 3: [AIUpdate1, AIUpdate2, ...] (parallel)
// Phase 4: [GameLogic, Animation]
// Phase 5: [Culling, ShadowGen]
// Phase 6: [RenderOpaque, RenderTransparent]
// Phase 7: [PostProcess, UIRender]
// Phase 8: [Present, NetworkSend]
```

**D. FIBER SYSTEM (User-Level Threading)**
```c
// Fibers untuk cooperative multitasking dalam single thread
// - Avoid context switch overhead dari OS threads
// - Ideal untuk coroutine-style gameplay code

// Android 5+ tidak memiliki native fiber support
// Implementasi manual menggunakan ucontext atau assembly

// ARM64 Fiber Context:
typedef struct T3D_FiberContext {
    uint64_t x19, x20, x21, x22, x23, x24, x25, x26, x27, x28;
    uint64_t fp;                // x29
    uint64_t lr;                // x30
    uint64_t sp;
    uint64_t pc;
    uint64_t vregs[16];         // d8-d23 (callee-saved SIMD)
    uint8_t* stack;
    size_t stack_size;
} T3D_FiberContext;

// Switch assembly (ARM64):
// __t3d_fiber_switch:
//     // Save current context
//     stp x19, x20, [x0, #0]
//     stp x21, x22, [x0, #16]
//     ...
//     str x30, [x0, #80]
//     mov x19, sp
//     str x19, [x0, #88]
//     str x30, [x0, #96]      // PC = LR
//     
//     // Load new context
//     ldp x19, x20, [x1, #0]
//     ...
//     ldr x19, [x1, #88]
//     mov sp, x19
//     ldr x19, [x1, #96]
//     br x19                   // Jump to new PC
```

#### 0.3.3 Job Categories & Scheduling

```c
typedef enum T3D_JOB_TYPE {
    T3D_JOB_PHYSICS = 0,       // Physics simulation steps
    T3D_JOB_AI,                // AI tick updates
    T3D_JOB_STREAMING,         // Asset streaming
    T3D_JOB_ANIMATION,         // Animation blending
    T3D_JOB_CULLING,           // Frustum/occlusion culling
    T3D_JOB_PARTICLE,          // Particle simulation
    T3D_JOB_AUDIO,             // Audio mixing
    T3D_JOB_PATHFINDING,       // Pathfinding queries
    T3D_JOB_PROCEDURAL,        // Procedural generation
    T3D_JOB_COUNT
} T3D_JOB_TYPE;

// Scheduling policy:
// - Physics: 1 job per physics island (parallel)
// - AI: 1 job per 100 entities (batch processing)
// - Streaming: 1 persistent job (background priority)
// - Animation: 1 job per skeleton (parallel)
// - Culling: 1 job per 1024 entities (parallel)
```

---

### 0.4 EVENT BUS
**Files:** `t3d_event.h` | `t3d_eventbus.c`

#### 0.4.1 Arsitektur & Struktur
```
EventBus/
├── t3d_event.h               # Event types & data structures
├── t3d_eventbus.c            # Pub-Sub implementation
├── t3d_eventqueue.c          # Buffered event queue
└── t3d_eventprofiler.c       # Event flow visualization
```

#### 0.4.2 Komponen & Modul Detail

**A. EVENT SYSTEM (Zero Coupling)**
```c
// Design: Publisher-Subscriber pattern dengan type-safe events
// - No direct references antara systems
// - Events adalah immutable data structures
// - Delivery: Immediate (synchronous) atau Queued (asynchronous)

typedef uint32_t T3D_EventType;

// Predefined event types (hash dari string nama):
#define T3D_EVENT_ON_DAMAGE         0x8A3B2C1D
#define T3D_EVENT_ON_DEATH          0x9C4D3E2F
#define T3D_EVENT_ON_LOAD_CHUNK     0xA5E6F7G8
#define T3D_EVENT_ON_PLAYER_JOIN    0xB6F7G8H9
#define T3D_EVENT_ON_QUEST_COMPLETE 0xC7G8H9I0
#define T3D_EVENT_ON_INVENTORY_CHANGE 0xD8H9I0J1
#define T3D_EVENT_ON_WEATHER_CHANGE 0xE9I0J1K2

// Event data union (max 64 bytes untuk cache line):
typedef union T3D_EventData {
    // Damage event
    struct {
        T3D_EntityID attacker;
        T3D_EntityID victim;
        float damage;
        uint32_t damage_type;   // Fire, Ice, Physical, etc.
        T3D_Vec3 hit_position;
        T3D_Vec3 hit_normal;
    } damage;

    // Chunk load event
    struct {
        int32_t chunk_x, chunk_y, chunk_z;
        uint32_t lod_level;
        void* chunk_data;
    } chunk;

    // Generic 64-byte payload
    uint8_t raw[64];
} T3D_EventData;

typedef struct T3D_Event {
    T3D_EventType type;
    uint32_t sender_id;         // Entity atau system ID
    uint64_t timestamp;
    uint32_t priority;          // 0 = critical, 255 = low
    T3D_EventData data;
} T3D_Event;
```

**B. SUBSCRIPTION SYSTEM**
```c
typedef void (*T3D_EventHandler)(const T3D_Event* event, void* user_data);

typedef struct T3D_Subscription {
    T3D_EventType type;
    T3D_EventHandler handler;
    void* user_data;
    uint32_t priority;          // Execution order (lower = first)
    uint8_t active;
} T3D_Subscription;

// Subscription table: hash map dari event type ke array subscriptions
// - Chaining untuk collision resolution
// - Array sorted by priority

typedef struct T3D_EventBus {
    T3D_Subscription* subscriptions;
    uint32_t sub_count;
    uint32_t sub_capacity;

    // Event queue untuk asynchronous events
    T3D_Event* event_queue;
    uint32_t queue_head;
    uint32_t queue_tail;
    uint32_t queue_capacity;

    pthread_mutex_t queue_mutex;
} T3D_EventBus;

// API:
T3D_SubscriptionID T3D_Subscribe(T3D_EventBus* bus, T3D_EventType type, 
                                  T3D_EventHandler handler, void* user_data, 
                                  uint32_t priority);
void T3D_Unsubscribe(T3D_EventBus* bus, T3D_SubscriptionID id);
void T3D_Publish(T3D_EventBus* bus, const T3D_Event* event, uint8_t immediate);
void T3D_ProcessEvents(T3D_EventBus* bus);  // Flush queued events
```

**C. EVENT PROFILING**
```c
// Track event flow untuk debugging:
// - Event creation timestamp
// - Handler execution time
// - Handler call count
// - Event drop count (queue full)

typedef struct T3D_EventProfile {
    T3D_EventType type;
    uint64_t fire_count;
    uint64_t total_handler_time_us;
    uint64_t max_handler_time_us;
    uint64_t queue_overflow_count;
    uint32_t subscriber_count;
} T3D_EventProfile;
```

---

### 0.5 TIME SYSTEM
**Files:** `t3d_time.h` | `t3d_clock.c`

#### 0.5.1 Arsitektur & Struktur
```
TimeSystem/
├── t3d_time.h                # Time API & constants
├── t3d_clock.c               # High-precision clock
├── t3d_timestep.c            # Fixed/variable timestep
├── t3d_timescale.c           # Time dilation
└── t3d_replay.c              # Replay recording & playback
```

#### 0.5.2 Komponen & Modul Detail

**A. HIGH-PRECISION CLOCK**
```c
// Android: clock_gettime(CLOCK_MONOTONIC) untuk elapsed time
//          clock_gettime(CLOCK_REALTIME) untuk wall clock
// Resolution: 1 nanosecond (theoretical), ~1 microsecond (practical)

typedef struct T3D_Clock {
    uint64_t start_time_ns;     // Application start
    uint64_t last_frame_time_ns;
    uint64_t current_time_ns;

    // Frame timing
    float delta_time;           // Seconds since last frame
    float smoothed_delta_time;  // Exponential moving average
    float fixed_delta_time;     // 1/60 = 0.0166667

    // Time scale
    float time_scale;           // 1.0 = normal, 0.0 = paused, 2.0 = 2x speed
    float unscaled_delta_time;  // Before time_scale application

    // Frame counter
    uint64_t frame_count;
    uint32_t fps;
    uint32_t fps_frame_count;
    float fps_timer;

    // Slow motion
    float slowmo_target;        // Target time scale
    float slowmo_current;       // Current interpolated value
    float slowmo_blend_speed;   // How fast to blend (units/sec)
} T3D_Clock;

// Android implementation:
// struct timespec ts;
// clock_gettime(CLOCK_MONOTONIC, &ts);
// uint64_t ns = (uint64_t)ts.tv_sec * 1000000000ULL + ts.tv_nsec;
```

**B. FIXED TIMESTEP (60 FPS LOGIC)**
```c
// Game logic runs at fixed 60Hz regardless of render framerate
// - Physics stability
// - Deterministic simulation
// - Replay compatibility

void T3D_FixedUpdate(T3D_Clock* clock, void (*update)(float dt)) {
    static float accumulator = 0.0f;
    accumulator += clock->unscaled_delta_time * clock->time_scale;

    const float fixed_dt = clock->fixed_delta_time;
    const float max_accumulator = fixed_dt * 5;  // Max 5 frames behind

    if (accumulator > max_accumulator) {
        accumulator = max_accumulator;  // Prevent spiral of death
    }

    while (accumulator >= fixed_dt) {
        update(fixed_dt);
        accumulator -= fixed_dt;
        clock->frame_count++;
    }

    // Interpolation factor untuk rendering (0.0 - 1.0)
    clock->interpolation_alpha = accumulator / fixed_dt;
}
```

**C. TIME SCALE & SLOW MOTION**
```c
void T3D_SetTimeScale(T3D_Clock* clock, float target, float blend_duration) {
    clock->slowmo_target = target;
    clock->slowmo_blend_speed = 1.0f / blend_duration;
}

void T3D_UpdateTimeScale(T3D_Clock* clock, float dt) {
    float diff = clock->slowmo_target - clock->slowmo_current;
    if (fabsf(diff) > 0.001f) {
        float step = clock->slowmo_blend_speed * dt;
        if (diff > 0) {
            clock->slowmo_current = fminf(clock->slowmo_current + step, 
                                           clock->slowmo_target);
        } else {
            clock->slowmo_current = fmaxf(clock->slowmo_current - step, 
                                           clock->slowmo_target);
        }
    }
    clock->time_scale = clock->slowmo_current;
}
```

**D. REPLAY SYSTEM**
```c
// Record all inputs dan game state untuk playback
// - Deterministic replay (same inputs = same output)
// - Compression: delta encoding + LZ4
// - Storage: ~1MB per minute (input recording only)

typedef struct T3D_ReplayFrame {
    uint32_t frame_number;
    T3D_InputState input;
    uint32_t random_seed;       // Untuk deterministic RNG
    // Optional: periodic full state snapshot
} T3D_ReplayFrame;

// Recording:
// - Setiap fixed timestep: capture input state
// - Every 60 frames (1 second): capture RNG seed
// - Every 300 frames (5 seconds): capture full state snapshot

// Playback:
// - Load initial state
// - Apply recorded inputs per frame
// - Interpolate untuk smooth rendering
```

---

### 0.6 LOGGING & CRASH REPORT
**Files:** `t3d_log.h` | `t3d_log.c` | `t3d_crash.c`

#### 0.6.1 Arsitektur & Struktur
```
Logging/
├── t3d_log.h                 # Log levels & macros
├── t3d_log.c                 # Log output management
├── t3d_log_android.c         # Android logcat integration
├── t3d_crash.c               # Crash handler
├── t3d_crash_android.c       # Android signal handling
├── t3d_sentry.c              # Sentry.io integration
└── t3d_dmp.c                 # Minidump generation
```

#### 0.6.2 Komponen & Modul Detail

**A. LOG SYSTEM**
```c
typedef enum T3D_LOG_LEVEL {
    T3D_LOG_VERBOSE = 0,       // Detailed tracing
    T3D_LOG_DEBUG,             // Development info
    T3D_LOG_INFO,              // General information
    T3D_LOG_WARN,              // Warning (non-fatal)
    T3D_LOG_ERROR,             // Error (recoverable)
    T3D_LOG_FATAL              // Fatal (crash imminent)
} T3D_LOG_LEVEL;

// Log format:
// [2024-01-15 14:32:15.123] [INFO] [Physics] Body 1234 sleeping
// [2024-01-15 14:32:15.124] [WARN] [Texture] Failed to load: missing.t3d
// [2024-01-15 14:32:15.125] [ERROR] [Memory] Out of memory: requested 64MB

// Android integration:
// __android_log_print(ANDROID_LOG_INFO, "T3D", "...");
// Log levels map ke android log levels

// Log output targets:
// - Console (debug builds)
// - File (rotating: max 5 files, 10MB each)
// - Android Logcat (always)
// - Network (Sentry, Firebase Crashlytics)
// - In-game overlay (debug builds)

// Macros dengan automatic file/line:
#define T3D_LOG(level, tag, fmt, ...) \
    T3D_LogWrite(level, tag, __FILE__, __LINE__, fmt, ##__VA_ARGS__)
#define T3D_LOGD(tag, fmt, ...) T3D_LOG(T3D_LOG_DEBUG, tag, fmt, ##__VA_ARGS__)
#define T3D_LOGI(tag, fmt, ...) T3D_LOG(T3D_LOG_INFO, tag, fmt, ##__VA_ARGS__)
#define T3D_LOGW(tag, fmt, ...) T3D_LOG(T3D_LOG_WARN, tag, fmt, ##__VA_ARGS__)
#define T3D_LOGE(tag, fmt, ...) T3D_LOG(T3D_LOG_ERROR, tag, fmt, ##__VA_ARGS__)
```

**B. CRASH HANDLER**
```c
// Android signal handling:
// - SIGSEGV (segmentation fault)
// - SIGABRT (abort)
// - SIGFPE (floating point exception)
// - SIGILL (illegal instruction)
// - SIGBUS (bus error)

// Signal handler (async-signal-safe only):
static void T3D_CrashHandler(int sig, siginfo_t* info, void* context) {
    // 1. Write crash info ke file (async-signal-safe operations only)
    char buffer[4096];
    int len = snprintf(buffer, sizeof(buffer),
        "CRASH: signal=%d, code=%d, address=%p
"
        "PC=%p, LR=%p
",
        sig, info->si_code, info->si_addr,
        // Extract PC dan LR dari ucontext
        (void*)((ucontext_t*)context)->uc_mcontext.pc,
        (void*)((ucontext_t*)context)->uc_mcontext.regs[30]
    );

    int fd = open("/data/data/<package>/crash.log", O_WRONLY|O_CREAT|O_TRUNC, 0644);
    write(fd, buffer, len);
    close(fd);

    // 2. Generate minidump (breakpad/crashpad)
    T3D_GenerateMinidump();

    // 3. Upload ke server (spawn separate process)
    T3D_UploadCrashReport();

    // 4. Restore default handler dan re-raise signal
    signal(sig, SIG_DFL);
    raise(sig);
}

// Setup:
struct sigaction sa;
sa.sa_sigaction = T3D_CrashHandler;
sa.sa_flags = SA_SIGINFO;
sigaction(SIGSEGV, &sa, NULL);
sigaction(SIGABRT, &sa, NULL);
sigaction(SIGFPE, &sa, NULL);
```

**C. MINIDUMP GENERATION**
```c
// Breakpad-style minidump untuk Android:
// - Thread list dengan registers
// - Memory regions (stack, heap, code)
// - Module list (loaded libraries)
// - Exception info

// Format: .dmp file (custom binary format)
// Upload: HTTP POST ke crash server
// Endpoint: https://crash.t3dengine.com/upload

// Size: ~100KB - 2MB (compressed)
// Generation time: < 50ms
```

---

# LAYER 1: DATA & ASSET PIPELINE
## "Semua adalah Data"

### 1.1 ASSET DATABASE
**Files:** `t3d_asset.h` | `t3d_assetdb.c`

#### 1.1.1 Arsitektur & Struktur
```
AssetDB/
├── t3d_asset.h               # Asset types & handles
├── t3d_assetdb.c             # Database management
├── t3d_guid.c                # GUID generation & validation
├── t3d_dependency.c          # Dependency graph
├── t3d_asset_android.c       # Android asset loading
└── t3d_asset_cache.c         # LRU cache
```

#### 1.1.2 Komponen & Modul Detail

**A. GUID SYSTEM**
```c
// GUID: 128-bit universally unique identifier
// Format: 8-4-4-4-12 hex digits (standard UUID v4)
// Implementation: random-based (cryptographically secure jika tersedia)

typedef struct T3D_GUID {
    uint32_t data1;
    uint16_t data2;
    uint16_t data3;
    uint8_t data4[8];
} T3D_GUID;

// String representation: "550e8400-e29b-41d4-a716-446655440000"

// Android entropy source:
// - /dev/urandom (preferred)
// - Java UUID.randomUUID() via JNI (fallback)
// - getrandom() syscall (API 28+)

// GUID sebagai filename:
// - Avoid filesystem issues dengan special characters
// - Flat storage: semua asset dalam satu directory
// - No nested paths (simplifies lookup)
```

**B. ASSET RECORD**
```c
typedef enum T3D_ASSET_TYPE {
    T3D_ASSET_TEXTURE = 0,
    T3D_ASSET_MESH,
    T3D_ASSET_MATERIAL,
    T3D_ASSET_SHADER,
    T3D_ASSET_AUDIO,
    T3D_ASSET_ANIMATION,
    T3D_ASSET_PREFAB,
    T3D_ASSET_LEVEL,
    T3D_ASSET_FONT,
    T3D_ASSET_SCRIPT,
    T3D_ASSET_DATATABLE,
    T3D_ASSET_COUNT
} T3D_ASSET_TYPE;

typedef struct T3D_AssetRecord {
    T3D_GUID guid;
    T3D_ASSET_TYPE type;
    uint32_t version;           // Asset version untuk hot reload

    // File info
    char source_path[T3D_MAX_PATH];    // Original file path
    char cooked_path[T3D_MAX_PATH];    // Processed file path
    uint64_t source_hash;       // Hash dari source file
    uint64_t cooked_hash;       // Hash dari cooked file
    uint64_t file_size;         // Cooked file size

    // Dependencies
    T3D_GUID dependencies[T3D_MAX_ASSET_DEPS];
    uint32_t dependency_count;

    // Runtime state
    void* runtime_data;         // Pointer ke loaded asset
    uint32_t ref_count;         // Reference count
    uint32_t load_state;        // UNLOADED, LOADING, LOADED, FAILED

    // Cache info
    uint64_t last_access_time;
    uint32_t access_count;
    uint32_t priority;          // Loading priority
} T3D_AssetRecord;
```

**C. DEPENDENCY GRAPH**
```c
// Directed graph: asset A depends on asset B, C, D
// - Cycle detection via DFS
// - Topological sort untuk loading order
// - Reverse dependencies untuk unload tracking

typedef struct T3D_DependencyGraph {
    // Adjacency list
    T3D_GUID* nodes;
    uint32_t* edges;            // [from_index, to_index, ...]
    uint32_t node_count;
    uint32_t edge_count;

    // Reverse edges (untuk unload)
    uint32_t* reverse_edges;

    // Load order (topological sort result)
    uint32_t* load_order;
} T3D_DependencyGraph;

// Loading algorithm:
// 1. Resolve all dependencies recursively
// 2. Topological sort
// 3. Load dalam order (dependencies first)
// 4. Track reverse dependencies
// 5. Unload: only when no reverse dependencies exist
```

**D. FILE WATCHER & HOT RELOAD**
```c
// Android file watcher (debug builds):
// - inotify API untuk file system events
// - Poll interval: 1 second (battery conscious)
// - Watch paths: asset source directories

// Hot reload flow:
// 1. File modification detected
// 2. Re-import asset (background thread)
// 3. Update runtime data (main thread, synchronized)
// 4. Notify subscribers via EventBus
// 5. Update render cache

// Safety:
// - Atomic replacement (double buffering)
// - Rollback jika new asset fails validation
// - Graceful degradation (keep old asset jika reload fails)
```

---

### 1.2 SERIALIZATION
**Files:** `t3d_serialize.h` | `t3d_binary.c` | `t3d_json.c` | `t3d_flatbuffer.c`

#### 1.2.1 Arsitektur & Struktur
```
Serialization/
├── t3d_serialize.h           # Serialization interface
├── t3d_binary.c              # Custom binary format
├── t3d_json.c                # JSON parser/serializer
├── t3d_flatbuffer.c          # FlatBuffers integration
├── t3d_delta.c               # Delta compression
└── t3d_checksum.c            # Integrity verification
```

#### 1.2.2 Komponen & Modul Detail

**A. CUSTOM BINARY FORMAT (.t3d)**
```c
// Binary format specification:
// Header (64 bytes):
// - Magic: "T3D\x01" (4 bytes)
// - Version: uint32
// - Type: uint32 (asset type enum)
// - GUID: 16 bytes
// - Data offset: uint32
// - Data size: uint32
// - Dependency count: uint32
// - Checksum: uint32 (CRC32C)
// - Compression: uint8 (0=none, 1=LZ4, 2=ZSTD)
// - Reserved: 11 bytes

// Data section:
// - Type-specific binary data
// - Aligned ke 8-byte boundary

// Dependency section:
// - Array of GUIDs (16 bytes each)

// Endianness: Little-endian (ARM default)
// Alignment: 8 bytes

// Read algorithm:
// 1. Verify magic dan version
// 2. Check CRC32C checksum
// 3. Decompress jika compressed
// 4. Parse type-specific data
// 5. Resolve dependencies
```

**B. JSON SERIALIZER**
```c
// Untuk: Save games, configs, debug output
// Parser: Recursive descent (no external library)
// - Object: { key: value, ... }
// - Array: [ value, ... ]
// - String: "..." (with escape sequences)
// - Number: integer atau float
// - Boolean: true/false
// - Null: null

// Memory efficient:
// - Streaming parser (SAX-style)
// - No DOM tree (kecuali diperlukan)
// - Reusable string pool

// Example save game:
// {
//   "version": 1,
//   "player": {
//     "name": "Hero",
//     "level": 42,
//     "health": 150.5,
//     "position": [100.0, 50.0, 200.0],
//     "inventory": ["sword_001", "potion_005"]
//   },
//   "quests": {
//     "main": ["quest_001", "quest_002"],
//     "completed": ["quest_000"]
//   }
// }
```

**C. FLATBUFFERS INTEGRATION**
```c
// Untuk: Network messages, asset metadata, UI layouts
// - Zero-copy deserialization
// - Schema-defined types
// - Backward/forward compatibility

// Schema example (asset_metadata.fbs):
// table AssetMetadata {
//   guid: string;
//   type: AssetType;
//   version: int;
//   dependencies: [string];
//   tags: [string];
//   size: ulong;
// }

// Android optimization:
// - Pre-compiled schema (no runtime parsing)
// - Direct memory mapping (no copy)
// - Alignment: 8 bytes untuk ARM64
```

**D. DELTA SAVE SYSTEM**
```c
// Untuk: Frequent save operations (auto-save, checkpoints)
// - Store base state (full save)
// - Store deltas (changes from base)
// - Merge deltas untuk create full state

// Delta format:
// - Operation: ADD, REMOVE, MODIFY
// - Path: dot-notation (player.inventory.3.count)
// - Value: new value (JSON encoded)

// Compression:
// - Base: full state (~1MB)
// - Delta 1: 50KB (changes)
// - Delta 2: 30KB (changes from delta 1)
// - Merge: base + delta1 + delta2 = current state

// Android storage:
// - Internal storage untuk saves (private, secure)
// - Cloud sync via Google Play Games (API 21+)
// - Max save slots: 10 per user
```

---

### 1.3 HOT RELOAD
**Files:** `t3d_hotreload.h` | `t3d_hotreload.c`

#### 1.3.1 Implementasi Detail
```c
// File watcher (debug builds only):
// - Platform: inotify (Linux/Android), FSEvents (macOS), ReadDirectoryChanges (Windows)
// - Watch list: asset source directories
// - Debounce: 500ms (avoid rapid reloads)

// Reload pipeline:
// 1. Detect file change
// 2. Validate file (not locked, not empty)
// 3. Re-import (background thread)
// 4. Generate new cooked asset
// 5. Atomic swap (main thread, frame boundary)
// 6. Notify systems via EventBus
// 7. Update render cache

// Supported asset types untuk hot reload:
// - Textures: immediate (GPU texture update)
// - Shaders: immediate (recompile, pipeline recreate)
// - Meshes: deferred (next frame, avoid mid-render)
// - Materials: immediate
// - Scripts: immediate (VM reload)
// - Data tables: immediate (cache invalidate)

// Safety checks:
// - File size > 0
// - Valid magic header
// - Dependency resolution success
// - Memory budget check
```

---

### 1.4 LOCALIZATION
**Files:** `t3d_locale.h` | `t3d_locale.c` | `t3d_font.c`

#### 1.4.1 Arsitektur & Struktur
```
Localization/
├── t3d_locale.h              # Localization API
├── t3d_locale.c              # String table management
├── t3d_font.c                # Font atlas & rendering
├── t3d_text.c                # Text layout & shaping
├── t3d_rtl.c                 # RTL text support
└── t3d_cjk.c                 # CJK specific handling
```

#### 1.4.2 Komponen & Modul Detail

**A. STRING TABLE**
```c
// 30+ languages support
// Storage: Key-Value pairs dengan fallback chain

// Language codes:
// en, id, ja, ko, zh-CN, zh-TW, es, pt, ru, ar, hi, th, vi, de, fr, it, tr, pl, 
// nl, sv, fi, no, da, cs, hu, ro, el, he, uk, ms

typedef struct T3D_StringTable {
    char language[8];           // Current language code
    char fallback[8];           // Fallback language (default: "en")

    // Hash table: key -> localized string
    T3D_HashTable entries;

    // String pool (deduplicated)
    char* string_pool;
    size_t pool_size;
    size_t pool_used;
} T3D_StringTable;

// Key format: CATEGORY_SUBCATEGORY_IDENTIFIER
// Examples:
// "MENU_PLAY" -> "Play" / "Main" / "遊ぶ"
// "DIALOG_NPC_001_GREETING" -> "Hello, traveler!"
// "ITEM_SWORD_IRON_NAME" -> "Iron Sword"
// "ERROR_NETWORK_TIMEOUT" -> "Connection timed out"

// API:
const char* T3D_GetText(const char* key);
const char* T3D_GetTextFormatted(const char* key, ...);  // printf-style
void T3D_SetLanguage(const char* lang);
```

**B. FONT ATLAS**
```c
// Font rendering untuk multiple languages:
// - Latin: standard TTF/OTF
// - CJK: subset font (hanya karakter yang digunakan)
// - Arabic/Hebrew: RTL shaping dengan HarfBuzz
// - Emoji: Noto Color Emoji (bitmap fallback)

typedef struct T3D_FontAtlas {
    T3D_Texture* texture;       // Glyph texture atlas
    uint32_t texture_size;      // 1024x1024 atau 2048x2048

    // Glyph info
    T3D_GlyphInfo* glyphs;
    uint32_t glyph_count;
    uint32_t glyph_capacity;

    // Font metrics
    float ascent;
    float descent;
    float line_height;
    float baseline;

    // Kerning table (sparse)
    T3D_KerningPair* kerning;
    uint32_t kerning_count;
} T3D_FontAtlas;

// Glyph info:
typedef struct T3D_GlyphInfo {
    uint32_t codepoint;         // Unicode codepoint
    float u0, v0, u1, v1;       // UV coordinates dalam atlas
    float width, height;        // Glyph size
    float advance_x;            // Horizontal advance
    float bearing_x, bearing_y; // Offset dari baseline
    uint8_t is_colored;         // Color emoji flag
} T3D_GlyphInfo;

// Dynamic atlas update:
// - Pre-populate dengan common characters
// - Lazy load uncommon characters on demand
// - LRU eviction jika atlas penuh
```

**C. RTL (RIGHT-TO-LEFT) SUPPORT**
```c
// Arabic, Hebrew, Persian, Urdu support
// - Text direction detection (first strong character)
// - Bidi algorithm (Unicode Bidirectional Algorithm)
// - Glyph shaping (HarfBuzz integration)
// - Ligatures: Arabic lam-alef, etc.

// Implementation:
// 1. Detect text direction per paragraph
// 2. Reorder characters untuk display (logical -> visual)
// 3. Shape Arabic text (isolated, initial, medial, final forms)
// 4. Render dari right to left
// 5. Mixed RTL/LTR: explicit direction marks (LRM, RLM)
```

**D. CJK SPECIFIC**
```c
// Chinese, Japanese, Korean:
// - Font subsetting: only include used characters
// - Vertical text layout (Japanese tategaki)
// - Ruby text (furigana)
// - Line breaking: no spaces, use dictionary

// Font subsetting algorithm:
// 1. Scan all string tables untuk used characters
// 2. Generate subset font (TTF subsetting)
// 3. Create atlas dari subset
// 4. Typical CJK game: 2000-4000 characters = ~2MB atlas
```

---

### 1.5 DATA TABLE
**Files:** `t3d_datatable.h` | `t3d_datatable.c`

#### 1.5.1 Arsitektur & Struktur
```
DataTable/
├── t3d_datatable.h           # Data table API
├── t3d_csv.c                 # CSV parser
├── t3d_binary_table.c        # Compiled binary format
└── t3d_table_editor.c        # In-game editor
```

#### 1.5.2 Komponen & Modul Detail

**A. CSV TO BINARY PIPELINE**
```c
// Source: Excel/Google Sheets -> CSV
// Build: CSV -> Binary (.t3dtbl)
// Runtime: Binary -> Memory structure

// CSV format:
// ID,Name,Type,Damage,Speed,Icon
// sword_001,Iron Sword,weapon,25,1.2,icon_sword_001
// potion_001,Health Potion,consumable,0,0,icon_potion_001

// Binary format (.t3dtbl):
// Header:
// - Magic: "T3DTBL"
// - Version: uint32
// - Row count: uint32
// - Column count: uint32
// - Column types: array of uint8 (INT, FLOAT, STRING, BOOL, REF)
// - String pool offset: uint32
// - Data offset: uint32

// Data layout (row-major, columnar untuk cache):
// - Fixed-size columns: contiguous arrays
// - String columns: offset into string pool
// - Reference columns: GUID atau foreign key

// Access API:
T3D_DataTable* T3D_LoadDataTable(const char* path);
void* T3D_TableGetRow(T3D_DataTable* table, uint32_t row);
int32_t T3D_TableGetInt(T3D_DataTable* table, uint32_t row, uint32_t col);
float T3D_TableGetFloat(T3D_DataTable* table, uint32_t row, uint32_t col);
const char* T3D_TableGetString(T3D_DataTable* table, uint32_t row, uint32_t col);

// Query API:
uint32_t T3D_TableFind(T3D_DataTable* table, uint32_t column, const char* value);
uint32_t T3D_TableFilter(T3D_DataTable* table, T3D_TablePredicate* pred, 
                          uint32_t* results, uint32_t max_results);
```

**B. TABLE TYPES**
```c
// Item table:
// - ID, Name, Type, Category, Rarity, Icon, Model, Stats...

// Weapon table:
// - ID, BaseDamage, AttackSpeed, Range, Durability, UpgradePath...

// Enemy table:
// - ID, Name, HP, Damage, Speed, AIType, Drops, SpawnRate...

// Quest 4x uint8 (4 bytes) - quantized to 255
- Padding: 2 bytes
Total: 32 bytes per vertex (cache line friendly)

Index format:
- u16 untuk < 65536 vertices (2 bytes per index)
- u32 untuk >= 65536 vertices (4 bytes per index)
- Triangle list (no strips, simpler rendering)

### A.3 TEXTURE BINARY FORMAT (.t3tex)
```
Texture Data Section:
+--------+--------+------------------------------------------+
| Offset | Size   | Description                              |
+--------+--------+------------------------------------------+
| 0x00   | 4      | Width                                    |
| 0x04   | 4      | Height                                   |
| 0x08   | 4      | Depth (1 untuk 2D, 6 untuk cube)         |
| 0x0C   | 4      | Mip count                                |
| 0x10   | 4      | Format: 0=RGBA8,1=RGB565,2=ETC2,3=ASTC  |
| 0x14   | 4      | Compression: 0=none,1=LZ4,2=ZSTD         |
| 0x18   | 4      | Flags: 1=srgb,2=normal,4=hdr             |
| 0x1C   | 4      | Reserved                                 |
| 0x20   | N      | Mip level offsets table                  |
| ...    | M      | Mip level data (compressed)              |
+--------+--------+------------------------------------------+

Texture formats per platform:
- Android 5+ (GLES 3.0): ETC2_RGB8, ETC2_RGBA8, EAC_R11
- Android 6+ (GLES 3.1): ASTC_4x4, ASTC_8x8
- Android 8+ (Vulkan): BC7, ASTC_4x4
- Fallback: RGBA8888 (uncompressed, 4x memory)

Mip chain:
- Always generate full mip chain
- Max mip: 1x1 pixel
- Memory: +33% vs base level only
- Quality: prevents aliasing, improves cache

Streaming textures:
- Base mip: always loaded (low res)
- Higher mips: stream on demand
- Priority: distance-based
- Budget: max 128MB texture memory
```

### A.4 ASSET PAK FORMAT (.t3pak)
```
Pak File Structure:
+--------+--------+------------------------------------------+
| Offset | Size   | Description                              |
+--------+--------+------------------------------------------+
| 0x00   | 6      | Magic: "T3DPAK"                          |
| 0x06   | 2      | Version                                  |
| 0x08   | 4      | Entry count                              |
| 0x0C   | 4      | Flags                                    |
| 0x10   | 8      | Entry table offset                       |
| 0x18   | 8      | Entry table size                         |
| 0x20   | 8      | Data offset                              |
| 0x28   | 8      | Data size                                |
| 0x30   | 8      | Total uncompressed size                  |
| 0x38   | 8      | Hash (XXH64)                             |
| 0x40   | 16     | Encryption IV (if encrypted)             |
| 0x50   | 176    | Reserved                                 |
+--------+--------+------------------------------------------+

Entry Table (per entry, 64 bytes):
+--------+--------+------------------------------------------+
| Offset | Size   | Description                              |
+--------+--------+------------------------------------------+
| 0x00   | 16     | Asset GUID                               |
| 0x10   | 8      | Data offset (within pak)                 |
| 0x18   | 4      | Compressed size                          |
| 0x1C   | 4      | Uncompressed size                        |
| 0x20   | 4      | CRC32C                                   |
| 0x24   | 4      | Flags (streaming, preload, encrypted)    |
| 0x28   | 8      | Access frequency (for cache)             |
| 0x30   | 8      | Last access time                         |
| 0x38   | 8      | Reserved                                 |
+--------+--------+------------------------------------------+

Android OBB (Expansion File):
- Main OBB: up to 2GB (assets)
- Patch OBB: up to 2GB (updates)
- Download: on first run atau via Play Asset Delivery
- Storage: /sdcard/Android/obb/<package>/
```

## B. ASSEMBLY SYSTEM (ARM)

### B.1 ARMv7-A ASSEMBLY (32-bit, Android 5)
```asm
; ARMv7-A calling convention (AAPCS):
; - R0-R3: arguments / return value
; - R4-R11: callee-saved registers
; - R12 (IP): intra-procedure call
; - R13 (SP): stack pointer
; - R14 (LR): link register
; - R15 (PC): program counter
; - Stack: 8-byte aligned

; Memory copy (optimized):
; void T3D_Memcpy(void* dst, const void* src, size_t count)
T3D_Memcpy:
    push    {r4-r11, lr}

    ; Align to 8 bytes
    ands    r3, r0, #7
    beq     .Laligned
    rsb     r3, r3, #8
    subs    r2, r2, r3
    blt     .Ltail

.Lalign_loop:
    ldrb    r4, [r1], #1
    strb    r4, [r0], #1
    subs    r3, r3, #1
    bne     .Lalign_loop

.Laligned:
    ; Copy 64 bytes at a time (8 registers * 8 bytes)
    subs    r2, r2, #64
    blt     .Lless64

.Lcopy64_loop:
    ldmia   r1!, {r3-r10}
    stmia   r0!, {r3-r10}
    subs    r2, r2, #64
    bge     .Lcopy64_loop

.Lless64:
    ; Copy remaining 8 bytes at a time
    adds    r2, r2, #64
    subs    r2, r2, #8
    blt     .Lless8

.Lcopy8_loop:
    ldr     r3, [r1], #8
    str     r3, [r0], #8
    subs    r2, r2, #8
    bge     .Lcopy8_loop

.Lless8:
    ; Copy remaining bytes
    adds    r2, r2, #8
    beq     .Ldone

.Ltail:
    ldrb    r3, [r1], #1
    strb    r3, [r0], #1
    subs    r2, r2, #1
    bne     .Ltail

.Ldone:
    pop     {r4-r11, pc}

; NEON SIMD (if available):
; Check: CPU feature flags (NEON = bit 12 of ID_ISAR0)
; 128-bit registers: Q0-Q15 (D0-D31)
; Use untuk: vertex processing, particle updates, audio mixing

; NEON matrix-vector multiply (4x4):
; void T3D_Mat4Vec4(float* result, const float* mat, const float* vec)
T3D_Mat4Vec4_NEON:
    vld1.32 {d0-d1}, [r2]           ; Load vector (4 floats)
    vld1.32 {d2-d3}, [r1]!          ; Load matrix row 0
    vld1.32 {d4-d5}, [r1]!          ; Load matrix row 1
    vld1.32 {d6-d7}, [r1]!          ; Load matrix row 2
    vld1.32 {d8-d9}, [r1]!          ; Load matrix row 3

    vmul.f32 q5, q1, d0[0]          ; row0 * vec.x
    vmla.f32 q5, q2, d0[1]          ; + row1 * vec.y
    vmla.f32 q5, q3, d1[0]          ; + row2 * vec.z
    vmla.f32 q5, q4, d1[1]          ; + row3 * vec.w

    vst1.32 {d10-d11}, [r0]         ; Store result
    bx      lr
```

### B.2 ARM64-v8a ASSEMBLY (64-bit, Android 5.0+)
```asm
; ARM64 calling convention (AAPCS64):
; - X0-X7: arguments / return value
; - X8-X18: temporary registers
; - X19-X28: callee-saved registers
; - X29 (FP): frame pointer
; - X30 (LR): link register
; - SP: stack pointer (16-byte aligned)
; - SIMD: V0-V31 (128-bit NEON)

; Memory copy (optimized, unrolled):
; void T3D_Memcpy(void* dst, const void* src, size_t count)
T3D_Memcpy:
    ; X0 = dst, X1 = src, X2 = count
    cmp     x2, #64
    b.lt    .Lcopy_small

    ; Align destination to 16 bytes
    ands    x3, x0, #15
    b.eq    .Laligned
    mov     x4, #16
    sub     x4, x4, x3
    sub     x2, x2, x4

.Lalign_loop:
    ldrb    w3, [x1], #1
    strb    w3, [x0], #1
    subs    x4, x4, #1
    b.ne    .Lalign_loop

.Laligned:
    ; Copy 64 bytes at a time using SIMD
    subs    x2, x2, #64
    b.lt    .Lless64

.Lcopy64_loop:
    ldp     q0, q1, [x1], #32
    ldp     q2, q3, [x1], #32
    stp     q0, q1, [x0], #32
    stp     q2, q3, [x0], #32
    subs    x2, x2, #64
    b.ge    .Lcopy64_loop

.Lless64:
    adds    x2, x2, #64
    cmp     x2, #16
    b.lt    .Lless16

.Lcopy16_loop:
    ldr     q0, [x1], #16
    str     q0, [x0], #16
    subs    x2, x2, #16
    b.ge    .Lcopy16_loop

.Lless16:
    adds    x2, x2, #16
    cbz     x2, .Ldone

.Lcopy_small:
    ldrb    w3, [x1], #1
    strb    w3, [x0], #1
    subs    x2, x2, #1
    b.ne    .Lcopy_small

.Ldone:
    ret

; NEON matrix-vector multiply (4x4):
; void T3D_Mat4Vec4(float* result, const float* mat, const float* vec)
T3D_Mat4Vec4_NEON:
    ; X0 = result, X1 = mat, X2 = vec
    ld1     {v0.4s}, [x2]           ; Load vector
    ld1     {v1.4s, v2.4s, v3.4s, v4.4s}, [x1]  ; Load matrix rows

    fmul    v5.4s, v1.4s, v0.s[0]   ; row0 * vec.x
    fmla    v5.4s, v2.4s, v0.s[1]   ; + row1 * vec.y
    fmla    v5.4s, v3.4s, v0.s[2]   ; + row2 * vec.z
    fmla    v5.4s, v4.4s, v0.s[3]   ; + row3 * vec.w

    st1     {v5.4s}, [x0]           ; Store result
    ret

; NEON 4x4 matrix multiply (A * B):
; void T3D_Mat4Mul(float* result, const float* a, const float* b)
T3D_Mat4Mul_NEON:
    ld1     {v0.4s, v1.4s, v2.4s, v3.4s}, [x1]  ; Load A
    ld1     {v4.4s, v5.4s, v6.4s, v7.4s}, [x2]  ; Load B

    ; Result row 0 = A * B.col0
    fmul    v16.4s, v0.4s, v4.s[0]
    fmla    v16.4s, v1.4s, v4.s[1]
    fmla    v16.4s, v2.4s, v4.s[2]
    fmla    v16.4s, v3.4s, v4.s[3]

    ; Result row 1 = A * B.col1
    fmul    v17.4s, v0.4s, v5.s[0]
    fmla    v17.4s, v1.4s, v5.s[1]
    fmla    v17.4s, v2.4s, v5.s[2]
    fmla    v17.4s, v3.4s, v5.s[3]

    ; Result row 2 = A * B.col2
    fmul    v18.4s, v0.4s, v6.s[0]
    fmla    v18.4s, v1.4s, v6.s[1]
    fmla    v18.4s, v2.4s, v6.s[2]
    fmla    v18.4s, v3.4s, v6.s[3]

    ; Result row 3 = A * B.col3
    fmul    v19.4s, v0.4s, v7.s[0]
    fmla    v19.4s, v1.4s, v7.s[1]
    fmla    v19.4s, v2.4s, v7.s[2]
    fmla    v19.4s, v3.4s, v7.s[3]

    st1     {v16.4s, v17.4s, v18.4s, v19.4s}, [x0]
    ret
```

### B.3 THUMB-2 ASSEMBLY (Compact, Android 5+)
```asm
; Thumb-2: 16-bit dan 32-bit instructions
; - More compact than ARM mode (30-40% smaller code)
; - All modern ARM cores support Thumb-2
; - Default untuk Android NDK

; Example: fast inverse square root (Quake III algorithm)
; float T3D_Q_rsqrt(float number)
T3D_Q_rsqrt:
    vmov    s0, r0              ; Move input to float register
    vcmp.f32 s0, #0.0           ; Compare dengan zero
    vmrs    APSR_nzcv, fpscr    ; Move flags
    beq     .Lzero              ; Handle zero

    vmov    r1, s0              ; Move bits to integer register
    lsr     r2, r1, #1          ; y = x >> 1
    ldr     r3, =0x5f3759df     ; Magic number
    sub     r1, r3, r2          ; i = 0x5f3759df - (y >> 1)
    vmov    s1, r1              ; Move back to float

    ; Newton-Raphson iteration
    vmul.f32 s2, s1, s1         ; y = y * y
    vmul.f32 s2, s2, s0         ; y = y * y * x
    vldr    s3, =1.5f           ; Load 1.5
    vldr    s4, =0.5f           ; Load 0.5
    vmul.f32 s5, s0, s4         ; x * 0.5
    vsub.f32 s3, s3, s2         ; 1.5 - (y * y * x)
    vmul.f32 s1, s1, s3         ; y = y * (1.5 - (y * y * x))

    vmov    r0, s1              ; Return result
    bx      lr

.Lzero:
    vldr    s1, =0.0f
    vmov    r0, s1
    bx      lr
```

## C. SECURITY & ANTI-TAMPER

### C.1 BINARY INTEGRITY
```c
// Self-integrity check:
// 1. Calculate hash of code section at runtime
// 2. Compare dengan embedded hash
// 3. If mismatch: tampering detected

// Implementation:
// - Hash algorithm: SHA-256 atau BLAKE2b
// - Target: .text section (executable code)
// - Timing: random intervals (every 30-120 seconds)
// - Response: crash gracefully atau show error

// Anti-debugging:
// - Check /proc/self/status untuk TracerPid
// - If TracerPid != 0: debugger attached
// - Check ptrace(PTRACE_TRACEME): fail jika already traced
// - Timing checks: detect breakpoints via timing anomalies
```

### C.2 MEMORY PROTECTION
```c
// Code obfuscation:
// - String encryption: decrypt at runtime
// - Control flow flattening: hide logic structure
// - Instruction substitution: equivalent but different instructions
// - Virtualization: convert code to custom bytecode

// Anti-memory-scan:
// - XOR sensitive values dengan random key
// - Re-encrypt every frame
// - Checksum critical values
// - Detect Cheat Engine scans via timing

// JNI anti-tamper:
// - Verify JNI method signatures
// - Check method table hasn't been modified
// - Monitor /proc/self/maps untuk suspicious libraries
```

### C.3 NETWORK SECURITY
```c
// Packet encryption:
// - AES-256-GCM: authenticated encryption
// - Key exchange: ECDH (Elliptic Curve Diffie-Hellman)
// - Perfect forward secrecy: new key per session
// - Anti-replay: sequence numbers + nonce

// Certificate pinning:
// - Embed server certificate hash dalam app
// - Reject connections dengan different certificate
// - Prevents MITM attacks

// Obfuscation:
// - XOR packet headers dengan rotating key
// - Fake packets: send decoy data
// - Variable packet sizes: pad to random length
```

## D. OPTIMIZATION MATRIX

### D.1 ANDROID 5+ DEVICE TIERS
```
Tier 1 (Low-end, Android 5-6):
- RAM: 1-2GB
- CPU: 4x ARM Cortex-A53 @ 1.2GHz
- GPU: Mali-T720, Adreno 306
- Target: 30fps, 480p-720p
- Draw calls: < 100
- Texture memory: < 128MB
- Vertex count: < 50K per frame
- Shadow: 1 cascade, 512x512
- Post-process: bloom only
- Physics: 30Hz, 100 bodies max
- AI: 50 agents, 5Hz tick rate

Tier 2 (Mid-range, Android 7-9):
- RAM: 3-4GB
- CPU: 8x ARM Cortex-A53 @ 1.8GHz
- GPU: Mali-G71, Adreno 506
- Target: 60fps, 720p-1080p
- Draw calls: < 200
- Texture memory: < 256MB
- Vertex count: < 100K per frame
- Shadow: 2 cascades, 1024x1024
- Post-process: bloom + SSAO + color grade
- Physics: 60Hz, 200 bodies max
- AI: 200 agents, 10Hz tick rate

Tier 3 (High-end, Android 10+):
- RAM: 6-8GB
- CPU: 8x ARM Cortex-A76 @ 2.4GHz
- GPU: Mali-G76, Adreno 640
- Target: 60fps, 1080p-1440p
- Draw calls: < 500
- Texture memory: < 512MB
- Vertex count: < 200K per frame
- Shadow: 4 cascades, 2048x2048
- Post-process: all effects
- Physics: 60Hz, 500 bodies max
- AI: 500 agents, 30Hz tick rate
```

### D.2 PERFORMANCE BUDGETS
```
Frame Budget (16.67ms untuk 60fps):
- Input: 0.1ms (1%)
- Game Logic: 2.0ms (12%)
- AI: 1.0ms (6%)
- Physics: 2.0ms (12%)
- Animation: 1.0ms (6%)
- Culling: 0.5ms (3%)
- Render Submit: 1.0ms (6%)
- GPU: 7.0ms (42%)
- Audio: 0.5ms (3%)
- Network: 0.5ms (3%)
- Misc: 1.07ms (6%)

Memory Budget (512MB total):
- Engine: 32MB (6%)
- Textures: 128MB (25%)
- Meshes: 64MB (12%)
- Audio: 32MB (6%)
- Physics: 16MB (3%)
- AI: 16MB (3%)
- UI: 16MB (3%)
- Framebuffers: 64MB (12%)
- Runtime: 64MB (12%)
- Streaming: 64MB (12%)
- Reserve: 16MB (3%)

CPU Budget (4 cores @ 1.2GHz):
- Main thread: 100% (rendering, logic)
- Worker 1: 100% (physics)
- Worker 2: 100% (AI)
- Worker 3: 50% (streaming, background)
```

### D.3 BATTERY OPTIMIZATION
```c
// Android battery optimization:
// - Target 60fps only saat active gameplay
// - Reduce to 30fps saat menus, cutscenes
// - Pause rendering saat app backgrounded
// - Reduce AI tick rate saat player idle
// - Use JobScheduler untuk background tasks

// Thermal throttling awareness:
// - Monitor CPU temperature via thermal API
// - If temp > 70C: reduce quality
// - If temp > 80C: cap at 30fps
// - If temp > 85C: show warning, reduce further

// Doze mode compatibility:
// - Respect device doze state
// - Pause non-essential network
// - Reduce background processing
// - Save state aggressively
```

### D.4 APK SIZE OPTIMIZATION
```
Target APK size: < 100MB (Google Play limit)
- Code: 10MB (native libraries stripped)
- Assets: 60MB (compressed textures, audio)
- Data: 20MB (tables, configs, strings)
- OBB: up to 2GB (additional assets)

Optimization techniques:
- Split APKs: per ABI (arm64-v8a, armeabi-v7a)
- Asset Delivery: Play Feature Delivery
- Compression: LZ4 untuk runtime, ZSTD untuk distribution
- Texture: ETC2/ASTC compression (4-8x smaller)
- Audio: OGG Vorbis (10:1 compression)
- Mesh: quantized vertices (50% smaller)
- Code: LTO (Link Time Optimization), strip symbols
```

## E. INTEGRATION SPECIFICATIONS

### E.1 ANDROID NDK INTEGRATION
```
Build System: CMake atau ndk-build
- Minimum API: 21 (Android 5.0)
- Target API: 33+ (Android 13+)
- ABIs: armeabi-v7a, arm64-v8a
- Optional: x86, x86_64 (emulator)

CMakeLists.txt:
- Set CMAKE_SYSTEM_NAME Android
- Set ANDROID_PLATFORM android-21
- Set ANDROID_ABI arm64-v8a
- Find libraries: log, android, EGL, GLESv3
- Link: OpenSLES atau AAudio

Gradle Integration:
- externalNativeBuild { cmake { path "CMakeLists.txt" } }
- abiFilters "arm64-v8a", "armeabi-v7a"
- arguments "-DANDROID_STL=c++_static"

JNI Bridge (minimal):
- Java -> Native: game initialization, lifecycle
- Native -> Java: analytics, IAP, ads, social
- Use JNI_OnLoad untuk register native methods
```

### E.2 OPENGL ES 3.0 RENDERER
```
Context Creation:
- EGL: eglGetDisplay, eglInitialize, eglChooseConfig
- Config: EGL_RENDERABLE_TYPE = EGL_OPENGL_ES3_BIT
- Context: eglCreateContext dengan ES 3.0
- Surface: eglCreateWindowSurface (ANativeWindow)

Required Extensions:
- GL_OES_texture_float (HDR)
- GL_OES_texture_half_float (HDR, mobile)
- GL_EXT_color_buffer_float (MRT)
- GL_OES_depth_texture (shadow maps)
- GL_OES_packed_depth_stencil (depth-stencil)
- GL_EXT_texture_filter_anisotropic (anisotropy)

Fallback (GLES 2.0):
- No MRT (deferred shading impossible)
- No integer textures
- Limited texture formats
- Vertex arrays only (no VAO)
- Reduced shader functionality
```

### E.3 VULKAN RENDERER (Android 7+)
```
Instance Creation:
- vkCreateInstance dengan Android extensions
- VK_KHR_android_surface untuk ANativeWindow
- Validation layers (debug builds only)

Device Requirements:
- Vulkan 1.0 (API 24+)
- Features: samplerAnisotropy, textureCompressionETC2
- Queue families: graphics, compute, transfer
- Memory: device_local, host_visible, host_coherent

Advantages over GLES:
- Lower CPU overhead (fewer driver calls)
- Multi-threaded command buffer recording
- Explicit memory management
- Better debugging (validation layers)
- Render passes untuk TBDR optimization
```

### E.4 GOOGLE PLAY SERVICES
```
Integration Points:
- Sign-In: GoogleSignInClient, silent sign-in
- Achievements: unlock, increment, reveal
- Leaderboards: submit score, show UI
- Saved Games: cloud save via SnapshotsClient
- Events: log custom events
- Quests: accept, claim rewards

Play Games Services v2:
- Automatic sign-in (no explicit consent)
- Friends: access gaming friends list
- Player profile: gamer tag, avatar
- Anti-piracy: license verification
```

### E.5 FIREBASE INTEGRATION
```
Services:
- Analytics: automatic + custom events
- Crashlytics: crash reporting, breadcrumbs
- Performance: automatic traces, custom traces
- Remote Config: A/B testing, feature flags
- Cloud Messaging: push notifications
- Authentication: anonymous, Google, Facebook
- Realtime Database: leaderboards, chat
- Storage: user-generated content

Implementation:
- Add google-services.json to app/
- Apply com.google.gms.google-services plugin
- Initialize FirebaseApp in Application.onCreate()
- Use Firebase APIs via JNI atau C++ SDK
```

## F. MATHEMATICAL & PHYSICAL FOUNDATIONS

### F.1 VECTOR MATH
```c
// Core vector operations (SIMD optimized):

typedef struct T3D_Vec2 { float x, y; } T3D_Vec2;
typedef struct T3D_Vec3 { float x, y, z; } T3D_Vec3;
typedef struct T3D_Vec4 { float x, y, z, w; } T3D_Vec4;

// Dot product: a . b = |a| |b| cos(theta)
inline float T3D_Vec3Dot(const T3D_Vec3* a, const T3D_Vec3* b) {
    return a->x * b->x + a->y * b->y + a->z * b->z;
}

// Cross product: a x b = perpendicular vector
inline T3D_Vec3 T3D_Vec3Cross(const T3D_Vec3* a, const T3D_Vec3* b) {
    return (T3D_Vec3){
        a->y * b->z - a->z * b->y,
        a->z * b->x - a->x * b->z,
        a->x * b->y - a->y * b->x
    };
}

// Length: |v| = sqrt(v . v)
inline float T3D_Vec3Length(const T3D_Vec3* v) {
    return sqrtf(v->x * v->x + v->y * v->y + v->z * v->z);
}

// Normalize: v / |v|
inline T3D_Vec3 T3D_Vec3Normalize(const T3D_Vec3* v) {
    float len = T3D_Vec3Length(v);
    if (len > 0.0001f) {
        float inv = 1.0f / len;
        return (T3D_Vec3){v->x * inv, v->y * inv, v->z * inv};
    }
    return (T3D_Vec3){0, 0, 0};
}

// Lerp: a + t * (b - a)
inline T3D_Vec3 T3D_Vec3Lerp(const T3D_Vec3* a, const T3D_Vec3* b, float t) {
    return (T3D_Vec3){
        a->x + t * (b->x - a->x),
        a->y + t * (b->y - a->y),
        a->z + t * (b->z - a->z)
    };
}

// Slerp (spherical lerp) untuk rotations
// - More accurate than lerp untuk quaternions
// - Use when t is small or vectors are nearly opposite
```

### F.2 QUATERNION MATH
```c
// Quaternion: q = [x, y, z, w]
// - No gimbal lock (unlike Euler angles)
// - Efficient interpolation (slerp)
// - Compact: 4 floats vs 9 floats (matrix)

typedef struct T3D_Quat { float x, y, z, w; } T3D_Quat;

// Identity: [0, 0, 0, 1]
inline T3D_Quat T3D_QuatIdentity(void) {
    return (T3D_Quat){0, 0, 0, 1};
}

// From axis-angle: q = [axis * sin(angle/2), cos(angle/2)]
inline T3D_Quat T3D_QuatFromAxisAngle(const T3D_Vec3* axis, float angle) {
    float half = angle * 0.5f;
    float s = sinf(half);
    float c = cosf(half);
    return (T3D_Quat){axis->x * s, axis->y * s, axis->z * s, c};
}

// Multiply: q1 * q2 (composition)
inline T3D_Quat T3D_QuatMul(const T3D_Quat* q1, const T3D_Quat* q2) {
    return (T3D_Quat){
        q1->w * q2->x + q1->x * q2->w + q1->y * q2->z - q1->z * q2->y,
        q1->w * q2->y - q1->x * q2->z + q1->y * q2->w + q1->z * q2->x,
        q1->w * q2->z + q1->x * q2->y - q1->y * q2->x + q1->z * q2->w,
        q1->w * q2->w - q1->x * q2->x - q1->y * q2->y - q1->z * q2->z
    };
}

// Rotate vector: q * v * q^-1
inline T3D_Vec3 T3D_QuatRotateVec3(const T3D_Quat* q, const T3D_Vec3* v) {
    // Optimized: avoid full quaternion multiply
    T3D_Vec3 qv = {q->x, q->y, q->z};
    T3D_Vec3 t = T3D_Vec3Cross(&qv, v);
    t.x *= 2.0f; t.y *= 2.0f; t.z *= 2.0f;
    T3D_Vec3 u = T3D_Vec3Cross(&qv, &t);
    return (T3D_Vec3){v->x + t.x * q->w + u.x, v->y + t.y * q->w + u.y, v->z + t.z * q->w + u.z};
}

// Slerp: spherical linear interpolation
// - Constant angular velocity
// - Use untuk smooth rotations
inline T3D_Quat T3D_QuatSlerp(const T3D_Quat* a, const T3D_Quat* b, float t) {
    float dot = a->x * b->x + a->y * b->y + a->z * b->z + a->w * b->w;

    // If dot < 0, negate one quaternion untuk take shorter path
    T3D_Quat b2 = *b;
    if (dot < 0.0f) {
        dot = -dot;
        b2.x = -b2.x; b2.y = -b2.y; b2.z = -b2.z; b2.w = -b2.w;
    }

    if (dot > 0.9995f) {
        // Linear interpolation untuk very close quaternions
        return (T3D_Quat){
            a->x + t * (b2.x - a->x),
            a->y + t * (b2.y - a->y),
            a->z + t * (b2.z - a->z),
            a->w + t * (b2.w - a->w)
        };
    }

    float theta_0 = acosf(dot);
    float theta = theta_0 * t;
    float sin_theta = sinf(theta);
    float sin_theta_0 = sinf(theta_0);

    float s0 = cosf(theta) - dot * sin_theta / sin_theta_0;
    float s1 = sin_theta / sin_theta_0;

    return (T3D_Quat){
        a->x * s0 + b2.x * s1,
        a->y * s0 + b2.y * s1,
        a->z * s0 + b2.z * s1,
        a->w * s0 + b2.w * s1
    };
}
```

### F.3 MATRIX MATH
```c
// 4x4 Matrix (column-major, OpenGL convention):
// [ m00 m04 m08 m12 ]
// [ m01 m05 m09 m13 ]
// [ m02 m06 m10 m14 ]
// [ m03 m07 m11 m15 ]

typedef struct T3D_Mat4 {
    float m[16];
} T3D_Mat4;

// Identity matrix
inline T3D_Mat4 T3D_Mat4Identity(void) {
    T3D_Mat4 m = {0};
    m.m[0] = m.m[5] = m.m[10] = m.m[15] = 1.0f;
    return m;
}

// Translation: T(t) * v
inline T3D_Mat4 T3D_Mat4Translation(const T3D_Vec3* t) {
    T3D_Mat4 m = T3D_Mat4Identity();
    m.m[12] = t->x;
    m.m[13] = t->y;
    m.m[14] = t->z;
    return m;
}

// Scale: S(s) * v
inline T3D_Mat4 T3D_Mat4Scale(const T3D_Vec3* s) {
    T3D_Mat4 m = {0};
    m.m[0] = s->x;
    m.m[5] = s->y;
    m.m[10] = s->z;
    m.m[15] = 1.0f;
    return m;
}

// Rotation dari quaternion
inline T3D_Mat4 T3D_Mat4FromQuat(const T3D_Quat* q) {
    float xx = q->x * q->x, yy = q->y * q->y, zz = q->z * q->z;
    float xy = q->x * q->y, xz = q->x * q->z, yz = q->y * q->z;
    float wx = q->w * q->x, wy = q->w * q->y, wz = q->w * q->z;

    T3D_Mat4 m;
    m.m[0] = 1 - 2*(yy + zz);  m.m[4] = 2*(xy - wz);     m.m[8]  = 2*(xz + wy);     m.m[12] = 0;
    m.m[1] = 2*(xy + wz);      m.m[5] = 1 - 2*(xx + zz);  m.m[9]  = 2*(yz - wx);     m.m[13] = 0;
    m.m[2] = 2*(xz - wy);      m.m[6] = 2*(yz + wx);      m.m[10] = 1 - 2*(xx + yy); m.m[14] = 0;
    m.m[3] = 0;                m.m[7] = 0;                m.m[11] = 0;               m.m[15] = 1;
    return m;
}

// Perspective projection (OpenGL style)
// fov: vertical field of view (radians)
// aspect: width / height
// near, far: clip planes
inline T3D_Mat4 T3D_Mat4Perspective(float fov, float aspect, float near, float far) {
    float f = 1.0f / tanf(fov * 0.5f);
    float nf = 1.0f / (near - far);

    T3D_Mat4 m = {0};
    m.m[0] = f / aspect;
    m.m[5] = f;
    m.m[10] = (far + near) * nf;
    m.m[11] = -1.0f;
    m.m[14] = 2.0f * far * near * nf;
    return m;
}

// LookAt: view matrix dari eye, target, up
inline T3D_Mat4 T3D_Mat4LookAt(const T3D_Vec3* eye, const T3D_Vec3* target, const T3D_Vec3* up) {
    T3D_Vec3 f = T3D_Vec3Normalize(&(T3D_Vec3){target->x - eye->x, target->y - eye->y, target->z - eye->z});
    T3D_Vec3 s = T3D_Vec3Normalize(&T3D_Vec3Cross(&f, up));
    T3D_Vec3 u = T3D_Vec3Cross(&s, &f);

    T3D_Mat4 m;
    m.m[0] = s.x;  m.m[4] = s.y;  m.m[8]  = s.z;  m.m[12] = -T3D_Vec3Dot(&s, eye);
    m.m[1] = u.x;  m.m[5] = u.y;  m.m[9]  = u.z;  m.m[13] = -T3D_Vec3Dot(&u, eye);
    m.m[2] = -f.x; m.m[6] = -f.y; m.m[10] = -f.z; m.m[14] = T3D_Vec3Dot(&f, eye);
    m.m[3] = 0;    m.m[7] = 0;    m.m[11] = 0;    m.m[15] = 1;
    return m;
}

// Matrix multiply: result = a * b
inline T3D_Mat4 T3D_Mat4Mul(const T3D_Mat4* a, const T3D_Mat4* b) {
    T3D_Mat4 r;
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 4; j++) {
            r.m[i*4+j] = 
                a->m[i*4+0] * b->m[0*4+j] +
                a->m[i*4+1] * b->m[1*4+j] +
                a->m[i*4+2] * b->m[2*4+j] +
                a->m[i*4+3] * b->m[3*4+j];
        }
    }
    return r;
}

// Inverse (for view matrix, assuming affine transform)
// - For orthonormal rotation + translation: fast path
// - General case: Gaussian elimination (slower)
```

### F.4 PHYSICS MATH
```c
// Linear interpolation (lerp)
inline float T3D_Lerp(float a, float b, float t) {
    return a + t * (b - a);
}

// Smoothstep: smooth interpolation (0,0) to (1,1)
inline float T3D_Smoothstep(float t) {
    return t * t * (3.0f - 2.0f * t);
}

// Smootherstep: Ken Perlin's improved version
inline float T3D_Smootherstep(float t) {
    return t * t * t * (t * (t * 6.0f - 15.0f) + 10.0f);
}

// Clamp: restrict value to range [min, max]
inline float T3D_Clamp(float v, float min, float max) {
    return fmaxf(min, fminf(max, v));
}

// Remap: map value dari one range to another
inline float T3D_Remap(float v, float in_min, float in_max, float out_min, float out_max) {
    return out_min + (v - in_min) * (out_max - out_min) / (in_max - in_min);
}

// Spring physics (damped harmonic oscillator)
// - Position: current value
// - Velocity: rate of change
// - Target: desired value
// - Stiffness: how fast to reach target (k)
// - Damping: how much to dampen (c)
// - dt: time step
inline void T3D_SpringUpdate(float* pos, float* vel, float target, float stiffness, float damping, float dt) {
    float displacement = *pos - target;
    float spring_force = -stiffness * displacement;
    float damping_force = -damping * *vel;
    float acceleration = spring_force + damping_force;
    *vel += acceleration * dt;
    *pos += *vel * dt;
}

// PID controller (Proportional-Integral-Derivative)
// - error = target - current
// - P = Kp * error
// - I = Ki * integral(error)
// - D = Kd * derivative(error)
// - output = P + I + D
inline float T3D_PIDUpdate(float* integral, float* last_error, float target, float current, float kp, float ki, float kd, float dt) {
    float error = target - current;
    *integral += error * dt;
    float derivative = (error - *last_error) / dt;
    *last_error = error;
    return kp * error + ki * *integral + kd * derivative;
}
```

### F.5 RANDOM NUMBER GENERATION
```c
// Xorshift32: fast, decent quality
// - State: 32-bit seed
// - Period: 2^32 - 1
// - Use untuk: gameplay randomness (not cryptographic)
inline uint32_t T3D_RandomXorshift32(uint32_t* state) {
    *state ^= *state << 13;
    *state ^= *state >> 17;
    *state ^= *state << 5;
    return *state;
}

// PCG32: better statistical quality
// - State: 64-bit
// - Period: 2^64
// - Better distribution than xorshift
inline uint32_t T3D_RandomPCG32(uint64_t* state) {
    uint64_t oldstate = *state;
    *state = oldstate * 6364136223846793005ULL + 1;
    uint32_t xorshifted = ((oldstate >> 18u) ^ oldstate) >> 27u;
    uint32_t rot = oldstate >> 59u;
    return (xorshifted >> rot) | (xorshifted << ((-rot) & 31));
}

// Seeded random: deterministic untuk replays
// - Seed dari: level seed + frame number + entity ID
// - Same seed = same sequence (reproducible)
inline uint32_t T3D_SeededRandom(uint32_t seed) {
    seed = (seed ^ 61) ^ (seed >> 16);
    seed *= 9;
    seed = seed ^ (seed >> 4);
    seed *= 0x27d4eb2d;
    seed = seed ^ (seed >> 15);
    return seed;
}

// Random float [0, 1)
inline float T3D_RandomFloat01(uint32_t* state) {
    return (T3D_RandomXorshift32(state) & 0xFFFFFF) / 16777216.0f;
}

// Random float [min, max)
inline float T3D_RandomFloatRange(uint32_t* state, float min, float max) {
    return min + T3D_RandomFloat01(state) * (max - min);
}

// Random int [min, max]
inline int32_t T3D_RandomIntRange(uint32_t* state, int32_t min, int32_t max) {
    return min + (int32_t)(T3D_RandomXorshift32(state) % (max - min + 1));
}

// Random point in circle (uniform distribution)
inline T3D_Vec2 T3D_RandomPointInCircle(uint32_t* state) {
    float angle = T3D_RandomFloatRange(state, 0, 2.0f * 3.14159265f);
    float radius = sqrtf(T3D_RandomFloat01(state));  // sqrt untuk uniform distribution
    return (T3D_Vec2){cosf(angle) * radius, sinf(angle) * radius};
}

// Random point on sphere surface (uniform distribution)
inline T3D_Vec3 T3D_RandomPointOnSphere(uint32_t* state) {
    float z = T3D_RandomFloatRange(state, -1.0f, 1.0f);
    float a = T3D_RandomFloatRange(state, 0, 2.0f * 3.14159265f);
    float r = sqrtf(1.0f - z * z);
    return (T3D_Vec3){r * cosf(a), r * sinf(a), z};
}
```

## G. SYNTAX & DATA STRUCTURES

### G.1 CORE DATA TYPES
```c
// Fixed-width integers (stdint.h)
typedef uint8_t  T3D_u8;   // 0 to 255
typedef uint16_t T3D_u16;  // 0 to 65535
typedef uint32_t T3D_u32;  // 0 to 4294967295
typedef uint64_t T3D_u64;  // 0 to 18446744073709551615
typedef int8_t   T3D_s8;   // -128 to 127
typedef int16_t  T3D_s16;  // -32768 to 32767
typedef int32_t  T3D_s32;  // -2147483648 to 2147483647
typedef int64_t  T3D_s64;  // -9223372036854775808 to 9223372036854775807

// Floating point
typedef float  T3D_f32;  // 32-bit IEEE 754
typedef double T3D_f64;  // 64-bit IEEE 754

// Boolean
typedef uint8_t T3D_bool;  // 0 = false, 1 = true

// Character
typedef char T3D_char;     // 8-bit ASCII/UTF-8

// Handle types
typedef uint32_t T3D_Handle;     // Generic handle
typedef uint32_t T3D_EntityID;   // Entity identifier
typedef uint64_t T3D_AssetID;    // Asset identifier

// Color formats
typedef struct T3D_Color {
    uint8_t r, g, b, a;
} T3D_Color;

typedef struct T3D_ColorF {
    float r, g, b, a;
} T3D_ColorF;

// Rectangle
typedef struct T3D_Rect {
    float x, y, width, height;
} T3D_Rect;

// Axis-aligned bounding box
typedef struct T3D_AABB {
    T3D_Vec3 min;
    T3D_Vec3 max;
} T3D_AABB;

// Sphere
typedef struct T3D_Sphere {
    T3D_Vec3 center;
    float radius;
} T3D_Sphere;

// Plane: ax + by + cz + d = 0
typedef struct T3D_Plane {
    T3D_Vec3 normal;
    float d;
} T3D_Plane;

// Ray: origin + t * direction
typedef struct T3D_Ray {
    T3D_Vec3 origin;
    T3D_Vec3 direction;
} T3D_Ray;

// Frustum (6 planes)
typedef struct T3D_Frustum {
    T3D_Plane planes[6];  // left, right, top, bottom, near, far
} T3D_Frustum;
```

### G.2 DYNAMIC ARRAY
```c
// Dynamic array (similar to C++ vector)
typedef struct T3D_Array {
    void* data;
    uint32_t count;
    uint32_t capacity;
    size_t element_size;
} T3D_Array;

// API:
T3D_Array* T3D_ArrayCreate(size_t element_size, uint32_t initial_capacity);
void T3D_ArrayDestroy(T3D_Array* arr);
void* T3D_ArrayPush(T3D_Array* arr);  // Add element, return pointer
void T3D_ArrayPop(T3D_Array* arr);    // Remove last element
void* T3D_ArrayAt(T3D_Array* arr, uint32_t index);
void T3D_ArrayClear(T3D_Array* arr);
void T3D_ArrayReserve(T3D_Array* arr, uint32_t capacity);

// Implementation:
// - Growth factor: 2x (amortized O(1) push)
// - Memory: single contiguous block
// - No shrink (unless explicitly requested)
// - Cache-friendly iteration
```

### G.3 HASH TABLE
```c
// Open addressing hash table (Robin Hood hashing)
typedef struct T3D_HashTable {
    T3D_HashEntry* entries;
    uint32_t count;
    uint32_t capacity;
    uint32_t tombstone_count;
} T3D_HashTable;

typedef struct T3D_HashEntry {
    uint64_t key_hash;
    void* value;
    uint32_t probe_distance;  // For Robin Hood
    uint8_t occupied;         // 0 = empty, 1 = occupied, 2 = tombstone
} T3D_HashEntry;

// Hash functions:
// - FNV-1a: fast, good distribution
// - MurmurHash3: better quality, slightly slower
// - xxHash: fastest, good quality (default)

// API:
T3D_HashTable* T3D_HashTableCreate(uint32_t initial_capacity);
void T3D_HashTableDestroy(T3D_HashTable* table);
void T3D_HashTableSet(T3D_HashTable* table, uint64_t key, void* value);
void* T3D_HashTableGet(T3D_HashTable* table, uint64_t key);
void T3D_HashTableRemove(T3D_HashTable* table, uint64_t key);
uint8_t T3D_HashTableContains(T3D_HashTable* table, uint64_t key);

// Performance:
// - Load factor: max 0.7 (resize at 0.7)
// - Average probe: < 3
// - Cache-friendly: linear probing
```

### G.4 RING BUFFER
```c
// Circular buffer untuk queues, audio, networking
typedef struct T3D_RingBuffer {
    uint8_t* data;
    uint32_t size;
    uint32_t head;  // Write position
    uint32_t tail;  // Read position
    uint32_t count; // Number of elements
} T3D_RingBuffer;

// API:
T3D_RingBuffer* T3D_RingBufferCreate(uint32_t size);
void T3D_RingBufferDestroy(T3D_RingBuffer* rb);
uint32_t T3D_RingBufferWrite(T3D_RingBuffer* rb, const void* data, uint32_t len);
uint32_t T3D_RingBufferRead(T3D_RingBuffer* rb, void* data, uint32_t len);
uint32_t T3D_RingBufferPeek(T3D_RingBuffer* rb, void* data, uint32_t len);
uint32_t T3D_RingBufferAvailable(T3D_RingBuffer* rb);
void T3D_RingBufferClear(T3D_RingBuffer* rb);

// Lock-free variant (SPSC - Single Producer Single Consumer):
// - Head/tail: atomic variables
// - No mutex needed
// - Producer: write, increment head
// - Consumer: read, increment tail
```

### G.5 STRING BUILDER
```c
// Efficient string concatenation
typedef struct T3D_StringBuilder {
    char* data;
    uint32_t length;
    uint32_t capacity;
} T3D_StringBuilder;

// API:
T3D_StringBuilder* T3D_SBCreate(uint32_t initial_capacity);
void T3D_SBDestroy(T3D_StringBuilder* sb);
void T3D_SBAppend(T3D_StringBuilder* sb, const char* str);
void T3D_SBAppendF(T3D_StringBuilder* sb, const char* fmt, ...);
void T3D_SBAppendChar(T3D_StringBuilder* sb, char c);
void T3D_SBClear(T3D_StringBuilder* sb);
const char* T3D_SBGetString(T3D_StringBuilder* sb);

// Use cases:
// - Building log messages
// - Generating JSON
// - Formatting UI text
// - Constructing file paths
```

## H. IMPLEMENTATION CHECKLIST

### H.1 CRITICAL PATH (Must Have)
- [x] Platform Abstraction (Android 5+ NDK)
- [x] Memory Manager (no GC, pools, arenas)
- [x] Job System (thread pool, work stealing)
- [x] Event Bus (pub-sub, zero coupling)
- [x] Time System (fixed timestep, time scale)
- [x] Logging & Crash Report (signal handlers, minidump)
- [x] Asset Database (GUID, dependency graph)
- [x] Serialization (binary, JSON, delta save)
- [x] ECS (archetype-based, 1M entities)
- [x] Physics (rigidbody, collision, raycast)
- [x] Rendering (forward shading, batching)
- [x] Audio (3D audio, mixer, music)
- [x] Input (touch, gamepad, sensors)
- [x] UI (canvas, layout, 9-slice)

### H.2 IMPORTANT (Should Have)
- [x] World Streaming (chunks, LOD, occlusion)
- [x] Behavior Trees (selector, sequence, decorator)
- [x] Pathfinding (navmesh, A*, flow field)
- [x] Perception (sight, sound, memory)
- [x] Player Controller (states, coyote time, IK)
- [x] Combat System (hitbox, damage, stagger)
- [x] Inventory (grid, equipment, crafting)
- [x] Quest System (graph, radiant)
- [x] Post Processing (bloom, SSAO, color grade)
- [x] Particles (GPU, pooling)
- [x] Localization (30+ languages, RTL, CJK)
- [x] Data Tables (CSV, binary, queries)
- [x] Build Pipeline (cook, pak, compress, encrypt)

### H.3 NICE TO HAVE (Could Have)
- [x] Fiber System (cooperative multitasking)
- [x] Replay System (deterministic, compression)
- [x] Procedural Generation (noise, WFC)
- [x] Ecosystem (food chain, territory)
- [x] Utility AI (scoring, curves)
- [x] Crowd Simulation (boids, traffic)
- [x] Global Illumination (light probes, lightmaps)
- [x] VFX Decals (bullet holes, blood)
- [x] Lip Sync (viseme generation)
- [x] Network Multiplayer (client-server, prediction)
- [x] Matchmaking (ELO, regions, parties)
- [x] Anti-Cheat (server-side, client-side)
- [x] Level Editor (gizmos, terrain, paint)
- [x] Visual Scripting (blueprint, VM)
- [x] Profiler (CPU, GPU, memory overlay)
- [x] Debug Tools (console, god mode, teleport)
- [x] Cloud Save (cross-platform sync)
- [x] IAP System (consumable, subscription)
- [x] Analytics (events, funnels)
- [x] Remote Config (A/B testing)

### H.4 OPTIMIZATION CHECKLIST
- [x] ARMv7-A assembly (memcpy, matrix math)
- [x] ARM64-v8a assembly (NEON SIMD)
- [x] Memory alignment (8/16/64 bytes)
- [x] Cache-friendly data structures (SoA)
- [x] Texture compression (ETC2, ASTC)
- [x] Mesh quantization (half-float, int16)
- [x] Draw call batching (< 300 calls)
- [x] LOD system (5 levels, distance-based)
- [x] Occlusion culling (HZB)
- [x] Object pooling (particles, bullets)
- [x] Frame budget enforcement (16.67ms)
- [x] Memory budget enforcement (512MB)
- [x] Battery optimization (thermal, doze)
- [x] APK size optimization (< 100MB)

---

## I. TOTAL SYSTEM COUNT

| Layer | Systems | Modules | Status |
|-------|---------|---------|--------|
| 0. Foundation | 6 | 24 | Complete |
| 1. Data Pipeline | 6 | 18 | Complete |
| 2. World Simulation | 6 | 24 | Complete |
| 3. Gameplay | 6 | 24 | Complete |
| 4. AI | 6 | 18 | Complete |
| 5. Rendering | 6 | 24 | Complete |
| 6. Audio | 4 | 12 | Complete |
| 7. Network | 4 | 12 | Complete |
| 8. Editor | 4 | 12 | Complete |
| 9. LiveOps | 4 | 12 | Complete |
| Binary/Assembly | 4 | 16 | Complete |
| Security | 3 | 9 | Complete |
| Optimization | 4 | 12 | Complete |
| Integration | 5 | 15 | Complete |
| Math/Physics | 5 | 20 | Complete |
| Data Structures | 5 | 15 | Complete |
| **TOTAL** | **75** | **255** | **Complete** |

---

*Dokumen ini merupakan spesifikasi lengkap dan komprehensif untuk T3D Game Engine, dioptimalkan untuk perangkat Android 5+ (API 21+) dengan fokus pada performa, efisiensi memori, dan skalabilitas. Setiap komponen telah dirancang dengan mempertimbangkan keterbatasan hardware low-end sambil tetap mendukung fitur premium pada device high-end.*

*Versi: 1.0.0*  
*Tanggal: 2026-08-28*  
*Arsitek: T3D Engine Team*
