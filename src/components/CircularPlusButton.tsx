import { Plus } from "lucide-react";
export function CircularPlusButton({ onClick, accent = false, size = 58 }: { onClick?: () => void; accent?: boolean; size?: number }) {
  return (
    <button onClick={onClick} className="rounded-full flex items-center justify-center transition-transform active:scale-95"
      style={{
        width: size, height: size,
        background: "#1A1C1F",
        border: accent ? "1.5px solid #42FFF4" : "1.5px solid rgba(255,255,255,0.06)",
        boxShadow: accent ? "0 0 18px rgba(66,255,244,0.25), inset 0 1px 0 rgba(255,255,255,0.03)" : "inset 0 1px 0 rgba(255,255,255,0.03), 0 6px 14px rgba(0,0,0,0.5)",
      }}>
      <Plus size={28} strokeWidth={2} color={accent ? "#42FFF4" : "#F3F4F5"} />
    </button>
  );
}
