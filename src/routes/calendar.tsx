import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { UA_DAYS_FULL, UA_MONTHS_NOM, UA_WEEKDAY_HEADER } from "../lib/date";

export const Route = createFileRoute("/calendar")({ component: CalendarScreen });

function CalendarScreen() {
  const [view, setView] = useState(new Date(2026, 4, 1));
  const [selected, setSelected] = useState(new Date(2026, 4, 10));
  const year = view.getFullYear(); const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startCol = (first.getDay() + 6) % 7; // monday=0
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const cells: (number|null)[] = [];
  for (let i=0;i<startCol;i++) cells.push(null);
  for (let d=1; d<=daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <AppShell>
      <div className="px-3 pt-3 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[20px]">{UA_DAYS_FULL[selected.getDay()]}, {selected.getDate()}</span>
          <button className="flex items-center gap-1.5" style={{ color: "var(--accent)" }}>
            <span className="text-[16px]">Дата</span><ChevronDown size={16} />
          </button>
        </div>
        <div className="flex items-center justify-between rounded-2xl px-2 h-14" style={{ background: "var(--card-soft)" }}>
          <button onClick={()=>setView(new Date(year, month-1, 1))} className="w-12 h-12 flex items-center justify-center"><ChevronLeft size={22} color="var(--accent)" /></button>
          <span className="text-[17px]" style={{ color: "var(--accent)" }}>{UA_MONTHS_NOM[month]}, {year}</span>
          <button onClick={()=>setView(new Date(year, month+1, 1))} className="w-12 h-12 flex items-center justify-center"><ChevronRight size={22} color="var(--accent)" /></button>
        </div>
        <div className="rounded-2xl px-2 py-3" style={{ background: "var(--card-soft)" }}>
          <div className="grid grid-cols-7 mb-2">
            {UA_WEEKDAY_HEADER.map((d,i) => (
              <div key={d} className="text-center text-[12px]" style={{ color: i===6 ? "var(--accent)" : i===5 ? "var(--text-dim)" : "var(--text-muted)" }}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-2">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const isSel = selected.getDate()===d && selected.getMonth()===month;
              const dow = new Date(year, month, d).getDay();
              const isSun = dow === 0; const isSat = dow === 6;
              return (
                <button key={i} onClick={()=>setSelected(new Date(year, month, d))}
                  className="h-12 flex items-center justify-center">
                  <span className={`flex items-center justify-center text-[17px] ${isSel ? "rounded-full" : ""}`}
                    style={{
                      width: 40, height: 40,
                      border: isSel ? "1.5px solid var(--accent)" : "none",
                      color: isSel ? "var(--accent)" : isSun ? "var(--accent)" : isSat ? "var(--text-dim)" : "var(--text-main)"
                    }}>
                    {d}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
