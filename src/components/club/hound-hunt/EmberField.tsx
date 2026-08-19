// Фон хоррор-арены: угли/искры вверх + медленный дым. Canvas, без зависимостей.
// intensity 0..1 — подкручивается на пиках шоу (укус, ревил).

import { useEffect, useRef } from "react";

type Props = { intensity?: number; className?: string };

type Ember = { x: number; y: number; vx: number; vy: number; r: number; life: number; max: number };

export function EmberField({ intensity = 0.35, className }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const inten = useRef(intensity);
  inten.current = intensity;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Один спрайт угля вместо нового CanvasGradient для каждой частицы в
    // каждом кадре. На мобильном это убирает сотни дорогих аллокаций за кадр.
    const emberSprite = document.createElement("canvas");
    emberSprite.width = 64;
    emberSprite.height = 64;
    const spriteCtx = emberSprite.getContext("2d");
    if (!spriteCtx) return;
    const spriteGradient = spriteCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
    spriteGradient.addColorStop(0, "oklch(0.72 0.24 25 / 1)");
    spriteGradient.addColorStop(0.45, "oklch(0.55 0.20 20 / 0.35)");
    spriteGradient.addColorStop(1, "oklch(0.5 0.2 20 / 0)");
    spriteCtx.fillStyle = spriteGradient;
    spriteCtx.fillRect(0, 0, 64, 64);

    let w = 0;
    let h = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const embers: Ember[] = [];
    const spawn = () => {
      const max = 900 + Math.random() * 1800;
      embers.push({
        x: Math.random() * w,
        y: h + 10,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.25 + Math.random() * 0.9) * (0.6 + inten.current),
        r: 0.7 + Math.random() * 2.1,
        life: 0,
        max,
      });
    };

    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;

      const want = 40 + inten.current * 140;
      while (embers.length < want) spawn();

      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += dt;
        e.x += e.vx * dt * 0.06 + Math.sin((e.life + i * 90) / 620) * 0.25;
        e.y += e.vy * dt * 0.06;
        const t = e.life / e.max;
        if (t >= 1 || e.y < -20) {
          embers.splice(i, 1);
          continue;
        }
        const a = Math.sin(Math.PI * t) * (0.35 + inten.current * 0.5);
        const size = e.r * 12;
        ctx.globalAlpha = a;
        ctx.drawImage(emberSprite, e.x - size / 2, e.y - size / 2, size, size);
      }

      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={ref} className={className} aria-hidden />;
}
