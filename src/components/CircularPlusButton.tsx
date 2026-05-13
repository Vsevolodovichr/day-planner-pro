import { Plus } from 'lucide-react';
export function CircularPlusButton({
  onClick,
  accent = false,
  size = 58,
}: {
  onClick?: () => void;
  accent?: boolean;
  size?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full flex items-center justify-center transition-transform active:scale-95"
      style={{
        width: size,
        height: size,
        background: accent ? '#191B1E' : '#202227',
        border: accent ? '2px solid var(--accent)' : '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <Plus size={28} strokeWidth={2} color={accent ? 'var(--accent)' : '#F3F4F5'} />
    </button>
  );
}
