import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { UA_DAYS_FULL, UA_MONTHS, UA_MONTHS_NOM, UA_WEEKDAY_HEADER, toISO } from '../lib/date';
import { useTasks } from '../components/Hooks';
import { TaskRow } from '../components/TaskRow';

export const Route = createFileRoute('/calendar')({ component: CalendarScreen });

function CalendarScreen() {
  const navigate = useNavigate();
  const { tasks, save } = useTasks();
  const [view, setView] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const statsByDate = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    tasks.forEach((task) => {
      if (!task.date) return;
      const current = map.get(task.date) ?? { total: 0, completed: 0 };
      current.total += 1;
      if (task.completed) current.completed += 1;
      map.set(task.date, current);
    });
    return map;
  }, [tasks]);
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startCol = (first.getDay() + 6) % 7; // monday=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const selectedISO = toISO(selected);
  const selectedTasks = tasks.filter((task) => task.date === selectedISO);
  const selectedCompleted = selectedTasks.filter((task) => task.completed).length;
  const cells: (number | null)[] = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <AppShell>
      <div className="px-4.5 pt-4 pb-28 space-y-5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[22px]">
            {UA_DAYS_FULL[selected.getDay()]}, {selected.getDate()}
          </span>
          <button className="flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
            <span className="text-[21px]">Дата</span>
            <ChevronDown size={18} />
          </button>
        </div>
        <div
          className="flex items-center justify-between rounded-[18px] px-4 h-13.5"
          style={{ background: 'var(--card-soft)' }}
        >
          <button
            onClick={() => setView(new Date(year, month - 1, 1))}
            className="w-12 h-12 flex items-center justify-center"
          >
            <ChevronLeft size={28} color="var(--accent)" />
          </button>
          <span className="text-[24px]" style={{ color: 'var(--accent)' }}>
            {UA_MONTHS_NOM[month]}, {year}
          </span>
          <button
            onClick={() => setView(new Date(year, month + 1, 1))}
            className="w-12 h-12 flex items-center justify-center"
          >
            <ChevronRight size={28} color="var(--accent)" />
          </button>
        </div>
        <div className="rounded-[20px] overflow-hidden" style={{ background: 'var(--card-soft)' }}>
          <div
            className="grid grid-cols-7 h-13.5 items-center"
            style={{ background: 'var(--top-bar)' }}
          >
            {UA_WEEKDAY_HEADER.map((d, i) => (
              <div
                key={d}
                className="text-center text-[15px]"
                style={{
                  color:
                    i === 6
                      ? 'var(--accent)'
                      : i === 5
                        ? 'var(--text-dim)'
                        : i === 0
                          ? 'var(--accent)'
                          : 'var(--text-main)',
                }}
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-y-4 px-1 py-8">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const isSel = selected.getDate() === d && selected.getMonth() === month;
              const dow = new Date(year, month, d).getDay();
              const isSun = dow === 0;
              const isSat = dow === 6;
              const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const stats = statsByDate.get(iso);
              return (
                <button
                  key={i}
                  onClick={() => setSelected(new Date(year, month, d))}
                  onDoubleClick={() => navigate({ to: '/task/$date', params: { date: iso } })}
                  className="h-13.5 flex flex-col items-center justify-center"
                >
                  <span
                    className={`relative flex items-center justify-center text-[20px] ${isSel ? 'rounded-full' : ''}`}
                    style={{
                      width: 58,
                      height: 58,
                      border: isSel ? '1.5px solid var(--accent)' : 'none',
                      color: isSel
                        ? 'var(--accent)'
                        : isSun
                          ? 'var(--accent)'
                          : isSat
                            ? 'var(--text-dim)'
                            : 'var(--text-main)',
                    }}
                  >
                    {d}
                    {stats && (
                      <span
                        className="absolute top-1 right-2 text-[13px]"
                        style={{ color: stats.completed === stats.total ? '#FFE800' : '#D61313' }}
                      >
                        {stats.total}
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {selectedTasks.length > 0 && (
          <div className="-mx-4.5">
            <div
              className="flex items-center justify-between px-4.5 py-4 text-[19px]"
              style={{ color: 'var(--accent)' }}
            >
              <span>
                {selectedISO.slice(8, 10)} {UA_MONTHS[selected.getMonth()].toLowerCase()} /{' '}
                {UA_WEEKDAY_HEADER[(selected.getDay() + 6) % 7].toLowerCase()}
              </span>
              <span>
                {selectedCompleted} / {selectedTasks.length}
              </span>
            </div>
            <div style={{ background: 'var(--card-soft)' }}>
              {selectedTasks.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  variant="list"
                  onToggle={() =>
                    save(
                      tasks.map((item) =>
                        item.id === task.id ? { ...item, completed: !item.completed } : item,
                      ),
                    )
                  }
                  onSelect={() =>
                    navigate({
                      to: '/task/$date',
                      params: { date: selectedISO },
                      search: { id: task.id },
                    })
                  }
                  onMenu={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
