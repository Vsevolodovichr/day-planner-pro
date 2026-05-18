import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Task } from '../types';
import { fromISO, UA_DAYS_FULL, UA_DAYS_SHORT, UA_MONTHS } from '../lib/date';
import { SortableTaskList } from './SortableTaskList';

export function DayCard({
  iso,
  tasks,
  isToday,
  position: _position,
  onToggle,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  onAddSubtask,
  onEdit,
  onTransfer,
  onSend,
  onDelete,
  onCopy,
  onReorder,
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
  onAddSubtask?: (id: string) => void;
  onEdit?: (id: string) => void;
  onTransfer?: (id: string) => void;
  onSend?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCopy?: (id: string) => void;
  onReorder?: (orderedIds: string[]) => void;
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
        borderRadius: 10,
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
          background: 'var(--card)',
          display: 'flex',
          alignItems: 'stretch',
          gap: 0,
          padding: 0,
          cursor: 'pointer',
          color: 'inherit',
          textAlign: 'left',
          minHeight: 86,
        }}
      >
        {/* Date column */}
        <div
          style={{
            width: 70,
            flexShrink: 0,
            background: dateColBg,
            borderRight: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 4px 9px',
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
              fontSize: 32,
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
            padding: '0 14px',
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
                Виконано · {total}
              </span>
            ) : (
              `${total} завдань`
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
          <span
            onClick={(event) => {
              event.stopPropagation();
              navigate({ to: '/task/$date', params: { date: iso } });
            }}
            role="button"
            aria-label="Додати завдання"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              border: 'var(--accent-45) 1px solid',
              background: 'linear-gradient(135deg, var(--accent-18) 10%, var(--accent-06) 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--gold-text-strong)',
              cursor: 'pointer',
            }}
          >
            <Plus size={20} style={{ stroke: 'var(--text-main)' }} />
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
            <SortableTaskList
              tasks={tasks}
                variant="list"
              selectedIds={selectedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onMenu={onMenu}
              onToggleSubtask={onToggleSubtask}
              onEditSubtask={onEditSubtask}
              onDeleteSubtask={onDeleteSubtask}
              onAddSubtask={onAddSubtask}
              onEdit={onEdit}
              onTransfer={onTransfer}
              onSend={onSend}
              onDelete={onDelete}
              onCopy={onCopy}
              onReorder={onReorder}
            />
          )}
        </div>
      )}
    </section>
  );
}
