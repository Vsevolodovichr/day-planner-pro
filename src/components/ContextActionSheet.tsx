import { ListPlus, UserPlus, ImagePlus, Camera, Copy, Share2, Star } from "lucide-react";
const items = [
  { Icon: ListPlus, label: "Додати підзадачу", key: "subtask" },
  { Icon: UserPlus, label: "Додати контакт", key: "contact", pro: true },
  { Icon: ImagePlus, label: "Додати фото", key: "photo" },
  { Icon: Camera, label: "Зробити фото", key: "takePhoto" },
  { Icon: Copy, label: "Зробити копію", key: "copy" },
  { Icon: Share2, label: "Поділитися", key: "share" },
] as const;
export function ContextActionSheet({ onAction, onClose }: { onAction: (k: string) => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{ background: "rgba(0,0,0,0.68)" }} onClick={onClose}>
      <div className="w-full sm:w-[428px] px-4 pb-6 space-y-2.5" onClick={e => e.stopPropagation()}>
        {items.map(({Icon,label,key,pro}) => (
          <button key={key} onClick={() => { onAction(key); onClose(); }}
            className="w-full flex items-center gap-4 px-5 rounded-2xl"
            style={{ height: 62, background: "var(--card-soft)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(66,255,244,0.12)" }}>
              <Icon size={20} strokeWidth={1.8} color="var(--accent)" />
            </div>
            <span className="flex-1 text-left text-[19px]" style={{ color: "var(--text-main)" }}>{label}</span>
            {pro && <Star size={20} fill="var(--warning-star)" color="var(--warning-star)" />}
          </button>
        ))}
      </div>
    </div>
  );
}
