# ⚡ Hyper-Sphere 3D — WebGL / R3F Endless Runner & Game Engine Architecture

A high-performance, 60–144 FPS 3D arcade endless runner built from scratch using **React Three Fiber (Three.js)**, **TypeScript**, and **Zustand**. Engineered to showcase production-grade game development patterns, zero-allocation memory management, Physically Based Rendering (PBR), and procedural audio synthesis on the web.

---

## 🛠️ Core Game Engineering Highlights

### 1. Zero-GC Object Pooling (`THREE.InstancedMesh`)
To prevent Garbage Collection (GC) frame drops during high-speed gameplay, zero meshes are instantiated or destroyed at runtime:
- **60-Instance Micro-Plasma Trail Pool:** Dynamically recycled particle emitter calculating delta-time ($\Delta t$) velocity and exponential scale decay per frame.
- **300-Instance Atmosphere & Scenery Pools:** 3D icebergs, volcanic basalt monoliths, rotating space asteroids, and weather particles (snowflakes, rising magma embers, deep-space starfields) rendered in single GPU draw calls.
- **25-Instance Obstacle & 40-Instance Shatter Explosion Pools:** Pre-allocated in memory and recycled seamlessly once passing behind the camera frustum.

### 2. Transient State Updates (Zero React Re-renders)
- The core 60+ FPS game loop (`useFrame`) bypasses React's reconciliation cycle by reading and mutating state directly via **Zustand transient references** (`useGameStore.getState()`) and `THREE.Vector3` refs.
- React UI overlays only re-render on discrete state transitions (`SCORE`, `LEVEL_UP`, `POWER_UP`, `PAUSED`, `GAMEOVER`).

### 3. Multi-Layer PBR Materials & Retina HD Pipeline
- **Hyper-Core Sphere Architecture:** 64x64 segment optical crystal shell (`MeshPhysicalMaterial` with real-time `transmission`, `ior: 1.52`, and automotive `clearcoat`), internal dual-axis brushed titanium gyroscopic rings, pulsing plasma core, and a height-reactive ground laser halo.
- **Retina 4K & ACES Filmic Tone Mapping:** Configured with `dpr={[1, 2]}` and `THREE.ACESFilmicToneMapping` for crisp edge anti-aliasing and high-dynamic-range emissive lighting.

### 4. Procedural Web Audio API Synthesizer (Zero External Assets)
Built-in `SoundManager` synthesizes all audio in real-time using `AudioContext`, `OscillatorNode`, and `GainNode`:
- **Dynamic Synthwave BGM:** Real-time sawtooth bass arpeggiator loop with mute/unmute state control.
- **Pitch-Shifted SFX:** Combo-reactive crystal collection tones, close-call wind whooshes (`sine` frequency sweep), obstacle shatter impacts (`square`), and a 4-note Major Arpeggio (`C5-E5-G5-C6`) high-score fanfare.

### 5. Gameplay Mechanics & Meta-Progression Loop
- **3 Selectable Planetary Biomes:**
  1. ❄️ **Turquoise Glacier:** Mirror-like ice floor, polygonal icebergs, and blizzard physics.
  2. 🌋 **Volcanic Lava Valley:** Glowing magma floor, basalt mountains, and rising fire embers.
  3. 🪐 **Deep Space & Saturn:** Rotating 3D Saturn planet with dual rings, metallic asteroid track, and 300-star deep space.
- **4 Active Super Power-Ups (5-Second Duration):**
  - 🔥 **Overdrive Juggernaut:** Enlarges the sphere, boosts speed by +35%, and shatters all obstacles on impact for bonus points.
  - ⏳ **Matrix Slow-Mo:** Dilates world time by 45% for precision navigation.
  - 🧲 **Magnetic Pull:** Lerps nearby crystals across all lanes directly toward the player.
  - ⚡ **2X Score & XP Overdrive:** Doubles all incoming score and experience points.
- **Close-Call (Near Miss) Detection:** Rewards players with `+35` bonus points and audio-visual feedback when grazing obstacles at high speed.
- **Persistent RPG Leveling System (`localStorage`):** 2,500 XP progression curve unlocking 5 distinct PBR Hyper-Core spheres (*Magma Core, Cryo Prism, Emerald Orb, Singularity, Solar Prime*).

---

## 🎮 Controls

| Input | Action |
| :--- | :--- |
| **`A` / `D`** or **`⬅️` / `➡️`** or **Swipe Left/Right** | Switch Lanes |
| **`SPACE`** / **`W`** / **`⬆️`** (x2) or **Swipe Up** | Jump / Double Jump |
| **`S`** / **`⬇️`** or **Swipe Down** | Aerodynamic Slide & Fast-Fall |
| **`ESC`** / **`P`** | Pause / Resume Simulation |

---

## 🚀 Getting Started Locally

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start the development server
npm run dev

# 3. Build for production
npm run build