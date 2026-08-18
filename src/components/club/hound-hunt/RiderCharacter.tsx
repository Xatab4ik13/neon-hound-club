// Персонаж HOUND HUNT — райдер в костюме (3D, GLB из Meshy AI).
// Внешняя API совпадает с прежней заглушкой HoundDog:
//   mode = "idle" | "watch" | "lunge" | "chew", lookAt = {x,y} в -1..1.
// "lunge" = удар ногой по капсуле (проигрывается клип один раз).

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import riderAsset from "@/assets/rider.glb.asset.json";

export type RiderMode = "idle" | "watch" | "lunge" | "chew";

type Props = {
  mode: RiderMode;
  /** Куда смотрит: -1..1 по обеим осям. */
  lookAt?: { x: number; y: number };
  className?: string;
};

const MODEL_URL = riderAsset.url;

function Model({ mode, lookAt }: { mode: RiderMode; lookAt: { x: number; y: number } }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const cloned = useMemo(() => scene, [scene]);
  const { actions, names } = useAnimations(animations, group);

  // нормализуем масштаб/позицию: ставим на пол, высота ~2 юнита
  const fit = useMemo(() => {
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = 2 / Math.max(size.y || 1, 0.001);
    return { s, offset: [-center.x * s, -box.min.y * s, -center.z * s] as const };
  }, [cloned]);

  const clip = names[0];

  useEffect(() => {
    const action = clip ? actions[clip] : null;
    if (!action) return;
    if (mode === "lunge") {
      action.reset();
      action.setLoop(THREE.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.timeScale = 1.15;
      action.play();
    } else {
      // спокойная стойка: медленно «дышим» тем же клипом на малой скорости
      action.paused = false;
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      action.timeScale = mode === "watch" ? 0.22 : 0.12;
      if (!action.isRunning()) action.play();
    }
  }, [mode, actions, clip]);

  const yaw = Math.max(-1, Math.min(1, lookAt.x)) * 0.28;
  const pitch = Math.max(-1, Math.min(1, lookAt.y)) * 0.1;

  return (
    <group ref={group} rotation={[pitch, yaw, 0]}>
      <primitive object={cloned} scale={fit.s} position={fit.offset as unknown as [number, number, number]} />
    </group>
  );
}

export function RiderCharacter({ mode, lookAt = { x: 0, y: 0 }, className }: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 1.25, 4.2], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} />
        <spotLight position={[-3, 4, 2]} angle={0.6} intensity={2.4} color="#ff2d6f" />
        <spotLight position={[0, 2, -4]} angle={0.8} intensity={1.6} color="#7c5cff" />
        <Suspense fallback={null}>
          <Model mode={mode} lookAt={lookAt} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
