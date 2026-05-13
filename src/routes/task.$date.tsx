import { createFileRoute, useNavigate, useParams } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft, Check, ChevronDown, MessageSquare } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { IOSSwitch } from "../components/IOSSwitch";
import { SortableTaskList } from "../components/SortableTaskList";
import { useTasks } from "../components/Hooks";
import { uid } from "../lib/storage";
import { formatLong } from "../lib/date";
import { applyTaskOrder, nextPlannerOrder, sortTasksForPlanner } from "../lib/task-order";

export const Route = createFileRoute("/task/$date")({ component: TaskEditor });

function TaskEditor() {
  const { date } = useParams({ from: "/task/$date" });
  const navigate = useNavigate();
  const { tasks, save } = useTasks();
  const [title, setTitle] = useState("");
  const [hasTime, setHasTime] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [autoMove, setAutoMove] = useState(false);
  const dayTasks = useMemo(() => sortTasksForPlanner(tasks.filter((task) => task.date === date)), [date, tasks]);

  const submit = () => {
    if (!title.trim()) return navigate({ to: "/" });
    save([...tasks, { id: uid(), title: title.trim(), date, completed: false, subtasks: [], createdAt: new Date().toISOString(), plannerOrder: nextPlannerOrder(tasks, date) }]);
    navigate({ to: "/" });
  };
  const toggle = (id: string) => save(tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task));
  const reorder = (orderedIds: string[]) => save(applyTaskOrder(tasks, orderedIds));

  return (
    <AppShell showToolbar={false}>
      <div className="flex items-center justify-between px-4 h-14 border-b" style={{ borderColor: "var(--border-soft)" }}>
        <button onClick={() => navigate({ to: "/" })} className="w-10 h-10 flex items-center justify-center"><ChevronLeft size={28} color="var(--accent)" /></button>
        <button className="flex items-center gap-1.5"><span className="text-[17px]">{formatLong(date)}</span><ChevronDown size={16} color="var(--text-muted)" /></button>
        <button onClick={submit} className="w-10 h-10 flex items-center justify-center"><Check size={26} color="var(--accent)" strokeWidth={2} /></button>
      </div>
      <div className="px-4 pt-5 space-y-4">
        <div className="rounded-2xl flex items-center gap-3 px-4 h-16" style={{ background: "var(--card-soft)" }}>
          <div className="w-[22px] h-[22px] rounded-full border" style={{ borderColor: "var(--text-dim)" }} />
          <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Завдання"
            className="flex-1 bg-transparent text-[18px] border-b" style={{ borderColor: "var(--border-soft)", color: "var(--text-main)" }} />
          <MessageSquare size={22} color="var(--accent)" />
        </div>
        <Row label="Вказати час" right={<IOSSwitch checked={hasTime} onChange={setHasTime} />} />
        <Row label="Повтор завдання" right={<IOSSwitch checked={repeat} onChange={setRepeat} />} />
        <Row label="Автоперенесення завдань" right={
          <IOSSwitch checked={autoMove} onChange={setAutoMove} />
        } />
        {dayTasks.length > 0 ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--card-soft)" }}>
            <SortableTaskList tasks={dayTasks} onOrderChange={reorder} onToggle={toggle} onSelect={() => undefined} />
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return <div className="flex items-center justify-between rounded-2xl px-4 h-16" style={{ background: "var(--card-soft)" }}>
    <span className="text-[17px]">{label}</span>{right}
  </div>;
}
