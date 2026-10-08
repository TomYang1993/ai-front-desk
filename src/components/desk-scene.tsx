import type { ReactNode } from "react";
import type { CenterId } from "@/content/types";

/**
 * The front desk: a window onto the center's city, the handbook shelf, the
 * notice board and the director's door, with Maple's spot behind the desk.
 * Maple is passed in as `maple`, so she can leave the desk for the chat.
 * Her spot ends exactly at the desk's top edge, so the desk never overlaps
 * her and she can fly in and out above everything else.
 *
 * Everything shares one 360 x 230 coordinate system.
 */
export function DeskScene({
  centerId,
  centerName,
  directorFirstName,
  labels,
  doorLit,
  maple,
  bubble,
}: {
  centerId: CenterId;
  centerName: string;
  directorFirstName: string;
  labels: { frontDesk: string; handbook: string };
  doorLit: boolean;
  maple: ReactNode;
  bubble?: ReactNode;
}) {
  return (
    <div className="desk-scene relative aspect-[36/23] w-full select-none">
      <svg viewBox="0 0 360 230" className="absolute inset-0 h-full w-full" aria-hidden>
        <rect width="360" height="230" rx="24" fill="#F6EBD9" />
        <rect y="186" width="360" height="44" fill="#EDE3D3" />
        <Window centerId={centerId} />

        {/* Handbook shelf under the window */}
        <rect x="20" y="128" width="96" height="5" rx="2" fill="#B9844F" />
        {[
          ["#D85A30", 26, 22],
          ["#2E9C7A", 35, 25],
          ["#5B8FC7", 44, 20],
          ["#E8B04B", 53, 24],
          ["#7F77DD", 62, 22],
        ].map(([color, x, h]) => (
          <rect key={x} x={x as number} y={128 - (h as number)} width="8" height={h as number} rx="1.5" fill={color as string} />
        ))}
        <rect x="74" y="111" width="34" height="17" rx="2" fill="#FFF" opacity="0.9" />
        <text x="91" y="122.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#7A5A3A">
          {labels.handbook}
        </text>

        {/* Notice board */}
        <rect x="244" y="28" width="52" height="44" rx="4" fill="#D9B48F" stroke="#B9844F" strokeWidth="2.5" />
        <rect x="250" y="34" width="17" height="14" fill="#FFF" transform="rotate(-4 258 41)" />
        <rect x="272" y="35" width="17" height="13" fill="#FAC775" transform="rotate(3 280 41)" />
        <rect x="255" y="53" width="18" height="13" fill="#9FE1CB" transform="rotate(2 264 59)" />
        <rect x="277" y="53" width="13" height="12" fill="#F5C4B3" transform="rotate(-3 283 59)" />

        {/* The director's door lights up while a person is being brought in. */}
        <rect x="304" y="66" width="42" height="120" rx="4" fill={doorLit ? "#F4C66B" : "#B5ADA3"} className="transition-colors duration-500" />
        <rect x="309" y="76" width="32" height="15" rx="3" fill="#FFF" opacity="0.9" />
        <text x="325" y="86.5" textAnchor="middle" fontSize="7" fontWeight="700" fill="#2C2420">
          {directorFirstName}
        </text>
        <circle cx="339" cy="132" r="2.8" fill="#5C554D" />
        {doorLit && <rect x="300" y="62" width="50" height="128" rx="7" fill="none" stroke="#F4C66B" strokeWidth="2.5" opacity="0.7" />}
      </svg>

      {/* Maple's spot: 120 wide, from x 120, ending at the desk top (y 166). */}
      <div className="absolute left-1/3 aspect-square w-1/3" style={{ bottom: `${(64 / 230) * 100}%` }}>
        {maple}
      </div>

      {bubble}

      <svg viewBox="0 0 360 230" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {/* A plant and a mug on the desk */}
        <g transform="translate(222 0)">
          <rect x="34" y="150" width="20" height="16" rx="3" fill="#D85A30" />
          <path d="M44 150 C38 138 30 136 28 128 C36 130 42 136 44 146 C46 134 52 128 60 126 C58 136 50 140 44 150Z" fill="#3F8F6B" />
        </g>
        <rect x="56" y="152" width="14" height="14" rx="3" fill="#FFF" />
        <path d="M70 156 q6 0 6 5 q0 5 -6 5" fill="none" stroke="#FFF" strokeWidth="2.5" />

        <rect x="14" y="166" width="332" height="60" rx="10" fill="#2E9C7A" />
        <rect x="14" y="166" width="332" height="10" rx="5" fill="#26876A" />
        <text x="180" y="203" textAnchor="middle" fontSize="15" fontWeight="800" fill="#FFF">
          {centerName}
        </text>
        <text x="180" y="217" textAnchor="middle" fontSize="8.5" fill="#D7F2E8">
          {labels.frontDesk}
        </text>
      </svg>
    </div>
  );
}

