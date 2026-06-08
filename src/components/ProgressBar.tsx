export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="w-full h-1.75 rounded-full overflow-hidden" style={{ background: 'var(--progress-bg)' }}>
      <div
        className="h-full"
        style={{ width: `${pct}%`, background: 'var(--gold-grad)', transition: 'width var(--motion-base)' }}
      />
    </div>
  );
}
