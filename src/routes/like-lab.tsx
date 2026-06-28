// Песочница вариантов анимированных лайков.
// Открыть: /like-lab
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/like-lab")({
  head: () => ({ meta: [{ title: "Like Lab" }, { name: "robots", content: "noindex" }] }),
  component: LikeLab,
});

function LikeLab() {
  return (
    <main className="mx-auto w-full max-w-[760px] px-4 py-10 text-foreground">
      <h1 className="mb-2 font-mono text-[20px] font-bold uppercase tracking-[0.18em]">Like Lab</h1>
      <p className="mb-8 text-[13px] text-muted-foreground">
        4 варианта. Тапни, чтоб посмотреть анимацию. Скажи номер — внедрю в ленту.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="V1 · Particle Burst" desc="Pop + 8 искр + ring. Жёстко, по-моторному.">
          <V1 />
        </Card>
        <Card title="V2 · Liquid Fill" desc="Заливка снизу вверх + wobble. Премиально.">
          <V2 />
        </Card>
        <Card title="V3 · Squash & Stretch" desc="Cartoon-bounce. Игривый, для соцсетей.">
          <V3 />
        </Card>
        <Card title="V4 · Neon Pulse" desc="Glow + sonar-волна. В стиле HELLHOUND.">
          <V4 />
        </Card>
      </div>
    </main>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/[0.08] bg-card/40 p-5">
      <div className="mb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-primary">{title}</div>
      <div className="mb-5 text-[12px] text-muted-foreground">{desc}</div>
      <div className="flex items-center justify-center py-6">{children}</div>
    </div>
  );
}

/* ───────────── V1 · Particle Burst ───────────── */
function V1() {
  const [liked, setLiked] = useState(false);
  const [k, setK] = useState(0);
  const particles = Array.from({ length: 8 }, (_, i) => i);
  return (
    <button
      onClick={() => {
        setLiked((v) => !v);
        setK((x) => x + 1);
      }}
      className="relative grid h-16 w-16 place-items-center"
    >
      {liked && (
        <span key={`r-${k}`} aria-hidden className="pointer-events-none absolute inset-0">
          <span className="absolute inset-0 rounded-full border-2 border-primary" style={{ animation: "v1-ring 600ms ease-out forwards" }} />
          {particles.map((i) => {
            const a = (i * 360) / 8 - 90;
            const r = (a * Math.PI) / 180;
            const x = Math.cos(r) * 34;
            const y = Math.sin(r) * 34;
            return (
              <span
                key={i}
                className="absolute left-1/2 top-1/2 h-1.5 w-1.5 rounded-full bg-primary"
                style={{
                  // @ts-expect-error css var
                  "--tx": `${x}px`, "--ty": `${y}px`,
                  animation: `v1-particle 700ms ${i * 10}ms cubic-bezier(.2,.7,.2,1) forwards`,
                }}
              />
            );
          })}
        </span>
      )}
      <Heart
        filled={liked}
        className="h-9 w-9 transition-colors"
        style={{
          color: liked ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.6)",
          animation: liked ? "v1-pop 520ms cubic-bezier(.34,1.56,.64,1)" : undefined,
        }}
        key={k}
      />
      <style>{`
        @keyframes v1-pop { 0%{transform:scale(.6)} 50%{transform:scale(1.35)} 100%{transform:scale(1)} }
        @keyframes v1-ring { 0%{transform:scale(.4);opacity:.9} 100%{transform:scale(2.4);opacity:0} }
        @keyframes v1-particle {
          0% { transform: translate(-50%,-50%) scale(.5); opacity:1 }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0); opacity:0 }
        }
      `}</style>
    </button>
  );
}

/* ───────────── V2 · Liquid Fill ───────────── */
function V2() {
  const [liked, setLiked] = useState(false);
  return (
    <button onClick={() => setLiked((v) => !v)} className="relative h-16 w-16">
      <svg viewBox="0 0 24 24" className="h-full w-full" style={{ animation: liked ? "v2-wobble 600ms ease-out" : undefined }} key={String(liked)}>
        <defs>
          <clipPath id="v2-clip">
            <path d="M12 21s-7-4.5-9.5-9C.8 8.4 3 4.5 6.7 4.5c1.9 0 3.6 1 5.3 3 1.7-2 3.4-3 5.3-3 3.7 0 5.9 3.9 4.2 7.5C19 16.5 12 21 12 21z" />
          </clipPath>
        </defs>
        <path
          d="M12 21s-7-4.5-9.5-9C.8 8.4 3 4.5 6.7 4.5c1.9 0 3.6 1 5.3 3 1.7-2 3.4-3 5.3-3 3.7 0 5.9 3.9 4.2 7.5C19 16.5 12 21 12 21z"
          fill="none" stroke="currentColor" strokeWidth="1.6"
          style={{ color: "hsl(var(--foreground) / 0.7)" }}
        />
        <g clipPath="url(#v2-clip)">
          <rect
            x="0" width="24" height="24" fill="hsl(var(--primary))"
            style={{
              transformOrigin: "center bottom",
              transform: liked ? "translateY(0)" : "translateY(24px)",
              transition: "transform 600ms cubic-bezier(.6,.05,.4,1)",
            }}
          />
        </g>
      </svg>
      <style>{`
        @keyframes v2-wobble {
          0%{transform:scale(1)} 30%{transform:scale(1.18) rotate(-6deg)}
          60%{transform:scale(.95) rotate(4deg)} 100%{transform:scale(1)}
        }
      `}</style>
    </button>
  );
}

