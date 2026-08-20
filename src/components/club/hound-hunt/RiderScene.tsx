// Персонаж HOUND HUNT — райдер в костюме (3D, GLB из Meshy AI).
// Внешняя API совпадает с прежней заглушкой HoundDog:
//   mode = "idle" | "watch" | "lunge" | "chew", lookAt = {x,y} в -1..1.
// "lunge" = удар ногой по капсуле (проигрывается клип один раз).

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import riderAsset from "@/assets/rider.glb.asset.json";
import victoryAsset from "@/assets/rider-victory.glb.asset.json";
import danceAsset from "@/assets/rider-agree.glb.asset.json";

export type RiderMode = "idle" | "watch" | "lunge" | "chew";

type Props = {
  mode: RiderMode;
  /** Куда смотрит: -1..1 по обеим осям. */
  lookAt?: { x: number; y: number };
  className?: string;
  /** Изменение токена запускает один полный взмах. */
  kickToken?: number;
  /** true = плавный переход в анимацию победы (луп). */
  victory?: boolean;
  /** true = финальный экран «охота закрыта»: луп танца. */
  dance?: boolean;
  /** Масштаб модели внутри канваса. */
  modelScale?: number;
  /** Сообщает задержку от запуска взмаха до контакта ноги. */
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  /** Вызывается в момент контакта ноги (≈60% клипа). */
  onImpact?: (cycle: number) => void;
};

