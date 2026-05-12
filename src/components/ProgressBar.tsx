export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <div className="w-full h-[7px] rounded-full overflow-hidden" style={{ background: '#5B5D5F' }}>
      <div
        className="h-full"
        style={{ width: `${pct}%`, background: 'var(--accent)', transition: 'width 0.3s' }}
      />
    </div>
  );
}
