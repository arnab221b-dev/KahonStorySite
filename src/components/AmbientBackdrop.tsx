interface AmbientBackdropProps {
  isPlaying: boolean;
}

export function AmbientBackdrop({ isPlaying }: AmbientBackdropProps) {
  return (
    <div
      className={`ambient-backdrop ${isPlaying ? 'ambient-backdrop--playing' : ''}`}
      aria-hidden="true"
    >
      <div className="ambient-orb ambient-orb--one" />
      <div className="ambient-orb ambient-orb--two" />
      <div className="ambient-orb ambient-orb--three" />
      <div className="ambient-grain" />
    </div>
  );
}