const MODEL_URL = riderAsset.url;
const VICTORY_URL = victoryAsset.url;
const DANCE_URL = danceAsset.url;
/** Имя, под которым регистрируется клип танца финального экрана. */
const DANCE_CLIP = "hh_final_dance";
/** Второй экземпляр того же клипа — им делаем бесшовный кроссфейд конца в начало. */
const DANCE_CLIP_B = "hh_final_dance_b";
/** Длительность кроссфейда лупа танца, сек. */
const DANCE_FADE = 0.5;
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
  victory,
  dance,
  modelScale = 1,
  onKickReady,
  onImpact,
}: {
  mode: RiderMode;
  lookAt: { x: number; y: number };
  kickToken?: number;
  victory?: boolean;
  dance?: boolean;
  modelScale?: number;
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  onImpact?: (cycle: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  // У каждого canvas свой разбор GLB. SkeletonUtils.clone ломает skin/bind matrices
  // именно у этой Meshy-модели и оставляет видимый canvas без геометрии.
  const instanceUrl = `${MODEL_URL}?instance=${mode}`;
  const { scene: cloned, animations } = useGLTF(instanceUrl);
  const { animations: victoryAnims } = useGLTF(VICTORY_URL);
  const { animations: danceAnims } = useGLTF(DANCE_URL);
  // Клипы делят один и тот же риг (Meshy, одинаковые имена костей),
  // поэтому победный танец играется тем же миксером — без подмены модели.
  const danceClips = useMemo(() => {
    const base = danceAnims.map((c, i) => {
      const clone = c.clone();
      clone.name = i === 0 ? DANCE_CLIP : `${DANCE_CLIP}_${i}`;
      return clone;
    });
    // Дубль первого клипа: два экземпляра позволяют перекрыть хвост клипа
    // его же началом, поэтому луп идёт без рывка и «сжатия» на стыке.
    if (danceAnims[0]) {
      const twin = danceAnims[0].clone();
      twin.name = DANCE_CLIP_B;
      base.push(twin);
    }
    return base;
  }, [danceAnims]);
  const allClips = useMemo(
    () => [...animations, ...victoryAnims, ...danceClips],
    [animations, victoryAnims, danceClips],
  );


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
  const { actions, names } = useAnimations(allClips, group);

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
  const victoryName = names.find((n) => n.toLowerCase().includes("victory"));
  const victoryAction = victoryName ? actions[victoryName] : null;
  const danceAction = actions[DANCE_CLIP] ?? null;
  const danceActionB = actions[DANCE_CLIP_B] ?? null;
  const danceCur = useRef<THREE.AnimationAction | null>(null);
  const impactRef = useRef(onImpact);
  impactRef.current = onImpact;
  const readyRef = useRef(onKickReady);
  readyRef.current = onKickReady;
  const prevTime = useRef(0);
  const kickCycle = useRef(0);
  const firedCycle = useRef(-1);

  // Ударный клип применяется только к lunge. В idle оставляем bind-pose модели:
  // первый кадр ударного клипа содержит root motion и уводит модель из canvas.
  useEffect(() => {
    if (!action) return;
    if (mode !== "lunge") {
      action.stop();
      cloned.traverse((node) => {
        const mesh = node as THREE.SkinnedMesh;
        if (mesh.isSkinnedMesh) mesh.skeleton.pose();
      });
      return;
    }
    action.enabled = true;
    action.clampWhenFinished = true;
    action.setLoop(THREE.LoopOnce, 1);
    action.timeScale = 1;
    action.reset();
    action.paused = true;
    action.play();
    const d = action.getClip().duration;
    readyRef.current?.(d * 0.6 * 1000, d * 1000);
  }, [action, cloned, mode]);

  useEffect(() => {
    if (!action || mode !== "lunge" || !kickToken || victory) return;
    kickCycle.current = kickToken;
    firedCycle.current = -1;
    prevTime.current = 0;
    action.reset();
    action.timeScale = 1;
    action.paused = false;
    action.play();
  }, [action, kickToken, mode, victory]);

  // Победа: кроссфейд из текущей позы удара в танец. Без резких скачков —
  // удар замораживается на своём кадре и плавно уступает вес танцу.
  useEffect(() => {
    if (!victoryAction) return;
    if (victory) {
      if (action) {
        action.paused = false;
        action.timeScale = 0;
        action.fadeOut(0.6);
      }
      victoryAction.enabled = true;
      victoryAction.clampWhenFinished = false;
      victoryAction.setLoop(THREE.LoopRepeat, Infinity);
      victoryAction.timeScale = 1;
      victoryAction.reset();
      victoryAction.setEffectiveWeight(1);
      victoryAction.fadeIn(0.6).play();
    } else {
      victoryAction.fadeOut(0.35);
      if (action) {
        action.timeScale = 1;
        action.reset();
        action.paused = true;
        action.fadeIn(0.35).play();
      }
    }
  }, [victory, victoryAction, action]);

  // Финальный экран: бесконечный танец. Луп собираем сами — два экземпляра
  // клипа перекрываются кроссфейдом (см. useFrame), поэтому на стыке нет рывка.
  useEffect(() => {
    if (!danceAction) return;
    if (dance) {
      victoryAction?.fadeOut(0.5);
      action?.fadeOut(0.5);
      danceActionB?.stop();
      danceAction.enabled = true;
      danceAction.clampWhenFinished = true;
      danceAction.setLoop(THREE.LoopOnce, 1);
      danceAction.timeScale = 1;
      danceAction.reset();
      danceAction.setEffectiveWeight(1);
      danceAction.fadeIn(0.5).play();
      danceCur.current = danceAction;
    } else {
      danceAction.fadeOut(0.35);
      danceActionB?.fadeOut(0.35);
      danceCur.current = null;
    }
  }, [dance, danceAction, danceActionB, victoryAction, action]);

  useFrame(() => {
    // Бесшовный луп танца: хвост клипа перекрываем его же началом.
    // Позицию модели здесь не меняем: она уже нормализована по bounds,
    // а компенсация через root-bone уводила оба экземпляра за камеру.
    if (dance && danceCur.current && danceAction) {
      const cur = danceCur.current;
      const d = cur.getClip().duration;
      if (d > DANCE_FADE * 2 && cur.time >= d - DANCE_FADE) {
        const next = cur === danceAction ? danceActionB : danceAction;
        if (next) {
          next.enabled = true;
          next.clampWhenFinished = true;
          next.setLoop(THREE.LoopOnce, 1);
          next.timeScale = 1;
          next.reset();
          next.setEffectiveWeight(0);
          next.play();
          next.fadeIn(DANCE_FADE);
          cur.fadeOut(DANCE_FADE);
          danceCur.current = next;
        }
      }
    }


    if (!action || !kickToken || action.paused || victory) return;
    const dur = action.getClip().duration;
    const impactAt = dur * 0.6;
    const t = action.time;
    if (prevTime.current < impactAt && t >= impactAt && firedCycle.current !== kickCycle.current) {
      firedCycle.current = kickCycle.current;
      impactRef.current?.(kickCycle.current);
    }
    prevTime.current = t;
  });




  const yaw = Math.max(-1, Math.min(1, lookAt.x)) * 0.28;
  const pitch = Math.max(-1, Math.min(1, lookAt.y)) * 0.1;

  return (
    <group ref={group} rotation={[pitch, yaw, 0]}>
      <group scale={modelScale}>
        <primitive
          object={cloned}
          scale={fit.s}
          position={fit.offset as unknown as [number, number, number]}
        />
      </group>
    </group>
  );
}

export default function RiderScene({
  mode,
  lookAt = { x: 0, y: 0 },
  className,
  kickToken,
  victory,
  dance,
  modelScale,
  onKickReady,
  onImpact,
}: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={[1, 2]}
        camera={{ position: [0, 1.1, 5.6], fov: 50 }}
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
            victory={victory}
            dance={dance}
            modelScale={modelScale}
            onKickReady={onKickReady}
            onImpact={onImpact}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_URL);
useGLTF.preload(VICTORY_URL);
useGLTF.preload(DANCE_URL);