/** Albuquerque gets the Sandia Mountains and balloons; Seattle gets rain and evergreens. */
function Window({ centerId }: { centerId: CenterId }) {
  const clip = `desk-window-${centerId}`;
  return (
    <g>
      <defs>
        <clipPath id={clip}>
          <rect x="24" y="28" width="88" height="66" rx="5" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        {centerId === "pinon-grove" ? (
          <>
            <rect x="24" y="28" width="88" height="66" fill="#BFE3F2" />
            <path d="M24 94 L24 74 L40 62 L52 68 L66 54 L82 64 L96 58 L112 70 L112 94Z" fill="#C98F8F" />
            <path d="M24 94 L24 84 L46 78 L70 82 L94 76 L112 80 L112 94Z" fill="#B97C6E" />
            <g className="desk-balloon">
              <path d="M52 36 c-7 0 -10 6 -10 10 c0 6 6 10 10 14 c4 -4 10 -8 10 -14 c0 -4 -3 -10 -10 -10z" fill="#E8573A" />
              <path d="M52 36 c-3 0 -4 6 -4 10 c0 6 2 10 4 14 c2 -4 4 -8 4 -14 c0 -4 -1 -10 -4 -10z" fill="#F4C66B" />
              <rect x="50" y="61" width="4" height="3" rx="1" fill="#7A5A3A" />
            </g>
            <g className="desk-balloon desk-balloon--late">
              <path d="M90 44 c-4 0 -6 4 -6 6 c0 4 4 6 6 8 c2 -2 6 -4 6 -8 c0 -2 -2 -6 -6 -6z" fill="#5B8FC7" />
              <rect x="89" y="58" width="2.5" height="2" rx="0.5" fill="#7A5A3A" />
            </g>
          </>
        ) : (
          <>
            <rect x="24" y="28" width="88" height="66" fill="#C9D3DC" />
            <path d="M30 94 L40 66 L50 94Z M46 94 L58 58 L70 94Z M66 94 L76 70 L86 94Z M84 94 L96 62 L108 94Z" fill="#3F6B57" />
            <g className="desk-rain" stroke="#8FA3B5" strokeWidth="1.4" strokeLinecap="round">
              {[30, 42, 54, 66, 78, 90, 102].map((x, i) => (
                <line key={x} x1={x} y1={18 + (i % 3) * 12} x2={x - 3} y2={26 + (i % 3) * 12} />
              ))}
              {[36, 48, 60, 72, 84, 96, 108].map((x, i) => (
                <line key={x} x1={x} y1={48 + (i % 3) * 10} x2={x - 3} y2={56 + (i % 3) * 10} />
              ))}
            </g>
          </>
        )}
      </g>
      <rect x="24" y="28" width="88" height="66" rx="5" fill="none" stroke="#FFF" strokeWidth="5" />
      <line x1="68" y1="28" x2="68" y2="94" stroke="#FFF" strokeWidth="3" />
      <line x1="24" y1="61" x2="112" y2="61" stroke="#FFF" strokeWidth="3" />
    </g>
  );
}
