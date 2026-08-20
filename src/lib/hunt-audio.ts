// Аудио шоу HOUND HUNT. Никаких ассетов — всё синтезируем через Web Audio,
// как в roller-sfx.ts: не грузит сеть, не лагает, работает офлайн в PWA.
//
// Музыка: «зиммеровский» минималистичный остинато в C-minor — суб-дрон,
// брасс-стек (пила + lowpass), струнный пэд и таико-пульс. Строится циклами
// по 4 такта, планируется заранее (lookahead), поэтому не дёргается на анимациях.
// Громкость специально низкая (фон), удар — заметнее музыки, но не орёт.

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

const BPM = 76;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

// C-minor: тоника и «геройская» подвижка в остинато.
const ROOT = 65.41; // C2
const OSTINATO = [0, 0, 3, 0, 0, 0, -2, 0]; // полутона к тонике, 8 восьмых на такт

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
    // мягкий лимитер, чтобы удары не клиппили микс
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 22;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.25;
    master.connect(comp).connect(ctx.destination);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0.0001;
    musicBus.connect(master);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = 0.55;
    sfxBus.connect(master);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

function semi(n: number) {
  return Math.pow(2, n / 12);
}

/** Один «брасс»-голос: пила через lowpass с быстрой атакой. */
function brass(c: AudioContext, when: number, freq: number, dur: number, gain: number) {
  const o1 = c.createOscillator();
  o1.type = "sawtooth";
  o1.frequency.value = freq;
  const o2 = c.createOscillator();
  o2.type = "sawtooth";
  o2.frequency.value = freq * 1.005; // легкий детюн = «секция», а не один синт
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(420 + tension * 900, when);
  lp.Q.value = 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o1.connect(lp);
  o2.connect(lp);
  lp.connect(g).connect(musicBus!);
  o1.start(when);
  o2.start(when);
  o1.stop(when + dur + 0.05);
  o2.stop(when + dur + 0.05);
}

/** Суб-дрон: синус + октава, длинный, держит «вес» сцены. */
function drone(c: AudioContext, when: number, freq: number, dur: number, gain: number) {
  [1, 2].forEach((mult, i) => {
    const o = c.createOscillator();
    o.type = i === 0 ? "sine" : "triangle";
    o.frequency.value = freq * mult;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain / (i + 1.6), when + dur * 0.35);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(g).connect(musicBus!);
    o.start(when);
    o.stop(when + dur + 0.05);
  });
}

/** Струнный пэд — аккорд с медленным свеллом. */
function pad(c: AudioContext, when: number, freq: number, dur: number, gain: number) {
  const chord = [0, 3, 7, 12];
  chord.forEach((st) => {
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq * 2 * semi(st);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 1400 + tension * 1200;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, when);
    g.gain.linearRampToValueAtTime(gain / chord.length, when + dur * 0.45);
    g.gain.linearRampToValueAtTime(0.0001, when + dur);
    o.connect(lp).connect(g).connect(musicBus!);
    o.start(when);
    o.stop(when + dur + 0.05);
  });
}

/** Таико: короткий питч-дроп синуса + шумовой «шлепок». */
function taiko(c: AudioContext, when: number, gain: number) {
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(120, when);
  o.frequency.exponentialRampToValueAtTime(46, when + 0.22);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + 0.3);
  o.connect(g).connect(musicBus!);
  o.start(when);
  o.stop(when + 0.34);

  const nb = c.createBuffer(1, Math.ceil(c.sampleRate * 0.08), c.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = c.createBufferSource();
  src.buffer = nb;
  const bp = c.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 900;
  const ng = c.createGain();
  ng.gain.value = gain * 0.35;
  src.connect(bp).connect(ng).connect(musicBus!);
  src.start(when);
}

/** Планирует один такт остинато. */
function scheduleBar(c: AudioContext, at: number, index: number) {
  const eighth = BEAT / 2;
  const heavy = index % 4 === 0;
  // остинато низких струнных/брасса
  OSTINATO.forEach((st, i) => {
    const t = at + i * eighth;
    const accent = i % 2 === 0 ? 1 : 0.62;
    brass(c, t, ROOT * semi(st), eighth * 0.9, 0.075 * accent * (0.75 + tension * 0.5));
  });
  // дрон и пэд — по такту
  drone(c, at, ROOT / 2, BAR, 0.1 + tension * 0.05);
  if (index % 2 === 0) pad(c, at, ROOT, BAR * 2, 0.05 + tension * 0.05);
  // пульс: 1 и 3 доля, на «тяжёлых» тактах добавляем синкопу
  taiko(c, at, 0.16 + tension * 0.1);
  taiko(c, at + BEAT * 2, 0.12 + tension * 0.09);
  if (heavy) taiko(c, at + BEAT * 3 + eighth, 0.1 + tension * 0.08);
}

function tick() {
  const c = ac();
  if (!c || !running) return;
  // lookahead 0.4 c: планируем такты заранее, ререндеры React ни на что не влияют
  while (nextBarAt < c.currentTime + 0.4) {
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
  musicBus!.gain.linearRampToValueAtTime(0.34, c.currentTime + 2.2); // тихий фон
  tick();
  timer = window.setInterval(tick, 120);
}

export function stopHuntMusic(fade = 1.4) {
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

/** Удар ногой: суб-бум + металлический клэнг + шумовой крэк. */
export function playHuntImpact(power = 1) {
  const c = ac();
  if (!c || !sfxBus) return;
  const sfx: GainNode = sfxBus;
  const t = c.currentTime + 0.005;

  // суб-бум
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(38, t + 0.28);
  const og = c.createGain();
  og.gain.setValueAtTime(0.55 * power, t);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  o.connect(og).connect(sfx);
  o.start(t);
  o.stop(t + 0.46);

  // металлический клэнг — несколько несгармоничных призвуков
  [523, 787, 1174, 1661].forEach((f, i) => {
    const m = c.createOscillator();
    m.type = "triangle";
    m.frequency.setValueAtTime(f * (1 + i * 0.002), t);
    m.frequency.exponentialRampToValueAtTime(f * 0.86, t + 0.5);
    const g = c.createGain();
    g.gain.setValueAtTime(0.12 * power / (i + 1), t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5 - i * 0.08);
    m.connect(g).connect(sfx);
    m.start(t);
    m.stop(t + 0.55);
  });

  // крэк: короткий шум через highpass
  const dur = 0.18;
  const nb = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = nb.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const src = c.createBufferSource();
  src.buffer = nb;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1600;
  const ng = c.createGain();
  ng.gain.value = 0.3 * power;
  src.connect(hp).connect(ng).connect(sfx);
  src.start(t);

  // «сайд-чейн»: музыка на миг проседает, удар читается чисто
  if (musicBus && running) {
    const cur = musicBus.gain.value;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setValueAtTime(cur, t);
    musicBus.gain.linearRampToValueAtTime(cur * 0.55, t + 0.03);
    musicBus.gain.linearRampToValueAtTime(cur, t + 0.4);
  }
}

/** Финал: победный аккорд-«свелл» вместо остинато. */
export function playHuntWin() {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + 0.02;
  setHuntTension(1);
  [0, 7, 12, 19].forEach((st, i) => {
    brass(c, t + i * 0.06, ROOT * 2 * semi(st), 2.6, 0.09);
  });
  drone(c, t, ROOT, 3.4, 0.14);
  taiko(c, t, 0.26);
  taiko(c, t + BEAT, 0.18);
}
