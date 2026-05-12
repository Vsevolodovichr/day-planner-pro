import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { DayCard } from '../components/DayCard';
import { BottomActionBar } from '../components/BottomActionBar';
import { ContextActionSheet } from '../components/ContextActionSheet';
import { useTasks } from '../components/Hooks';
import { getWeekDates, toISO } from '../lib/date';
import { uid } from '../lib/storage';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Мої Завдання — Список справ' },
      { name: 'description', content: 'Простий планер задач у стилі iOS.' },
    ],
  }),
  component: Home,
});

export function Home() {
  const { tasks, save } = useTasks();
  const navigate = useNavigate();
  const todayISO = toISO(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const week = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const [selection, setSelection] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const shiftWeek = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta * 7);
    setSelectedDate(toISO(next));
  };

  const toggle = (id: string) =>
    save(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  const select = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const action = (k: string) => {
    if (k === 'delete') {
      save(tasks.filter((t) => !selection.includes(t.id)));
      setSelection([]);
    } else if (k === 'copy') {
      const dup = tasks
        .filter((t) => selection.includes(t.id))
        .map((t) => ({
          ...t,
          id: uid(),
          subtasks: t.subtasks.map((s) => ({ ...s, id: uid() })),
          createdAt: new Date().toISOString(),
        }));
      save([...tasks, ...dup]);
      setSelection([]);
    } else if (k === 'edit' && selection.length === 1) {
      navigate({
        to: '/task/$date',
        params: { date: tasks.find((t) => t.id === selection[0])?.date || todayISO },
        search: { id: selection[0] },
      });
    } else if (k === 'transfer') {
      const date = window.prompt('Дата у форматі YYYY-MM-DD', selectedDate);
      if (date) save(tasks.map((t) => (selection.includes(t.id) ? { ...t, date } : t)));
      setSelection([]);
      if (date) setSelectedDate(date);
    } else {
      setSelection([]);
    }
  };

  return (
    <AppShell>
      <div
        className="relative flex min-h-[calc(100dvh-64px)] flex-col gap-0 px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-4 lg:min-h-[calc(100vh-64px)] lg:px-0"
        onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStart === null) return;
          const delta = event.changedTouches[0]?.clientX - touchStart;
          if (delta > 60) shiftWeek(-1);
          if (delta < -60) shiftWeek(1);
          setTouchStart(null);
        }}
      >
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          className="hidden lg:flex absolute -left-14 top-1/2 h-12 w-12 items-center justify-center rounded-full"
          style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.22)' }}
        >
          <ChevronLeft size={28} />
        </button>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          className="hidden lg:flex absolute -right-14 top-1/2 h-12 w-12 items-center justify-center rounded-full"
          style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.22)' }}
        >
          <ChevronRight size={28} />
        </button>
        {week.map((iso, index) => (
          <DayCard
            key={iso}
            iso={iso}
            isToday={iso === selectedDate}
            tasks={tasks.filter((t) => t.date === iso)}
            position={index === 0 ? 'first' : index === week.length - 1 ? 'last' : 'middle'}
            onToggle={toggle}
            onSelect={select}
            onMenu={(id) => setMenuFor(id)}
            selectedIds={selection}
          />
        ))}
        <div className="hidden lg:flex mt-3 items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.22)' }}
            aria-label="Попередній тиждень"
          >
            <ChevronLeft size={28} />
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="flex h-12 w-12 items-center justify-center rounded-full"
            style={{ color: 'var(--accent)', background: 'rgba(0,0,0,0.22)' }}
            aria-label="Наступний тиждень"
          >
            <ChevronRight size={28} />
          </button>
        </div>
      </div>
      {selection.length > 0 && <BottomActionBar onAction={action} />}
      {menuFor && (
        <ContextActionSheet
          onClose={() => setMenuFor(null)}
          onAction={(k) => {
            if (k === 'subtask') {
              const title = window.prompt('Назва підзадачі');
              if (title)
                save(
                  tasks.map((t) =>
                    t.id === menuFor && t.subtasks.length < 4
                      ? {
                          ...t,
                          subtasks: [
                            ...t.subtasks,
                            {
                              id: uid(),
                              title,
                              completed: false,
                              subtasks: [],
                              createdAt: new Date().toISOString(),
                            },
                          ],
                        }
                      : t,
                  ),
                );
            }
            if (k === 'copy') {
              const t = tasks.find((x) => x.id === menuFor);
              if (t)
                save([
                  ...tasks,
                  { ...t, id: uid(), subtasks: t.subtasks.map((s) => ({ ...s, id: uid() })) },
                ]);
            }
          }}
        />
      )}
    </AppShell>
  );
}
