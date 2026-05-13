import { ChevronDown, ChevronRight, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { Task } from '../types';
import { taskText } from '../lib/task-utils';

function Checkbox({ checked, size = 22 }: { checked: boolean; size?: number }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        border: checked ? 'none' : '1.5px solid rgba(255,255,255,0.35)',
        background: checked ? 'var(--gold-grad)' : 'transparent',
      }}
    >
      {checked && (
        <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 12 12" fill="none">
          <path
            d="M2 6.5L5 9.5L10 3.5"
            stroke="#1A1308"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </span>
  );
}

export function TaskRow({
  task,
  onToggle,
  onSelect,
  onMenu,
  onToggleSubtask,
  onEditSubtask,
  onDeleteSubtask,
  variant = 'default',
  selected = false,
}: {
  task: Task;
  onToggle: () => void;
  onSelect: () => void;
  onMenu: () => void;
  onToggleSubtask?: (id: string) => void;
  onEditSubtask?: (id: string) => void;
  onDeleteSubtask?: (id: string) => void;
  variant?: 'default' | 'list';
  selected?: boolean;
}) {
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const [subtaskMenuFor, setSubtaskMenuFor] = useState<string | null>(null);
  const checked = task.completed;
  const text = taskText(task);

  return (
    <div
      style={{
        borderBottom: '1px solid var(--hairline)',
        background: selected
          ? 'linear-gradient(180deg, var(--accent-18) 0%, var(--accent-04) 100%)'
          : 'transparent',
        borderRadius: selected ? 12 : 0,
        margin: selected ? '4px 6px' : 0,
        // suppress the variant warning while still allowing the prop
        opacity: variant === 'default' || variant === 'list' ? 1 : 1,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          minHeight: 56,
          padding: '10px 14px',
        }}
      >
        <button
          onClick={onToggle}
          aria-label="Перемкнути статус"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
          }}
        >
          <Checkbox checked={checked} />
        </button>

        <button
          onClick={onSelect}
          style={{
            flex: 1,
            minWidth: 0,
            background: 'transparent',
            border: 'none',
            padding: 0,
            textAlign: 'left',
            cursor: 'pointer',
          }}
        >
          <div
            style={{
              fontSize: 15.5,
              letterSpacing: -0.1,
              color: checked ? 'var(--txt-dim)' : 'var(--txt-main)',
              textDecorationLine: checked ? 'line-through' : 'none',
              textDecorationColor: 'rgba(244,245,247,0.3)',
              whiteSpace: 'pre-wrap',
              overflowWrap: 'anywhere',
              lineHeight: 1.35,
            }}
          >
            {text}
          </div>
          {task.subtasks.length > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: 'var(--txt-muted)',
              }}
            >
              {task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length} підзадач
            </div>
          )}
        </button>

        {task.time && (
          <span
            style={{
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: 0.3,
              color: checked ? 'var(--txt-dim)' : 'var(--gold-text)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {task.time}
          </span>
        )}

        {task.subtasks.length > 0 && (
          <button
            onClick={() => setSubtasksOpen((v) => !v)}
            aria-label={subtasksOpen ? 'Сховати підзадачі' : 'Показати підзадачі'}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 4,
              cursor: 'pointer',
              color: 'var(--gold-text-strong)',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            {subtasksOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </button>
        )}

        <button
          onClick={onMenu}
          aria-label="Меню"
          style={{
            border: 'none',
            background: 'transparent',
            padding: 4,
            cursor: 'pointer',
            color: 'var(--txt-dim)',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          <MoreVertical size={20} strokeWidth={1.8} />
        </button>
      </div>

      {subtasksOpen && task.subtasks.length > 0 && (
        <div
          style={{
            borderTop: '1px solid var(--hairline)',
            marginTop: 2,
            paddingLeft: 30,
            paddingRight: 18,
            paddingBottom: 10,
            paddingTop: 8,
          }}
        >
          {task.subtasks.map((s) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '6px 0',
              }}
            >
              <button
                onClick={() => onToggleSubtask?.(s.id)}
                aria-label="Перемкнути підзадачу"
                style={{
                  border: 'none',
                  background: 'transparent',
                  padding: 0,
                  cursor: onToggleSubtask ? 'pointer' : 'default',
                }}
              >
                <Checkbox checked={s.completed} size={16} />
              </button>
              <span
                style={{
                  fontSize: 14,
                  flex: 1,
                  color: s.completed ? 'var(--txt-dim)' : 'var(--txt-main)',
                  textDecorationLine: s.completed ? 'line-through' : 'none',
                  textDecorationColor: 'rgba(244,245,247,0.3)',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  lineHeight: 1.35,
                }}
              >
                {taskText(s)}
              </span>
              {(onEditSubtask || onDeleteSubtask) && (
                <button
                  type="button"
                  onClick={() => setSubtaskMenuFor(s.id)}
                  aria-label="Меню підзадачі"
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--txt-dim)',
                    padding: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <MoreVertical size={18} strokeWidth={1.8} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {subtaskMenuFor && (
        <div
          onClick={() => setSubtaskMenuFor(null)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 75,
            background: 'rgba(0,0,0,0.68)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            padding: '0 14px calc(96px + env(safe-area-inset-bottom))',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="glass"
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 24,
              padding: 10,
              background: 'rgba(18,18,20,0.96)',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {onEditSubtask && (
              <button
                type="button"
                onClick={() => {
                  onEditSubtask(subtaskMenuFor);
                  setSubtaskMenuFor(null);
                }}
                style={{
                  height: 48,
                  borderRadius: 16,
                  border: '1px solid var(--glass-stroke)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--txt-main)',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Редагувати
              </button>
            )}
            {onDeleteSubtask && (
              <button
                type="button"
                onClick={() => {
                  onDeleteSubtask(subtaskMenuFor);
                  setSubtaskMenuFor(null);
                }}
                style={{
                  height: 48,
                  borderRadius: 16,
                  border: '1px solid rgba(255,90,90,0.28)',
                  background: 'rgba(255,90,90,0.12)',
                  color: '#FF8B8B',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Видалити
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
