// Ленивая обёртка над 3D-сценой персонажа: three/fiber грузится только
// на экране HOUND HUNT, а не в основном бандле.

import { Suspense, lazy } from "react";

export type RiderMode = "idle" | "watch" | "lunge" | "chew";

const importScene = () => import("./RiderScene");
const RiderScene = lazy(importScene);

/**
 * Прогревает чанк three/fiber и GLB-модели заранее (модуль RiderScene
 * вызывает useGLTF.preload на верхнем уровне), чтобы при переходе
 * на HELL HUNT персонаж был уже готов.
 */
let riderPreloaded = false;
export function preloadRider() {
  if (riderPreloaded) return;
  riderPreloaded = true;
  void importScene();
}

type Props = {
  mode: RiderMode;
  lookAt?: { x: number; y: number };
  className?: string;
  kickToken?: number;
  /** true = персонаж переходит в танец победы (плавный кроссфейд). */
  victory?: boolean;
  /** true = финальный экран: луп танца. */
  dance?: boolean;
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  onImpact?: (cycle: number) => void;
};


export function RiderCharacter(props: Props) {
  return (
    <Suspense fallback={<div className={props.className} />}>
      <RiderScene {...props} />
    </Suspense>
  );
}
