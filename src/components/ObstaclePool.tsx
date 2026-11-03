import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

const POOL_SIZE = 25;
const LANES = [-3.2, 0, 3.2];

interface ObstacleData {
  position: THREE.Vector3;
  scaleY: number;
  rotationY: number;
  passed: boolean;
}

export function ObstaclePool({ playerPositionRef }: { playerPositionRef: { current: THREE.Vector3 } }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const status = useGameStore((s) => s.status);
  const stage = useGameStore((s) => s.stage);

  const pool = useMemo<ObstacleData[]>(() => {
    return Array.from({ length: POOL_SIZE }, (_, i) => ({
      position: new THREE.Vector3(
        LANES[Math.floor(Math.random() * LANES.length)],
        0.7,
        -18 - i * 8
      ),
      scaleY: 1 + Math.random() * 0.6,
      rotationY: Math.random() * Math.PI,
      passed: false,
    }));
  }, []);

  useEffect(() => {
    if (status === 'PLAYING' && useGameStore.getState().score === 0) {
      pool.forEach((obstacle, i) => {
        obstacle.position.set(
          LANES[Math.floor(Math.random() * LANES.length)],
          0.7,
          -18 - i * 8
        );
        obstacle.passed = false;
      });
    }
  }, [status, pool]);

  useFrame((_, delta) => {
    const {
      status: currentStatus,
      speed,
      hasShield,
      activePowerUp,
      addScore,
      increaseSpeed,
      shatterObstacle,
      triggerCloseCall,
      endGame,
    } = useGameStore.getState();

    const mesh = meshRef.current;
    if (currentStatus !== 'PLAYING' || !mesh) return;

    increaseSpeed(delta);
    // JUGGERNAUT hızlandırır, SLOW_MO ise %45 yavaşlatır (Ağır Çekim)!
    const speedMultiplier =
      activePowerUp === 'JUGGERNAUT' ? 1.35 : activePowerUp === 'SLOW_MO' ? 0.55 : 1.0;
    const effectiveSpeed = speed * speedMultiplier;
    const pPos = playerPositionRef.current;

    pool.forEach((obstacle, i) => {
      obstacle.position.z += effectiveSpeed * delta;

      const dx = Math.abs(pPos.x - obstacle.position.x);
      const dy = Math.abs(pPos.y - obstacle.position.y);
      const dz = Math.abs(pPos.z - obstacle.position.z);

      // Çarpışma Kontrolü
      if (dx < 0.85 && dy < 1.0 && dz < 0.85) {
        if (activePowerUp === 'JUGGERNAUT') {
          shatterObstacle(obstacle.position, true);
          obstacle.position.z = 10;
          obstacle.passed = true;
        } else if (hasShield) {
          shatterObstacle(obstacle.position, false);
          obstacle.position.z = 10;
          obstacle.passed = true;
        } else {
          endGame(pPos);
        }
      }

      // Skor ve "KIL PAYI (Close Call)" Teğet Geçiş Kontrolü!
      if (!obstacle.passed && obstacle.position.z > pPos.z + 0.5) {
        obstacle.passed = true;
        // Eğer oyuncu engelin hemen bitişiğinden veya tam üstünden (kıl payı) geçtiyse ödüllendir!
        if (dx < 3.3 && dy < 1.6) {
          triggerCloseCall();
        } else {
          addScore(10);
        }
      }

      if (obstacle.position.z > 6) {
        obstacle.position.z = -POOL_SIZE * 8 + 6;
        obstacle.position.x = LANES[Math.floor(Math.random() * LANES.length)];
        obstacle.passed = false;
      }

      dummy.position.copy(obstacle.position);
      dummy.rotation.set(stage === 3 ? obstacle.rotationY : 0, obstacle.rotationY, 0);
      dummy.scale.set(1, obstacle.scaleY, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  const matConfig =
    stage === 1
      ? { color: '#a5f3fc', emissive: '#0284c7', roughness: 0.08, transmission: 0.65 }
      : stage === 2
      ? { color: '#450a0a', emissive: '#ea580c', roughness: 0.5, transmission: 0 }
      : { color: '#64748b', emissive: '#1e293b', roughness: 0.7, transmission: 0 };

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as unknown as THREE.BufferGeometry, null as unknown as THREE.Material, POOL_SIZE]}
      castShadow
      receiveShadow
    >
      <coneGeometry args={[0.7, 1.65, 6]} />
      <meshPhysicalMaterial
        color={matConfig.color}
        emissive={matConfig.emissive}
        emissiveIntensity={0.45}
        roughness={matConfig.roughness}
        metalness={0.3}
        transmission={matConfig.transmission}
        flatShading
      />
    </instancedMesh>
  );
}