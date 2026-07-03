const FACE = '#24243E'; // eyes + mouth
const BLUSH = '#EBA283';

export const PROFILE_CHARACTERS = [
  { color: '#F2A2B8' }, // pink
  { color: '#8FD3AF' }, // green
  { color: '#ABA4EF' }, // purple
  { color: '#F5CE5E' }, // yellow
  { color: '#7FC9E8' }, // sky blue
] as const;

type Props = { color: string; wink?: boolean; className?: string };

export function ProfileCharacter({ color, wink, className }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden>
      {/* body */}
      <path
        d="M28 90C28 40 60 18 100 18s72 22 72 72v65q0 27-27 27H55q-27 0-27-27Z"
        fill={color}
      />
      {/* left eye */}
      <circle cx="80" cy="92" r="13" fill="#fff" />
      <circle cx="84" cy="92" r="6" fill={FACE} />
      {/* right eye — winking = dash */}
      {wink ? (
        <path d="M108 92h28" stroke={FACE} strokeWidth="7" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="120" cy="92" r="13" fill="#fff" />
          <circle cx="124" cy="92" r="6" fill={FACE} />
        </>
      )}
      {/* cheeks */}
      <ellipse cx="60" cy="120" rx="11" ry="7" fill={BLUSH} opacity="0.7" />
      <ellipse cx="140" cy="120" rx="11" ry="7" fill={BLUSH} opacity="0.7" />
      {/* smile */}
      <path
        d="M80 126q20 24 40 0"
        fill="none"
        stroke={FACE}
        strokeWidth="7"
        strokeLinecap="round"
      />
    </svg>
  );
}
