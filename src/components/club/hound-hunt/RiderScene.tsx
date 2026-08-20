// Персонаж HOUND HUNT — райдер в костюме (3D, GLB из Meshy AI).
// Внешняя API совпадает с прежней заглушкой HoundDog:
//   mode = "idle" | "watch" | "lunge" | "chew", lookAt = {x,y} в -1..1.
// "lunge" = удар ногой по капсуле (проигрывается клип один раз).

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import riderAsset from "@/assets/rider.glb.asset.json";
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
  /** Запускает жест сразу, без появления/исчезновения через кроссфейд. */
  instantDance?: boolean;
  /** Масштаб модели внутри канваса. */
  modelScale?: number;
  /** Постоянный экземпляр модели для одновременных canvas. */
  instance?: "hero" | "action";
  /** Сообщает задержку от запуска взмаха до контакта ноги. */
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  /** Вызывается в момент контакта ноги (≈60% клипа). */
  onImpact?: (cycle: number) => void;
};

const MODEL_URL = riderAsset.url;
const DANCE_URL = danceAsset.url;
/** Имя, под которым регистрируется клип танца финального экрана. */
const DANCE_CLIP = "hh_final_dance";
const FIT_BY_INSTANCE = new Map<string, { s: number; offset: readonly [number, number, number] }>();

