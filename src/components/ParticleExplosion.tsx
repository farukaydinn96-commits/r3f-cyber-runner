import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore } from "../store/useGameStore";

const PARTICLE_COUNT = 40;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  scale: number;
}

export function ParticleExplosion() {
  const meshRef = useRef<THREE.InstancedMesh>(null!);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const explosionPos = useGameStore((s) => s.explosionPos);
  const explosionColor = useGameStore((s) => s.explosionColor);

  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      scale: 0,
    }));
  }, []);

  // Patlama tetiklendiğinde havuzdaki parçacıkları merkeze toplayıp rastgele 3D vektörlerle fırlat
  useEffect(() => {
    if (!explosionPos) return;
    particles.forEach((p) => {
      p.position.copy(explosionPos);
      p.velocity.set(
        (Math.random() - 0.5) * 14,
        Math.random() * 10 + 2,
        (Math.random() - 0.5) * 14,
      );
      p.scale = Math.random() * 0.6 + 0.4;
    });
  }, [explosionPos, particles]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    particles.forEach((p, i) => {
      if (p.scale > 0.01) {
        p.position.addScaledVector(p.velocity, delta);
        p.velocity.y -= 24 * delta; // 3D Yerçekimi
        p.scale = Math.max(0, p.scale - delta * 1.4); // Küçülerek kaybolma
      } else {
        p.scale = 0;
      }

      dummy.position.copy(p.position);
      dummy.scale.setScalar(p.scale);
      dummy.rotation.x += delta * 6;
      dummy.rotation.y += delta * 6;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[
        null as unknown as THREE.BufferGeometry,
        null as unknown as THREE.Material,
        PARTICLE_COUNT,
      ]}
    >
      <dodecahedronGeometry args={[0.22, 0]} />
      <meshStandardMaterial
        color={explosionColor}
        emissive={explosionColor}
        emissiveIntensity={1.5}
      />
    </instancedMesh>
  );
}
