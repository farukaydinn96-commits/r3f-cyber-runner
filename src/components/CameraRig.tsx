import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store/useGameStore';

export function CameraRig({ playerPositionRef }: { playerPositionRef: { current: THREE.Vector3 } }) {
  useFrame((state, delta) => {
    const { shakeIntensity, speed, activePowerUp, updateTimers } = useGameStore.getState();
    const cam = state.camera as THREE.PerspectiveCamera;

    const targetX = playerPositionRef.current.x * 0.35;
    cam.position.x = THREE.MathUtils.lerp(cam.position.x, targetX, 6 * delta);
    cam.position.y = THREE.MathUtils.lerp(cam.position.y, 4.6, 6 * delta);

    if (shakeIntensity > 0) {
      cam.position.x += (Math.random() - 0.5) * shakeIntensity;
      cam.position.y += (Math.random() - 0.5) * shakeIntensity;
    }

    updateTimers(delta);

    const boostFov = activePowerUp === 'JUGGERNAUT' ? 10 : 0;
    const targetFov = 66 + Math.max(0, (speed - 14) * 0.65) + boostFov;
    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov, 4 * delta);
    cam.updateProjectionMatrix();
  });

  return null;
}