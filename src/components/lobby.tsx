import { Maple, type MapleState } from "./maple";

/** The laptop-size lobby: Maple at the front desk, the handbook shelf, the notice board and the director's door. */
export function Lobby({ state, centerName, directorName }: { state: MapleState; centerName: string; directorName: string }) {
  const doorLit = state === "handoff" || state === "calm";
  return (
    <div className="relative mx-auto aspect-[7/9] w-full max-w-[260px] select-none" aria-hidden>
      <svg viewBox="0 0 280 360" className="absolute inset-0 h-full w-full">
        <rect x="0" y="0" width="280" height="270" rx="18" fill="#F6EBD9" />
        <rect x="0" y="262" width="280" height="98" rx="0" fill="#EDE3D3" />
        {/* Handbook shelf */}
        <rect x="16" y="70" width="58" height="130" rx="4" fill="#B9844F" />
        <rect x="16" y="112" width="58" height="4" fill="#9A6B3F" />
        <rect x="16" y="156" width="58" height="4" fill="#9A6B3F" />
        {[["#D85A30", 22], ["#2E9C7A", 32], ["#5B8FC7", 42], ["#E8B04B", 52]].map(([c, x]) => (
          <rect key={x as number} x={x as number} y="82" width="8" height="30" rx="1.5" fill={c as string} />
        ))}
        {[["#7F77DD", 22], ["#D85A30", 32], ["#2E9C7A", 42]].map(([c, x]) => (
          <rect key={x as number} x={x as number} y="126" width="8" height="30" rx="1.5" fill={c as string} />
        ))}
        <text x="45" y="190" textAnchor="middle" fontSize="11" fill="#FFF" fontWeight="600">Handbook</text>
        {/* Notice board */}
        <rect x="96" y="40" width="88" height="62" rx="4" fill="#D9B48F" stroke="#B9844F" strokeWidth="3" />
        <rect x="104" y="48" width="24" height="20" fill="#FFF" transform="rotate(-4 116 58)" />
        <rect x="136" y="50" width="22" height="18" fill="#FAC775" transform="rotate(3 147 59)" />
        <rect x="114" y="74" width="26" height="20" fill="#9FE1CB" transform="rotate(2 127 84)" />
        <rect x="150" y="74" width="24" height="18" fill="#F5C4B3" transform="rotate(-3 162 83)" />
        {/* Director's door */}
        <rect x="206" y="86" width="56" height="176" rx="4" fill={doorLit ? "#F4C66B" : "#A8A29A"} className="transition-colors duration-500" />
        <rect x="214" y="96" width="40" height="22" rx="3" fill="#FFF" opacity="0.85" />
        <text x="234" y="111" textAnchor="middle" fontSize="9" fill="#2C2420" fontWeight="600">Director</text>
        <circle cx="252" cy="178" r="4" fill="#5C554D" />
        {doorLit && <rect x="200" y="80" width="68" height="188" rx="8" fill="none" stroke="#F4C66B" strokeWidth="3" opacity="0.6" />}
      </svg>
      <div className="absolute bottom-[26%] left-1/2 w-[62%] -translate-x-1/2">
        <Maple state={state} size={170} />
      </div>
      <svg viewBox="0 0 280 120" className="absolute bottom-0 left-0 w-full">
        <rect x="24" y="10" width="232" height="96" rx="10" fill="#2E9C7A" />
        <rect x="24" y="10" width="232" height="14" rx="6" fill="#26876A" />
        <text x="140" y="70" textAnchor="middle" fontSize="15" fill="#FFF" fontWeight="700">{centerName}</text>
        <text x="140" y="90" textAnchor="middle" fontSize="10" fill="#D7F2E8">Front desk · {directorName.split(" ")[0]}&apos;s team</text>
      </svg>
    </div>
  );
}
