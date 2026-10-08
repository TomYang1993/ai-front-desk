import { useId, type ReactNode } from "react";
import type { CenterId } from "@/content/types";

/**
 * The front desk, in Maple's flat, grainy style: a still window onto the
 * center's city, a bookshelf, the notice board, the director's door and a
 * low counter with the center's name. Maple stands on the floor
 * beside the counter, full body. She is passed in as `maple`, so she can
 * leave the desk for the chat; her spot overlaps nothing drawn in front of
 * her, so she can fly in and out above everything else.
 *
 * Everything shares one 360 x 230 coordinate system.
 */

/** Maple's spot: 140 wide from x 90, standing on the floor at y 204. */
const SPOT = { left: 90, width: 140, floor: 204 };
const pct = (n: number, of: number) => `${(n / of) * 100}%`;

export function DeskScene({
  centerId,
  centerName,
  frontDeskLabel,
  doorLit,
  maple,
  bubble,
}: {
  centerId: CenterId;
  centerName: string;
  frontDeskLabel: string;
  doorLit: boolean;
  maple: ReactNode;
  bubble?: ReactNode;
}) {
  const grain = `desk-grain-${useId().replace(/:/g, "")}`;
  return (
    <div className="desk-scene relative aspect-[36/23] w-full select-none overflow-hidden rounded-[28px]">
      <svg viewBox="0 0 360 230" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <filter id={grain} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="3" stitchTiles="stitch" result="noise" />
            <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.25  0 0 0 0 0.16  0 0 0 0 0.08  1.5 0 0 0 -0.88" result="specks" />
            <feComposite in="specks" in2="SourceGraphic" operator="in" result="grainOnShapes" />
            <feComposite in="grainOnShapes" in2="SourceGraphic" operator="over" />
          </filter>
        </defs>
        <g filter={`url(#${grain})`}>
          {/* Wall, chair rail and wooden floor */}
          <rect width="360" height="230" fill="#F3EBDD" />
          <rect y="150" width="360" height="56" fill="#ECE0CC" />
          <rect y="148" width="360" height="3" fill="#E2D2B8" />
          <rect y="204" width="360" height="26" fill="#D6B48D" />
          <path d="M0 214 H360 M60 204 V214 M150 214 V230 M240 204 V214 M320 214 V230" stroke="#C49E73" strokeWidth="1.2" />

          <Window centerId={centerId} />

          {/* Bookshelf under the window */}
          <rect x="20" y="126" width="88" height="5" rx="2" fill="#A86E3E" />
          {[
            ["#C2603A", 26, 22],
            ["#3F6F66", 35, 25],
            ["#5B7FA3", 44, 20],
            ["#E39A45", 53, 24],
            ["#A9CDBF", 62, 18],
            ["#C2603A", 71, 23],
          ].map(([color, x, h]) => (
            <rect key={x} x={x as number} y={126 - (h as number)} width="8" height={h as number} rx="1.5" fill={color as string} />
          ))}
          <rect x="84" y="104" width="8" height="22" rx="1.5" fill="#5B7FA3" transform="rotate(16 88 126)" />
          <path d="M94 126 L104 126 L102 116 L96 116 Z" fill="#E9E1D2" />
          <path d="M99 117 C96 111 97 107 99 104 C101 107 102 111 99 117 Z" fill="#4E7F6A" />

          {/* A floor plant */}
          <path d="M30 186 L48 186 L45 204 L33 204 Z" fill="#C2603A" />
          <path d="M39 186 C30 172 24 168 20 158 C30 160 36 168 39 180 C40 166 46 156 56 152 C54 164 46 172 39 186 Z" fill="#4E7F6A" />
          <path d="M39 184 C38 172 40 162 44 154" stroke="#3E6B5C" strokeWidth="1.5" fill="none" />

          {/* Notice board */}
          <rect x="238" y="34" width="54" height="44" rx="4" fill="#CDA174" stroke="#A9784C" strokeWidth="2.5" />
          <rect x="244" y="40" width="17" height="14" fill="#FBF6EC" transform="rotate(-4 252 47)" />
          <rect x="266" y="41" width="17" height="13" fill="#F0C77A" transform="rotate(3 274 47)" />
          <rect x="249" y="59" width="18" height="13" fill="#A9CDBF" transform="rotate(2 258 65)" />
          <rect x="271" y="59" width="14" height="12" fill="#E9B3A0" transform="rotate(-3 278 65)" />

          {/* The director's door lights up while a person is being brought in. */}
          <rect x="300" y="52" width="46" height="96" rx="3" fill={doorLit ? "#F2C66D" : "#C9B8A3"} className="transition-colors duration-500" />
          <rect x="309" y="62" width="28" height="20" rx="2.5" fill="#FBF6EC" opacity="0.55" />
          <circle cx="339" cy="112" r="2.6" fill="#6B5A48" />

          {/* The counter, with a bell and a mug */}
          <rect x="232" y="140" width="128" height="10" rx="3" fill="#2C514A" />
          <rect x="236" y="150" width="124" height="54" fill="#3F6F66" />
          <rect x="236" y="150" width="124" height="5" fill="#2C514A" opacity="0.55" />
          <path d="M250 140 C250 131 264 131 264 140 Z" fill="#E3B04B" />
          <rect x="255.5" y="128" width="3" height="4" rx="1" fill="#C98F2E" />
          <rect x="332" y="128" width="12" height="12" rx="2.5" fill="#FBF6EC" />
          <path d="M344 131 q5 0 5 4 q0 4 -5 4" fill="none" stroke="#FBF6EC" strokeWidth="2.2" />
          <text x="298" y="178" textAnchor="middle" fontSize="12.5" fontWeight="800" fill="#FBF6EC">
            {centerName}
          </text>
          <text x="298" y="191" textAnchor="middle" fontSize="7.5" fill="#CFE3DC">
            {frontDeskLabel}
          </text>
        </g>
      </svg>

      <div className="absolute aspect-square" style={{ left: pct(SPOT.left, 360), width: pct(SPOT.width, 360), bottom: pct(230 - SPOT.floor - 4, 230) }}>
        {maple}
      </div>

      {bubble && (
        <div className="absolute top-[3%] max-w-[46%] -translate-x-1/2" style={{ left: pct(SPOT.left + SPOT.width / 2, 360) }}>
          {bubble}
        </div>
      )}
    </div>
  );
}

