import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Task } from '../types';
import { fromISO, UA_DAYS_FULL, UA_DAYS_SHORT, UA_MONTHS } from '../lib/date';
import { TaskRow } from './TaskRow';

function ProgressRing({
  value = 0,
  size = 28,
  stroke = 2.5,
}: {
  value?: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  const id = `gring-${size}`;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--gold-1)" />
          <stop offset="1" stopColor="var(--gold-3)" />
        </linearGradient>
      </defs>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={stroke}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={`url(#${id})`}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${C * value} ${C}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

export function DayCard({
  iso,
  tasks,
  isToday,
  position: _position,
  onToggle,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onSelect,
  onMenu,
  selectedIds = [],
}: {
  iso: string;
  tasks: Task[];
  isToday: boolean;
  position: 'first' | 'middle' | 'last';
  onToggle: (id: string) => void;
  onToggleSubtask: (taskId: string, subtaskId: string) => void;
  onEditSubtask: (taskId: string, subtaskId: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
  onSelect: (id: string) => void;
  onMenu: (id: string) => void;
  selectedIds?: string[];
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const d = fromISO(iso);
  const dow = (d.getDay() + 6) % 7;
  const isWeekend = dow >= 5;
  const done = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const pct = total > 0 ? done / total : 0;
  const allDone = total > 0 && done === total;

  const dateColBg = isToday ? 'var(--gold-shine)' : 'rgba(255,255,255,0.03)';
  const dateColTextMain = isToday ? '#1A1308' : 'var(--txt-main)';
  const dateColTextSub = isToday
    ? 'rgba(26,19,8,0.7)'
    : isWeekend
      ? 'var(--gold-text)'
      : 'var(--txt-dim)';

  return (
    <section
      className="glass"
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        ...(isToday
          ? {
              border: '1px solid var(--accent-45)',
            }
          : {}),
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          width: '100%',
          border: 'none',
          background: 'transparent',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          minHeight: 72,
        }}
      >
        {/* Date column */}
        <div
          style={{
            width: 66,
            flexShrink: 0,
            background: dateColBg,
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 4px 8px',
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: dateColTextSub,
              fontWeight: 800,
            }}
          >
            {UA_DAYS_SHORT[d.getDay()]}
          </span>
          <span
            style={{
              fontSize: 30,
              fontWeight: 300,
              lineHeight: 1,
              letterSpacing: -2,
              color: dateColTextMain,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {d.getDate()}
          </span>
          <span
            style={{
              fontSize: 8,
              letterSpacing: 1.4,
              textTransform: 'uppercase',
              color: dateColTextSub,
              fontWeight: 600,
              textAlign: 'center',
            }}
          >
            {UA_MONTHS[d.getMonth()]}
          </span>
        </div>

        {/* Name + counts */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 12px',
          }}
        >
          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: -0.2,
              ...(isToday
                ? {
                    background: 'var(--gold-grad)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    WebkitTextFillColor: 'transparent',
                  }
                : { color: 'var(--txt-main)' }),
            }}
          >
            {isToday ? 'Сьогодні' : UA_DAYS_FULL[d.getDay()]}
          </div>
          <div style={{ marginTop: 2, fontSize: 12.5, color: 'var(--txt-muted)' }}>
            {total === 0 ? (
              'Немає завдань'
            ) : allDone ? (
              <span style={{ color: 'var(--gold-text)', fontWeight: 500 }}>
                Виконано · {done}/{total}
              </span>
            ) : (
              `${done}/${total} виконано`
            )}
          </div>
        </div>

        {/* Progress + chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            paddingRight: 14,
          }}
        >
          {total > 0 && <ProgressRing value={pct} />}
          <span
            onClick={(event) => {
              event.stopPropagation();
              navigate({ to: '/task/$date', params: { date: iso } });
            }}
            role="button"
            aria-label="Додати завдання"
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: 'var(--accent-10)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold-text-strong)',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
          </span>
        </div>
      </button>

      {/* Expanded list */}
      {expanded && (
        <div
          style={{
            borderTop: '1px solid var(--hairline)',
            paddingBottom: 8,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {total === 0 ? (
            <div
              style={{
                padding: '14px 16px',
                fontSize: 13.5,
                color: 'var(--txt-muted)',
                textAlign: 'center',
              }}
            >
              На цей день нічого не заплановано
            </div>
          ) : (
            tasks.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                variant="list"
                selected={selectedIds.includes(t.id)}
                onToggle={() => onToggle(t.id)}
                onSelect={() => onSelect(t.id)}
                onMenu={() => onMenu(t.id)}
                onToggleSubtask={(subtaskId) => onToggleSubtask(t.id, subtaskId)}
                onEditSubtask={(subtaskId) => onEditSubtask(t.id, subtaskId)}
                onDeleteSubtask={(subtaskId) => onDeleteSubtask(t.id, subtaskId)}
              />
            ))
          )}
        </div>
      )}
    </section>
  );
}
