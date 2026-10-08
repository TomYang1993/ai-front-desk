"use client";

import { useId } from "react";
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";

/**
 * Maple, the front desk bear. Her pose shows what the system is doing:
 * ready, listening while the parent types, checking the handbook, getting
 * a person, done after an action (a happy hop and a nod), calm for
 * sensitive moments, and a wave hello.
 *
 * Each part moves on its own: body, head, ears, eyes, brows and both arms
 * pivot at fixed points in the 200 x 200 drawing. Motion springs drive the
 * poses; loops (breathing, blinking) stop for people who prefer reduced
 * motion, who see the still pose for each state instead.
 */
export type MapleState = "ready" | "listening" | "thinking" | "handoff" | "done" | "calm" | "wave";

const FUR = "#9A6B47";
const FUR_LIGHT = "#B98B62";
const FUR_DARK = "#7E5536";
const FUR_DEEP = "#64412A";
const MUZZLE = "#EFD3AE";
const MUZZLE_SHADE = "#D8B38B";
const INNER_EAR = "#E7C3A0";
const INK = "#2C2420";
const APRON = "#4FBF98";
const APRON_LIGHT = "#7FD8B8";
const APRON_DARK = "#2E9C7A";
const CHEEK = "#F2A7B8";

/** A pivot point in the drawing. Motion builds transform-origin from originX and originY. */
const at = (x: number, y: number) => ({ transformBox: "view-box" as const, originX: `${x}px`, originY: `${y}px` });

const SPRING: Transition = { type: "spring", stiffness: 260, damping: 18 };
const SOFT: Transition = { type: "spring", stiffness: 120, damping: 20 };

type Pose = { animate: TargetAndTransition; transition?: Transition };

/** Picks a looping or one-off animation, or its still pose when motion is reduced. */
function pose(reduce: boolean, moving: Pose, still: TargetAndTransition): Pose {
  return reduce ? { animate: still, transition: { duration: 0 } } : moving;
}

