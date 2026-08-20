// Аудио шоу HOUND HUNT. Никаких ассетов — всё синтезируем через Web Audio,
// как в roller-sfx.ts: не грузит сеть, не лагает, работает офлайн в PWA.
//
// Музыка: «зиммеровский» сквозной трек в C-minor — не луп. Есть длинная
// гармоническая арка (SECTIONS ~ 6 минут: интро → нарастание → плато →
// финальный подъём), в каждой секции своя тональная ступень, свой рисунок
// остинато, своя плотность перкуссии. Планируется заранее (lookahead),
// поэтому ререндеры и анимации на неё не влияют.
// Громкость низкая (фон), удар — заметный, но не орёт.

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
// Варианты рисунка остинато (8 восьмых на такт, полутона к текущей ступени).
const FIGURES: number[][] = [
  [0, 0, 3, 0, 0, 0, -2, 0],
  [0, 3, 0, 5, 0, 3, 0, -2],
  [0, 0, 0, 7, 0, 5, 3, 0],
  [0, -2, 0, 3, 0, 7, 5, 3],
  [0, 7, 5, 3, 0, -2, 0, 3],
];

// Сквозная форма трека: степень (полутона к C), фигура, плотность, длина в тактах.
type Section = { deg: number; fig: number; bars: number; energy: number; pulse: number };
const SECTIONS: Section[] = [
  { deg: 0, fig: 0, bars: 8, energy: 0.35, pulse: 0.4 }, // интро: дрон и редкий пульс
  { deg: 0, fig: 1, bars: 8, energy: 0.55, pulse: 0.7 },
  { deg: -4, fig: 2, bars: 8, energy: 0.6, pulse: 0.8 }, // уход в Ab
  { deg: -5, fig: 1, bars: 8, energy: 0.7, pulse: 0.9 }, // G
  { deg: 0, fig: 3, bars: 12, energy: 0.8, pulse: 1 }, // плато на тонике
  { deg: 3, fig: 2, bars: 8, energy: 0.75, pulse: 0.9 }, // Eb — «просвет»
  { deg: -2, fig: 4, bars: 8, energy: 0.85, pulse: 1 }, // Bb
  { deg: -4, fig: 3, bars: 8, energy: 0.9, pulse: 1.05 },
  { deg: 0, fig: 4, bars: 12, energy: 1, pulse: 1.1 }, // финальный подъём
  { deg: -5, fig: 2, bars: 8, energy: 0.8, pulse: 0.85 }, // спад-перезарядка
  { deg: 0, fig: 1, bars: 12, energy: 0.95, pulse: 1 }, // второй заход, но другой рисунок
];
const FORM_BARS = SECTIONS.reduce((s, x) => s + x.bars, 0);

