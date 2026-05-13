import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "../components/AppShell";
import { DayCard } from "../components/DayCard";
import { BottomActionBar } from "../components/BottomActionBar";
import { ContextActionSheet } from "../components/ContextActionSheet";
import { useTasks } from "../components/Hooks";
import { getWeekDates, toISO } from "../lib/date";
import { uid } from "../lib/storage";
import { applyTaskOrder, sortTasksForPlanner } from "../lib/task-order";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Мої Завдання — Список справ" }, { name: "description", content: "Простий планер задач у стилі iOS." }] }),
  component: Home,
});

function Home() {
  const { tasks, save } = useTasks();
  const navigate = useNavigate();
  const todayISO = toISO(new Date());
  const [selectedDate] = useState("2026-05-10");
  const week = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const [selection, setSelection] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const select = (id: string) => setSelection(s => s.includes(id) ? s.filter(x=>x!==id) : [...s, id]);
  const reorder = (orderedIds: string[]) => save(applyTaskOrder(tasks, orderedIds));

  const action = (k: string) => {
    if (k === "delete") { save(tasks.filter(t => !selection.includes(t.id))); setSelection([]); }
    else if (k === "copy") {
      const dup = tasks.filter(t=>selection.includes(t.id)).map(t=>({...t, id:uid(), createdAt:new Date().toISOString()}));
      save([...tasks, ...dup]); setSelection([]);
    }
    else if (k === "edit" && selection.length === 1) { navigate({ to: "/task/$date", params: { date: tasks.find(t=>t.id===selection[0])?.date || todayISO }, search: { id: selection[0] } as any }); }
    else { setSelection([]); }
  };

  return (
    <AppShell>
      <div className="pt-3 pb-32">
        {week.map(iso => (
          <DayCard key={iso} iso={iso} isToday={iso === selectedDate}
            tasks={sortTasksForPlanner(tasks.filter(t => t.date === iso))}
            onToggle={toggle} onSelect={select} onMenu={(id)=>setMenuFor(id)} onReorder={reorder} />
        ))}
      </div>
      {selection.length > 0 && <BottomActionBar onAction={action} />}
      {menuFor && <ContextActionSheet onClose={()=>setMenuFor(null)} onAction={(k)=>{
        if (k === "subtask") { /* mock */ }
        if (k === "copy") { const t = tasks.find(x=>x.id===menuFor); if (t) save([...tasks, {...t, id:uid()}]); }
      }} />}
    </AppShell>
  );
}
