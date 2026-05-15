import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ChevronLeft, Check, ChevronDown, Clock, Repeat2, Sparkles, Palette } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { IOSSwitch } from '../components/IOSSwitch';
import { SortableTaskList } from '../components/SortableTaskList';
import { useTasks } from '../components/Hooks';
import { uid } from '../lib/storage';
import { formatLong } from '../lib/date';
import {
  newSubtask,
  reorderTasksForDate,
  taskText,
  tasksForDate,
  toggleTaskCompletion,
} from '../lib/task-utils';

const repeatOptions = [
  { value: 'daily', label: 'Кожен день' },
  { value: 'weekdays', label: 'Кожен день Пн-Пт' },
  { value: 'weekly', label: 'Щотижня' },
  { value: 'monthly', label: 'Кожен місяць' },
  { value: 'yearly', label: 'Щороку' },
  { value: 'flexible', label: 'Гнучкий графік' },
] as const;

type RepeatValue = 'none' | (typeof repeatOptions)[number]['value'];

const repeatLabels: Record<RepeatValue, string> = {
  none: 'Не повторювати',
  daily: 'Кожен день',
  weekdays: 'Кожен день Пн-Пт',
  weekly: 'Щотижня',
  monthly: 'Кожен місяць',
  yearly: 'Щороку',
  flexible: 'Гнучкий графік',
};

const colorPresets = ['#F8DC8A', '#F2B5A6', '#8DC4DD', '#B8DBA0', '#C7B8E8', '#5A5A60'];

export const Route = createFileRoute('/task/$date')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === 'string' ? search.id : undefined,
  }),
  component: TaskEditor,
});

