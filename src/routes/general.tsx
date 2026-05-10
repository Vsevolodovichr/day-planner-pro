import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { CircularPlusButton } from "../components/CircularPlusButton";

export const Route = createFileRoute("/general")({ component: General });

function General() {
  const [tab, setTab] = useState<"tasks"|"folders">("tasks");
  return (
    <AppShell>
      <div className="px-3 pt-3">
        <div className="flex items-center gap-3">
          <div className="flex-1 flex rounded-2xl p-1.5 h-[60px]" style={{ background: "var(--card-soft)" }}>
            {(["tasks","folders"] as const).map(k => (
              <button key={k} onClick={()=>setTab(k)} className="flex-1 rounded-xl text-[15px] transition-colors"
                style={{ background: tab===k ? "rgba(66,255,244,0.12)" : "transparent", color: tab===k ? "var(--accent)" : "var(--text-muted)" }}>
                {k === "tasks" ? "Загальні завдання" : "Папки"}
              </button>
            ))}
          </div>
          <CircularPlusButton accent size={52} />
        </div>
        <div className="flex flex-col items-center justify-center text-center mt-44 px-10">
          <p className="text-[17px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {tab === "tasks" ? "Створюйте завдання\nбез прив'язки до дати та часу" : "Створіть папку,\nщоб організувати завдання"}
          </p>
        </div>
      </div>
    </AppShell>
  );
}