function sectionAt(index: number): { sec: Section; local: number } {
  // после конца формы не зацикливаемся жёстко: сдвигаем фигуру, чтобы не узнавалось
  const wrapped = index % FORM_BARS;
  const laps = Math.floor(index / FORM_BARS);
  let acc = 0;
  for (const sec of SECTIONS) {
    if (wrapped < acc + sec.bars) {
      return {
        sec: laps === 0 ? sec : { ...sec, fig: (sec.fig + laps * 2) % FIGURES.length },
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
    sfxBus.gain.value = 0.32;
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

/** Планирует один такт сквозной формы (не луп: гармония и рисунок меняются). */
function scheduleBar(c: AudioContext, at: number, index: number) {
  const eighth = BEAT / 2;
  const { sec, local } = sectionAt(index);
  const deg = semi(sec.deg);
  const fig = FIGURES[sec.fig];
  // energy формы + накал шоу
  const e = Math.min(1.15, sec.energy * (0.8 + tension * 0.45));
  const first = local === 0;
  const last = local === sec.bars - 1;

  fig.forEach((st, i) => {
    const t = at + i * eighth;
    const accent = i % 2 === 0 ? 1 : 0.6;
    // в интро играем только сильные восьмые — трек «раскрывается» постепенно
    if (sec.energy < 0.5 && i % 2 !== 0) return;
    brass(c, t, ROOT * deg * semi(st), eighth * 0.9, 0.07 * accent * e);
  });

  drone(c, at, (ROOT * deg) / 2, BAR, 0.09 + e * 0.05);
  if (first || local === Math.floor(sec.bars / 2))
    pad(c, at, ROOT * deg, BAR * 2, 0.04 + e * 0.05);

  const p = sec.pulse * (0.85 + tension * 0.3);
  taiko(c, at, 0.13 * p);
  if (p > 0.5) taiko(c, at + BEAT * 2, 0.1 * p);
  if (p > 0.85 && local % 2 === 1) taiko(c, at + BEAT * 3 + eighth, 0.09 * p);
  // «филл» на стыке секций — слышно, что музыка идёт вперёд, а не по кругу
  if (last && p > 0.6) {
    taiko(c, at + BEAT * 3, 0.1 * p);
    taiko(c, at + BEAT * 3 + eighth, 0.12 * p);
    taiko(c, at + BEAT * 3 + eighth * 1.5, 0.14 * p);
  }
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

/** Удар ногой: короткий свуш + мягкий суб-«тамп» + лёгкий металлический
 *  хвост через фильтр. Тише прежнего, но объёмнее — за счёт свуша и хвоста. */
export function playHuntImpact(power = 1) {
  const c = ac();
  if (!c || !sfxBus) return;
  const sfx: GainNode = sfxBus;
  const t = c.currentTime + 0.005;
  const p = Math.max(0.3, Math.min(1, power));

  // 1) свуш замаха: шум, у которого bandpass уезжает вверх → «воздух» перед удара
  const wDur = 0.16;
  const wb = c.createBuffer(1, Math.ceil(c.sampleRate * wDur), c.sampleRate);
  const wd = wb.getChannelData(0);
  for (let i = 0; i < wd.length; i++) wd[i] = (Math.random() * 2 - 1) * 0.7;
  const wsrc = c.createBufferSource();
  wsrc.buffer = wb;
  const wbp = c.createBiquadFilter();
  wbp.type = "bandpass";
  wbp.Q.value = 1.1;
  wbp.frequency.setValueAtTime(320, t);
  wbp.frequency.exponentialRampToValueAtTime(2600, t + wDur);
  const wg = c.createGain();
  wg.gain.setValueAtTime(0.0001, t);
  wg.gain.linearRampToValueAtTime(0.1 * p, t + wDur * 0.75);
  wg.gain.linearRampToValueAtTime(0.0001, t + wDur);
  wsrc.connect(wbp).connect(wg).connect(sfx);
  wsrc.start(t);

  // 2) суб-«тамп»: мягкая атака, без щелчка, короткий хвост
  const hit = t + wDur * 0.78;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(120, hit);
  o.frequency.exponentialRampToValueAtTime(44, hit + 0.2);
  const og = c.createGain();
  og.gain.setValueAtTime(0.0001, hit);
  og.gain.linearRampToValueAtTime(0.24 * p, hit + 0.008);
  og.gain.exponentialRampToValueAtTime(0.0001, hit + 0.34);
  o.connect(og).connect(sfx);
  o.start(hit);
  o.stop(hit + 0.38);

  // 3) телесный «шлепок»: узкий шум в среднем диапазоне, очень короткий
  const bDur = 0.09;
  const bb = c.createBuffer(1, Math.ceil(c.sampleRate * bDur), c.sampleRate);
  const bd = bb.getChannelData(0);
  for (let i = 0; i < bd.length; i++)
    bd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bd.length, 2.4);
  const bsrc = c.createBufferSource();
  bsrc.buffer = bb;
  const bbp = c.createBiquadFilter();
  bbp.type = "bandpass";
  bbp.frequency.value = 620;
  bbp.Q.value = 0.9;
  const bg = c.createGain();
  bg.gain.value = 0.13 * p;
  bsrc.connect(bbp).connect(bg).connect(sfx);
  bsrc.start(hit);

  // 4) металлический хвост: тихо, приглушённо, чтобы был «характер», а не звон
  const tail = c.createGain();
  tail.gain.setValueAtTime(0.0001, hit);
  tail.gain.linearRampToValueAtTime(0.055 * p, hit + 0.012);
  tail.gain.exponentialRampToValueAtTime(0.0001, hit + 0.6);
  const tlp = c.createBiquadFilter();
  tlp.type = "lowpass";
  tlp.frequency.setValueAtTime(2400, hit);
  tlp.frequency.exponentialRampToValueAtTime(700, hit + 0.6);
  tail.connect(tlp).connect(sfx);
  [277, 415, 623, 934].forEach((f, i) => {
    const m = c.createOscillator();
    m.type = "triangle";
    m.frequency.setValueAtTime(f * (1 + i * 0.003), hit);
    m.frequency.exponentialRampToValueAtTime(f * 0.9, hit + 0.6);
    const g = c.createGain();
    g.gain.value = 1 / (i + 1.4);
    m.connect(g).connect(tail);
    m.start(hit);
    m.stop(hit + 0.64);
  });

  // «сайд-чейн»: музыка на миг проседает — удар читается без прибавки громкости
  if (musicBus && running) {
    const cur = musicBus.gain.value;
    musicBus.gain.cancelScheduledValues(hit);
    musicBus.gain.setValueAtTime(cur, hit);
    musicBus.gain.linearRampToValueAtTime(cur * 0.62, hit + 0.03);
    musicBus.gain.linearRampToValueAtTime(cur, hit + 0.45);
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
