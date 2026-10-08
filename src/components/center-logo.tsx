import { useId } from "react";
import type { CenterId } from "@/content/types";

/**
 * Each fictional center's own logo. Piñon Grove: a piñon tree against a
 * mesa and the New Mexico sun. Quail Ridge: a quail with its topknot on the
 * green ridges of a grey Seattle sky. Maple stays the parents' assistant;
 * staff tools carry the center's brand.
 */
export function CenterLogo({ centerId, size = 40, title }: { centerId: CenterId; size?: number; title?: string }) {
  const clip = `logo-${useId().replace(/:/g, "")}`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title ?? (centerId === "pinon-grove" ? "Piñon Grove logo" : "Quail Ridge logo")}>
      <defs>
        <clipPath id={clip}>
          <circle cx="32" cy="32" r="31" />
        </clipPath>
      </defs>
      {centerId === "pinon-grove" ? (
        <g clipPath={`url(#${clip})`}>
          <rect width="64" height="64" fill="#F5E6D0" />
          <circle cx="44" cy="20" r="8.5" fill="#E8A13A" />
          <path d="M0 46 L12 38 L22 41 L32 33 L42 38 L52 34 L64 41 V64 H0 Z" fill="#C2603A" />
          <path d="M0 52 C14 48 28 50 40 47 C50 45 58 47 64 49 V64 H0 Z" fill="#A54E2E" />
          <rect x="20.5" y="40" width="4" height="12" rx="1.5" fill="#6B4A2E" />
          <path d="M22.5 11 C15 18 12 26 13.5 33 C15 40 30 40 31.5 33 C33 26 30 18 22.5 11 Z" fill="#2E7D6B" />
          <path d="M22.5 16 C19 21 17.5 27 18.5 32" stroke="#4FA08B" strokeWidth="2" fill="none" strokeLinecap="round" />
        </g>
      ) : (
        <g clipPath={`url(#${clip})`}>
          <rect width="64" height="64" fill="#E3EBEE" />
          <path d="M0 40 C12 32 22 33 30 38 C40 31 52 31 64 37 V64 H0 Z" fill="#3E6B5C" />
          <path d="M0 49 C16 44 30 47 42 45 C52 43 58 45 64 47 V64 H0 Z" fill="#5E8C6A" />
          <ellipse cx="30" cy="31" rx="11.5" ry="9" fill="#6E5646" />
          <ellipse cx="28" cy="34" rx="7" ry="4.5" fill="#C9B49B" />
          <circle cx="40" cy="23.5" r="6" fill="#6E5646" />
          <path d="M40.5 18 C40 12.5 44 10.5 46.5 12.5" stroke="#2F2A26" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          <circle cx="47" cy="12.8" r="1.8" fill="#2F2A26" />
          <circle cx="42" cy="22.5" r="1.2" fill="#1E1A17" />
          <path d="M45.5 24 L49 25 L45.5 26.2 Z" fill="#3A2E26" />
          <path d="M17 28 L11 25 L18.5 31.5 Z" fill="#5A4536" />
          <path d="M27 39.5 V43.5 M32 39.5 V43.5" stroke="#3A2E26" strokeWidth="1.6" strokeLinecap="round" />
        </g>
      )}
      <circle cx="32" cy="32" r="31" fill="none" stroke="#000" strokeOpacity="0.08" strokeWidth="2" />
    </svg>
  );
}
