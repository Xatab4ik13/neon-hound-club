// Динамический OG-image для публичного профиля.
// Без внешних библиотек (satori и т.п.): отдаём чистый SVG.
// Telegram/Twitter/WhatsApp подхватывают image/svg+xml корректно для своих превью карточек.

import { createFileRoute } from "@tanstack/react-router";
import { RANKS } from "@/data/ranks";
import { PUBLIC_USERS } from "@/data/users";

export const Route = createFileRoute("/api/public/og/u/$nick")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const nick = String(params.nick || "").toLowerCase();
        const user = PUBLIC_USERS[nick];

        const rank = user ? RANKS.find((r) => r.id === user.rank) : undefined;

        const displayNick = user?.nick ?? nick.toUpperCase() ?? "HELLHOUND";
        const rankLabel = rank?.label ?? "RIDER";
        const accent = rank?.accent ?? "#ff007f";
        const accentSoft = rank?.accentSoft ?? "rgba(255,0,127,0.25)";
        const initials = user?.initials ?? displayNick.slice(0, 2).toUpperCase();
        const city = user?.city ?? "";
        const bike = user?.bike ?? "";
        const wins = user?.wins?.length ?? 0;
        const badges = user?.badgeIds?.length ?? 0;

        const subtitle = [city, bike].filter(Boolean).join(" · ");

        const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0a0a"/>
      <stop offset="100%" stop-color="#111"/>
    </linearGradient>
    <radialGradient id="glow" cx="0%" cy="0%" r="80%">
      <stop offset="0%" stop-color="${accentSoft}"/>
      <stop offset="100%" stop-color="transparent"/>
    </radialGradient>
    <pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse">
      <path d="M44 0 L0 0 0 44" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#grid)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Accent stripe -->
  <rect x="0" y="0" width="14" height="630" fill="${accent}"/>

  <!-- Brand -->
  <text x="80" y="100" font-family="system-ui, -apple-system, sans-serif" font-size="28" font-weight="900" fill="#fff" letter-spacing="2" font-style="italic">
    HELL<tspan fill="${accent}">HOUND</tspan>
    <tspan font-weight="500" font-style="normal" fill="rgba(255,255,255,0.4)" letter-spacing="6">  · RACING CLUB</tspan>
  </text>

  <!-- Avatar plaque -->
  <g transform="translate(80, 180)">
    <rect width="220" height="220" fill="#0a0a0a" stroke="${accent}" stroke-width="3"/>
    <rect x="6" y="6" width="208" height="208" fill="none" stroke="${accentSoft}" stroke-width="1"/>
    <text x="110" y="148" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="110" font-weight="900" font-style="italic" fill="${accent}">${escapeXml(initials)}</text>
  </g>

  <!-- Identity -->
  <g transform="translate(340, 200)">
    <text font-family="system-ui, -apple-system, sans-serif" font-size="86" font-weight="900" font-style="italic" fill="#fff" letter-spacing="-1">
      ${escapeXml(displayNick)}
    </text>
    <text y="48" font-family="ui-monospace, monospace" font-size="22" font-weight="700" fill="${accent}" letter-spacing="4">
      ${escapeXml(rankLabel.toUpperCase())}
    </text>
    ${
      subtitle
        ? `<text y="98" font-family="ui-monospace, monospace" font-size="20" fill="rgba(255,255,255,0.55)" letter-spacing="2">${escapeXml(subtitle)}</text>`
        : ""
    }

    <!-- Stat strip -->
    <g transform="translate(0, 150)">
      <rect width="700" height="80" fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.08)"/>
      <g transform="translate(30, 28)">
        <text font-family="ui-monospace, monospace" font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="3">ВЫИГРЫШЕЙ</text>
        <text y="38" font-family="system-ui, sans-serif" font-size="34" font-weight="900" font-style="italic" fill="#fff">${wins}</text>
      </g>
      <g transform="translate(220, 28)">
        <text font-family="ui-monospace, monospace" font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="3">ЗНАЧКИ</text>
        <text y="38" font-family="system-ui, sans-serif" font-size="34" font-weight="900" font-style="italic" fill="#fff">${badges}</text>
      </g>
      <g transform="translate(410, 28)">
        <text font-family="ui-monospace, monospace" font-size="14" fill="rgba(255,255,255,0.4)" letter-spacing="3">В КЛУБЕ С</text>
        <text y="38" font-family="system-ui, sans-serif" font-size="22" font-weight="700" fill="#fff">${escapeXml(user?.joined ?? "—")}</text>
      </g>
    </g>
  </g>

  <!-- Footer -->
  <text x="80" y="570" font-family="ui-monospace, monospace" font-size="18" fill="rgba(255,255,255,0.35)" letter-spacing="4">
    HELLHOUND.RACING / U / ${escapeXml(nick.toUpperCase())}
  </text>
  <text x="1120" y="570" text-anchor="end" font-family="ui-monospace, monospace" font-size="18" fill="${accent}" letter-spacing="4" font-weight="700">
    ВОТ Я В HELLHOUND
  </text>
</svg>`;

        return new Response(svg, {
          status: 200,
          headers: {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "public, max-age=300, s-maxage=3600",
          },
        });
      },
    },
  },
});

function escapeXml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
