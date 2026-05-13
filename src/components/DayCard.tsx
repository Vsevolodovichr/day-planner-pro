import { Task } from "../types";
import { fromISO, UA_DAYS_SHORT, UA_MONTHS } from "../lib/date";
import { CircularPlusButton } from "./CircularPlusButton";
import { ProgressBar } from "./ProgressBar";
import { SortableTaskList } from "./SortableTaskList";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function DayCard({ iso, tasks, isToday, onToggle, onSelect, onMenu, onReorder }: {
  iso: string; tasks: Task[]; isToday: boolean;
  onToggle: (id: string) => void; onSelect: (id: string) => void; onMenu: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
}) {
  const navigate = useNavigate();
  const d = fromISO(iso);
  const dayIdx = d.getDay();
  const dayLabel = UA_DAYS_SHORT[dayIdx];
  const isSat = dayIdx === 6;
  const completed = tasks.filter(t=>t.completed).length;
  const total = tasks.length;
  const headerLabel = total === 0 ? "Завдання відсутні" : `${total} ${total === 1 ? "завдання" : "завдань"}`;
  const [expanded, setExpanded] = useState(true);
  const canToggle = total > 0;

  return (
    <div className="mx-3 mb-3 rounded-[20px] overflow-hidden flex ios-shadow" style={{ background: "var(--card)", border: "1px solid var(--border-soft)" }}>
      <div className="flex flex-col items-center justify-center py-4 px-2" style={{
        width: 78,
        background: isToday ? "var(--date-panel-active)" : "var(--date-panel)",
      }}>
        <span className="text-[14px]" style={{ color: isSat ? "#FF3B30" : isToday ? "var(--accent)" : "var(--text-muted)" }}>{dayLabel}</span>
        <span className="text-[34px] leading-none font-light mt-1" style={{ color: isToday ? "var(--accent)" : "var(--text-main)" }}>{d.getDate()}</span>
        <span className="text-[12px] mt-1" style={{ color: isToday ? "var(--accent)" : "var(--text-dim)" }}>{UA_MONTHS[d.getMonth()]}</span>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex items-center px-4 pt-4 pb-3 gap-3">
          <button
            type="button"
            onClick={() => canToggle && setExpanded(e => !e)}
            className="flex-1 text-left"
            style={{ cursor: canToggle ? "pointer" : "default" }}
          >
            <div className="text-[15px] mb-2" style={{ color: total===0 ? "var(--text-dim)" : "var(--text-main)" }}>{headerLabel}</div>
            <div className="flex items-center gap-3">
              <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>{completed}/{total}</span>
              <div className="flex-1"><ProgressBar value={completed} total={total} /></div>
              {canToggle && (
                <ChevronDown
                  size={18}
                  color="var(--text-muted)"
                  style={{ transition: "transform 0.2s", transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                />
              )}
            </div>
          </button>
          <CircularPlusButton accent={isToday} onClick={() => navigate({ to: "/task/$date", params: { date: iso } })} />
        </div>
        {tasks.length > 0 && expanded && (
          <div className="border-t" style={{ borderColor: "var(--border-soft)" }}>
            <SortableTaskList tasks={tasks} onOrderChange={onReorder} onToggle={onToggle} onSelect={onSelect} onMenu={onMenu} />
          </div>
        )}
      </div>
    </div>
  );
}