/** A still view of the city: the Sandia Mountains and balloons for Albuquerque, rain and evergreens for Seattle. */
function Window({ centerId }: { centerId: CenterId }) {
  const clip = `desk-window-${centerId}`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x="24" y="28" width="80" height="64" rx="5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {centerId === "pinon-grove" ? (
          <>
            <rect x="24" y="28" width="80" height="64" fill="#BCDDEA" />
            <path d="M24 92 L24 72 L38 61 L50 67 L62 53 L77 63 L90 57 L104 68 L104 92Z" fill="#C98F84" />
            <path d="M24 92 L24 82 L44 76 L66 80 L88 74 L104 78 L104 92Z" fill="#B47766" />
            <g>
              <path d="M50 36 c-7 0 -10 6 -10 10 c0 6 6 10 10 14 c4 -4 10 -8 10 -14 c0 -4 -3 -10 -10 -10z" fill="#D9643F" />
              <path d="M50 36 c-3 0 -4 6 -4 10 c0 6 2 10 4 14 c2 -4 4 -8 4 -14 c0 -4 -1 -10 -4 -10z" fill="#EDB860" />
              <rect x="48" y="61" width="4" height="3" rx="1" fill="#7A5A3A" />
            </g>
            <g>
              <path d="M84 44 c-4 0 -6 4 -6 6 c0 4 4 6 6 8 c2 -2 6 -4 6 -8 c0 -2 -2 -6 -6 -6z" fill="#5B7FA3" />
              <rect x="83" y="58" width="2.5" height="2" rx="0.5" fill="#7A5A3A" />
            </g>
          </>
        ) : (
          <>
            <rect x="24" y="28" width="80" height="64" fill="#C6D0D6" />
            <path d="M30 92 L40 64 L50 92Z M46 92 L57 56 L68 92Z M64 92 L74 68 L84 92Z M80 92 L92 60 L104 92Z" fill="#3E6B5C" />
            <g stroke="#8C9FAE" strokeWidth="1.4" strokeLinecap="round">
              {[30, 42, 54, 66, 78, 90, 100].map((x, i) => (
                <line key={x} x1={x} y1={18 + (i % 3) * 12} x2={x - 3} y2={26 + (i % 3) * 12} />
              ))}
              {[36, 48, 60, 72, 84, 96].map((x, i) => (
                <line key={x} x1={x} y1={48 + (i % 3) * 10} x2={x - 3} y2={56 + (i % 3) * 10} />
              ))}
            </g>
          </>
        )}
      </g>
      <rect x="24" y="28" width="80" height="64" rx="5" fill="none" stroke="#FBF6EC" strokeWidth="5" />
      <line x1="64" y1="28" x2="64" y2="92" stroke="#FBF6EC" strokeWidth="3" />
      <line x1="24" y1="60" x2="104" y2="60" stroke="#FBF6EC" strokeWidth="3" />
    </g>
  );
}
