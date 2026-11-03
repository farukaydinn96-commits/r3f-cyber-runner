import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, type PowerUpType } from '../store/useGameStore';

const LANES = [-3.2, 0, 3.2];
const POWERUP_TYPES: Exclude<PowerUpType, null>[] = ['JUGGERNAUT', 'SLOW_MO', 'MAGNET', 'DOUBLE_SCORE'];

const POWERUP_COLORS: Record<Exclude<PowerUpType, null>, string> = {
  JUGGERNAUT: '#ff2a00',   // Kırmızı: 5 Sn Kıra Kıra Gitme
  SLOW_MO: '#38bdf8',      // Mavi: 5 Sn Zamanı Yavaşlatma (Ağır Çekim)
  MAGNET: '#a855f7',       // Mor: 5 Sn Kristal Mıknatısı
  DOUBLE_SCORE: '#10b981', // Yeşil: 5 Sn 2X Puan
};

export function PowerUpPool({ playerPositionRef }: { playerPositionRef: { current: THREE.Vector3 } }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const status = useGameStore((s) => s.status);

  const data = useMemo(
    () => ({
      position: new THREE.Vector3(LANES[1], 1.0, -42),
      type: 'JUGGERNAUT' as Exclude<PowerUpType, null>,
      active: true,
    }),
    []
  );

  useEffect(() => {
    if (status === 'PLAYING' && data.position.z < -40) {
      data.position.set(LANES[Math.floor(Math.random() * LANES.length)], 1.0, -38);
      data.type = 'JUGGERNAUT';
      data.active = true;
    }
  }, [status, data]);

  useFrame((state, delta) => {
    const { status: currentStatus, speed, activePowerUp, activatePowerUp } = useGameStore.getState();
    const mesh = meshRef.current;
    if (currentStatus !== 'PLAYING' || !mesh) return;

    const pPos = playerPositionRef.current;
    const t = state.clock.elapsedTime;
    const effectiveSpeed = activePowerUp === 'SLOW_MO' ? speed * 0.55 : speed;

    data.position.z += effectiveSpeed * delta;

    if (data.active && pPos.distanceTo(data.position) < 1.35) {
      data.active = false;
      activatePowerUp(data.type, data.position);
    }

    if (data.position.z > 8) {
      data.position.z = -60 - Math.random() * 20;
      data.position.x = LANES[Math.floor(Math.random() * LANES.length)];
      data.type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
      data.active = true;
    }

    mesh.position.copy(data.position);
    mesh.position.y = 1.0 + Math.sin(t * 5) * 0.25;
    mesh.rotation.y = t * 4;
    mesh.rotation.x = t * 2;
    mesh.scale.setScalar(data.active ? 1 : 0);

    if (ringRef.current) {
      ringRef.current.rotation.z = -t * 6;
    }

    const mat = mesh.material as THREE.MeshStandardMaterial;
    const col = POWERUP_COLORS[data.type];
    mat.color.set(col);
    mat.emissive.set(col);
  });

  return (
    <mesh ref={meshRef}>
      <octahedronGeometry args={[0.65, 0]} />
      <meshStandardMaterial color="#ff2a00" emissive="#ff2a00" emissiveIntensity={2} metalness={0.8} roughness={0.1} />
      <mesh ref={ringRef}>
        <torusGeometry args={[0.9, 0.05, 8, 24]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </mesh>
  );
}