/* ───────────── V3 · Squash & Stretch ───────────── */
function V3() {
  const [liked, setLiked] = useState(false);
  const [k, setK] = useState(0);
  return (
    <button
      onClick={() => { setLiked((v) => !v); setK((x) => x + 1); }}
      className="relative grid h-16 w-16 place-items-center"
    >
      <Heart
        filled={liked}
        className="h-9 w-9"
        style={{
          color: liked ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.6)",
          animation: liked ? "v3-squash 700ms cubic-bezier(.34,1.56,.64,1)" : undefined,
          transformOrigin: "center bottom",
        }}
        key={k}
      />
      {liked && (
        <span key={`s-${k}`} aria-hidden className="pointer-events-none absolute inset-0">
          {["+1","♥","✦"].map((t, i) => (
            <span key={i}
              className="absolute left-1/2 top-1/2 font-mono text-[12px] font-bold text-primary"
              style={{
                // @ts-expect-error css var
                "--dx": `${(i-1)*20}px`,
                animation: `v3-float 900ms ${i*60}ms ease-out forwards`,
              }}
            >{t}</span>
          ))}
        </span>
      )}
      <style>{`
        @keyframes v3-squash {
          0%{transform:scale(1,1)}
          20%{transform:scale(1.3,.7)}
          40%{transform:scale(.8,1.3) translateY(-6px)}
          70%{transform:scale(1.1,.95)}
          100%{transform:scale(1,1)}
        }
        @keyframes v3-float {
          0%{transform:translate(-50%,-50%) scale(.5);opacity:0}
          30%{opacity:1}
          100%{transform:translate(calc(-50% + var(--dx)),-180%) scale(1);opacity:0}
        }
      `}</style>
    </button>
  );
}

/* ───────────── V4 · Neon Pulse (HELLHOUND-style) ───────────── */
function V4() {
  const [liked, setLiked] = useState(false);
  const [k, setK] = useState(0);
  return (
    <button
      onClick={() => { setLiked((v) => !v); setK((x) => x + 1); }}
      className="relative grid h-16 w-16 place-items-center"
    >
      {liked && (
        <>
          <span key={`g-${k}`} className="absolute inset-0 rounded-full"
            style={{ background: "radial-gradient(circle, hsl(var(--primary) / .55), transparent 60%)",
              animation: "v4-glow 900ms ease-out forwards" }} />
          <span key={`s-${k}`} className="absolute inset-0 rounded-full border border-primary/70"
            style={{ animation: "v4-sonar 900ms ease-out forwards" }} />
          <span key={`s2-${k}`} className="absolute inset-0 rounded-full border border-primary/40"
            style={{ animation: "v4-sonar 900ms 150ms ease-out forwards" }} />
        </>
      )}
      <Heart
        filled={liked}
        className="relative h-9 w-9"
        style={{
          color: liked ? "hsl(var(--primary))" : "hsl(var(--foreground) / 0.6)",
          filter: liked ? "drop-shadow(0 0 10px hsl(var(--primary) / .8))" : "none",
          animation: liked ? "v4-beat 800ms ease-out" : undefined,
          transition: "color 200ms, filter 200ms",
        }}
        key={k}
      />
      <style>{`
        @keyframes v4-beat {
          0%{transform:scale(.7)} 25%{transform:scale(1.3)}
          45%{transform:scale(.95)} 65%{transform:scale(1.15)} 100%{transform:scale(1)}
        }
        @keyframes v4-glow { 0%{opacity:0;transform:scale(.4)} 40%{opacity:1} 100%{opacity:0;transform:scale(1.8)} }
        @keyframes v4-sonar { 0%{transform:scale(.6);opacity:.9} 100%{transform:scale(2.2);opacity:0} }
      `}</style>
    </button>
  );
}

/* ───────────── Shared heart ───────────── */
function Heart({ filled, className, style }: { filled: boolean; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <path
        d="M12 21s-7-4.5-9.5-9C.8 8.4 3 4.5 6.7 4.5c1.9 0 3.6 1 5.3 3 1.7-2 3.4-3 5.3-3 3.7 0 5.9 3.9 4.2 7.5C19 16.5 12 21 12 21z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