export function Maple({ state = "ready", size = 120, label }: { state?: MapleState; size?: number; label?: string }) {
  const reduce = useReducedMotion() ?? false;
  const id = useId().replace(/:/g, "");
  const fur = `maple-fur-${id}`;
  const muzzle = `maple-muzzle-${id}`;
  const apron = `maple-apron-${id}`;
  const calm = state === "calm";
  const happy = state === "done" || state === "wave";

  const body = pose(
    reduce,
    state === "done"
      ? { animate: { y: [0, 3, -18, 0, 0], scaleY: [1, 0.93, 1.04, 0.95, 1] }, transition: { duration: 0.8, times: [0, 0.15, 0.45, 0.75, 1], ease: "easeOut" } }
      : { animate: { y: [0, calm ? -0.8 : -1.8, 0], scaleY: [1, calm ? 1.005 : 1.012, 1] }, transition: { duration: calm ? 5.5 : 3.4, repeat: Infinity, ease: "easeInOut" } },
    { y: 0, scaleY: 1 },
  );

  const shadow = pose(
    reduce,
    state === "done" ? { animate: { scaleX: [1, 1.06, 0.78, 1.06, 1], opacity: [0.1, 0.12, 0.05, 0.12, 0.1] }, transition: { duration: 0.8, times: [0, 0.15, 0.45, 0.75, 1] } } : { animate: { scaleX: 1, opacity: 0.1 } },
    { scaleX: 1, opacity: 0.1 },
  );

  const headTarget: Record<MapleState, TargetAndTransition> = {
    ready: { rotate: 0, y: 0 },
    listening: { rotate: -8, y: 0 },
    thinking: { rotate: 5, y: 3 },
    handoff: { rotate: 7, y: 0 },
    calm: { rotate: -3, y: 1 },
    wave: { rotate: -6, y: 0 },
    done: { rotate: 0, y: 0 },
  };
  const head = pose(
    reduce,
    state === "done"
      ? { animate: { rotate: [0, 0, 10, -3, 0], y: 0 }, transition: { duration: 1.1, times: [0, 0.5, 0.7, 0.85, 1], ease: "easeInOut" } }
      : { animate: headTarget[state], transition: SPRING },
    headTarget[state],
  );

  // Ears perk up and in while listening, droop a little in calm mode, and the right one twitches now and then.
  const leftEar = pose(
    reduce,
    { animate: state === "listening" ? { rotate: 8, scale: 1.12 } : calm ? { rotate: -12, scale: 0.96 } : { rotate: 0, scale: 1 }, transition: SPRING },
    state === "listening" ? { rotate: 8, scale: 1.12 } : calm ? { rotate: -12, scale: 0.96 } : { rotate: 0, scale: 1 },
  );
  const rightEar = pose(
    reduce,
    state === "listening"
      ? { animate: { rotate: -8, scale: 1.12 }, transition: SPRING }
      : calm
        ? { animate: { rotate: 12, scale: 0.96 }, transition: SPRING }
        : { animate: { rotate: [0, 0, 14, 0, 0], scale: 1 }, transition: { duration: 6, times: [0, 0.8, 0.84, 0.88, 1], repeat: Infinity } },
    state === "listening" ? { rotate: -8, scale: 1.12 } : calm ? { rotate: 12, scale: 0.96 } : { rotate: 0, scale: 1 },
  );

  // Blinking, and a glance toward the director's door while getting a person.
  const eyes = pose(
    reduce,
    {
      animate: { scaleY: [1, 1, 0.08, 1], x: state === "handoff" ? 3 : 0, scale: state === "listening" ? 1.08 : 1 },
      transition: { scaleY: { duration: state === "thinking" ? 6 : 4.2, times: [0, 0.93, 0.96, 1], repeat: Infinity }, x: SPRING, scale: SPRING },
    },
    { scaleY: 1, x: state === "handoff" ? 3 : 0, scale: 1 },
  );

  const brows = pose(
    reduce,
    { animate: state === "listening" ? { y: -3 } : calm ? { y: 1 } : { y: 0 }, transition: SPRING },
    state === "listening" ? { y: -3 } : calm ? { y: 1 } : { y: 0 },
  );

  // Arms pivot at the shoulders. Positive angles turn clockwise.
  const leftArmAngle = state === "thinking" ? -30 : state === "done" ? 24 : 10;
  const rightArmAngle: Record<MapleState, number> = { ready: -10, listening: -10, thinking: 30, handoff: -152, calm: 56, wave: -10, done: -24 };
  const leftArm = pose(reduce, { animate: { rotate: leftArmAngle }, transition: SPRING }, { rotate: leftArmAngle });
  const rightArm = pose(
    reduce,
    state === "wave"
      ? { animate: { rotate: [-10, -150, -122, -150, -122, -150, -10] }, transition: { duration: 2, times: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1], ease: "easeInOut" } }
      : { animate: { rotate: rightArmAngle[state] }, transition: SPRING },
    { rotate: state === "wave" ? -140 : rightArmAngle[state] },
  );

  const show = (on: boolean) => ({ animate: { opacity: on ? 1 : 0, scale: on ? 1 : 0.85 }, transition: reduce ? { duration: 0 } : SOFT });
  const page = pose(reduce, { animate: { scaleX: [1, 1, -0.2, 1] }, transition: { duration: 1.8, times: [0, 0.4, 0.7, 1], repeat: Infinity, ease: "easeInOut" } }, { scaleX: 1 });

  return (
    <svg
      className={`maple maple--${state}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label={label ?? `Maple, ${state === "thinking" ? "checking the handbook" : state === "handoff" ? "getting a person" : state === "wave" ? "waving hello" : "the front desk bear"}`}
    >
      <defs>
        <radialGradient id={fur} cx="0.38" cy="0.3" r="0.8">
          <stop offset="0" stopColor={FUR_LIGHT} />
          <stop offset="0.55" stopColor={FUR} />
          <stop offset="1" stopColor={FUR_DARK} />
        </radialGradient>
        <radialGradient id={muzzle} cx="0.45" cy="0.35" r="0.75">
          <stop offset="0" stopColor="#F7E2C4" />
          <stop offset="0.6" stopColor={MUZZLE} />
          <stop offset="1" stopColor={MUZZLE_SHADE} />
        </radialGradient>
        <linearGradient id={apron} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={APRON_LIGHT} />
          <stop offset="0.5" stopColor={APRON} />
          <stop offset="1" stopColor={APRON_DARK} />
        </linearGradient>
      </defs>

      <motion.ellipse cx="100" cy="192" rx="50" ry="6" fill="#000" style={at(100, 192)} initial={false} {...shadow} />

      <motion.g style={at(100, 192)} initial={false} {...body}>
        {/* Feet */}
        <ellipse cx="78" cy="184" rx="17" ry="9" fill={FUR_DARK} />
        <ellipse cx="122" cy="184" rx="17" ry="9" fill={FUR_DARK} />
        <ellipse cx="78" cy="185" rx="8" ry="4.5" fill={MUZZLE_SHADE} opacity="0.7" />
        <ellipse cx="122" cy="185" rx="8" ry="4.5" fill={MUZZLE_SHADE} opacity="0.7" />

        {/* Body and belly */}
        <path d="M100 110 C134 110 150 136 150 160 C150 181 128 191 100 191 C72 191 50 181 50 160 C50 136 66 110 100 110 Z" fill={`url(#${fur})`} />
        <ellipse cx="100" cy="166" rx="30" ry="20" fill={MUZZLE} opacity="0.35" />

        {/* Apron, pocket with the handbook, and name tag */}
        <path d="M73 130 Q100 121 127 130 L129 175 Q100 186 71 175 Z" fill={`url(#${apron})`} />
        <path d="M76 131 Q100 124 124 131" stroke="#FFF" strokeOpacity="0.35" strokeWidth="2" fill="none" strokeLinecap="round" />
        <line x1="78" y1="130" x2="72" y2="114" stroke={APRON_DARK} strokeWidth="4" strokeLinecap="round" />
        <line x1="122" y1="130" x2="128" y2="114" stroke={APRON_DARK} strokeWidth="4" strokeLinecap="round" />
        <rect x="90" y="145" width="20" height="13" rx="2" fill="#D85A30" />
        <rect x="92" y="147" width="16" height="1.8" rx="0.9" fill="#FBE3D6" />
        <rect x="85" y="153" width="30" height="17" rx="6" fill={APRON_DARK} />
        <path d="M88 156 Q100 159 112 156" stroke="#FFF" strokeOpacity="0.25" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <circle cx="117" cy="139" r="6" fill="#FFF" stroke={APRON_DARK} strokeWidth="1.5" />
        <text x="117" y="141.6" textAnchor="middle" fontSize="7" fontWeight="800" fill={APRON_DARK}>
          M
        </text>

        {/* The handbook, held open while she checks it */}
        <motion.g style={at(100, 152)} initial={false} {...show(state === "thinking")}>
          <path d="M74 138 L100 144 L126 138 L126 166 L100 172 L74 166 Z" fill="#FFF" stroke="#D6CFC4" strokeWidth="1.5" strokeLinejoin="round" />
          <line x1="100" y1="144" x2="100" y2="172" stroke="#D6CFC4" strokeWidth="1.5" />
          <line x1="80" y1="148" x2="95" y2="151" stroke="#C9C1B4" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="80" y1="154" x2="95" y2="157" stroke="#C9C1B4" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="80" y1="160" x2="91" y2="162" stroke="#C9C1B4" strokeWidth="1.5" strokeLinecap="round" />
          <motion.path d="M100 144 L123 139 L123 164 L100 169 Z" fill="#F7F2EA" stroke="#E2DAD0" strokeWidth="1" style={at(100, 156)} initial={false} {...(state === "thinking" ? page : { animate: { scaleX: 1 } })} />
        </motion.g>

        {/* Head */}
        <motion.g style={at(100, 122)} initial={false} {...head}>
          <motion.g style={at(70, 64)} initial={false} {...leftEar}>
            <circle cx="62" cy="50" r="18" fill={`url(#${fur})`} />
            <circle cx="63" cy="51" r="10" fill={INNER_EAR} />
          </motion.g>
          <motion.g style={at(130, 64)} initial={false} {...rightEar}>
            <circle cx="138" cy="50" r="18" fill={`url(#${fur})`} />
            <circle cx="137" cy="51" r="10" fill={INNER_EAR} />
          </motion.g>

          <ellipse cx="100" cy="84" rx="48" ry="44" fill={`url(#${fur})`} />
          <ellipse cx="84" cy="60" rx="17" ry="9" fill="#FFF" opacity="0.1" transform="rotate(-12 84 60)" />

          <motion.g fill="none" stroke={FUR_DEEP} strokeWidth="2.6" strokeLinecap="round" initial={false} {...brows}>
            {calm ? (
              <>
                <path d="M76 66 Q83 63 90 66" transform="rotate(8 83 65)" />
                <path d="M110 66 Q117 63 124 66" transform="rotate(-8 117 65)" />
              </>
            ) : (
              <>
                <path d="M76 66 Q83 62 90 65" />
                <path d="M110 65 Q117 62 124 66" />
              </>
            )}
          </motion.g>

          {calm ? (
            <g stroke={INK} strokeWidth="2.8" fill="none" strokeLinecap="round">
              <path d="M77 79 Q83 83 89 79" />
              <path d="M111 79 Q117 83 123 79" />
            </g>
          ) : state === "done" ? (
            <g stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round">
              <path d="M77 80 Q83 73 89 80" />
              <path d="M111 80 Q117 73 123 80" />
            </g>
          ) : (
            <motion.g style={at(100, 78)} initial={false} {...eyes}>
              <ellipse cx="83" cy="78" rx="5" ry="5.8" fill={INK} />
              <ellipse cx="117" cy="78" rx="5" ry="5.8" fill={INK} />
              <circle cx="84.8" cy="75.8" r="1.7" fill="#FFF" />
              <circle cx="118.8" cy="75.8" r="1.7" fill="#FFF" />
            </motion.g>
          )}

          <ellipse cx="69" cy="96" rx="7.5" ry="4.8" fill={CHEEK} opacity={calm ? 0.45 : 0.7} />
          <ellipse cx="131" cy="96" rx="7.5" ry="4.8" fill={CHEEK} opacity={calm ? 0.45 : 0.7} />

          <ellipse cx="100" cy="100" rx="23" ry="17" fill={`url(#${muzzle})`} />
          <path d="M92 92 Q100 87 108 92 Q106 99 100 100 Q94 99 92 92 Z" fill={INK} />
          <ellipse cx="97" cy="91.5" rx="2.6" ry="1.4" fill="#FFF" opacity="0.55" />
          <line x1="100" y1="100" x2="100" y2="104" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          {happy ? (
            <path d="M92 104 Q100 115 108 104 Z" fill="#8A3B34" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
          ) : calm ? (
            <path d="M95 106 Q100 108 105 106" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
          ) : (
            <path d="M93 104 Q100 110 107 104" stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round" />
          )}

          {/* Reading glasses */}
          <motion.g style={at(100, 78)} initial={false} {...show(state === "thinking")}>
            <g stroke={INK} strokeWidth="2" fill="#FFF" fillOpacity="0.2">
              <circle cx="83" cy="78" r="10" />
              <circle cx="117" cy="78" r="10" />
            </g>
            <path d="M93 77 Q100 73 107 77" stroke={INK} strokeWidth="2" fill="none" />
          </motion.g>
        </motion.g>

        {/* Arms, in front of the head so a raised paw can hold the phone to her ear */}
        <motion.g style={at(70, 128)} initial={false} {...leftArm}>
          <rect x="60" y="122" width="20" height="36" rx="10" fill={`url(#${fur})`} />
          <ellipse cx="70" cy="156" rx="11" ry="10" fill={FUR_LIGHT} />
          <ellipse cx="70" cy="158" rx="5" ry="3.8" fill={MUZZLE_SHADE} opacity="0.8" />
        </motion.g>
        <motion.g style={at(130, 128)} initial={false} {...rightArm}>
          <motion.rect x="123.5" y="150" width="13" height="27" rx="3.5" fill={INK} style={at(130, 160)} initial={false} {...show(state === "handoff")} />
          <rect x="120" y="122" width="20" height="36" rx="10" fill={`url(#${fur})`} />
          <ellipse cx="130" cy="156" rx="11" ry="10" fill={FUR_LIGHT} />
          <ellipse cx="130" cy="158" rx="5" ry="3.8" fill={MUZZLE_SHADE} opacity="0.8" />
        </motion.g>
      </motion.g>
    </svg>
  );
}
