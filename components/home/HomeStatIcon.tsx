/** Small illustrated symbols for the six homepage counters. */
type HomeStatKind = "barrel" | "mug" | "crest" | "brewery" | "hop" | "globe";

export default function HomeStatIcon({ kind }: { kind: HomeStatKind }) {
  const wood = `home-${kind}-wood`;
  const metal = `home-${kind}-metal`;
  const beer = `home-${kind}-beer`;
  const green = `home-${kind}-green`;
  const sea = `home-${kind}-sea`;

  return (
    <svg viewBox="0 0 48 48" width="34" height="34" fill="none" aria-hidden="true" style={{ filter: "drop-shadow(0 2px 2px rgba(0,0,0,.6))" }}>
      <defs>
        <linearGradient id={wood} x1="6" y1="8" x2="39" y2="42" gradientUnits="userSpaceOnUse"><stop stopColor="#e0a75d" /><stop offset=".46" stopColor="#935225" /><stop offset="1" stopColor="#4b2818" /></linearGradient>
        <linearGradient id={metal} x1="9" y1="4" x2="38" y2="44" gradientUnits="userSpaceOnUse"><stop stopColor="#ffe1a0" /><stop offset=".42" stopColor="#b77935" /><stop offset="1" stopColor="#67401e" /></linearGradient>
        <linearGradient id={beer} x1="13" y1="8" x2="35" y2="43" gradientUnits="userSpaceOnUse"><stop stopColor="#f9bd45" /><stop offset=".45" stopColor="#d77c17" /><stop offset="1" stopColor="#794014" /></linearGradient>
        <linearGradient id={green} x1="10" y1="7" x2="37" y2="41" gradientUnits="userSpaceOnUse"><stop stopColor="#d4df74" /><stop offset=".45" stopColor="#8a9e36" /><stop offset="1" stopColor="#435823" /></linearGradient>
        <radialGradient id={sea} cx="0" cy="0" r="1" gradientTransform="translate(17 13) rotate(49) scale(36)"><stop stopColor="#8fced8" /><stop offset=".55" stopColor="#347994" /><stop offset="1" stopColor="#173a55" /></radialGradient>
      </defs>
      {kind === "barrel" && <>
        <path d="M11 11c-3 8-3 18 0 26 7 4 19 4 26 0 3-8 3-18 0-26-7-4-19-4-26 0Z" fill={`url(#${wood})`} stroke="#3f2818" strokeWidth="1.5" />
        <ellipse cx="24" cy="11" rx="13" ry="4.3" fill="#b98042" stroke={`url(#${metal})`} strokeWidth="2" />
        <path d="M13 14c-2 8-2 15 0 21m7-19-1 18m9-18 1 18m6-20c2 8 2 15 0 21" stroke="#4d2a16" strokeWidth="1.5" opacity=".65" />
        <path d="M10 17c8 3 20 3 28 0M9 32c9 3 21 3 30 0" stroke={`url(#${metal})`} strokeWidth="4" />
        <path d="M13 17c8 2 18 2 22 0M12 32c8 2 20 2 24 0" stroke="#ffe0a1" strokeWidth=".9" opacity=".7" />
        <ellipse cx="24" cy="24" rx="3.5" ry="4" fill="#65401e" stroke="#e4b16b" strokeWidth="1.3" />
      </>}
      {kind === "mug" && <>
        <path d="M33 13h4c6 0 7 14 0 16h-4" stroke={`url(#${metal})`} strokeWidth="4" />
        <path d="M10 12h25l-2 27c-5 3-16 3-21 0L10 12Z" fill={`url(#${beer})`} stroke={`url(#${metal})`} strokeWidth="2" />
        <path d="M17 17v18m7-18v19" stroke="#ffe3a1" strokeWidth="2" opacity=".55" />
        <path d="M9 13c-2-3 0-6 4-6 1-5 8-5 10-2 4-2 8 0 9 3 4 0 5 3 4 5-2 3-5 2-7 1-3 2-6 1-8 0-4 2-8 2-12-1Z" fill="#f9ebcd" stroke="#e1cda7" strokeWidth="1.3" />
        <path d="M14 8c3-3 5-2 7-1" stroke="white" strokeWidth="1.4" opacity=".7" />
      </>}
      {kind === "crest" && <>
        <path d="M24 4 40 10v13c0 10-7 16-16 21C15 39 8 33 8 23V10L24 4Z" fill={`url(#${metal})`} stroke="#eec47b" strokeWidth="1.5" />
        <path d="M24 9 35 13v10c0 7-4 12-11 16-7-4-11-9-11-16V13L24 9Z" fill="#4b2519" stroke="#f3c573" strokeWidth="1" />
        <path d="M24 14c-6 3-8 7-7 12 2 5 5 7 7 9 2-2 5-4 7-9 1-5-1-9-7-12Z" fill={`url(#${green})`} stroke="#d0b86b" strokeWidth="1.2" />
        <path d="M24 17v16m0-12-5-2m5 6-6-2m6-2 5-2m-5 6 6-2" stroke="#4d6427" strokeWidth="1.2" />
        <path d="M14 11 24 7l10 4" stroke="#fff0b5" strokeWidth="1.2" opacity=".8" />
      </>}
      {kind === "brewery" && <>
        <path d="M8 39V21l9 5 7-5 7 5 9-5v18H8Z" fill={`url(#${wood})`} stroke="#e1ae6f" strokeWidth="1.5" />
        <path d="M11 23V10h6v15M32 23V6h5v17" fill={`url(#${metal})`} stroke="#eac17f" strokeWidth="1.5" />
        <path d="M10 10h8M31 6h7" stroke="#ffe6ae" strokeWidth="2" />
        <path d="M14 32h5v7h-5zm14 0h5v7h-5z" fill="#e8aa42" stroke="#50321f" strokeWidth="1.2" />
        <path d="M22 30h4v9h-4z" fill="#3c271d" stroke="#e3b272" strokeWidth="1" />
        <path d="M7 40h35" stroke="#f0bd73" strokeWidth="2" />
      </>}
      {kind === "hop" && <>
        <path d="M24 5c-7 5-12 12-12 20 0 10 7 15 12 19 5-4 12-9 12-19 0-8-5-15-12-20Z" fill={`url(#${green})`} stroke="#d3db77" strokeWidth="1.5" />
        <path d="M24 10v31M24 18l-8-5m8 5 8-5m-8 12-11-6m11 6 11-6m-11 13-10-5m10 5 10-5" stroke="#3c5724" strokeWidth="1.8" />
        <path d="M17 15c-4 5-5 11-3 15m17-15c4 5 5 11 3 15" stroke="#e8eea3" strokeWidth="1.3" opacity=".7" />
      </>}
      {kind === "globe" && <>
        <circle cx="24" cy="23" r="18" fill={`url(#${sea})`} stroke={`url(#${metal})`} strokeWidth="2" />
        <path d="m14 11 7 1 3 4-2 4-5 1-2 5-5-3-2-6 6-6Zm16 0 8 5-1 5-5 1-3 5-5-1-1-5 4-3-1-4 4-3Zm-9 17 6 1 2 5-5 7-5-7 2-6Z" fill={`url(#${green})`} stroke="#415c31" strokeWidth=".8" />
        <path d="M7 23h34M24 5c-5 5-7 11-7 18s2 13 7 18M24 5c5 5 7 11 7 18s-2 13-7 18" stroke="#d3e4dd" strokeWidth=".8" opacity=".55" />
        <path d="M24 41v4m-9 0h18" stroke={`url(#${metal})`} strokeWidth="2" strokeLinecap="round" />
      </>}
    </svg>
  );
}
