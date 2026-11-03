import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, type DragonId } from '../store/useGameStore';
import { soundManager } from '../audio/SoundManager';

const LANES = [-3.2, 0, 3.2];
const GRAVITY = -30;
const JUMP_FORCE = 12.0;
const TRAIL_COUNT = 60; // Daha yoğun ve pürüzsüz HD plazma kuyruğu

interface PlayerProps {
  positionRef: { current: THREE.Vector3 };
}

// 5 PROFESYONEL HYPER-SPHERE (PBR CAM & TİTANYUM) RENK PALETİ
const SPHERE_THEMES: Record<
  DragonId,
  {
    core: string;        // En içteki akkor enerji çekirdeği
    coreGlow: string;    // Çekirdek ışıması
    armor: string;       // İç metalik titanyum şeritler
    glassTint: string;   // Dış kristal cam kürenin hafif renk tonu
    trail: string;       // Arkadan akan plazma kuyruğu
  }
> = {
  // Level 1: Magma Core (Kızıl Kor & Karbon Metal)
  IGNIS: {
    core: '#ffffff',
    coreGlow: '#ff4500',
    armor: '#1e293b',
    glassTint: '#ffedd5',
    trail: '#ff5500',
  },
  // Level 2: Cryo Prism (Saf Kristal Buz & Gümüş)
  FROSTY: {
    core: '#ffffff',
    coreGlow: '#00d8ff',
    armor: '#e2e8f0',
    glassTint: '#e0f2fe',
    trail: '#38bdf8',
  },
  // Level 3: Emerald Fusion (Zümrüt Reaktör & Altın Alaşım)
  JADE: {
    core: '#ecfdf5',
    coreGlow: '#10b981',
    armor: '#064e3b',
    glassTint: '#d1fae5',
    trail: '#34d399',
  },
  // Level 4: Singularity (Kara Delik & Kuantum Moru)
  NEBULA: {
    core: '#09090b',
    coreGlow: '#a855f7',
    armor: '#0f172a',
    glassTint: '#f3e8ff',
    trail: '#c084fc',
  },
  // Level 5: Celestial Gold (24 Ayar Saf Altın & Beyaz Işık)
  AURELIUS: {
    core: '#ffffff',
    coreGlow: '#facc15',
    armor: '#eab308',
    glassTint: '#fef9c3',
    trail: '#fde047',
  },
};

