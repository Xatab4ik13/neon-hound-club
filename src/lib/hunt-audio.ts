// Аудио шоу HOUND HUNT. Никаких ассетов — всё синтезируем через Web Audio:
// не грузит сеть, не лагает, работает офлайн в PWA.
//
// Музыка: энергичный драйвовый трек (не мрачный дрон и без «жирной» полифонии).
// Основа — четыре чистых голоса, которые почти не наслаиваются:
//   1) короткий синтовый бас-стаккато (снимается сразу, без гула),
//   2) плак-арпеджио (одна нота за раз, быстрый decay),
//   3) ритм-секция: кик / клэп / хэт,
//   4) редкие «стабы» на стыках фраз.
// Никаких длинных пилообразных пэдов и детюн-стеков — они и давали кашу.
// Форма сквозная: аккордовая прогрессия + меняющиеся паттерны, без лупа.

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
let sfxBus: GainNode | null = null;
let timer: number | null = null;
let nextBarAt = 0;
let bar = 0;
let running = false;
let muted = false;
let tension = 0; // 0..1 — накал (растёт к финалу)

const BPM = 124; // энергично, но не рейв
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const SIXTEENTH = BEAT / 4;

const ROOT = 110; // A2
function semi(n: number) {
  return Math.pow(2, n / 12);
}

/** Аккорды (полутона к ROOT + строение) — минор с «подъёмными» аккордами. */
type Chord = { deg: number; triad: number[] };
const PROG: Chord[] = [
  { deg: 0, triad: [0, 3, 7] }, // Am
  { deg: 5, triad: [0, 4, 7] }, // D
  { deg: 8, triad: [0, 4, 7] }, // F
  { deg: 3, triad: [0, 4, 7] }, // C
  { deg: 0, triad: [0, 3, 7] }, // Am
  { deg: -2, triad: [0, 4, 7] }, // G
  { deg: 8, triad: [0, 4, 7] }, // F
  { deg: 5, triad: [0, 4, 7] }, // D
];

// Ритмические паттерны баса (16-е, 1 = нота).
const BASS_PATTERNS = [
  [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0],
  [1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1],
  [1, 1, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0],
];
// Арпеджио: индексы ступеней аккорда (-1 = пауза).
const ARP_PATTERNS = [
  [0, -1, 1, 2, -1, 1, 2, 3, 0, -1, 1, 2, -1, 2, 3, 4],
  [2, 1, 0, 1, 2, 3, 2, 1, 2, 1, 0, 1, 2, 3, 4, 3],
  [0, 2, 4, 2, 1, 3, 2, 0, 0, 2, 4, 5, 4, 2, 1, 0],
  [4, -1, 3, -1, 2, -1, 1, 2, 4, 3, 2, 1, 0, 1, 2, 3],
];

type Section = { bars: number; energy: number; arp: number; bass: number; hats: boolean };
const SECTIONS: Section[] = [
  { bars: 4, energy: 0.45, arp: 0, bass: 0, hats: false }, // разгон
  { bars: 8, energy: 0.7, arp: 1, bass: 1, hats: true },
  { bars: 8, energy: 0.85, arp: 2, bass: 2, hats: true },
  { bars: 4, energy: 0.55, arp: 3, bass: 0, hats: false }, // «выдох»
  { bars: 8, energy: 1, arp: 2, bass: 3, hats: true }, // дроп
  { bars: 8, energy: 0.9, arp: 0, bass: 2, hats: true },
  { bars: 4, energy: 0.6, arp: 3, bass: 1, hats: false },
  { bars: 12, energy: 1.05, arp: 1, bass: 3, hats: true }, // финальный заход
];
const FORM_BARS = SECTIONS.reduce((s, x) => s + x.bars, 0);

function sectionAt(index: number): { sec: Section; local: number } {
  const wrapped = index % FORM_BARS;
  const laps = Math.floor(index / FORM_BARS);
  let acc = 0;
  for (const sec of SECTIONS) {
    if (wrapped < acc + sec.bars) {
      return {
        sec:
          laps === 0
            ? sec
            : {
                ...sec,
                arp: (sec.arp + laps) % ARP_PATTERNS.length,
                bass: (sec.bass + laps) % BASS_PATTERNS.length,
              },
        local: wrapped - acc,
      };
    }
    acc += sec.bars;
  }
  return { sec: SECTIONS[0], local: 0 };
}

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const w = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = w.AudioContext ?? w.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -12;
    comp.knee.value = 20;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.22;
    master.connect(comp).connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0001;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.34;
    sfxBus.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Короткий бас-стаккато: один осциллятор, быстрый спад — никакого гула. */