function Model({
  mode,
  lookAt,
  kickToken,
  victory,
  dance,
  instantDance,
  modelScale = 1,
  instance = "action",
  onKickReady,
  onImpact,
}: {
  mode: RiderMode;
  lookAt: { x: number; y: number };
  kickToken?: number;
  victory?: boolean;
  dance?: boolean;
  instantDance?: boolean;
  modelScale?: number;
  instance?: "hero" | "action";
  onKickReady?: (impactDelay: number, cycleMs: number) => void;
  onImpact?: (cycle: number) => void;
}) {
  const group = useRef<THREE.Group>(null);
  // В файле жеста уже лежит полноценная модель. Герою не нужно параллельно
  // держать базовый GLB, а ударному персонажу — 20 МБ файла с жестом.
  const instanceUrl = instance === "hero" ? DANCE_URL : MODEL_URL;
  const { scene, animations } = useGLTF(instanceUrl);
  // useGLTF держит один общий scene в кеше. Каждый персонаж получает
  // собственное дерево и skeleton, иначе primitive переносится между canvas.
  const cloned = useMemo(() => cloneSkeleton(scene) as THREE.Group, [scene]);
  const localClips = useMemo(() => {
    return animations.map((c, i) => {
      const clone = c.clone();
      if (instance === "hero") clone.name = i === 0 ? DANCE_CLIP : `${DANCE_CLIP}_${i}`;
      return clone;
    });
  }, [animations, instance]);
  const allClips = useMemo(() => {
    // Реальная причина «персонаж исчезает»: в этих GLB rest-поза скелета
    // записана в метрах (Hips.y ≈ 0.82), а треки анимации — в сантиметрах
    // (Hips.y ≈ 80). Как только клип начинал играть, тело улетало в 100 раз
    // выше камеры и на канвасе оставалась пустота. Позицию корня берём из
    // rest-позы модели: это и убирает root-motion, и снимает расхождение единиц.
    const restPositions = new Map<string, THREE.Vector3>();
    cloned.traverse((node) => {
      restPositions.set(node.name, node.position.clone());
    });

    const lockRootMotion = (source: THREE.AnimationClip) => {
      const clip = source.clone();
      clip.tracks = clip.tracks.map((track) => {
        // В разных Meshy-файлах корень называется Hips, mixamorigHips и
        // Armature.Hips. Проверяем окончание имени, иначе горизонтальный
        // root-motion остаётся и персонаж гуляет по canvas или выходит из него.
        if (track instanceof THREE.VectorKeyframeTrack && /hips\.position$/i.test(track.name)) {
          const boneName = track.name.split(".")[0];
          const rest = restPositions.get(boneName);
          const values = Array.from(track.values);
          const x = rest ? rest.x : values[0] ?? 0;
          const y = rest ? rest.y : values[1] ?? 0;
          const z = rest ? rest.z : values[2] ?? 0;
          for (let i = 0; i < values.length; i += 3) {
            values[i] = x;
            values[i + 1] = y;
            values[i + 2] = z;
          }
          return new THREE.VectorKeyframeTrack(track.name, Array.from(track.times), values);
        }
        if (track instanceof THREE.VectorKeyframeTrack && /\.scale$/i.test(track.name)) {
          const boneName = track.name.split(".")[0];
          const rest = restPositions.has(boneName) ? null : null;
          void rest;
          const values = Array.from(track.values);
          const x = values[0] ?? 1;
          const y = values[1] ?? 1;
          const z = values[2] ?? 1;
          for (let i = 0; i < values.length; i += 3) {
            values[i] = x;
            values[i + 1] = y;
            values[i + 2] = z;
          }
          return new THREE.VectorKeyframeTrack(track.name, Array.from(track.times), values);
        }
        return track;
      });
      return clip;
    };
    return localClips.map(lockRootMotion);
  }, [localClips, cloned]);


  // Не копируем пиксели текстур через Canvas: на телефонах это удваивало
  // видеопамять модели и приводило к WebGL Context Lost.
  useEffect(() => {
    cloned.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      mats.forEach((m) => {
        const mat = m as THREE.MeshStandardMaterial;
        if (!mat) return;
        if (mat.map) {
          mat.map.anisotropy = 1;
        } else {
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
  // drei отдаёт actions ленивыми геттерами: до того как ref группы заполнен,
  // они возвращают undefined. На первом рендере ref пуст, а повторного рендера
  // при статичных пропсах нет — поэтому анимации никогда не запускались и
  // персонаж стоял в bind-pose. Один принудительный рендер после монтирования
  // отдаёт реальные AnimationAction.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // нормализуем масштаб/позицию: ставим на пол, высота ~2 юнита
  const fit = useMemo(() => {
    const cached = FIT_BY_INSTANCE.get(instanceUrl);
    if (cached) return cached;
    cloned.traverse((node) => {
      const mesh = node as THREE.SkinnedMesh;
      if (mesh.isSkinnedMesh) mesh.skeleton.pose();
    });
    cloned.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const s = 2 / Math.max(size.y || 1, 0.001);
    const normalized = { s, offset: [-center.x * s, -box.min.y * s, -center.z * s] as const };
    FIT_BY_INSTANCE.set(instanceUrl, normalized);
    return normalized;
  }, [cloned, instanceUrl]);

  const clip = names[0];
  const action = mounted && clip ? actions[clip] ?? null : null;
  const victoryName = names.find((n) => n.toLowerCase().includes("victory"));
  const victoryAction = mounted && victoryName ? actions[victoryName] ?? null : null;
  const danceAction = mounted ? actions[DANCE_CLIP] ?? null : null;
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

  // Жест играет нативным бесконечным loop с постоянным весом. Не используем
  // fadeOut/crossfade: после нескольких циклов они обнуляли вес action, из-за
  // чего герой постепенно сжимался и исчезал.
  useEffect(() => {
    if (!danceAction) return;
    if (dance) {
      victoryAction?.stop();
      action?.stop();
      danceAction.enabled = true;
      danceAction.clampWhenFinished = false;
      danceAction.setLoop(THREE.LoopRepeat, Infinity);
      danceAction.timeScale = 1;
      danceAction.reset();
      danceAction.setEffectiveWeight(1);
      danceAction.play();
    } else {
      danceAction.stop();
    }
    return () => {
      danceAction.stop();
      cloned.traverse((node) => {
        const mesh = node as THREE.SkinnedMesh;
        if (mesh.isSkinnedMesh) mesh.skeleton.pose();
      });
    };
  }, [dance, instantDance, danceAction, victoryAction, action, cloned]);

  useFrame(() => {
    const d = ((window as any).__riderDebug ??= {});
    const box = new THREE.Box3().setFromObject(cloned);
    const roots = cloned.children.map((ch) => `${ch.name}:${ch.position.toArray().map((v)=>+v.toFixed(2))}:${ch.scale.toArray().map((v)=>+v.toFixed(2))}`);
    d[`${instance}_state`] = {
      danceRunning: danceAction ? [+danceAction.time.toFixed(2), danceAction.isRunning(), danceAction.getEffectiveWeight()] : null,
      actionRunning: action ? [+action.time.toFixed(2), action.isRunning(), action.getEffectiveWeight()] : null,
      box: [box.min.toArray().map((v)=>+v.toFixed(2)), box.max.toArray().map((v)=>+v.toFixed(2))],
      roots,
      rest: (() => { let h: any = null; cloned.traverse((n) => { if (!h && /hips$/i.test(n.name)) h = n; }); if (!h) return null; const before = h.position.toArray().map((v: number)=>+v.toFixed(3)); const sm: any = (() => { let m: any = null; cloned.traverse((n: any) => { if (!m && n.isSkinnedMesh) m = n; }); return m; })(); const idx = sm ? sm.skeleton.bones.indexOf(h) : -1; const inv = idx >= 0 ? sm.skeleton.boneInverses[idx] : null; const restPos = inv ? new THREE.Vector3().setFromMatrixPosition(new THREE.Matrix4().copy(inv).invert()).toArray().map((v: number)=>+v.toFixed(3)) : null; return { live: before, restWorldFromInverse: restPos, geomBox: sm ? [sm.geometry.boundingBox?.min.toArray().map((v: number)=>+v.toFixed(3)), sm.geometry.boundingBox?.max.toArray().map((v: number)=>+v.toFixed(3))] : null, bindMatrixScale: sm ? new THREE.Vector3().setFromMatrixScale(sm.bindMatrix).toArray().map((v: number)=>+v.toFixed(3)) : null }; })(),
      chain: (() => { let h: THREE.Object3D | null = null; cloned.traverse((n) => { if (!h && /hips$/i.test(n.name)) h = n; }); const r: string[] = []; let c: THREE.Object3D | null = h; while (c) { r.push(`${c.name || c.type} p=${c.position.toArray().map((v)=>+v.toFixed(2))} s=${c.scale.toArray().map((v)=>+v.toFixed(3))}`); c = c.parent; } return r; })(),
      bones: (() => { const r: string[] = []; cloned.traverse((n) => { if (/hips$|head$|spine$/i.test(n.name) && r.length < 6) { const w = new THREE.Vector3(); n.getWorldPosition(w); const sc = new THREE.Vector3(); n.getWorldScale(sc); r.push(`${n.name} p=${w.toArray().map((v)=>+v.toFixed(2))} s=${sc.toArray().map((v)=>+v.toFixed(3))}`); } }); return r; })(),
      meshes: (() => { const r: string[] = []; cloned.traverse((n) => { const m = n as THREE.SkinnedMesh; if ((m as any).isMesh) { const mat = m.material as THREE.MeshStandardMaterial; r.push(`${n.name} vis=${m.visible} op=${mat?.opacity} tr=${mat?.transparent} frust=${m.frustumCulled} bones=${(m as any).isSkinnedMesh ? m.skeleton?.bones?.length : "-"}`); } }); return r; })(),
    };
  });
  useFrame(() => {
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




  return (
    <group ref={group}>
      <group scale={modelScale}>
        <primitive
          object={cloned}
          dispose={null}
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
  instantDance,
  modelScale,
  instance,
  onKickReady,
  onImpact,
}: Props) {
  return (
    <div className={className}>
      <Canvas
        dpr={1}
        camera={{ position: [0, 1.1, 5.6], fov: 50 }}
        gl={{
          antialias: false,
          alpha: true,
          powerPreference: "low-power",
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
            instantDance={instantDance}
            modelScale={modelScale}
            instance={instance}
            onKickReady={onKickReady}
            onImpact={onImpact}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

