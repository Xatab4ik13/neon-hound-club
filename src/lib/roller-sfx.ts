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

// Один «гудок» airhorn: стек расстроенных saw + квадрат снизу, лёгкий питч-свип,
// полосовой фильтр сверху для агрессии, быстрая атака и резкий обрыв.
function scheduleHonk(c: AudioContext, when: number, dur: number, base: number) {
  const master = c.createGain();
  master.gain.setValueAtTime(0.0001, when);
  master.gain.exponentialRampToValueAtTime(0.35, when + 0.012);
  master.gain.setValueAtTime(0.35, when + dur - 0.04);
  master.gain.exponentialRampToValueAtTime(0.0001, when + dur);

  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 220;

  const drive = c.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) {
    const x = (i / 1024) * 2 - 1;
    curve[i] = Math.tanh(x * 2.4);
  }
  drive.curve = curve;

  master.connect(drive).connect(hp).connect(c.destination);

  // расстроенные saw — «толстый» гудок
  const detunes = [-12, -5, 0, 5, 12];
  detunes.forEach((d) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(base * 0.94, when);
    o.frequency.exponentialRampToValueAtTime(base, when + 0.05);
    o.detune.value = d;
    const g = c.createGain();
    g.gain.value = 0.18;
    o.connect(g).connect(master);
    o.start(when);
    o.stop(when + dur + 0.02);
  });

  // суб-квадрат на октаву ниже — низ для DJ-вайба
  const sub = c.createOscillator();
  sub.type = "square";
  sub.frequency.value = base / 2;
  const subG = c.createGain();
  subG.gain.value = 0.25;
  sub.connect(subG).connect(master);
  sub.start(when);
  sub.stop(when + dur + 0.02);
}

/** Airhorn: серия из 4 коротких гудков, как на тусовке. */
export function playWin() {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + 0.02;
  // ритм: тук-тук-тук-тууу
  const pattern: Array<[number, number]> = [
    [0.0, 0.13],
    [0.18, 0.13],
    [0.36, 0.13],
    [0.56, 0.55],
  ];
  pattern.forEach(([off, dur]) => scheduleHonk(c, t0 + off, dur, 466)); // ~A#4
}

/** «Бам» при ре-спине / отмене. */
export function playClick() {
  const c = ac();
  if (!c) return;
  scheduleTick(c, c.currentTime + 0.005, 0.25, 0.5);
}
