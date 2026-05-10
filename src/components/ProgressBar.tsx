export function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((value/total)*100);
  return (
    <div className="w-full h-[6px] rounded-full overflow-hidden" style={{ background: "#3A3D42" }}>
      <div className="h-full" style={{ width: `${pct}%`, background: "#42FFF4", transition: "width 0.3s" }} />
    </div>
  );
}
