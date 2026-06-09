/**
 * Decorative node constellations echoing the LearnPeers logo motif
 * (connected dots + thin links). Used as soft, blurred background accents.
 * Purely presentational — always render behind content with pointer-events-none.
 */

type Tone = 'brand' | 'light';

const TONES: Record<Tone, { line: string; dot: string; hub: string }> = {
  // For light surfaces (azure links, blue dots, charcoal hub — like the logo)
  brand: { line: '#0077be', dot: '#1f8dcc', hub: '#243036' },
  // For dark surfaces (glowing light dots)
  light: { line: '#7cc8ee', dot: '#bfe2f6', hub: '#ffffff' },
};

export function NodeConstellation({
  className = '',
  tone = 'brand',
}: {
  className?: string;
  tone?: Tone;
}) {
  const c = TONES[tone];
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {/* links */}
      <g stroke={c.line} strokeWidth="2.25" strokeLinecap="round">
        <line x1="60" y1="52" x2="38" y2="18" />
        <line x1="60" y1="52" x2="82" y2="24" />
        <line x1="60" y1="52" x2="42" y2="92" />
        <line x1="60" y1="52" x2="86" y2="82" />
      </g>
      {/* nodes */}
      <circle cx="38" cy="18" r="5.5" fill={c.dot} />
      <circle cx="82" cy="24" r="4.5" fill={c.dot} />
      <circle cx="42" cy="92" r="5.5" fill={c.dot} />
      <circle cx="86" cy="82" r="4.5" fill={c.dot} />
      <circle cx="60" cy="52" r="9" fill={c.hub} />
    </svg>
  );
}
