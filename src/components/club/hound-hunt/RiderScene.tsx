// Персонаж HOUND HUNT — райдер в костюме (3D, GLB из Meshy AI).
// Внешняя API совпадает с прежней заглушкой HoundDog:
//   mode = "idle" | "watch" | "lunge" | "chew", lookAt = {x,y} в -1..1.
// "lunge" = удар ногой по капсуле (проигрывается клип один раз).

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import riderAsset from "@/assets/rider.glb.asset.json";

export type RiderMode = "idle" | "watch" | "lunge" | "chew";

type Props = {
  mode: RiderMode;
  /** Куда смотрит: -1..1 по обеим осям. */
  lookAt?: { x: number; y: number };
  className?: string;
  /** Непрерывный цикл удара: клип крутится сам, без перезапусков извне. */
  loopKick?: boolean;
  /** Вызывается в момент контакта ноги (≈60% клипа) на каждом цикле. */
  onImpact?: () => void;
};

const MODEL_URL = riderAsset.url;

function Model({
  mode,
  lookAt,
  loopKick,
  onImpact,
}: {
  mode: RiderMode;
  lookAt: { x: number; y: number };
  loopKick?: boolean;
  onImpact?: () => void;
}) {
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
  const action = clip ? actions[clip] : null;
  const impactRef = useRef(onImpact);
  impactRef.current = onImpact;
  const prevTime = useRef(0);

  // Режим loopKick: клип удара крутится бесконечно на своей скорости и
  // НИКОГДА не перезапускается руками — поэтому нога всегда возвращается
  // в стойку и не бывает рывков. Импакт отдаём наружу колбэком.
  useEffect(() => {
    if (!action) return;
    action.enabled = true;
    action.clampWhenFinished = false;
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.timeScale = loopKick ? 1 : mode === "watch" ? 0.5 : 0.35;
    if (!action.isRunning()) {
      action.reset();
      action.play();
    }
  }, [action, loopKick, mode]);

  useFrame(() => {
    if (!action || !loopKick) return;
    const dur = action.getClip().duration;
    const impactAt = dur * 0.6;
    const t = action.time;
    // цикл завернулся — сбрасываем сторож
    if (t < prevTime.current) prevTime.current = 0;
    if (prevTime.current < impactAt && t >= impactAt) impactRef.current?.();
    prevTime.current = t;
  });

  const yaw = Math.max(-1, Math.min(1, lookAt.x)) * 0.28;
  const pitch = Math.max(-1, Math.min(1, lookAt.y)) * 0.1;

  return (
    <group ref={group} rotation={[pitch, yaw, 0]}>
      <primitive object={cloned} scale={fit.s} position={fit.offset as unknown as [number, number, number]} />
    </group>
  );
}

export default function RiderScene({
  mode,
  lookAt = { x: 0, y: 0 },
  className,
  loopKick,
  onImpact,
}: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 1.6]}
        camera={{ position: [0, 1.1, 5.6], fov: 42 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[3, 5, 4]} intensity={1.5} />
        <spotLight position={[-3, 4, 2]} angle={0.6} intensity={2.4} color="#ff2d6f" />
        <spotLight position={[0, 2, -4]} angle={0.8} intensity={1.6} color="#7c5cff" />
        <Suspense fallback={null}>
          <Model mode={mode} lookAt={lookAt} loopKick={loopKick} onImpact={onImpact} />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