function bass(c: AudioContext, when: number, freq: number, gain: number) {
  const o = c.createOscillator();
  o.type = "square";
  o.frequency.value = freq;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900 + tension * 700, when);
  lp.frequency.exponentialRampToValueAtTime(260, when + 0.14);
  lp.Q.value = 4;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.15);
  o.connect(lp).connect(g).connect(musicBus!);
  o.start(when);
  o.stop(when + 0.18);
}

/** Плак: треугольник с очень быстрым decay — «одна нота», не пэд. */
function pluck(c: AudioContext, when: number, freq: number, gain: number) {
  const o = c.createOscillator();
  o.type = "triangle";
  o.frequency.value = freq;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 240;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.19);
  o.connect(hp).connect(g).connect(musicBus!);
  o.start(when);
  o.stop(when + 0.22);
}

/** Стаб: короткий аккорд на сильную долю (маркер фразы). */
function stab(c: AudioContext, when: number, base: number, triad: number[], gain: number) {
  triad.forEach((st) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = base * 2 * semi(st);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3200, when);
    lp.frequency.exponentialRampToValueAtTime(900, when + 0.24);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain / triad.length, when + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, when + 0.26);
    o.connect(lp).connect(g).connect(musicBus!);
    o.start(when);
    o.stop(when + 0.3);
  });
}

function noise(c: AudioContext, dur: number, curve: number) {
  const b = c.createBuffer(1, Math.max(1, Math.ceil(c.sampleRate * dur)), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, curve);
  const src = c.createBufferSource();
  src.buffer = b;
  return src;
}