function TaskEditor() {
  const { date } = useParams({ from: '/task/$date' });
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const { tasks, save } = useTasks();
  const existing = tasks.find((task) => task.id === id);
  const [title, setTitle] = useState(existing ? taskText(existing) : '');
  const [time, setTime] = useState(existing?.time ?? '');
  const [color, setColor] = useState(existing?.color ?? '#F8DC8A');
  const [hasTime, setHasTime] = useState(Boolean(existing?.time));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeat, setRepeat] = useState<RepeatValue>(existing?.repeat ?? 'none');
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [autoMove, setAutoMove] = useState(Boolean(existing?.autoMove));
  const dayTasks = tasksForDate(tasks, date);

  useEffect(() => {
    if (!existing) return;
    setTitle(taskText(existing));
    setTime(existing.time ?? '');
    setHasTime(Boolean(existing.time));
    setRepeat(existing.repeat ?? 'none');
    setAutoMove(Boolean(existing.autoMove));
    setColor(existing.color ?? '#F8DC8A');
  }, [existing]);

  const toggleTime = (checked: boolean) => {
    setHasTime(checked);
    if (checked) {
      setTime((current) => current || '09:00');
      setShowTimePicker(true);
    } else {
      setTime('');
      setShowTimePicker(false);
    }
  };

  const toggleRepeat = (checked: boolean) => {
    if (checked) {
      setShowRepeatPicker(true);
    } else {
      setRepeat('none');
      setShowRepeatPicker(false);
    }
  };

  const toggleDayTask = (taskId: string) => {
    save(tasks.map((task) => (task.id === taskId ? toggleTaskCompletion(task) : task)));
  };

  const reorderDayTasks = (orderedIds: string[]) => {
    save(reorderTasksForDate(tasks, date, orderedIds));
  };

  const copyTaskText = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const text = task ? taskText(task) : '';
    if (!text) return;
    if (navigator.clipboard) {
      void navigator.clipboard
        .writeText(text)
        .then(() => toast.success('Скопійовано'))
        .catch(() => toast.error('Не вдалося скопіювати'));
    } else {
      toast.error('Буфер обміну недоступний');
    }
  };

  const sendTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const text = task ? taskText(task) : '';
    if (text && navigator.share) void navigator.share({ text }).catch(() => undefined);
    if (text && !navigator.share) copyTaskText(taskId);
  };

  const addSubtask = (taskId: string) => {
    const title = window.prompt('Підзадача');
    if (!title?.trim()) return;
    save(
      tasks.map((task) =>
        task.id === taskId ? { ...task, subtasks: [...task.subtasks, newSubtask(title.trim())] } : task,
      ),
    );
  };

  const editSubtask = (taskId: string, subtaskId: string) => {
    const subtask = tasks
      .find((task) => task.id === taskId)
      ?.subtasks.find((item) => item.id === subtaskId);
    const title = window.prompt('Підзадача', subtask ? taskText(subtask) : '');
    if (!title?.trim()) return;
    save(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((item) =>
                item.id === subtaskId ? { ...item, title: title.trim() } : item,
              ),
            }
          : task,
      ),
    );
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    save(
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.filter((item) => item.id !== subtaskId) }
          : task,
      ),
    );
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    save(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((item) =>
                item.id === subtaskId ? toggleTaskCompletion(item) : item,
              ),
            }
          : task,
      ),
    );
  };

  const transferTask = (taskId: string) => {
    const nextDate = window.prompt('Дата у форматі YYYY-MM-DD', date);
    if (!nextDate) return;
    save(tasks.map((task) => (task.id === taskId ? { ...task, date: nextDate } : task)));
  };

  const deleteTask = (taskId: string) => {
    if (!window.confirm('Видалити завдання?')) return;
    save(tasks.filter((task) => task.id !== taskId));
    if (id === taskId) navigate({ to: '/task/$date', params: { date } });
  };

  const submit = () => {
    if (!title.trim()) return navigate({ to: '/' });
    const [firstLine = '', ...rest] = title.trim().split(/\r?\n/);
    const next = {
      id: existing?.id ?? uid(),
      title: firstLine.trim() || title.trim(),
      note: rest.join('\n').trim() || undefined,
      date,
      time: hasTime && time ? time : undefined,
      completed: existing?.completed ?? false,
      completedAt: existing?.completedAt,
      subtasks: existing?.subtasks ?? [],
      repeat,
      autoMove,
      color,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
      folderId: existing?.folderId,
    };
    save(
      existing ? tasks.map((task) => (task.id === existing.id ? next : task)) : [...tasks, next],
    );
    navigate({ to: '/' });
  };

  const topBtn: React.CSSProperties = {
    height: 38,
    borderRadius: 999,
    background: 'var(--accent-08)',
    border: '1px solid var(--accent-22)',
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    color: 'var(--gold-text-strong)',
  };

  return (
    <AppShell showToolbar={false}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 70%, transparent 100%)',
        }}
      >
        <button onClick={() => navigate({ to: '/' })} style={topBtn} aria-label="Назад">
          <ChevronLeft size={20} />
          <span className="gold-text" style={{ fontSize: 14, fontWeight: 500 }}>
            Назад
          </span>
        </button>
        <button
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'transparent',
            border: 'none',
            color: 'var(--txt-main)',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          <span>{formatLong(date)}</span>
          <ChevronDown size={15} color="var(--txt-muted)" />
        </button>
        <button
          onClick={submit}
          style={{
            ...topBtn,
            background: 'var(--gold-shine)',
            border: '1px solid var(--accent-light-50)',
            color: '#1A1308',
          }}
          aria-label="Готово"
        >
          <Check size={18} strokeWidth={2.2} color="#1A1308" />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1308' }}>Готово</span>
        </button>
      </div>

      <div style={{ padding: '4px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {dayTasks.length > 0 && (
          <div className="glass" style={{ borderRadius: 18, overflow: 'hidden' }}>
            <SortableTaskList
              tasks={dayTasks}
              variant="list"
              selectedIds={id ? [id] : []}
              onToggle={toggleDayTask}
              onSelect={(taskId) =>
                navigate({ to: '/task/$date', params: { date }, search: { id: taskId } })
              }
              onToggleSubtask={toggleSubtask}
              onEditSubtask={editSubtask}
              onDeleteSubtask={deleteSubtask}
              onAddSubtask={addSubtask}
              onEdit={(taskId) =>
                navigate({ to: '/task/$date', params: { date }, search: { id: taskId } })
              }
              onTransfer={transferTask}
              onSend={sendTask}
              onDelete={deleteTask}
              onCopy={copyTaskText}
              onReorder={reorderDayTasks}
            />
          </div>
        )}

        {/* Title input */}
        <div
          className="glass"
          style={{
            borderRadius: 22,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '1.5px solid rgba(255,255,255,0.35)',
              flexShrink: 0,
              marginTop: 4,
            }}
          />
          <textarea
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Завдання"
            rows={6}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 17,
              color: 'var(--txt-main)',
              resize: 'none',
              fontFamily: 'inherit',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Time row */}
        <Row
          icon={<Clock size={16} color="var(--gold-text)" />}
          label="Вказати час"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {hasTime && (
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    fontSize: 15,
                    cursor: 'pointer',
                    color: 'var(--gold-text-strong)',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {time}
                </button>
              )}
              <IOSSwitch checked={hasTime} onChange={toggleTime} />
            </div>
          }
        />

        {/* Repeat row */}
        <Row
          icon={<Repeat2 size={16} color="var(--gold-text)" />}
          label="Повтор завдання"
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {repeat !== 'none' && (
                <button
                  type="button"
                  onClick={() => setShowRepeatPicker(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-text-strong)',
                    fontSize: 14,
                    maxWidth: 140,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {repeatLabels[repeat]}
                </button>
              )}
              <IOSSwitch checked={repeat !== 'none'} onChange={toggleRepeat} />
            </div>
          }
        />

        {/* Auto-move */}
        <Row
          icon={<Sparkles size={16} color="var(--gold-text)" />}
          label="Автоперенесення"
          sublabel="Невиконані → на завтра"
          right={<IOSSwitch checked={autoMove} onChange={setAutoMove} />}
        />

        {/* Color picker */}
        <div className="glass" style={{ borderRadius: 22, padding: '14px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Palette size={16} color="var(--gold-text)" />
            <span style={{ fontSize: 15, color: 'var(--txt-main)', fontWeight: 500 }}>Колір</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            {colorPresets.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                aria-label={c}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  border: 'none',
                  background: c,
                  padding: 0,
                  cursor: 'pointer',
                }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              style={{
                width: 36,
                height: 36,
                padding: 0,
                background: 'transparent',
                border: '1px dashed var(--accent-40)',
                borderRadius: 8,
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>

      {/* Time picker sheet */}
      {showTimePicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.68)',
            padding: '0 16px 24px',
          }}
        >
          <div
            className="glass"
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 24,
              padding: 16,
              background: 'rgba(18,18,20,0.96)',
            }}
          >
            <div
              style={{
                marginBottom: 14,
                textAlign: 'center',
                fontSize: 16,
                color: 'var(--txt-main)',
                fontWeight: 500,
              }}
            >
              Виберіть час
            </div>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              style={{
                marginBottom: 14,
                height: 48,
                width: '100%',
                borderRadius: 16,
                background: 'transparent',
                color: 'var(--gold-text-strong)',
                border: '1px solid var(--glass-stroke)',
                textAlign: 'center',
                fontSize: 22,
                fontVariantNumeric: 'tabular-nums',
              }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setHasTime(false);
                  setTime('');
                  setShowTimePicker(false);
                }}
                style={{
                  height: 44,
                  borderRadius: 999,
                  border: '1px solid var(--glass-stroke)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--txt-main)',
                  fontSize: 15,
                  cursor: 'pointer',
                }}
              >
                Скасувати
              </button>
              <button
                type="button"
                onClick={() => {
                  setTime((current) => current || '09:00');
                  setHasTime(true);
                  setShowTimePicker(false);
                }}
                style={{
                  height: 44,
                  borderRadius: 999,
                  border: '1px solid var(--accent-light-50)',
                  background: 'var(--gold-shine)',
                  color: '#1A1308',
                  fontSize: 15,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repeat picker sheet */}
      {showRepeatPicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.68)',
            padding: '0 16px 24px',
          }}
        >
          <div
            className="glass"
            style={{
              width: '100%',
              maxWidth: 400,
              borderRadius: 24,
              padding: 14,
              background: 'rgba(18,18,20,0.96)',
            }}
          >
            <div
              style={{
                padding: '6px 4px 12px',
                textAlign: 'center',
                fontSize: 16,
                color: 'var(--txt-main)',
                fontWeight: 500,
              }}
            >
              Повтор завдання
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {repeatOptions.map((option) => {
                const active = repeat === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRepeat(option.value);
                      setShowRepeatPicker(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      height: 46,
                      width: '100%',
                      borderRadius: 14,
                      padding: '0 14px',
                      fontSize: 15,
                      textAlign: 'left',
                      cursor: 'pointer',
                      background: active
                        ? 'linear-gradient(180deg, var(--accent-18) 0%, var(--accent-04) 100%)'
                        : 'rgba(255,255,255,0.05)',
                      border: active
                        ? '1px solid var(--accent-45)'
                        : '1px solid var(--glass-stroke)',
                      color: active ? 'var(--gold-text-strong)' : 'var(--txt-main)',
                    }}
                  >
                    <span>{option.label}</span>
                    {active && <Check size={18} color="var(--gold-text-strong)" />}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowRepeatPicker(false)}
              style={{
                marginTop: 12,
                height: 44,
                width: '100%',
                borderRadius: 999,
                border: '1px solid var(--glass-stroke)',
                background: 'rgba(255,255,255,0.06)',
                color: 'var(--gold-text-strong)',
                fontSize: 15,
                cursor: 'pointer',
              }}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Row({
  icon,
  label,
  sublabel,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  right: React.ReactNode;
}) {
  return (
    <div
      className="glass"
      style={{
        borderRadius: 22,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 60,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--accent-10)',
          border: '1px solid var(--accent-18)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: 'var(--txt-main)', fontWeight: 500 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: 'var(--txt-dim)', marginTop: 1 }}>{sublabel}</div>
        )}
      </div>
      {right}
    </div>
  );
}
