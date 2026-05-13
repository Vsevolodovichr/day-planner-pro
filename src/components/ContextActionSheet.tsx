import { ArrowRightLeft, Copy, ListPlus, Pencil, Send, Trash2 } from 'lucide-react';
const items = [
  { Icon: ListPlus, label: 'Додати підзадачу', key: 'subtask' },
  { Icon: ArrowRightLeft, label: 'Перенести', key: 'transfer' },
  { Icon: Pencil, label: 'Редагувати', key: 'edit' },
  { Icon: Copy, label: 'Копіювати', key: 'copy' },
  { Icon: Send, label: 'Відправити', key: 'send' },
  { Icon: Trash2, label: 'Видалити', key: 'delete' },
] as const;
export function ContextActionSheet({
  onAction,
  onClose,
}: {
  onAction: (k: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 flex items-end justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', zIndex: 70 }}
      onClick={onClose}
    >
      <div
        className="w-full sm:w-[428px] px-4 pb-[calc(6.25rem+env(safe-area-inset-bottom))] space-y-2.5"
        onClick={(e) => e.stopPropagation()}
      >
        {items.map(({ Icon, label, key }) => (
          <button
            key={key}
            onClick={() => {
              onAction(key);
              onClose();
            }}
            className="w-full flex items-center gap-4 px-5 rounded-2xl"
            style={{ height: 62, background: 'rgba(18,18,20,0.96)' }}
          >
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(66,255,244,0.12)' }}
            >
              <Icon size={20} strokeWidth={1.8} color="var(--accent)" />
            </div>
            <span className="flex-1 text-left text-[19px]" style={{ color: 'var(--text-main)' }}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