function kick(c: AudioContext, when: number, gain: number) {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(150, when);
  o.frequency.exponentialRampToValueAtTime(48, when + 0.11);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.linearRampToValueAtTime(gain, when + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
  o.connect(g).connect(musicBus!);
  o.start(when);
  o.stop(when + 0.24);
}

function clap(c: AudioContext, when: number, gain: number) {
  const src = noise(c, 0.14, 2.2);
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1700;
  bp.Q.value = 1.1;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(bp).connect(g).connect(musicBus!);
  src.start(when);
}

function hat(c: AudioContext, when: number, gain: number) {
  const src = noise(c, 0.045, 3.4);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 6800;
  const g = c.createGain();
  g.gain.value = gain;
  src.connect(hp).connect(g).connect(musicBus!);
  src.start(when);
}

/** Планирует один такт сквозной формы. */
function scheduleBar(c: AudioContext, at: number, index: number) {
  const { sec, local } = sectionAt(index);
  const chord = PROG[index % PROG.length];
  const base = ROOT * semi(chord.deg);
  const e = Math.min(1.15, sec.energy * (0.85 + tension * 0.35));
  const bp = BASS_PATTERNS[sec.bass];
  const ap = ARP_PATTERNS[sec.arp];
  const scale = [0, 3, 5, 7, 10, 12, 15]; // минорная пентатоника-ish вверх

  for (let i = 0; i < 16; i++) {
    const t = at + i * SIXTEENTH;

    if (bp[i]) bass(c, t, base / 2, 0.16 * e);

    const step = ap[i];
    if (step >= 0) {
      const st = chord.triad[step % chord.triad.length] + 12 * Math.floor(step / chord.triad.length);
      const accent = i % 4 === 0 ? 1 : 0.66;
      pluck(c, t, base * 2 * semi(st + (i % 8 === 7 ? scale[1] : 0)), 0.075 * accent * e);
    }

    // ритм-секция
    if (i === 0 || i === 6 || i === 10) kick(c, t, 0.28 * e);
    if (i === 4 || i === 12) clap(c, t, 0.11 * e);
    if (sec.hats && i % 2 === 1) hat(c, t, (i % 4 === 3 ? 0.05 : 0.032) * e);
  }

  // маркер фразы: стаб на первой доле каждых 4 тактов + «филл» в конце секции
  if (local % 4 === 0) stab(c, at, base, chord.triad, 0.1 * e);
  if (local === sec.bars - 1) {
    clap(c, at + BEAT * 3 + SIXTEENTH * 2, 0.12 * e);
    clap(c, at + BEAT * 3 + SIXTEENTH * 3, 0.15 * e);
  }
}

function tick() {
  const c = ac();
  if (!c || !running) return;
  while (nextBarAt < c.currentTime + 0.5) {
    scheduleBar(c, Math.max(nextBarAt, c.currentTime + 0.05), bar);
    nextBarAt += BAR;
    bar += 1;
  }
}

/** Запуск музыки. Вызывать только из обработчика пользовательского клика. */
export function startHuntMusic() {
  const c = ac();
  if (!c || running) return;
  running = true;
  bar = 0;
  nextBarAt = c.currentTime + 0.12;
  musicBus!.gain.cancelScheduledValues(c.currentTime);
  musicBus!.gain.setValueAtTime(0.0001, c.currentTime);
  musicBus!.gain.linearRampToValueAtTime(0.4, c.currentTime + 1.4);
  tick();
  timer = window.setInterval(tick, 120);
}

export function stopHuntMusic(fade = 1.2) {
  const c = ctx;
  running = false;
  if (timer) {
    window.clearInterval(timer);
    timer = null;
  }
  if (c && musicBus) {
    musicBus.gain.cancelScheduledValues(c.currentTime);
    musicBus.gain.setValueAtTime(musicBus.gain.value, c.currentTime);
    musicBus.gain.linearRampToValueAtTime(0.0001, c.currentTime + fade);
  }
}

/** Накал 0..1 — чем меньше участников осталось, тем плотнее музыка. */
export function setHuntTension(v: number) {
  tension = Math.max(0, Math.min(1, v));
}

export function setHuntMuted(v: boolean) {
  muted = v;
  const c = ac();
  if (!c || !master) return;
  master.gain.cancelScheduledValues(c.currentTime);
  master.gain.setValueAtTime(master.gain.value, c.currentTime);
  master.gain.linearRampToValueAtTime(v ? 0.0001 : 1, c.currentTime + 0.25);
}

export function isHuntMuted() {
  return muted;
}

/** Удар: свуш → щёлкающий транзиент → короткий панч. Ярко, но негромко. */
export function playHuntImpact(power = 1) {
  const c = ac();
  if (!c || !sfxBus) return;
  const sfx: GainNode = sfxBus;
  const t = c.currentTime + 0.005;
  const p = Math.max(0.3, Math.min(1, power));

  // свуш замаха
  const wDur = 0.11;
  const wsrc = noise(c, wDur, 0.4);
  const wbp = c.createBiquadFilter();
  wbp.type = "bandpass";
  wbp.Q.value = 1.4;
  wbp.frequency.setValueAtTime(500, t);
  wbp.frequency.exponentialRampToValueAtTime(4200, t + wDur);
  const wg = c.createGain();
  wg.gain.setValueAtTime(0.0001, t);
  wg.gain.linearRampToValueAtTime(0.09 * p, t + wDur * 0.8);
  wg.gain.linearRampToValueAtTime(0.0001, t + wDur);
  wsrc.connect(wbp).connect(wg).connect(sfx);
  wsrc.start(t);

  const hit = t + wDur * 0.85;

  // транзиент-щёлк: очень короткий яркий шум → удар «читается» на любой громкости
  const csrc = noise(c, 0.03, 4);
  const chp = c.createBiquadFilter();
  chp.type = "highpass";
  chp.frequency.value = 2600;
  const cg = c.createGain();
  cg.gain.value = 0.16 * p;
  csrc.connect(chp).connect(cg).connect(sfx);
  csrc.start(hit);

  // панч: быстрый питч-дроп, короткий хвост — без бубнежа
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(210, hit);
  o.frequency.exponentialRampToValueAtTime(58, hit + 0.1);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, hit);
  og.gain.linearRampToValueAtTime(0.24 * p, hit + 0.006);
  og.gain.exponentialRampToValueAtTime(0.0001, hit + 0.22);
  o.connect(og).connect(sfx);
  o.start(hit);
  o.stop(hit + 0.26);

  // корпус: полосовой шум, добавляет «тело» без звона
  const bsrc = noise(c, 0.08, 2.6);
  const bbp = c.createBiquadFilter();
  bbp.type = "bandpass";
  bbp.frequency.value = 900;
  bbp.Q.value = 0.8;
  const bg = c.createGain();
  bg.gain.value = 0.12 * p;
  bsrc.connect(bbp).connect(bg).connect(sfx);
  bsrc.start(hit);

  // сайд-чейн: музыка проседает на миг
  if (musicBus && running) {
    const cur = musicBus.gain.value;
    musicBus.gain.cancelScheduledValues(hit);
    musicBus.gain.setValueAtTime(cur, hit);
    musicBus.gain.linearRampToValueAtTime(cur * 0.68, hit + 0.025);
    musicBus.gain.linearRampToValueAtTime(cur, hit + 0.35);
  }
}

