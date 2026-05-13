import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import {
  UA_DAYS_FULL,
  UA_MONTHS,
  UA_MONTHS_NOM,
  UA_WEEKDAY_HEADER,
  toISO,
} from '../lib/date';
import { useTasks } from '../components/Hooks';
import { TaskRow } from '../components/TaskRow';
import { taskOccursOnDate, tasksForDate, toggleTaskCompletion } from '../lib/task-utils';

export const Route = createFileRoute('/calendar')({ component: CalendarScreen });

const navBtn: React.CSSProperties = {
  width: 38,
  height: 38,
  borderRadius: '50%',
  background: 'var(--accent-08)',
  border: '1px solid var(--accent-25)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  color: 'var(--gold-text-strong)',
  padding: 0,
};

function CalendarScreen() {
  const navigate = useNavigate();
  const { tasks, save } = useTasks();
  const [view, setView] = useState(new Date());
  const [selected, setSelected] = useState(new Date());

  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const startCol = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const statsByDate = useMemo(() => {
    const map = new Map<string, { total: number; completed: number }>();
    tasks.forEach((t) => {
      for (let day = 1; day <= daysInMonth; day += 1) {
        const iso = toISO(new Date(year, month, day));
        if (!taskOccursOnDate(t, iso)) continue;
        const cur = map.get(iso) ?? { total: 0, completed: 0 };
        cur.total += 1;
        if (t.completed) cur.completed += 1;
        map.set(iso, cur);
      }
    });
    return map;
  }, [daysInMonth, month, tasks, year]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < startCol; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const selectedISO = toISO(selected);
  const todayISO = toISO(new Date());
  const selectedTasks = tasksForDate(tasks, selectedISO);
  const selectedCompleted = selectedTasks.filter((t) => t.completed).length;
  const totalTasksInMonth = Array.from(statsByDate.entries()).reduce((acc, [iso, s]) => {
    if (iso.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)) return acc + s.total;
    return acc;
  }, 0);

  const shiftMonth = (delta: number) => setView(new Date(year, month + delta, 1));

  const toggle = (id: string) =>
    save(tasks.map((t) => (t.id === id ? toggleTaskCompletion(t) : t)));

  return (
    <AppShell>
      {/* Header */}
      <div style={{ padding: '24px 18px 10px' }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'var(--txt-dim)',
          }}
        >
          Календар
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginTop: 4,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              className="gold-text"
              style={{
                fontSize: 30,
                fontWeight: 700,
                letterSpacing: -0.8,
                lineHeight: 1.05,
              }}
            >
              {UA_MONTHS_NOM[month]}
            </div>
            <div style={{ fontSize: 13, color: 'var(--txt-muted)', marginTop: 2 }}>
              {year} · {totalTasksInMonth} завдань
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => shiftMonth(-1)} style={navBtn} aria-label="Попередній місяць">
              <ChevronLeft size={20} />
            </button>
            <button onClick={() => shiftMonth(1)} style={navBtn} aria-label="Наступний місяць">
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Month grid */}
      <div style={{ padding: '0 12px' }}>
        <div className="glass" style={{ borderRadius: 22, padding: '12px 10px 14px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              marginBottom: 6,
            }}
          >
            {UA_WEEKDAY_HEADER.map((wd, i) => (
              <div
                key={wd}
                style={{
                  textAlign: 'center',
                  fontSize: 10.5,
                  fontWeight: 600,
                  letterSpacing: 1,
                  color: i >= 5 ? 'var(--gold-text)' : 'var(--txt-dim)',
                }}
              >
                {wd}
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} style={{ height: 42 }} />;
              const dt = new Date(year, month, d);
              const iso = toISO(dt);
              const dow = (dt.getDay() + 6) % 7;
              const isToday = iso === todayISO;
              const isSel = iso === selectedISO;
              const s = statsByDate.get(iso);
              const isComplete = s && s.completed === s.total && s.total > 0;
              return (
                <button
                  key={i}
                  onClick={() => setSelected(dt)}
                  onDoubleClick={() => navigate({ to: '/task/$date', params: { date: iso } })}
                  style={{
                    position: 'relative',
                    height: 42,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                  }}
                >
                  {isSel && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 3,
                        borderRadius: '50%',
                        background: 'var(--gold-grad)',
                      }}
                    />
                  )}
                  {isToday && !isSel && (
                    <span
                      style={{
                        position: 'absolute',
                        inset: 3,
                        borderRadius: '50%',
                        border: '1.5px solid var(--accent-65)',
                      }}
                    />
                  )}
                  <span
                    style={{
                      position: 'relative',
                      fontSize: 15,
                      fontWeight: isSel ? 700 : 500,
                      letterSpacing: -0.3,
                      color: isSel
                        ? '#1A1308'
                        : isToday
                          ? 'var(--gold-text-strong)'
                          : dow >= 5
                            ? 'var(--txt-muted)'
                            : 'var(--txt-main)',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {d}
                  </span>
                  {s && (
                    <span
                      style={{
                        position: 'relative',
                        marginTop: 2,
                        width: 4,
                        height: 4,
                        borderRadius: '50%',
                        background: isSel
                          ? '#1A1308'
                          : isComplete
                            ? 'var(--gold-text-strong)'
                            : 'rgba(244,245,247,0.55)',
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected day list */}
      <div style={{ padding: '16px 12px 0' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            padding: '0 6px 10px',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: -0.3,
                color: 'var(--txt-main)',
              }}
            >
              {selected.getDate()} {UA_MONTHS[selected.getMonth()]}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--txt-dim)',
                textTransform: 'capitalize',
                marginTop: 1,
              }}
            >
              {UA_DAYS_FULL[selected.getDay()]}
            </div>
          </div>
          <span
            style={{
              fontSize: 13,
              color: 'var(--gold-text)',
              fontVariantNumeric: 'tabular-nums',
              fontWeight: 600,
            }}
          >
            {selectedCompleted}/{selectedTasks.length}
          </span>
        </div>

        {selectedTasks.length === 0 ? (
          <div
            className="glass"
            style={{ borderRadius: 22, padding: '24px 16px', textAlign: 'center' }}
          >
            <div style={{ fontSize: 14, color: 'var(--txt-muted)' }}>Немає завдань</div>
            <button
              onClick={() => navigate({ to: '/task/$date', params: { date: selectedISO } })}
              style={{
                marginTop: 12,
                height: 40,
                borderRadius: 999,
                border: '1px solid var(--accent-45)',
                background: 'var(--accent-06)',
                color: 'var(--gold-text-strong)',
                fontWeight: 500,
                fontSize: 14,
                padding: '0 14px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Plus size={15} /> Створити
            </button>
          </div>
        ) : (
          <div className="glass" style={{ borderRadius: 22, overflow: 'hidden' }}>
            {selectedTasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                variant="list"
                onToggle={() => toggle(t.id)}
                onSelect={() =>
                  navigate({
                    to: '/task/$date',
                    params: { date: t.date || selectedISO },
                    search: { id: t.id },
                  })
                }
                onMenu={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
