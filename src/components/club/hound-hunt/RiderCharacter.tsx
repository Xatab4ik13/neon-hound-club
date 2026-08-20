// Ленивая обёртка над 3D-сценой персонажа: three/fiber грузится только
// на экране HOUND HUNT, а не в основном бандле.

import { Suspense, lazy } from "react";

export type RiderMode = "idle" | "watch" | "lunge" | "chew";

const RiderScene = lazy(() => import("./RiderScene"));

type Props = {
  mode: RiderMode;
  lookAt?: { x: number; y: number };
  className?: string;
  kickToken?: number;
  /** true = персонаж переходит в танец победы (плавный кроссфейд). */
  victory?: boolean;
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