/** Тик отсчёта «3 / 2 / 1»: короткий яркий бип с телом (без музыки). */
export function playHuntCountBeep(step: number) {
  const c = ac();
  if (!c || !sfxBus) return;
  const sfx: GainNode = sfxBus;
  const t = c.currentTime + 0.01;
  const freq = step >= 3 ? 660 : step === 2 ? 784 : 988;

  const o = c.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(freq, t);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(4200, t);
  lp.frequency.exponentialRampToValueAtTime(1200, t + 0.22);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.22, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
  o.connect(lp).connect(g).connect(sfx);
  o.start(t);
  o.stop(t + 0.3);

  // низкий «стук» под бипом — чтобы цифра ощущалась весомо
  const s2 = c.createOscillator();
  s2.type = "sine";
  s2.frequency.setValueAtTime(150, t);
  s2.frequency.exponentialRampToValueAtTime(60, t + 0.1);
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.linearRampToValueAtTime(0.18, t + 0.005);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
  s2.connect(g2).connect(sfx);
  s2.start(t);
  s2.stop(t + 0.24);
}

/** «GO!» — старт раунда: восходящий свип + панч. */
export function playHuntRoundGo() {
  const c = ac();
  if (!c || !sfxBus) return;
  const sfx: GainNode = sfxBus;
  const t = c.currentTime + 0.01;

  const o = c.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(220, t);
  o.frequency.exponentialRampToValueAtTime(1320, t + 0.28);
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(1200, t);
  lp.frequency.exponentialRampToValueAtTime(6000, t + 0.28);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.2, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(lp).connect(g).connect(sfx);
  o.start(t);
  o.stop(t + 0.46);

  const src = noise(c, 0.24, 1.4);
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 3000;
  const ng = c.createGain();
  ng.gain.setValueAtTime(0.0001, t);
  ng.gain.linearRampToValueAtTime(0.12, t + 0.16);
  ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  src.connect(hp).connect(ng).connect(sfx);
  src.start(t);
}

// ===== Готовые mp3-сэмплы (public/sfx): фанфара победы и басовый отсчёт =====
const SAMPLES = {
  win: "/sfx/win-fanfare.mp3",
  three: "/sfx/count-three.mp3",
  two: "/sfx/count-two.mp3",
  one: "/sfx/count-one.mp3",
  go: "/sfx/count-go.mp3",
} as const;
type SampleKey = keyof typeof SAMPLES;

const cache = new Map<SampleKey, HTMLAudioElement>();

function sample(key: SampleKey): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  let el = cache.get(key);
  if (!el) {
    el = new Audio(SAMPLES[key]);
    el.preload = "auto";
    cache.set(key, el);
  }
  return el;
}

/** Прогреваем сэмплы, чтобы отсчёт не запаздывал при первом воспроизведении. */
export function preloadHuntSamples() {
  (Object.keys(SAMPLES) as SampleKey[]).forEach((k) => sample(k)?.load());
}

function playSample(key: SampleKey, volume = 1) {
  if (muted) return;
  const el = sample(key);
  if (!el) return;
  el.volume = volume;
  el.currentTime = 0;
  void el.play().catch(() => {});
}

/** Финал раунда: настоящая фанфара (mp3), без синтетической полифонии. */
export function playHuntWin() {
  playSample("win", 0.9);
}

/** Голосовой отсчёт «three / two / one / go» — грубый низкий голос. */
export function speakHuntCount(step: number) {
  const key: SampleKey = step === 3 ? "three" : step === 2 ? "two" : step === 1 ? "one" : "go";
  playSample(key, 1);
}


