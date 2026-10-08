"use client";

import { useId } from "react";
import { motion, useReducedMotion, type TargetAndTransition, type Transition } from "motion/react";

/**
 * Maple, the front desk bear: a full-body, slightly turned bear in flat,
 * grainy colors, wearing a teal apron with her name tag and the handbook in
 * the pocket. Her pose shows what the system is doing: ready, listening
 * while the parent types, checking the handbook, getting a person, done
 * after an action (a happy hop and a nod), calm for sensitive moments, and
 * a wave hello.
 *
 * Each part moves on its own: body, head, ears, eyes and both arms pivot at
 * fixed points in the 200 x 200 drawing. Raised arms shorten (scaleY) as if
 * bending toward the viewer, so a paw can reach her cheek. Motion springs
 * drive the poses; loops (breathing, blinking) stop for people who prefer
 * reduced motion, who see the still pose for each state instead.
 */
export type MapleState = "ready" | "listening" | "thinking" | "handoff" | "done" | "calm" | "wave";

const FUR = "#B4612C";
const FUR_LIGHT = "#C97A40";
const FUR_SHADOW = "#8C4720";
const MUZZLE = "#E9B37C";
const INNER_EAR = "#7E3F1C";
const INK = "#2E1C14";
const CHEEK = "#D9775F";
const APRON = "#3F6F66";
const APRON_DARK = "#2C514A";
const TAG = "#F5EBDB";
const BOOK = "#E39A45";
const BOOK_LIGHT = "#F4C27C";

/** A pivot point in the drawing. Motion builds transform-origin from originX and originY. */
const at = (x: number, y: number) => ({ transformBox: "view-box" as const, originX: `${x}px`, originY: `${y}px` });

const SPRING: Transition = { type: "spring", stiffness: 240, damping: 18 };
const SOFT: Transition = { type: "spring", stiffness: 120, damping: 20 };

type Pose = { animate: TargetAndTransition; transition?: Transition };

/** Picks a looping or one-off animation, or its still pose when motion is reduced. */
function pose(reduce: boolean, moving: Pose, still: TargetAndTransition): Pose {
  return reduce ? { animate: still, transition: { duration: 0 } } : moving;
}

/** Arm angles (clockwise is positive) and length (scaleY) for each state. */
const FRONT_ARM: Record<MapleState, { rotate: number; scaleY: number }> = {
  ready: { rotate: 6, scaleY: 1 },
  listening: { rotate: 6, scaleY: 1 },
  thinking: { rotate: -28, scaleY: 0.9 },
  handoff: { rotate: 6, scaleY: 1 },
  done: { rotate: 26, scaleY: 1 },
  calm: { rotate: -56, scaleY: 0.92 },
  wave: { rotate: 6, scaleY: 1 },
};
const BACK_ARM: Record<MapleState, { rotate: number; scaleY: number }> = {
  ready: { rotate: -6, scaleY: 1 },
  listening: { rotate: -6, scaleY: 1 },
  thinking: { rotate: -6, scaleY: 1 },
  handoff: { rotate: -172, scaleY: 0.58 },
  done: { rotate: -26, scaleY: 1 },
  calm: { rotate: -4, scaleY: 1 },
  wave: { rotate: -6, scaleY: 1 },
};

