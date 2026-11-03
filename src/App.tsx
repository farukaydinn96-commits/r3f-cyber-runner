import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Player } from './components/Player';
import { ObstaclePool } from './components/ObstaclePool';
import { CoinPool } from './components/CoinPool';
import { PowerUpPool } from './components/PowerUpPool';
import { ParticleExplosion } from './components/ParticleExplosion';
import { CameraRig } from './components/CameraRig';
import {
  useGameStore,
  DRAGON_UNLOCK_LEVELS,
  XP_PER_LEVEL,
  type StageType,
  type DragonId,
} from './store/useGameStore';

const STAGE_CONFIG = {
  1: {
    title: 'TURKUAZ BUZUL',
    subtitle: 'Saf Buz Zemini & Buzdağları',
    icon: '❄️',
    bgGradient: 'linear-gradient(to bottom, #021019, #064e63)',
    fogColor: '#083344',
    ambientColor: '#a5f3fc',
    floorColor: '#06b6d4',
    floorEmissive: '#0891b2',
    floorRoughness: 0.04,
    floorMetalness: 0.88,
    mountainColor: '#22d3ee',
    mountainEmissive: '#0369a1',
    weatherColor: '#ffffff',
    accentColor: '#22d3ee',
  },
  2: {
    title: 'VOLKANİK LAV',
    subtitle: 'Akkor Magma Vadisi & Volkanlar',
    icon: '🌋',
    bgGradient: 'linear-gradient(to bottom, #140303, #450a0a)',
    fogColor: '#2a0505',
    ambientColor: '#fca5a5',
    floorColor: '#ea580c',
    floorEmissive: '#dc2626',
    floorRoughness: 0.25,
    floorMetalness: 0.4,
    mountainColor: '#290d05',
    mountainEmissive: '#b91c1c',
    weatherColor: '#fb923c',
    accentColor: '#f97316',
  },
  3: {
    title: 'DERİN UZAY & SATÜRN',
    subtitle: 'Satürn Asteroit Halkası & Yıldızlar',
    icon: '🪐',
    bgGradient: 'radial-gradient(circle at 50% 20%, #090d16 0%, #000005 100%)',
    fogColor: '#000005',
    ambientColor: '#cbd5e1',
    floorColor: '#334155',
    floorEmissive: '#0f172a',
    floorRoughness: 0.2,
    floorMetalness: 0.85,
    mountainColor: '#64748b',
    mountainEmissive: '#1e293b',
    weatherColor: '#ffffff',
    accentColor: '#facc15',
  },
};

const SPHERES: { id: DragonId; name: string; title: string; color: string }[] = [
  { id: 'IGNIS', name: '🔥 Magma Core', title: 'Karbon & Kızıl Plazma', color: '#ef4444' },
  { id: 'FROSTY', name: '❄️ Cryo Prism', title: 'Saf Kristal & Gümüş', color: '#38bdf8' },
  { id: 'JADE', name: '🌿 Emerald Orb', title: 'Zümrüt & Altın Reaktör', color: '#10b981' },
  { id: 'NEBULA', name: '🌌 Singularity', title: 'Kara Delik Çekirdeği', color: '#c084fc' },
  { id: 'AURELIUS', name: '👑 Solar Prime', title: '24K Altın & Süpernova', color: '#facc15' },
];

const POWERUP_NAMES = {
  JUGGERNAUT: '🔥 OVERDRIVE YIKIM MODU',
  SLOW_MO: '⏳ ZAMAN YAVAŞLATMA',
  MAGNET: '🧲 MANYETİK ÇEKİM',
  DOUBLE_SCORE: '⚡ 2X SKOR & XP',
};

