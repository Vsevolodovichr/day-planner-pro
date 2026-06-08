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
      className="flex items-center justify-center transition-transform active:scale-95"
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        background: accent ? 'var(--gold-shine)' : 'rgba(13,12,10,0.94)',
        border: accent ? '1px solid var(--accent-light-50)' : '1px solid var(--glass-stroke)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 14px 34px rgba(0,0,0,0.36)',
      }}
    >
      <Plus size={28} strokeWidth={2} color={accent ? '#1A1308' : 'var(--gold-text-strong)'} />
    </button>
  );
}
