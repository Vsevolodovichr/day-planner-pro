import { Check, MoreHorizontal } from "lucide-react";
import { Task } from "../types";

export function TaskRow({ task, onToggle, onSelect, onMenu, showBorder = true }: {
  task: Task; onToggle: () => void; onSelect: () => void; onMenu?: () => void; showBorder?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 h-[64px] px-4 ${showBorder ? "border-b last:border-b-0" : ""}`} style={{ borderColor: "var(--border-soft)" }}>
      <button onClick={onToggle} className="w-[22px] h-[22px] rounded-full flex items-center justify-center"
        style={{ background: task.completed ? "var(--accent)" : "transparent", border: task.completed ? "none" : "1.5px solid var(--text-dim)" }}>
        {task.completed && <Check size={14} strokeWidth={3} color="#0c1213" />}
      </button>
      <button onClick={onSelect} className="flex-1 text-left text-[18px]"
        style={{ color: task.completed ? "var(--text-muted)" : "var(--text-main)", textDecoration: task.completed ? "line-through" : "none" }}>
        {task.title}
      </button>
      {onMenu ? (
        <button onClick={onMenu} className="w-9 h-9 flex items-center justify-center">
          <MoreHorizontal size={22} strokeWidth={1.8} color="var(--text-muted)" />
        </button>
      ) : null}
    </div>
  );
}
