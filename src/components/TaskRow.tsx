import { Check, ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Task } from '../types';

export function TaskRow({
  task,
  onToggle,
  onSelect,
  onMenu,
  variant = 'default',
  selected = false,
}: {
  task: Task;
  onToggle: () => void;
  onSelect: () => void;
  onMenu: () => void;
  variant?: 'default' | 'list';
  selected?: boolean;
}) {
  const checked = task.completed;
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const taskColor = task.color ?? 'var(--accent)';
  return (
    <div className="border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
      <div
        className={`flex items-center gap-4 min-h-[76px] px-5 ${selected ? 'mx-2 my-1 rounded-[10px]' : ''}`}
        style={{
          background: selected
            ? '#141515'
            : variant === 'list'
              ? 'var(--card-soft)'
              : 'transparent',
          boxShadow: selected
            ? `0 0 18px color-mix(in srgb, ${taskColor} 42%, transparent)`
            : undefined,
        }}
      >
        <button
          onClick={onToggle}
          className="w-[24px] h-[24px] rounded-[4px] flex items-center justify-center shrink-0"
          style={{
            background: checked ? taskColor : 'transparent',
            border: checked ? 'none' : `2px solid ${taskColor}`,
          }}
        >
          {checked && <Check size={17} strokeWidth={3.4} color="#0c1213" />}
        </button>
        <button
          onClick={onSelect}
          className="flex-1 min-w-0 text-left text-[22px] leading-tight"
          style={{
            color: checked ? 'var(--text-muted)' : 'var(--text-main)',
            textDecoration: 'none',
          }}
        >
          {task.title}
          {task.subtasks.length > 0 && (
            <span className="ml-2 text-[13px]" style={{ color: 'var(--text-muted)' }}>
              {task.subtasks.filter((subtask) => subtask.completed).length}/{task.subtasks.length}
            </span>
          )}
        </button>
        {task.subtasks.length > 0 && (
          <button
            onClick={() => setSubtasksOpen((value) => !value)}
            className="w-9 h-9 flex items-center justify-center"
            aria-label={subtasksOpen ? 'Сховати підзадачі' : 'Показати підзадачі'}
          >
            {subtasksOpen ? (
              <ChevronDown size={20} strokeWidth={1.8} color="var(--text-dim)" />
            ) : (
              <ChevronRight size={20} strokeWidth={1.8} color="var(--text-dim)" />
            )}
          </button>
        )}
        <button onClick={onMenu} className="w-9 h-9 flex items-center justify-center">
          <MoreVertical size={22} strokeWidth={1.8} color="var(--text-dim)" />
        </button>
      </div>
      {subtasksOpen && task.subtasks.length > 0 && (
        <div className="px-5 pb-4 pl-[66px] space-y-2">
          {task.subtasks.map((subtask) => (
            <div key={subtask.id} className="flex items-center gap-3 text-[15px]">
              <span
                className="w-[16px] h-[16px] rounded-[3px] flex items-center justify-center shrink-0"
                style={{
                  background: subtask.completed ? 'var(--accent)' : 'transparent',
                  border: subtask.completed ? 'none' : '1.5px solid var(--accent)',
                }}
              >
                {subtask.completed && <Check size={11} strokeWidth={3} color="#0c1213" />}
              </span>
              <span style={{ color: subtask.completed ? 'var(--text-muted)' : 'var(--text-main)' }}>
                {subtask.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
