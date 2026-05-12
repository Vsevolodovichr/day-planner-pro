import { Task } from '../types';
import { fromISO, UA_DAYS_SHORT, UA_MONTHS } from '../lib/date';
import { CircularPlusButton } from './CircularPlusButton';
import { ProgressBar } from './ProgressBar';
import { TaskRow } from './TaskRow';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

export function DayCard({
  iso,
  tasks,
  isToday,
  position,
  onToggle,
  onSelect,
  onMenu,
  selectedIds = [],
}: {
  iso: string;
  tasks: Task[];
  isToday: boolean;
  position: 'first' | 'middle' | 'last';
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onMenu: (id: string) => void;
  selectedIds?: string[];
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const d = fromISO(iso);
  const dayIdx = d.getDay();
  const dayLabel = UA_DAYS_SHORT[dayIdx];
  const isSat = dayIdx === 6;
  const isSun = dayIdx === 0;
  const completed = tasks.filter((t) => t.completed).length;
  const total = tasks.length;
  const undone = total - completed;
  const headerLabel =
    total === 0
      ? 'Завдання відсутні'
      : `${undone} ${undone === 1 ? 'невирішене завдання' : 'невирішених завдання'}`;
  const dateColor = isSat || isSun ? '#FF1515' : isToday ? '#0B1515' : 'var(--text-main)';
  const panelBg = isToday ? 'var(--date-panel-active)' : 'var(--date-panel)';
  const collapsedRadius = 'rounded-[8px]';

  return (
    <section className={`${expanded ? 'flex-none' : ''}${position === 'first' ? '' : ' mt-1'}`}>
      <div
        className={`${expanded ? 'rounded-[8px]' : collapsedRadius} min-h-[96px] overflow-hidden flex cursor-pointer`}
        onClick={() => total > 0 && setExpanded((value) => !value)}
        style={{
          background: total > 0 ? '#181919' : '#26262c',
          border: '1px solid var(--border-soft)',
        }}
      >
        <div
          className="flex flex-col justify-between py-2 px-2.5"
          style={{ width: 70, background: panelBg, color: dateColor }}
        >
          <span className="text-[14px] leading-none">{dayLabel}</span>
          <span className="text-[30px] leading-none font-light text-center">{d.getDate()}</span>
          <span className="text-[14px] leading-none">{UA_MONTHS[d.getMonth()]}</span>
        </div>
        <div className="flex-1 flex items-center gap-3 px-4 py-3">
          <div className="flex-1 min-w-0">
            <div
              className="text-[16px] leading-tight mb-2 truncate"
              style={{ color: total === 0 ? 'var(--text-main)' : 'var(--accent)' }}
            >
              {headerLabel}
            </div>
            <div className="flex items-center gap-4">
              <span
                className="text-[13px]"
                style={{ color: total === 0 ? 'var(--text-main)' : 'var(--accent)' }}
              >
                {completed}/{total}
              </span>
              <div className="flex-1">
                <ProgressBar value={completed} total={total} />
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <CircularPlusButton
              accent={isToday || total > 0}
              size={42}
              onClick={(event) => {
                event.stopPropagation();
                navigate({ to: '/task/$date', params: { date: iso } });
              }}
            />
          </div>
        </div>
      </div>
      {expanded && tasks.length > 0 && (
        <div
          className="overflow-hidden rounded-b-[8px]"
          onClick={(event) => event.stopPropagation()}
          style={{ background: 'var(--card-soft)' }}
        >
          {tasks.map((t) => (
            <TaskRow
              key={t.id}
              task={t}
              variant="list"
              selected={selectedIds.includes(t.id)}
              onToggle={() => onToggle(t.id)}
              onSelect={() => onSelect(t.id)}
              onMenu={() => onMenu(t.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
