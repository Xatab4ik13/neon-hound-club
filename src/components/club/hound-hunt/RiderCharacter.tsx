// Ленивая обёртка над 3D-сценой персонажа: three/fiber грузится только
// на экране HOUND HUNT, а не в основном бандле.

import { Suspense } from "react";
import RiderScene from "./RiderScene";

export type RiderMode = "idle" | "watch" | "lunge" | "chew";

type Props = {
  mode: RiderMode;
  lookAt?: { x: number; y: number };
  className?: string;
  kickToken?: number;
  /** true = персонаж переходит в танец победы (плавный кроссфейд). */
  victory?: boolean;
  /** true = финальный экран: луп танца. */
  dance?: boolean;
  /** Жест начинается сразу, без fade-in/fade-out. */
  instantDance?: boolean;
  /** Масштаб модели внутри канваса, без увеличения и обрезки самого canvas. */
  modelScale?: number;
  /** Постоянный экземпляр GLB: не должен меняться вместе с режимом анимации. */
  instance?: "hero" | "action";
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  onImpact?: (cycle: number) => void;
};


export function RiderCharacter(props: Props) {
  return (
    <div className={props.className}>
      <Suspense fallback={null}>
        <RiderScene {...props} className="h-full w-full" />
      </Suspense>
    </div>
  );
}
