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
  /** Изменение токена запускает один полный взмах. */
  kickToken?: number;
  /** Сообщает задержку от запуска взмаха до контакта ноги. */
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  /** Вызывается в момент контакта ноги (≈60% клипа). */
  onImpact?: (cycle: number) => void;
};

const MODEL_URL = riderAsset.url;

/** Во сколько раз обратный ход быстрее самого взмаха.
 *  1 = ровно та же скорость: никакого «рывка назад» глазом не видно. */
const REWIND = 1;

const BRAND = { r: 0xf0, g: 0x00, b: 0xc0 };

/** Переводит розово-малиновые пиксели текстуры в фирменный #F000C0. */
function recolorPinkTexture(tex: THREE.Texture): THREE.Texture | null {
  const img = tex.image as HTMLImageElement | ImageBitmap | undefined;
  if (!img || !("width" in img) || !img.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(img as CanvasImageSource, 0, 0);
  let data: ImageData;
  try {
    data = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
  const px = data.data;
  for (let i = 0; i < px.length; i += 4) {
    const r = px[i],
      g = px[i + 1],
      b = px[i + 2];
    const max = Math.max(r, g, b),
      min = Math.min(r, g, b);
    if (max < 40) continue;
    const sat = (max - min) / max;
    if (sat < 0.25) continue;
    // hue в градусах
    const d = max - min;
    let h: number;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    // розовый/малиновый/красно-розовый диапазон
    if (!(h >= 285 || h <= 15)) continue;
    const v = max / 255; // сохраняем светотень
    px[i] = Math.min(255, BRAND.r * v);
    px[i + 1] = Math.min(255, BRAND.g * v + (min / 255) * 255 * 0.35);
    px[i + 2] = Math.min(255, BRAND.b * v);
  }
  ctx.putImageData(data, 0, 0);
  const out = new THREE.CanvasTexture(canvas);
  out.flipY = tex.flipY;
  out.wrapS = tex.wrapS;
  out.wrapT = tex.wrapT;
  out.colorSpace = tex.colorSpace;
  out.anisotropy = 8;
  out.needsUpdate = true;
  return out;
}

function Model({
  mode,
  lookAt,
  kickToken,
  onKickReady,
  onImpact,
}: {
  mode: RiderMode;
  lookAt: { x: number; y: number };
  kickToken?: number;
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  onImpact?: (cycle: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const cloned = useMemo(() => scene, [scene]);

  // Перекраска в фирменный розовый + подтяжка резкости/контраста материалов.
  useEffect(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat) return;
        if (mat.map && !(mat.map as THREE.Texture & { __hhBrand?: boolean }).__hhBrand) {
          const next = recolorPinkTexture(mat.map);
          if (next) {
            (next as THREE.Texture & { __hhBrand?: boolean }).__hhBrand = true;
            mat.map = next;
          }
          (mat.map as THREE.Texture & { __hhBrand?: boolean }).__hhBrand = true;
          mat.map.anisotropy = 8;
        } else if (!mat.map) {
          const c = mat.color?.getHSL({ h: 0, s: 0, l: 0 });
          if (c && c.s > 0.25 && (c.h * 360 >= 285 || c.h * 360 <= 15)) {
            mat.color.setHex(0xf000c0);
          }
        }
        if (typeof mat.roughness === "number") mat.roughness = Math.min(mat.roughness, 0.65);
        if (typeof mat.metalness === "number") mat.metalness = Math.min(mat.metalness, 0.35);
        mat.needsUpdate = true;
      });
    });
  }, [cloned]);
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
  const readyRef = useRef(onKickReady);
  readyRef.current = onKickReady;
  const prevTime = useRef(0);
  const kickCycle = useRef(0);
  const firedCycle = useRef(-1);
  /** Обратный ход: возвращаемся в стойку плавно, а не рывком через reset(). */
  const rewinding = useRef(false);

  // Между ударами персонаж стоит на первом кадре. Каждый новый kickToken
  // запускает один полный клип — поэтому он физически не бьёт в дырку.
  useEffect(() => {
    if (!action) return;
    action.enabled = true;
    action.clampWhenFinished = true;
    action.setLoop(THREE.LoopOnce, 1);
    action.timeScale = 1;
    action.reset();
    action.paused = true;
    action.play();
    const d = action.getClip().duration;
    // Полный цикл = взмах + плавный обратный ход (×REWIND быстрее).
    readyRef.current?.(d * 0.6 * 1000, d * 1000 * (1 + 1 / REWIND));
  }, [action]);

  const startKick = (token: number) => {
    if (!action) return;
    kickCycle.current = token;
    firedCycle.current = -1;
    prevTime.current = 0;
    rewinding.current = false;
    action.reset();
    action.timeScale = 1;
    action.paused = false;
    action.play();
  };
  const startKickRef = useRef(startKick);
  startKickRef.current = startKick;
  /** Токен, пришедший посреди обратного хода: доигрываем возврат, потом бьём. */
  const pendingKick = useRef<number | null>(null);
  /** Момент старта обратного хода — для аварийного выхода из зависшего возврата. */
  const rewindStart = useRef(0);

  useEffect(() => {
    if (!action || !kickToken) return;
    // Никогда не обрываем возврат в стойку через reset() — это и есть тот
    // самый «рывок»: поза телепортируется в первый кадр клипа.
    if (rewinding.current) {
      pendingKick.current = kickToken;
      return;
    }
    startKickRef.current(kickToken);
  }, [action, kickToken]);

  const finishRewind = () => {
    if (!action) return;
    rewinding.current = false;
    action.timeScale = 1;
    action.time = 0;
    action.paused = true;
    prevTime.current = 0;
    const next = pendingKick.current;
    if (next !== null) {
      pendingKick.current = null;
      startKickRef.current(next);
    }
  };

  useFrame(() => {
    if (!action || !kickToken) return;
    const dur = action.getClip().duration;
    const impactAt = dur * 0.6;
    const t = action.time;

    // --- обратный ход ---
    if (rewinding.current) {
      // three.js при LoopOnce + clampWhenFinished сам ставит paused = true,
      // когда клип «дошёл до конца» (в реверсе — до нуля). Раньше мы на этом
      // выходили из useFrame раньше времени и застревали в rewinding навсегда.
      if (t <= 1e-3 || action.paused || performance.now() - rewindStart.current > 1500) {
        finishRewind();
      } else {
        prevTime.current = t;
      }
      return;
    }

    // --- взмах ---
    if (prevTime.current < impactAt && t >= impactAt && firedCycle.current !== kickCycle.current) {
      firedCycle.current = kickCycle.current;
      impactRef.current?.(kickCycle.current);
    }

    if (t >= dur - 1e-3) {
      // Клип доигран: вместо мгновенного reset() отматываем назад — так поза
      // возвращается в стойку без дёрганья.
      rewinding.current = true;
      rewindStart.current = performance.now();
      action.timeScale = -REWIND;
      action.time = Math.min(t, dur - 1e-4);
      action.paused = false;
      action.play();
      prevTime.current = action.time;
      return;
    }

    prevTime.current = t;
  });


  const yaw = Math.max(-1, Math.min(1, lookAt.x)) * 0.28;
  const pitch = Math.max(-1, Math.min(1, lookAt.y)) * 0.1;

  return (
    <group ref={group} rotation={[pitch, yaw, 0]}>
      <primitive
        object={cloned}
        scale={fit.s}
        position={fit.offset as unknown as [number, number, number]}
      />
    </group>
  );
}

export default function RiderScene({
  mode,
  lookAt = { x: 0, y: 0 },
  className,
  kickToken,
  onKickReady,
  onImpact,
}: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.1, 5.6], fov: 42 }}
        gl={{
          antialias: true,
          alpha: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.25,
        }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 4]} intensity={2.4} />
        <directionalLight position={[-4, 2, 3]} intensity={0.9} color="#ffffff" />
        <spotLight position={[-3, 4, 2]} angle={0.6} intensity={3.2} color="#f000c0" />
        <spotLight position={[0, 3, -4]} angle={0.9} intensity={2.6} color="#f000c0" />
        <Suspense fallback={null}>
          <Model
            mode={mode}
            lookAt={lookAt}
            kickToken={kickToken}
            onKickReady={onKickReady}
            onImpact={onImpact}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