function SideScenery({ stage }: { stage: StageType }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = 40;
  const cfg = STAGE_CONFIG[stage];

  const mountains = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const isLeft = i % 2 === 0;
      const sideOffset = isLeft ? -1 : 1;
      return {
        pos: new THREE.Vector3(
          sideOffset * (8.0 + Math.random() * 6),
          stage === 3 ? (Math.random() - 0.3) * 5 : 0,
          -Math.floor(i / 2) * 5 + 5
        ),
        scale: new THREE.Vector3(
          2.2 + Math.random() * 2.5,
          stage === 3 ? 1.2 + Math.random() * 1.8 : 3.5 + Math.random() * 6,
          2.2 + Math.random() * 2.5
        ),
        rotY: Math.random() * Math.PI,
        rotSpeed: (Math.random() - 0.5) * 1.5,
      };
    });
  }, [stage]);

  useFrame((_, delta) => {
    const { status, speed, activePowerUp } = useGameStore.getState();
    const mesh = meshRef.current;
    if (!mesh) return;
    const effectiveSpeed = activePowerUp === 'SLOW_MO' ? speed * 0.55 : speed;

    mountains.forEach((m, i) => {
      if (status === 'PLAYING') {
        m.pos.z += effectiveSpeed * delta;
        if (m.pos.z > 12) {
          m.pos.z = -85;
        }
      }

      dummy.position.copy(m.pos);
      dummy.scale.copy(m.scale);
      if (stage === 3) {
        dummy.rotation.set(m.rotY, m.rotY + delta * m.rotSpeed, 0);
      } else {
        dummy.rotation.set(0, m.rotY, 0);
      }
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as unknown as THREE.BufferGeometry, null as unknown as THREE.Material, count]}
      castShadow
      receiveShadow
    >
      <dodecahedronGeometry args={[1, 0]} />
      <meshPhysicalMaterial
        color={cfg.mountainColor}
        emissive={cfg.mountainEmissive}
        emissiveIntensity={stage === 2 ? 0.65 : 0.25}
        roughness={stage === 1 ? 0.1 : 0.5}
        metalness={0.5}
        flatShading
      />
    </instancedMesh>
  );
}

function AtmosphereParticles({ stage }: { stage: StageType }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const count = stage === 3 ? 300 : 150;
  const cfg = STAGE_CONFIG[stage];

  const flakes = useMemo(() => {
    return Array.from({ length: count }, () => ({
      pos: new THREE.Vector3(
        (Math.random() - 0.5) * 45,
        Math.random() * 20 - (stage === 3 ? 4 : 0),
        -Math.random() * 80
      ),
      speedY: stage === 3 ? 0 : 2 + Math.random() * 3,
      driftX: stage === 3 ? 0 : (Math.random() - 0.5) * 2,
    }));
  }, [count, stage]);

  useFrame((_, delta) => {
    const { status, speed } = useGameStore.getState();
    const mesh = meshRef.current;
    if (!mesh || status === 'PAUSED') return;

    flakes.forEach((f, i) => {
      f.pos.z += (speed * 0.8 + 6) * delta;
      f.pos.y += (stage === 2 ? f.speedY : -f.speedY) * delta;
      f.pos.x += f.driftX * delta;

      if (f.pos.z > 8 || (stage !== 3 && (f.pos.y < 0 || f.pos.y > 16))) {
        f.pos.z = -70 - Math.random() * 10;
        f.pos.y = stage === 3 ? (Math.random() - 0.2) * 22 : stage === 2 ? 0.2 : 10 + Math.random() * 4;
        f.pos.x = (Math.random() - 0.5) * 45;
      }

      dummy.position.copy(f.pos);
      dummy.scale.setScalar(stage === 3 ? 0.06 : 0.09);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as unknown as THREE.BufferGeometry, null as unknown as THREE.Material, count]}
    >
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color={cfg.weatherColor} />
    </instancedMesh>
  );
}

function SaturnPlanet() {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.12;
    }
  });
  return (
    <group ref={groupRef} position={[0, 15, -68]} rotation={[0.38, 0, -0.2]}>
      <mesh>
        <sphereGeometry args={[7.5, 64, 64]} />
        <meshStandardMaterial color="#fcd34d" emissive="#b45309" emissiveIntensity={0.3} roughness={0.7} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[13, 2.2, 16, 100]} />
        <meshStandardMaterial color="#fde68a" emissive="#d97706" emissiveIntensity={0.4} transparent opacity={0.85} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[17, 1.1, 16, 100]} />
        <meshStandardMaterial color="#94a3b8" emissive="#475569" emissiveIntensity={0.4} transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

