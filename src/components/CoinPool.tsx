import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

const COIN_COUNT = 12;
const LANES = [-3.2, 0, 3.2];

interface CoinData {
  position: THREE.Vector3;
  active: boolean;
}

export function CoinPool({ playerPositionRef }: { playerPositionRef: { current: THREE.Vector3 } }) {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const coins = useMemo<CoinData[]>(() => {
    return Array.from({ length: COIN_COUNT }, (_, i) => ({
      position: new THREE.Vector3(
        LANES[Math.floor(Math.random() * LANES.length)],
        0.8,
        -12 - i * 11
      ),
      active: true,
    }));
  }, []);

  useFrame((state, delta) => {
    const { status, speed, activePowerUp, collectCoin } = useGameStore.getState();
    const mesh = meshRef.current;
    if (status !== 'PLAYING' || !mesh) return;

    const pPos = playerPositionRef.current;
    const time = state.clock.elapsedTime;

    coins.forEach((coin, i) => {
      coin.position.z += speed * delta;

      // MIKNATIS (MAGNET) BONUSU AKTİFSE: Yakındaki tüm kristalleri oyuncuya doğru çek!
      if (coin.active && activePowerUp === 'MAGNET' && coin.position.z > -18 && coin.position.z < 2) {
        coin.position.x = THREE.MathUtils.lerp(coin.position.x, pPos.x, 10 * delta);
        coin.position.y = THREE.MathUtils.lerp(coin.position.y, pPos.y, 10 * delta);
      }

      if (coin.active && pPos.distanceTo(coin.position) < 1.25) {
        coin.active = false;
        collectCoin(coin.position);
      }

      if (coin.position.z > 6) {
        coin.position.z = -COIN_COUNT * 11 + 6;
        coin.position.x = LANES[Math.floor(Math.random() * LANES.length)];
        coin.active = true;
      }

      dummy.position.copy(coin.position);
      dummy.position.y = 0.85 + Math.sin(time * 4 + i) * 0.2;
      dummy.rotation.y = time * 3 + i;
      dummy.scale.setScalar(coin.active ? 1 : 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[null as unknown as THREE.BufferGeometry, null as unknown as THREE.Material, COIN_COUNT]}
    >
      <octahedronGeometry args={[0.4, 0]} />
      <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} metalness={0.9} roughness={0.1} />
    </instancedMesh>
  );
}