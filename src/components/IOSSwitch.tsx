export function IOSSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="relative rounded-full transition-colors"
      style={{ width: 51, height: 31, background: checked ? 'var(--accent)' : 'rgba(255,255,255,0.12)' }}
    >
      <div
        className="absolute top-0.5 rounded-full bg-white transition-transform"
        style={{
          width: 27,
          height: 27,
          left: 2,
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  );
}
