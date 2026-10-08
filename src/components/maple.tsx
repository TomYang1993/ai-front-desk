/**
 * Maple, the front desk bear. Her pose shows what the system is doing:
 * ready, listening while the parent types, checking the handbook, getting
 * a person, done after an action, and calm for sensitive moments.
 * Animations live in globals.css and respect reduced-motion settings.
 */
export type MapleState = "ready" | "listening" | "thinking" | "handoff" | "done" | "calm";

const FUR = "#9A6B47";
const FUR_DARK = "#7E5536";
const MUZZLE = "#E8C9A3";
const INK = "#2C2420";
const APRON = "#5DCAA5";
const APRON_DARK = "#2E9C7A";

export function Maple({ state = "ready", size = 120, label }: { state?: MapleState; size?: number; label?: string }) {
  const calm = state === "calm";
  return (
    <svg
      className={`maple maple--${state}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label ?? `Maple, ${state === "thinking" ? "checking the handbook" : state === "handoff" ? "getting a person" : "the front desk bear"}`}
    >
      <ellipse cx="100" cy="190" rx="52" ry="6" fill="#000" opacity="0.08" />
      <g className="maple-body">
        <g className="maple-ears">
          <circle cx="60" cy="46" r="17" fill={FUR} />
          <circle cx="140" cy="46" r="17" fill={FUR} />
          <circle cx="60" cy="46" r="9" fill={MUZZLE} />
          <circle cx="140" cy="46" r="9" fill={MUZZLE} />
        </g>
        <rect x="54" y="112" width="92" height="76" rx="36" fill={FUR} />
        <path d="M72 128 Q100 118 128 128 L126 176 Q100 184 74 176 Z" fill={APRON} />
        <line x1="76" y1="128" x2="68" y2="114" stroke={APRON_DARK} strokeWidth="4" strokeLinecap="round" />
        <line x1="124" y1="128" x2="132" y2="114" stroke={APRON_DARK} strokeWidth="4" strokeLinecap="round" />
        <rect x="84" y="152" width="32" height="18" rx="5" fill={APRON_DARK} />
        <rect x="90" y="144" width="20" height="11" rx="2" fill="#D85A30" />
        <circle cx="116" cy="136" r="5" fill="#FFF" stroke={APRON_DARK} strokeWidth="1.5" />

        {/* Paws: resting, holding a book, on the phone, or on the chest. */}
        {state === "thinking" ? (
          <g className="maple-book">
            <path d="M68 136 L100 142 L132 136 L132 164 L100 170 L68 164 Z" fill="#FFF" stroke="#D6CFC4" strokeWidth="1.5" />
            <line x1="100" y1="142" x2="100" y2="170" stroke="#D6CFC4" strokeWidth="1.5" />
            <path className="maple-page" d="M100 142 L128 137 L128 162 L100 168 Z" fill="#F7F2EA" />
            <line x1="76" y1="146" x2="94" y2="149" stroke="#C9C1B4" strokeWidth="1.5" />
            <line x1="76" y1="153" x2="94" y2="156" stroke="#C9C1B4" strokeWidth="1.5" />
            <circle cx="66" cy="152" r="10" fill={FUR} />
            <circle cx="134" cy="152" r="10" fill={FUR} />
          </g>
        ) : state === "handoff" ? (
          <g>
            <circle cx="62" cy="152" r="11" fill={FUR} />
            <circle cx="144" cy="104" r="11" fill={FUR} />
          </g>
        ) : calm ? (
          <g>
            <circle cx="62" cy="152" r="11" fill={FUR} />
            <circle cx="108" cy="134" r="11" fill={FUR_DARK} />
          </g>
        ) : (
          <g className="maple-paws">
            <circle cx="62" cy="154" r="11" fill={FUR} />
            <circle cx="138" cy="154" r="11" fill={FUR} />
          </g>
        )}

        <g className="maple-head">
          <circle cx="100" cy="82" r="45" fill={FUR} />
          <ellipse cx="100" cy="99" rx="21" ry="15" fill={MUZZLE} />
          <ellipse cx="100" cy="92" rx="7" ry="5" fill={INK} />
          <path d="M93 103 Q100 109 107 103" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          {calm ? (
            <g stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round">
              <path d="M78 78 Q84 74 90 78" />
              <path d="M110 78 Q116 74 122 78" />
            </g>
          ) : (
            <g className="maple-eyes" fill={INK}>
              <circle cx="84" cy="76" r="4.6" />
              <circle cx="116" cy="76" r="4.6" />
            </g>
          )}
          <circle cx="71" cy="94" r="6" fill="#F2A7B8" opacity="0.75" />
          <circle cx="129" cy="94" r="6" fill="#F2A7B8" opacity="0.75" />
          {state === "thinking" && (
            <g stroke={INK} strokeWidth="2" fill="none">
              <circle cx="84" cy="76" r="10" />
              <circle cx="116" cy="76" r="10" />
              <path d="M94 76 Q100 72 106 76" />
            </g>
          )}
          {state === "handoff" && <rect x="138" y="60" width="15" height="30" rx="4" fill={INK} transform="rotate(14 145 75)" />}
        </g>
      </g>
    </svg>
  );
}