export function Maple({ state = "ready", size = 120, label }: { state?: MapleState; size?: number; label?: string }) {
  const reduce = useReducedMotion() ?? false;
  const id = useId().replace(/:/g, "");
  const grain = `maple-grain-${id}`;
  const calm = state === "calm";

  const body = pose(
    reduce,
    state === "done"
      ? { animate: { y: [0, 3, -18, 0, 0], scaleY: [1, 0.94, 1.04, 0.96, 1] }, transition: { duration: 0.8, times: [0, 0.15, 0.45, 0.75, 1], ease: "easeOut" } }
      : { animate: { y: [0, calm ? -0.6 : -1.6, 0], scaleY: [1, calm ? 1.004 : 1.01, 1] }, transition: { duration: calm ? 5.5 : 3.4, repeat: Infinity, ease: "easeInOut" } },
    { y: 0, scaleY: 1 },
  );
  const shadow = pose(
    reduce,
    state === "done" ? { animate: { scaleX: [1, 1.05, 0.8, 1.05, 1], opacity: [0.1, 0.12, 0.05, 0.12, 0.1] }, transition: { duration: 0.8, times: [0, 0.15, 0.45, 0.75, 1] } } : { animate: { scaleX: 1, opacity: 0.1 } },
    { scaleX: 1, opacity: 0.1 },
  );

  const headTarget: Record<MapleState, TargetAndTransition> = {
    ready: { rotate: 0, y: 0 },
    listening: { rotate: 7, y: 0 },
    thinking: { rotate: 4, y: 3 },
    handoff: { rotate: 6, y: 0 },
    calm: { rotate: -3, y: 1 },
    wave: { rotate: -5, y: 0 },
    done: { rotate: 0, y: 0 },
  };
  const head = pose(
    reduce,
    state === "done"
      ? { animate: { rotate: [0, 0, 9, -3, 0], y: 0 }, transition: { duration: 1.1, times: [0, 0.5, 0.7, 0.85, 1], ease: "easeInOut" } }
      : { animate: headTarget[state], transition: SPRING },
    headTarget[state],
  );

  const earPose = (side: 1 | -1) =>
    state === "listening" ? { rotate: 8 * side, scale: 1.12 } : calm ? { rotate: -10 * side, scale: 0.95 } : { rotate: 0, scale: 1 };
  const leftEar = pose(reduce, { animate: earPose(1), transition: SPRING }, earPose(1));
  const rightEar = pose(
    reduce,
    state === "listening" || calm
      ? { animate: earPose(-1), transition: SPRING }
      : { animate: { rotate: [0, 0, -12, 0, 0], scale: 1 }, transition: { duration: 6, times: [0, 0.8, 0.84, 0.88, 1], repeat: Infinity } },
    earPose(-1),
  );

  const eyes = pose(
    reduce,
    {
      animate: { scaleY: [1, 1, 0.1, 1], x: state === "handoff" ? 2.5 : 0, scale: state === "listening" ? 1.12 : 1 },
      transition: { scaleY: { duration: state === "thinking" ? 6 : 4.2, times: [0, 0.93, 0.96, 1], repeat: Infinity }, x: SPRING, scale: SPRING },
    },
    { scaleY: 1, x: state === "handoff" ? 2.5 : 0, scale: 1 },
  );

  const frontArm = pose(reduce, { animate: FRONT_ARM[state], transition: SPRING }, FRONT_ARM[state]);
  const backArm = pose(
    reduce,
    state === "wave"
      ? { animate: { rotate: [-6, -150, -122, -150, -122, -150, -6], scaleY: [1, 0.9, 0.9, 0.9, 0.9, 0.9, 1] }, transition: { duration: 2, times: [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1], ease: "easeInOut" } }
      : { animate: BACK_ARM[state], transition: SPRING },
    state === "wave" ? { rotate: -140, scaleY: 0.9 } : BACK_ARM[state],
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
        {/* Film grain, laid only over Maple's own shapes. */}
        <filter id={grain} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feTurbulence type="fractalNoise" baseFrequency="0.95" numOctaves="2" seed="7" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.2  0 0 0 0 0.11  0 0 0 0 0.05  1.7 0 0 0 -0.95" result="specks" />
          <feComposite in="specks" in2="SourceGraphic" operator="in" result="grainOnShapes" />
          <feComposite in="grainOnShapes" in2="SourceGraphic" operator="over" />
        </filter>
      </defs>

      <motion.ellipse cx="100" cy="190" rx="56" ry="5.5" fill="#3A2A1A" style={at(100, 190)} initial={false} {...shadow} />

      <motion.g style={at(100, 188)} initial={false} {...body} filter={`url(#${grain})`}>
        {/* The far arm, in shadow behind the body. Waves and holds the phone. */}
        <motion.g style={at(134, 94)} initial={false} {...backArm}>
          <path d="M123 96 C123 85 145 85 145 96 L146 148 C146 162 125 162 124 148 Z" fill={FUR_SHADOW} />
        </motion.g>

        {/* Legs and feet */}
        <path d="M70 158 C70 150 96 150 96 158 L96 178 L70 178 Z" fill={FUR} />
        <path d="M106 158 C106 150 132 150 132 158 L132 178 L106 178 Z" fill={FUR} />
        <path d="M62 184 C62 172 98 172 98 184 C98 189 62 189 62 184 Z" fill={FUR} />
        <path d="M104 184 C104 172 140 172 140 184 C140 189 104 189 104 184 Z" fill={FUR} />
        <path d="M72 186 Q80 183 88 186 M114 186 Q122 183 130 186" stroke={FUR_SHADOW} strokeWidth="1.4" fill="none" strokeLinecap="round" />

        {/* Body */}
        <path d="M100 76 C125 76 139 92 142 116 C145 140 142 158 131 167 C117 176 83 176 69 167 C58 158 55 140 58 116 C61 92 75 76 100 76 Z" fill={FUR} />
        <path d="M134 98 C142 116 143 142 134 162 C140 140 140 118 134 98 Z" fill={FUR_SHADOW} opacity="0.55" />

        {/* Apron, with the name tag and the handbook in the pocket */}
        <path d="M80 96 L86 79" stroke={APRON} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M120 96 L114 79" stroke={APRON} strokeWidth="4.5" strokeLinecap="round" />
        <path d="M76 95 L124 95 L132 166 C113 174 87 174 68 166 Z" fill={APRON} />
        <rect x="84" y="101" width="32" height="10.5" rx="2.5" fill={TAG} />
        <text x="100" y="108.8" textAnchor="middle" fontSize="6.6" fontWeight="800" fill={INK} fontFamily="var(--font-nunito), system-ui, sans-serif">
          Maple
        </text>
        <g transform="rotate(-8 108 126)">
          <rect x="97" y="120" width="22" height="9" rx="1.5" fill={BOOK} />
          <rect x="97" y="120" width="22" height="2.6" rx="1.2" fill={BOOK_LIGHT} />
        </g>
        <path d="M85 126 L117 126 L118 152 C118 157 115 159 111 159 L91 159 C87 159 84 157 84 152 Z" fill={APRON} stroke={APRON_DARK} strokeWidth="1.3" strokeLinejoin="round" />

        {/* The open handbook, held up while she checks it */}
        <motion.g style={at(112, 124)} initial={false} {...show(state === "thinking")}>
          <path d="M90 112 L112 117 L134 112 L134 138 L112 143 L90 138 Z" fill="#FBF6EC" stroke="#CDBFAE" strokeWidth="1.2" strokeLinejoin="round" />
          <line x1="112" y1="117" x2="112" y2="143" stroke="#CDBFAE" strokeWidth="1.2" />
          <path d="M95 121 L108 124 M95 127 L108 130 M95 133 L104 135" stroke="#BFB09C" strokeWidth="1.3" strokeLinecap="round" />
          <motion.path d="M112 117 L131 113 L131 137 L112 141 Z" fill="#F3ECDF" stroke="#DCCFBE" strokeWidth="0.8" style={at(112, 129)} initial={false} {...(state === "thinking" ? page : { animate: { scaleX: 1 } })} />
          <ellipse cx="134" cy="128" rx="7" ry="8" fill={FUR_SHADOW} />
        </motion.g>

        {/* Head */}
        <motion.g style={at(100, 86)} initial={false} {...head}>
          <motion.g style={at(74, 42)} initial={false} {...leftEar}>
            <circle cx="71" cy="34" r="13" fill={FUR} />
            <circle cx="72" cy="35" r="6.5" fill={INNER_EAR} />
          </motion.g>
          <motion.g style={at(122, 38)} initial={false} {...rightEar}>
            <circle cx="125" cy="30" r="11.5" fill={FUR} />
            <circle cx="125" cy="31" r="5.5" fill={INNER_EAR} />
          </motion.g>
          <ellipse cx="99" cy="56" rx="36" ry="33" fill={FUR} />
          <ellipse cx="86" cy="40" rx="13" ry="6" fill={FUR_LIGHT} opacity="0.3" transform="rotate(-18 86 40)" />
          <ellipse cx="111" cy="65" rx="15.5" ry="11.5" fill={MUZZLE} />
          <circle cx="81" cy="65" r="6.2" fill={CHEEK} opacity="0.85" />
          <ellipse cx="118" cy="59.5" rx="6.2" ry="4.6" fill={INK} />
          {calm ? (
            <path d="M106 70 Q112 72 118 70" stroke={INK} strokeWidth="1.6" fill="none" strokeLinecap="round" />
          ) : state === "done" || state === "wave" ? (
            <path d="M105 68.5 Q112 76 119 68.5 Z" fill="#7A2E22" stroke={INK} strokeWidth="1.5" strokeLinejoin="round" />
          ) : (
            <path d="M106 69 Q112 73.5 118 69" stroke={INK} strokeWidth="1.7" fill="none" strokeLinecap="round" />
          )}
          {calm ? (
            <g stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round">
              <path d="M88 53 Q92 56 96 53" />
              <path d="M110 50 Q114 53 118 50" />
            </g>
          ) : state === "done" ? (
            <g stroke={INK} strokeWidth="2.2" fill="none" strokeLinecap="round">
              <path d="M88 54 Q92 49 96 54" />
              <path d="M110 51 Q114 46 118 51" />
            </g>
          ) : (
            <motion.g style={at(103, 51)} initial={false} {...eyes} fill={INK}>
              <circle cx="92" cy="52" r="2.8" />
              <circle cx="114" cy="49" r="2.8" />
            </motion.g>
          )}
          {/* Reading glasses */}
          <motion.g style={at(103, 51)} initial={false} {...show(state === "thinking")}>
            <g stroke={INK} strokeWidth="1.5" fill="#FFF" fillOpacity="0.15">
              <circle cx="92" cy="52" r="7" />
              <circle cx="114" cy="49" r="7" />
            </g>
            <path d="M99 51 Q103 48.5 107 50" stroke={INK} strokeWidth="1.5" fill="none" />
          </motion.g>
        </motion.g>

        {/* The near arm, in front: holds the book, rests on her chest in calm mode */}
        <motion.g style={at(66, 94)} initial={false} {...frontArm}>
          <path d="M55 96 C55 85 77 85 77 96 L76 148 C76 162 55 162 55 148 Z" fill={FUR} />
          <path d="M57 99 C57 92 62 89 66 89" stroke={FUR_LIGHT} strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
        </motion.g>

        {/* A phone at her cheek while she gets a person */}
        <motion.g style={at(140, 58)} initial={false} {...show(state === "handoff")}>
          <rect x="135" y="44" width="10" height="20" rx="2.5" fill={INK} transform="rotate(14 140 54)" />
          <ellipse cx="141" cy="60" rx="7" ry="6.5" fill={FUR_SHADOW} />
        </motion.g>
      </motion.g>
    </svg>
  );
}
