// Web Audio SFX для CS:GO-роллера. Никаких ассетов — синтез на лету.
// Тик-сэмплы расписываем заранее с учётом cubic-bezier торможения,
// чтобы ритм совпадал с визуалом и не лагал даже на 10к участниках.

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// Короткий «клик» — белый шум через bandpass + быстрый экспоненциальный спад.
function scheduleTick(c: AudioContext, when: number, gain: number, pitch: number) {
  const dur = 0.05;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buf;

  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800 + pitch * 600;
  bp.Q.value = 6;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), when + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  src.connect(bp).connect(g).connect(c.destination);
  src.start(when);
  src.stop(when + dur + 0.01);
}

// cubic-bezier(0.12, 0.78, 0.18, 1) — то же, что у transition на ленте.
// Численно инвертируем: по прогрессу положения (0..1) находим прогресс времени.
function bezierY(t: number, p1y: number, p2y: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1y + 3 * u * t * t * p2y + t * t * t;
}
function bezierX(t: number, p1x: number, p2x: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1x + 3 * u * t * t * p2x + t * t * t;
}
function timeForProgress(progress: number): number {
  // ищем t такой, что bezierY(t) == progress, потом возвращаем bezierX(t)
  let lo = 0,
    hi = 1,
    t = progress;
  for (let i = 0; i < 24; i++) {
    t = (lo + hi) / 2;
    const y = bezierY(t, 0.78, 1);
    if (y < progress) lo = t;
    else hi = t;
  }
  return bezierX(t, 0.12, 0.18);
}

/**
 * Расписать тики на длительность спина.
 * @param totalCards сколько карточек пройдёт мимо маркера от старта до остановки
 * @param durationMs длительность анимации, мс
 */
export function playSpin(totalCards: number, durationMs: number) {
  const c = ac();
  if (!c) return;
  const start = c.currentTime + 0.02;
  const dur = durationMs / 1000;
  const n = Math.min(totalCards, 90);
  for (let i = 1; i <= n; i++) {
    const progress = i / n; // позиционный прогресс (равномерно по карточкам)
    const tNorm = timeForProgress(progress); // прогресс времени с учётом easing
    const when = start + tNorm * dur;
    // громкость и высота слегка падают к концу — ощущение замедления
    const fade = 1 - tNorm * 0.55;
    scheduleTick(c, when, 0.18 * fade, 1 - tNorm);
  }
}

// Классический MLG/Discord airhorn — реальный сэмпл, ничем не имитируется.
import airhornUrl from "@/assets/airhorn.mp3";

let airhornBuf: AudioBuffer | null = null;
let airhornLoading: Promise<AudioBuffer | null> | null = null;
async function loadAirhorn(c: AudioContext): Promise<AudioBuffer | null> {
  if (airhornBuf) return airhornBuf;
  if (airhornLoading) return airhornLoading;
  airhornLoading = (async () => {
    try {
      const res = await fetch(airhornUrl);
      const arr = await res.arrayBuffer();
      airhornBuf = await c.decodeAudioData(arr);
      return airhornBuf;
    } catch {
      return null;
    }
  })();
  return airhornLoading;
}

// Предзагружаем сразу, чтобы к концу спина было готово.
if (typeof window !== "undefined") {
  const warm = () => {
    const c = ac();
    if (c) loadAirhorn(c);
    window.removeEventListener("pointerdown", warm);
  };
  window.addEventListener("pointerdown", warm, { once: true });
}

/** Airhorn — три honk'а, как в Discord. */
export function playWin() {
  const c = ac();
  if (!c) return;
  loadAirhorn(c).then((buf) => {
    if (!buf) return;
    const c2 = ac();
    if (!c2) return;
    const t0 = c2.currentTime + 0.02;
    // короткий-короткий-длинный, как !airhorn в Discord
    [0, 0.22, 0.5].forEach((off) => {
      const src = c2.createBufferSource();
      src.buffer = buf;
      const g = c2.createGain();
      g.gain.value = 0.7;
      src.connect(g).connect(c2.destination);
      src.start(t0 + off);
    });
  });
}

/** «Бам» при ре-спине / отмене. */
export function playClick() {
  const c = ac();
  if (!c) return;
  scheduleTick(c, c.currentTime + 0.005, 0.25, 0.5);
}
