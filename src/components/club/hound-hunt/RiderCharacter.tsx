// Ленивая обёртка над 3D-сценой персонажа: three/fiber грузится только
// на экране HOUND HUNT, а не в основном бандле.

import { Suspense, lazy } from "react";

export type RiderMode = "idle" | "watch" | "lunge" | "chew";

const RiderScene = lazy(() => import("./RiderScene"));

type Props = {
  mode: RiderMode;
  lookAt?: { x: number; y: number };
  className?: string;
};

export function RiderCharacter(props: Props) {
  return (
    <Suspense fallback={<div className={props.className} />}>
      <RiderScene {...props} />
    </Suspense>
  );
}
