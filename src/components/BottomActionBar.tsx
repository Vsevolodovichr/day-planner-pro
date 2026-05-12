import { Pencil, ArrowRightLeft, Copy, Trash2 } from 'lucide-react';
const items = [
  { Icon: Pencil, label: 'Редагувати', key: 'edit' },
  { Icon: ArrowRightLeft, label: 'Перенести', key: 'transfer' },
  { Icon: Copy, label: 'Копіювати', key: 'copy' },
  { Icon: Trash2, label: 'Видалити', key: 'delete' },
] as const;
export function BottomActionBar({ onAction }: { onAction: (k: string) => void }) {
  return (
    <div
      className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-1rem)] sm:w-[428px] flex justify-around items-center rounded-[18px] overflow-hidden"
      style={{
        background: 'var(--top-bar)',
        height: 104,
        paddingBottom: 'env(safe-area-inset-bottom)',
        border: '1px solid var(--border-soft)',
      }}
    >
      {items.map(({ Icon, label, key }) => (
        <button
          key={key}
          onClick={() => onAction(key)}
          className="flex flex-col items-center gap-1.5 px-2"
        >
          <Icon size={26} strokeWidth={1.6} color="var(--accent)" />
          <span className="text-[11px]" style={{ color: 'var(--accent)' }}>
            {label}
          </span>
        </button>
      ))}
    </div>
  );
}