export default function App() {
  const playerPosRef = useRef(new THREE.Vector3(0, 0.62, 0));
  const {
    status,
    stage,
    score,
    highScore,
    xp,
    level,
    selectedDragon,
    isNewRecord,
    combo,
    hasShield,
    shieldCharge,
    activePowerUp,
    powerUpTimeLeft,
    speed,
    floatingText,
    isMuted,
    selectStage,
    selectDragon,
    togglePause,
    toggleSound,
    startGame,
  } = useGameStore();

  const cfg = STAGE_CONFIG[stage];
  const currentXpInLevel = xp % XP_PER_LEVEL;
  const currentLevelProgress = (currentXpInLevel / XP_PER_LEVEL) * 100;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const currentStatus = useGameStore.getState().status;
      if (e.key === 'Enter' && (currentStatus === 'MENU' || currentStatus === 'GAMEOVER')) {
        startGame();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: cfg.bgGradient,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* ÜST-ORTA PROFESYONEL LEVEL İBRESİ (EKRANI ASLA KAPATMAZ!) */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 15,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          pointerEvents: 'none',
          fontFamily: 'monospace',
        }}
      >
        <div
          style={{
            background: 'rgba(2, 6, 23, 0.78)',
            backdropFilter: 'blur(8px)',
            padding: '8px 20px',
            borderRadius: '999px',
            border: `1px solid ${cfg.accentColor}`,
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
            minWidth: '340px',
          }}
        >
          <span
            style={{
              background: cfg.accentColor,
              color: '#020617',
              fontWeight: 'bold',
              fontSize: '0.85rem',
              padding: '3px 10px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            LVL {level}
          </span>

          {/* İnce Keskin Level İbre Çubuğu */}
          <div style={{ flex: 1, height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${currentLevelProgress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #38bdf8, #a855f7, #facc15)',
                borderRadius: '999px',
                transition: 'width 0.25s ease',
              }}
            />
          </div>

          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', whiteSpace: 'nowrap' }}>
            {currentXpInLevel} / {XP_PER_LEVEL} XP ({Math.floor(currentLevelProgress)}%)
          </span>
        </div>

        {/* Aktif 5 Saniyelik Bonus Varsa Level İbresinin Hemen Altında İnce Şerit Olarak Çıkar */}
        {activePowerUp && status === 'PLAYING' && (
          <div
            style={{
              background: 'rgba(2, 6, 23, 0.85)',
              border: '1px solid #facc15',
              padding: '4px 16px',
              borderRadius: '999px',
              color: '#fde047',
              fontSize: '0.82rem',
              fontWeight: 'bold',
            }}
          >
            {POWERUP_NAMES[activePowerUp]} • {powerUpTimeLeft.toFixed(1)}s
          </div>
        )}

        {/* Kıl Payı veya Parçalama Bildirimi (Yolu Kapatmayan Zarif Alt Metin) */}
        {floatingText && status === 'PLAYING' && (
          <div
            style={{
              color: '#fef08a',
              fontSize: '0.95rem',
              fontWeight: 'bold',
              textShadow: '0 0 10px #ea580c',
              letterSpacing: '0.5px',
            }}
          >
            {floatingText}
          </div>
        )}
      </div>

      {/* SOL VE SAĞ ÜST HUD PANELLERİ */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 24,
          right: 24,
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          color: '#fff',
          fontFamily: 'monospace',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            background: 'rgba(2, 6, 23, 0.65)',
            backdropFilter: 'blur(8px)',
            padding: '12px 18px',
            borderRadius: '12px',
            border: `1px solid ${cfg.accentColor}`,
            pointerEvents: 'auto',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: cfg.accentColor, fontWeight: 'bold', marginBottom: '2px' }}>
            {cfg.icon} {cfg.title}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', lineHeight: 1.1 }}>
            SKOR: {score}
          </div>
          <div style={{ fontSize: '0.9rem', color: '#fbbf24', marginTop: '6px', fontWeight: 'bold' }}>
            🔥 KOMBO: x{combo} &nbsp;|&nbsp; 🏆 REKOR: {highScore}
          </div>
          <div style={{ marginTop: '6px', fontSize: '0.82rem', color: hasShield ? '#38bdf8' : '#94a3b8' }}>
            🛡️ KALKAN: {hasShield ? 'AKTİF' : `ŞARJ (${shieldCharge}/3)`}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', pointerEvents: 'auto' }}>
          <div
            style={{
              textAlign: 'right',
              background: 'rgba(2, 6, 23, 0.65)',
              backdropFilter: 'blur(8px)',
              padding: '12px 18px',
              borderRadius: '12px',
              border: `1px solid ${cfg.accentColor}`,
            }}
          >
            <div style={{ fontSize: '1.4rem', color: cfg.accentColor, fontWeight: 'bold' }}>
              ⚡ {Math.round(speed * 3.6)} KM/S
            </div>
            <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '4px' }}>
              [A/D] Şerit | [SPACE x2] Zıpla | [S] Kay
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={toggleSound}
              style={{
                background: 'rgba(2, 6, 23, 0.75)',
                color: '#fff',
                border: '1px solid #475569',
                padding: '6px 12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: '0.8rem',
              }}
            >
              {isMuted ? '🔇 SESSİZ' : '🔊 SES AÇIK'}
            </button>
            {status === 'PLAYING' && (
              <button
                onClick={togglePause}
                style={{
                  background: 'rgba(2, 6, 23, 0.75)',
                  color: '#fde047',
                  border: '1px solid #fde047',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                }}
              >
                ⏸️ [ESC]
              </button>
            )}
          </div>
        </div>
      </div>

      {status === 'PAUSED' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 25,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 6, 23, 0.8)',
            backdropFilter: 'blur(8px)',
            color: '#fff',
            fontFamily: 'monospace',
          }}
        >
          <h1 style={{ fontSize: '3rem', color: '#fde047', marginBottom: '20px' }}>⏸️ OYUN DURAKLATILDI</h1>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button
              onClick={togglePause}
              style={{
                padding: '14px 36px',
                fontSize: '1.15rem',
                fontWeight: 'bold',
                background: '#22c55e',
                color: '#020617',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              ▶️ DEVAM ET [ESC]
            </button>
            <button
              onClick={startGame}
              style={{
                padding: '14px 36px',
                fontSize: '1.15rem',
                fontWeight: 'bold',
                background: '#38bdf8',
                color: '#020617',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              🔄 YENİDEN BAŞLAT
            </button>
          </div>
        </div>
      )}

      {(status === 'MENU' || status === 'GAMEOVER') && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 20,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(2, 6, 23, 0.84)',
            backdropFilter: 'blur(10px)',
            color: '#fff',
            fontFamily: 'monospace',
            padding: '20px',
            overflowY: 'auto',
          }}
        >
          {status === 'GAMEOVER' && isNewRecord && (
            <div
              style={{
                background: 'linear-gradient(135deg, #facc15, #ea580c)',
                color: '#020617',
                padding: '10px 28px',
                borderRadius: '999px',
                fontWeight: 'bold',
                fontSize: '1.25rem',
                marginBottom: '12px',
                boxShadow: '0 0 40px rgba(250, 204, 21, 0.9)',
                border: '2px solid #fef08a',
              }}
            >
              🏆 TEBRİKLER! YENİ EFSANEVİ REKOR KIRDIN: {score} 🔥
            </div>
          )}

          <h1
            style={{
              fontSize: '2.8rem',
              margin: '0 0 6px 0',
              color: cfg.accentColor,
              textShadow: '0 0 25px currentColor',
            }}
          >
            {status === 'GAMEOVER' ? 'SİMÜLASYON SONA ERDİ!' : '⚡ HYPER-SPHERE 3D'}
          </h1>

          <p style={{ fontSize: '1.02rem', color: '#e9d5ff', marginBottom: '16px' }}>
            ⭐ Seviyen: <b>LEVEL {level}</b> ({currentXpInLevel} / {XP_PER_LEVEL} XP) &nbsp;|&nbsp; 🏆 Rekor: <b>{highScore}</b>
          </p>

          <p style={{ color: '#94a3b8', marginBottom: '10px', fontSize: '0.92rem' }}>
            🌌 1. YARIŞMAK İSTEDİĞİN GEZEGENİ SEÇ:
          </p>
          <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {([1, 2, 3] as StageType[]).map((s) => {
              const item = STAGE_CONFIG[s];
              const isSelected = stage === s;
              return (
                <div
                  key={s}
                  onClick={() => selectStage(s)}
                  style={{
                    width: '210px',
                    padding: '12px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255,255,255,0.12)' : 'rgba(15, 23, 42, 0.7)',
                    border: isSelected ? `3px solid ${item.accentColor}` : '1px solid #334155',
                    boxShadow: isSelected ? `0 0 20px ${item.accentColor}55` : 'none',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontSize: '1.7rem', marginBottom: '4px' }}>{item.icon}</div>
                  <div style={{ fontWeight: 'bold', fontSize: '0.95rem', color: item.accentColor }}>{item.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#cbd5e1', marginTop: '4px' }}>{item.subtitle}</div>
                </div>
              );
            })}
          </div>

          <p style={{ color: '#fde047', marginBottom: '10px', fontSize: '0.95rem', fontWeight: 'bold' }}>
            🔮 2. HYPER-CORE KÜRENİ SEÇ (HER 2500 XP'DE YENİ LEVEL AÇILIR):
          </p>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {SPHERES.map((sp) => {
              const reqLevel = DRAGON_UNLOCK_LEVELS[sp.id];
              const isUnlocked = level >= reqLevel;
              const isSelected = selectedDragon === sp.id;
              return (
                <div
                  key={sp.id}
                  onClick={() => selectDragon(sp.id)}
                  style={{
                    padding: '12px 16px',
                    borderRadius: '12px',
                    cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    opacity: isUnlocked ? 1 : 0.55,
                    background: isSelected ? 'rgba(255,255,255,0.16)' : 'rgba(15, 23, 42, 0.85)',
                    border: isSelected ? `2px solid ${sp.color}` : '1px solid #334155',
                    boxShadow: isSelected ? `0 0 18px ${sp.color}66` : 'none',
                    textAlign: 'center',
                    minWidth: '150px',
                  }}
                >
                  <div style={{ fontWeight: 'bold', color: sp.color, fontSize: '0.98rem' }}>{sp.name}</div>
                  <div style={{ fontSize: '0.76rem', color: '#cbd5e1', marginTop: '2px' }}>{sp.title}</div>
                  <div
                    style={{
                      fontSize: '0.75rem',
                      marginTop: '6px',
                      fontWeight: 'bold',
                      color: isSelected ? '#4ade80' : isUnlocked ? '#38bdf8' : '#f87171',
                    }}
                  >
                    {isSelected ? '✓ KUŞANILDI' : isUnlocked ? 'KULLANIMA HAZIR' : `🔒 LEVEL ${reqLevel}`}
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={startGame}
            style={{
              padding: '15px 46px',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              color: '#020617',
              background: cfg.accentColor,
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              boxShadow: `0 0 30px ${cfg.accentColor}`,
              fontFamily: 'monospace',
            }}
          >
            {status === 'GAMEOVER' ? 'TEKRAR BAŞLAT [ENTER]' : 'SİMÜLASYONU BAŞLAT [ENTER]'}
          </button>
        </div>
      )}

      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.25 }}
        camera={{ position: [0, 4.4, 7.6], fov: 65 }}
      >
        <fog attach="fog" args={[cfg.fogColor, 16, 72]} />
        <ambientLight intensity={0.7} color={cfg.ambientColor} />
        <directionalLight position={[10, 18, 10]} intensity={1.45} color="#ffffff" castShadow />

        <CameraRig playerPositionRef={playerPosRef} />
        <Player positionRef={playerPosRef} />
        <ObstaclePool playerPositionRef={playerPosRef} />
        <CoinPool playerPositionRef={playerPosRef} />
        <PowerUpPool playerPositionRef={playerPosRef} />
        <ParticleExplosion />
        <AtmosphereParticles stage={stage} />
        <SideScenery stage={stage} />

        {stage === 3 && <SaturnPlanet />}

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} receiveShadow>
          <planeGeometry args={[14, 110]} />
          <meshStandardMaterial
            color={cfg.floorColor}
            emissive={cfg.floorEmissive}
            emissiveIntensity={stage === 2 ? 0.55 : 0.15}
            roughness={cfg.floorRoughness}
            metalness={cfg.floorMetalness}
          />
        </mesh>

        {stage === 3 && (
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -30]}>
            <planeGeometry args={[26, 110]} />
            <meshBasicMaterial color="#fde68a" transparent opacity={0.18} />
          </mesh>
        )}
      </Canvas>
    </div>
  );
}