export function Player({ positionRef }: PlayerProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const rollingGroupRef = useRef<THREE.Group>(null!);
  const innerCoreRef = useRef<THREE.Mesh>(null!);
  const shieldMeshRef = useRef<THREE.Mesh>(null!);
  const groundRingRef = useRef<THREE.Mesh>(null!);
  const trailMeshRef = useRef<THREE.InstancedMesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);

  const [laneIndex, setLaneIndex] = useState(1);
  const status = useGameStore((s) => s.status);
  const selectedDragon = useGameStore((s) => s.selectedDragon);
  const hasShield = useGameStore((s) => s.hasShield);
  const activePowerUp = useGameStore((s) => s.activePowerUp);

  const theme = SPHERE_THEMES[selectedDragon];
  const isJuggernaut = activePowerUp === 'JUGGERNAUT';

  const velocityY = useRef(0);
  const jumpCount = useRef(0);
  const slideTimer = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // 60 Parçacıklı İpeksi Mikro-Küre Kuyruğu
  const trailPool = useMemo(() => {
    return Array.from({ length: TRAIL_COUNT }, (_, i) => ({
      pos: new THREE.Vector3(0, -10, 0),
      vel: new THREE.Vector3(),
      life: i / TRAIL_COUNT,
    }));
  }, []);

  useEffect(() => {
    if (status === 'PLAYING' && useGameStore.getState().score === 0 && groupRef.current) {
      setLaneIndex(1);
      velocityY.current = 0;
      jumpCount.current = 0;
      slideTimer.current = 0;
      groupRef.current.position.set(0, 0.65, 0);
      groupRef.current.scale.setScalar(1);
      positionRef.current.set(0, 0.65, 0);
    }
  }, [status, positionRef]);

  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const triggerJump = () => {
      if (jumpCount.current < 2) {
        velocityY.current = JUMP_FORCE;
        jumpCount.current += 1;
        slideTimer.current = 0;
        soundManager.playJump();
      }
    };

    const triggerSlide = () => {
      slideTimer.current = 0.45;
      if (groupRef.current && groupRef.current.position.y > 0.65) {
        velocityY.current = -26;
      }
      soundManager.playSlide();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        useGameStore.getState().togglePause();
        return;
      }
      if (useGameStore.getState().status !== 'PLAYING') return;

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        setLaneIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        setLaneIndex((prev) => Math.min(2, prev + 1));
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
        triggerJump();
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        triggerSlide();
      }
    };

    const handlePointerDown = (e: PointerEvent) => {
      touchStartX = e.clientX;
      touchStartY = e.clientY;
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (useGameStore.getState().status !== 'PLAYING') return;
      const dx = e.clientX - touchStartX;
      const dy = e.clientY - touchStartY;
      if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

      if (Math.abs(dx) > Math.abs(dy)) {
        if (dx > 35) setLaneIndex((prev) => Math.min(2, prev + 1));
        else if (dx < -35) setLaneIndex((prev) => Math.max(0, prev - 1));
      } else {
        if (dy < -35) triggerJump();
        else if (dy > 35) triggerSlide();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const { status: currentStatus, speed, activePowerUp: currentPower } = useGameStore.getState();
    const t = state.clock.elapsedTime;

    // İç enerji çekirdeği yüksek frekanslı nabız atışı (Pulsing Core)
    if (innerCoreRef.current) {
      const corePulse = 1 + Math.sin(t * 18) * 0.08;
      innerCoreRef.current.scale.setScalar(corePulse);
    }

    // Menüdeyken de iç jiroskop yavaşça dönsün
    if (rollingGroupRef.current && currentStatus !== 'PLAYING') {
      rollingGroupRef.current.rotation.x -= delta * 2.5;
      rollingGroupRef.current.rotation.y += delta * 1.8;
    }

    if (currentStatus === 'PLAYING') {
      const targetX = LANES[laneIndex];
      const prevX = group.position.x;
      group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, 14 * delta);
      const lateralVel = (group.position.x - prevX) / Math.max(delta, 0.001);

      group.position.y += velocityY.current * delta;
      velocityY.current += GRAVITY * delta;

      if (group.position.y <= 0.62) {
        group.position.y = 0.62;
        velocityY.current = 0;
        jumpCount.current = 0;
      }

      // Gerçekçi Küre Yuvarlanma Fiziği (İleri hız X ekseninde, yanal kayma Z ekseninde döndürür!)
      if (rollingGroupRef.current) {
        rollingGroupRef.current.rotation.x -= speed * delta * 0.95;
        rollingGroupRef.current.rotation.z -= lateralVel * delta * 0.65;
        rollingGroupRef.current.rotation.y += delta * 2.0;
      }

      // Zemindeki Lazer Yansıma Halkası (Top yükseldikçe zayıflar)
      if (groundRingRef.current) {
        groundRingRef.current.position.y = -group.position.y + 0.03;
        const heightFactor = Math.max(0, 1 - (group.position.y - 0.62) * 0.35);
        groundRingRef.current.scale.setScalar(heightFactor);
      }

      // Eğilme/Kayma (Aerodinamik Squash) ve Juggernaut Büyüme Fiziği
      if (slideTimer.current > 0) {
        slideTimer.current = Math.max(0, slideTimer.current - delta);
      }
      const baseScale = currentPower === 'JUGGERNAUT' ? 1.38 : 1.0;
      const scaleY = slideTimer.current > 0 ? baseScale * 0.58 : baseScale;
      const scaleXZ = slideTimer.current > 0 ? baseScale * 1.22 : baseScale;
      group.scale.lerp(new THREE.Vector3(scaleXZ, scaleY, scaleXZ), 12 * delta);

      positionRef.current.copy(group.position);

      // İpeksi Plazma Kuyruğu (60 Mikro-Küre)
      if (trailMeshRef.current) {
        trailPool.forEach((p, i) => {
          p.life -= delta * 3.4;

          if (p.life <= 0) {
            p.life = 1;
            const angle = Math.random() * Math.PI * 2;
            const radius = Math.random() * 0.32;
            p.pos.set(
              group.position.x + Math.cos(angle) * radius,
              group.position.y + Math.sin(angle) * radius,
              group.position.z + 0.35
            );
            p.vel.set(
              (Math.random() - 0.5) * 1.2,
              Math.random() * 1.8,
              speed * 0.5 + Math.random() * 2.5
            );
          } else {
            p.pos.addScaledVector(p.vel, delta);
          }

          dummy.position.copy(p.pos);
          // Kuyruk parçacıkları pürüzsüzce küçülür
          dummy.scale.setScalar(Math.max(0.001, Math.pow(p.life, 1.5) * 0.22));
          dummy.updateMatrix();
          trailMeshRef.current.setMatrixAt(i, dummy.matrix);
        });
        trailMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  const activeGlow = isJuggernaut ? '#ff2a00' : theme.coreGlow;
  const activeTrail = isJuggernaut ? '#ff2a00' : theme.trail;

  return (
    <>
      {/* AAA HYPER-CORE SPHERE GRUBU */}
      <group ref={groupRef} position={[0, 0.62, 0]}>
        <pointLight ref={lightRef} color={activeGlow} intensity={5.5} distance={15} decay={2} />

        {/* YUVARLANAN MERKEZ GRUP */}
        <group ref={rollingGroupRef}>
          {/* KATMAN 1: Merkezdeki Nabız Atan Akkor Plazma Çekirdeği (64 Segment HD) */}
          <mesh ref={innerCoreRef}>
            <sphereGeometry args={[0.34, 64, 64]} />
            <meshStandardMaterial
              color={theme.core}
              emissive={activeGlow}
              emissiveIntensity={3.8}
              roughness={0.1}
            />
          </mesh>

          {/* KATMAN 2: Kürenin İçine Gömülü Fırçalanmış Titanyum Jiroskopik Zırh Kuşakları (Tel Kafes YOK!) */}
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[0.45, 0.055, 24, 64]} />
            <meshPhysicalMaterial
              color={theme.armor}
              metalness={0.95}
              roughness={0.15}
              clearcoat={1}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.45, 0.055, 24, 64]} />
            <meshPhysicalMaterial
              color={theme.armor}
              metalness={0.95}
              roughness={0.15}
              clearcoat={1}
            />
          </mesh>
          {/* Çapraz Parlayan Enerji Damarı */}
          <mesh rotation={[Math.PI / 4, Math.PI / 4, 0]}>
            <torusGeometry args={[0.46, 0.02, 16, 64]} />
            <meshStandardMaterial color="#ffffff" emissive={activeGlow} emissiveIntensity={4} />
          </mesh>

          {/* KATMAN 3: Dış Kırılmalı Kristal Cam Kabuk (64x64 HD Optik Mercek Küresi) */}
          <mesh castShadow>
            <sphereGeometry args={[0.58, 64, 64]} />
            <meshPhysicalMaterial
              color={theme.glassTint}
              transmission={0.88}      // Gerçek cam geçirgenliği
              opacity={1}
              transparent
              roughness={0.03}         // Ayna/Mercek pürüzsüzlüğü
              ior={1.52}               // Optik cam kırılma indisi
              thickness={0.8}
              clearcoat={1}            // Otomotiv verniği parlaklığı
              clearcoatRoughness={0.02}
            />
          </mesh>
        </group>

        {/* KATMAN 4: Zeminle Temas Noktasında Parlayan Lazer Halo */}
        <mesh ref={groundRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.59, 0]}>
          <ringGeometry args={[0.42, 0.56, 48]} />
          <meshBasicMaterial color={activeGlow} side={THREE.DoubleSide} transparent opacity={0.75} />
        </mesh>

        {/* KATMAN 5: Koruyucu Kalkan (Tel Kafes YOK — Pürüzsüz Kuvvet Alanı Küresi) */}
        <mesh ref={shieldMeshRef} visible={hasShield || isJuggernaut}>
          <sphereGeometry args={[0.88, 48, 48]} />
          <meshPhysicalMaterial
            color={isJuggernaut ? '#ff2a00' : '#38bdf8'}
            emissive={isJuggernaut ? '#ff0000' : '#0284c7'}
            emissiveIntensity={0.45}
            transparent
            opacity={0.22}
            roughness={0.05}
            transmission={0.85}
            clearcoat={1}
          />
        </mesh>
      </group>

      {/* Pürüzsüz Küresel Mikro-Plazma Kuyruğu (60 Adet HD Kürecik) */}
      <instancedMesh
        ref={trailMeshRef}
        args={[null as unknown as THREE.BufferGeometry, null as unknown as THREE.Material, TRAIL_COUNT]}
      >
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={activeTrail}
          emissiveIntensity={3.2}
          roughness={0.1}
        />
      </instancedMesh>
    </>
  );
}