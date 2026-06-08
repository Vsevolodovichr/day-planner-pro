import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlarmClock, CalendarClock, ChevronLeft, Check, ChevronDown, Clock, Repeat2, Sparkles, Palette } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { IOSSwitch } from '../components/IOSSwitch';
import { SortableTaskList } from '../components/SortableTaskList';
import { useTasks } from '../components/Hooks';
import { uid } from '../lib/storage';
import { formatLong } from '../lib/date';
import {
  IOS_ALARM_SHORTCUT_INSTALL_OPENED_KEY,
  IOS_ALARM_SHORTCUT_NAME,
  createIosShortcutAlarms,
  type IosAlarmOffsetMinutes,
} from '../lib/iosShortcutAlarms';
import type { Task } from '../types';
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

const autoMoveOptions = [
  { value: 'next_day', label: 'На наступний день' },
  { value: 'next_full_moon', label: 'На наступне повнолуння' },
] as const;

type AutoMoveMode = (typeof autoMoveOptions)[number]['value'];

const repeatLabels: Record<RepeatValue, string> = {
  none: 'Не повторювати',
  daily: 'Кожен день',
  weekdays: 'Кожен день Пн-Пт',
  weekly: 'Щотижня',
  monthly: 'Кожен місяць',
  yearly: 'Щороку',
  flexible: 'Гнучкий графік',
};

const autoMoveLabels: Record<AutoMoveMode, string> = {
  next_day: 'На наступний день',
  next_full_moon: 'На наступне повнолуння',
};

const colorPresets = ['#F8DC8A', '#F2B5A6', '#8DC4DD', '#B8DBA0', '#C7B8E8', '#5A5A60'];
const iosAlarmOffsetOptions: Array<{ value: IosAlarmOffsetMinutes; label: string }> = [
  { value: 15, label: 'За 15 хвилин' },
  { value: 30, label: 'За 30 хвилин' },
  { value: 60, label: 'За 1 годину' },
];

type RecurrenceAction = { type: 'delete'; taskId: string } | { type: 'edit' };
type RecurrenceScope = 'occurrence' | 'series';

function isRepeatingTask(task?: Task): task is Task {
  return Boolean(task?.repeat && task.repeat !== 'none');
}

function withRepeatException(task: Task, date: string): Task {
  const repeatExceptions = task.repeatExceptions ?? [];
  if (repeatExceptions.includes(date)) return task;
  return { ...task, repeatExceptions: [...repeatExceptions, date] };
}

function withoutRepeatException(task: Task, date: string): Task {
  if (!task.repeatExceptions?.includes(date)) return task;
  return { ...task, repeatExceptions: task.repeatExceptions.filter((item) => item !== date) };
}

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
  const recurrenceParent = existing?.recurrenceParentId
    ? tasks.find((task) => task.id === existing.recurrenceParentId)
    : undefined;
  const recurrenceBase = isRepeatingTask(existing)
    ? existing
    : isRepeatingTask(recurrenceParent)
      ? recurrenceParent
      : undefined;
  const existingRepeat = existing?.recurrenceParentId && recurrenceParent
    ? recurrenceParent.repeat ?? 'none'
    : existing?.repeat ?? 'none';
  const [title, setTitle] = useState(existing ? taskText(existing) : '');
  const [time, setTime] = useState(existing?.time ?? '');
  const [color, setColor] = useState(existing?.color ?? '#F8DC8A');
  const [hasTime, setHasTime] = useState(Boolean(existing?.time));
  const [scheduleForce, setScheduleForce] = useState(Boolean(existing?.scheduleForceEnabled));
  const [iosAlarmEnabled, setIosAlarmEnabled] = useState(Boolean(existing?.iosAlarmEnabled));
  const [iosAlarmOffsetMinutes, setIosAlarmOffsetMinutes] = useState<IosAlarmOffsetMinutes[]>(
    existing?.iosAlarmOffsetMinutes ?? [],
  );
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeat, setRepeat] = useState<RepeatValue>(existingRepeat);
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [autoMove, setAutoMove] = useState(Boolean(existing?.autoMove));
  const [autoMoveMode, setAutoMoveMode] = useState<AutoMoveMode>(existing?.autoMoveMode ?? 'next_day');
  const [showAutoMovePicker, setShowAutoMovePicker] = useState(false);
  const [recurrenceAction, setRecurrenceAction] = useState<RecurrenceAction | null>(null);
  const [hasOpenedShortcutInstall] = useState(
    () => window.localStorage.getItem(IOS_ALARM_SHORTCUT_INSTALL_OPENED_KEY) === 'true',
  );
  const titleInputRef = useRef<HTMLTextAreaElement | null>(null);
  const dayTasks = tasksForDate(tasks, date);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      titleInputRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [id]);

  useEffect(() => {
    if (!existing) return;
    setTitle(taskText(existing));
    setTime(existing.time ?? '');
    setHasTime(Boolean(existing.time));
    setScheduleForce(Boolean(existing.scheduleForceEnabled));
    setIosAlarmEnabled(Boolean(existing.iosAlarmEnabled));
    setIosAlarmOffsetMinutes(existing.iosAlarmOffsetMinutes ?? []);
    setRepeat(existing?.recurrenceParentId && recurrenceParent ? recurrenceParent.repeat ?? 'none' : existing.repeat ?? 'none');
    setAutoMove(Boolean(existing.autoMove));
    setAutoMoveMode(existing.autoMoveMode ?? 'next_day');
    setColor(existing.color ?? '#F8DC8A');
  }, [existing, recurrenceParent]);

  const toggleTime = (checked: boolean) => {
    setHasTime(checked);
    if (checked) {
      setTime((current) => current || '09:00');
      setShowTimePicker(true);
    } else {
      setTime('');
      setIosAlarmEnabled(false);
      setShowTimePicker(false);
    }
  };

  const toggleIosAlarm = (checked: boolean) => {
    if (checked && (!date || !hasTime || !time)) {
      toast.error('Для створення iOS-будильника потрібно вказати точний час задачі.');
      return;
    }
    setIosAlarmEnabled(checked);
  };

  const toggleIosAlarmOffset = (offset: IosAlarmOffsetMinutes) => {
    setIosAlarmOffsetMinutes((current) =>
      current.includes(offset)
        ? current.filter((item) => item !== offset)
        : [...current, offset].sort((a, b) => b - a),
    );
  };

  const toggleRepeat = (checked: boolean) => {
    if (checked) {
      setShowRepeatPicker(true);
    } else {
      setRepeat('none');
      setShowRepeatPicker(false);
    }
  };

  const toggleAutoMove = (checked: boolean) => {
    setAutoMove(checked);
    if (checked) {
      setShowAutoMovePicker(true);
    } else {
      setShowAutoMovePicker(false);
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

  const deleteRecurringTask = (taskId: string, scope: RecurrenceScope) => {
    const target = tasks.find((task) => task.id === taskId);
    const parent = target?.recurrenceParentId
      ? tasks.find((task) => task.id === target.recurrenceParentId)
      : undefined;
    const base = isRepeatingTask(target) ? target : isRepeatingTask(parent) ? parent : undefined;
    if (!target || !base) return;

    const nextTasks = scope === 'series'
      ? tasks.filter((task) => task.id !== base.id && task.recurrenceParentId !== base.id)
      : target.recurrenceParentId
        ? tasks.filter((task) => task.id !== target.id)
        : tasks.map((task) => (task.id === base.id ? withRepeatException(task, date) : task));

    save(nextTasks);
    if (
      id === target.id ||
      (scope === 'series' && id && (id === base.id || tasks.find((task) => task.id === id)?.recurrenceParentId === base.id))
    ) {
      navigate({ to: '/task/$date', params: { date } });
    }
  };

  const deleteTask = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    const parent = task?.recurrenceParentId ? tasks.find((item) => item.id === task.recurrenceParentId) : undefined;
    if (isRepeatingTask(task) || isRepeatingTask(parent)) {
      setRecurrenceAction({ type: 'delete', taskId });
      return;
    }
    if (!window.confirm('Видалити завдання?')) return;
    save(tasks.filter((task) => task.id !== taskId));
    if (id === taskId) navigate({ to: '/task/$date', params: { date } });
  };

  const submit = (scope?: RecurrenceScope) => {
    if (!title.trim()) return navigate({ to: '/', search: { date } });
    if (scheduleForce && (!date || !hasTime || !time)) {
      toast.error('Для додавання в Розклад вкажіть дату і час');
      return;
    }
    if (iosAlarmEnabled && (!date || !hasTime || !time)) {
      toast.error('Для створення iOS-будильника потрібно вказати точний час задачі.');
      return;
    }

    let nextIosAlarmOffsetMinutes = iosAlarmOffsetMinutes;
    if (iosAlarmEnabled && nextIosAlarmOffsetMinutes.length === 0) {
      nextIosAlarmOffsetMinutes = [60];
      setIosAlarmOffsetMinutes(nextIosAlarmOffsetMinutes);
      toast.info('Для iOS-будильника автоматично вибрано нагадування за 1 годину.');
    }

    if (existing && recurrenceBase && !scope) {
      setRecurrenceAction({ type: 'edit' });
      return;
    }

    const [firstLine = '', ...rest] = title.trim().split(/\r?\n/);
    const buildTask = (source?: Task, taskDate = date): Task => ({
      id: source?.id ?? uid(),
      title: firstLine.trim() || title.trim(),
      note: rest.join('\n').trim() || undefined,
      date: taskDate,
      time: hasTime && time ? time : undefined,
      completed: source?.completed ?? false,
      completedAt: source?.completedAt,
      subtasks: source?.subtasks ?? [],
      repeat,
      autoMove,
      autoMoveMode: autoMove ? autoMoveMode : undefined,
      color,
      scheduleForceEnabled: scheduleForce,
      iosAlarmEnabled,
      iosAlarmOffsetMinutes: iosAlarmEnabled ? nextIosAlarmOffsetMinutes : undefined,
      createdAt: source?.createdAt ?? new Date().toISOString(),
      folderId: source?.folderId,
      repeatExceptions: source?.repeatExceptions,
      recurrenceParentId: source?.recurrenceParentId,
      recurrenceDate: source?.recurrenceDate,
    });

    if (existing && recurrenceBase && scope === 'occurrence') {
      const occurrence = {
        ...buildTask(existing, date),
        id: existing.recurrenceParentId ? existing.id : uid(),
        repeat: 'none' as const,
        repeatExceptions: undefined,
        recurrenceParentId: recurrenceBase.id,
        recurrenceDate: date,
        createdAt: existing.recurrenceParentId ? existing.createdAt : new Date().toISOString(),
      };
      const updatedTasks = tasks.map((task) => {
        if (task.id === recurrenceBase.id) return withRepeatException(task, date);
        if (task.id === occurrence.id) return occurrence;
        return task;
      });
      save(existing.recurrenceParentId ? updatedTasks : [...updatedTasks, occurrence]);
      launchIosAlarms(occurrence, existing);
      navigate({ to: '/', search: { date } });
      return;
    }

    if (existing && recurrenceBase && scope === 'series') {
      const series = {
        ...buildTask(recurrenceBase, recurrenceBase.date ?? date),
        id: recurrenceBase.id,
        date: recurrenceBase.date,
        repeatExceptions: recurrenceBase.repeatExceptions,
        recurrenceParentId: recurrenceBase.recurrenceParentId,
        recurrenceDate: recurrenceBase.recurrenceDate,
      };
      const nextSeries = existing.recurrenceParentId ? withoutRepeatException(series, date) : series;
      const sourceTasks = existing.recurrenceParentId
        ? tasks.filter((task) => task.id !== existing.id)
        : tasks;
      save(sourceTasks.map((task) => (task.id === recurrenceBase.id ? nextSeries : task)));
      launchIosAlarms(nextSeries, recurrenceBase);
      navigate({ to: '/', search: { date } });
      return;
    }

    const next = buildTask(existing);
    save(
      existing ? tasks.map((task) => (task.id === existing.id ? next : task)) : [...tasks, next],
    );
    launchIosAlarms(next, existing);
    navigate({ to: '/', search: { date } });
  };

  const launchIosAlarms = (task: Task, previous?: Task) => {
    if (!task.date || !task.time || !task.iosAlarmOffsetMinutes?.length) return;
    if (!task.iosAlarmEnabled) return;

    const currentOffsets = [...task.iosAlarmOffsetMinutes].sort((a, b) => b - a).join(',');
    const previousOffsets = [...(previous?.iosAlarmOffsetMinutes ?? [])].sort((a, b) => b - a).join(',');
    const shouldLaunch =
      !previous?.iosAlarmEnabled ||
      previous.date !== task.date ||
      previous.time !== task.time ||
      previousOffsets !== currentOffsets;

    if (!shouldLaunch) return;

    createIosShortcutAlarms({
      shortcutName: IOS_ALARM_SHORTCUT_NAME,
      taskId: task.id,
      taskTitle: taskText(task),
      taskDateTime: `${task.date}T${task.time}:00`,
      offsetsMinutes: task.iosAlarmOffsetMinutes,
    });
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
          position: 'fixed',
          top: 'calc(var(--app-shell-bg-top, 0px) + var(--vv-offset-top, 0px))',
          left: 'var(--app-shell-bg-left, 0px)',
          width: 'var(--app-shell-bg-width, 100vw)',
          boxSizing: 'border-box',
          zIndex: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'calc(env(safe-area-inset-top, 0px) + 18px) 14px 14px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 70%, transparent 100%)',
        }}
      >
        <button onClick={() => navigate({ to: '/', search: { date } })} style={topBtn} aria-label="Назад">
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
          onClick={() => submit()}
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

      <div
        style={{
          padding: '72px 14px calc(24px + var(--kb-offset, 0px))',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
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
            ref={titleInputRef}
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })}
            placeholder="Завдання"
            rows={6}
            className="field-input field-input--bare field-input--textarea"
            style={{
              flex: 1,
              fontSize: 17,
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

        <Row
          icon={<AlarmClock size={16} color="var(--gold-text)" />}
          label="Створити iOS-будильник"
          sublabel={
            iosAlarmEnabled && !hasOpenedShortcutInstall
              ? 'Спочатку створіть iOS-команду в налаштуваннях, інакше будильник не буде створено.'
              : undefined
          }
          right={<IOSSwitch checked={iosAlarmEnabled} onChange={toggleIosAlarm} />}
        />

        {iosAlarmEnabled && (
          <div
            className="glass"
            style={{
              borderRadius: 22,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {iosAlarmOffsetOptions.map((option) => (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  color: 'var(--txt-main)',
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="checkbox"
                  checked={iosAlarmOffsetMinutes.includes(option.value)}
                  onChange={() => toggleIosAlarmOffset(option.value)}
                  style={{ accentColor: 'var(--gold-text)' }}
                />
                {option.label}
              </label>
            ))}
          </div>
        )}

        <Row
          icon={<CalendarClock size={16} color="var(--gold-text)" />}
          label="У Розклад"
          sublabel="Якщо увімкнено — задача буде додана в Розклад за датою і часом. Статус можна задати #тегом у тексті: #офіс, #офісі, #полі, #виїзд."
          right={<IOSSwitch checked={scheduleForce} onChange={setScheduleForce} />}
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
          sublabel={autoMove ? autoMoveLabels[autoMoveMode] : 'Вимкнено'}
          right={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {autoMove && (
                <button
                  type="button"
                  onClick={() => setShowAutoMovePicker(true)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--gold-text-strong)',
                    fontSize: 13,
                    maxWidth: 142,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    cursor: 'pointer',
                  }}
                >
                  {autoMoveLabels[autoMoveMode]}
                </button>
              )}
              <IOSSwitch checked={autoMove} onChange={toggleAutoMove} />
            </div>
          }
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
              className="field-input field-input--color"
              style={{
                width: 36,
                height: 36,
                border: '1px dashed var(--accent-40)',
                borderRadius: 8,
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
              className="field-input"
              style={{
                width: '100%',
                maxWidth: '100%',
                boxSizing: 'border-box',
                marginBottom: 14,
                height: 48,
                borderRadius: 16,
                color: 'var(--gold-text-strong)',
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

      {/* Auto-move picker sheet */}
      {showAutoMovePicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(10px)',
          }}
          onClick={() => setShowAutoMovePicker(false)}
        >
          <div
            className="glass"
            onClick={(event) => event.stopPropagation()}
            style={{
              width: 'min(430px, calc(100vw - 24px))',
              marginBottom: 14,
              borderRadius: 28,
              padding: '18px 16px 14px',
              boxShadow: '0 24px 60px rgba(0,0,0,0.45)',
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
              Автоперенесення
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {autoMoveOptions.map((option) => {
                const active = autoMoveMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setAutoMoveMode(option.value);
                      setShowAutoMovePicker(false);
                    }}
                    style={{
                      width: '100%',
                      border: 'none',
                      borderRadius: 18,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: active ? 'var(--accent-14)' : 'rgba(255,255,255,0.04)',
                      color: active ? 'var(--gold-text-strong)' : 'var(--txt-main)',
                      fontSize: 15,
                      cursor: 'pointer',
                    }}
                  >
                    <span>{option.label}</span>
                    {active && <Check size={16} />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {recurrenceAction && (
        <RecurrenceActionSheet
          title={recurrenceAction.type === 'delete' ? 'Видалити повтор?' : 'Зберегти зміни?'}
          onOccurrence={() => {
            const action = recurrenceAction;
            setRecurrenceAction(null);
            if (action.type === 'delete') deleteRecurringTask(action.taskId, 'occurrence');
            if (action.type === 'edit') submit('occurrence');
          }}
          onSeries={() => {
            const action = recurrenceAction;
            setRecurrenceAction(null);
            if (action.type === 'delete') deleteRecurringTask(action.taskId, 'series');
            if (action.type === 'edit') submit('series');
          }}
          onCancel={() => setRecurrenceAction(null)}
        />
      )}
    </AppShell>
  );
}

function RecurrenceActionSheet({
  title,
  onOccurrence,
  onSeries,
  onCancel,
}: {
  title: string;
  onOccurrence: () => void;
  onSeries: () => void;
  onCancel: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.68)',
        padding:
          '0 16px max(24px, env(safe-area-inset-bottom), calc(var(--app-shell-main-bottom, 96px) - var(--kb-offset, 0px)))',
      }}
      onClick={onCancel}
    >
      <div
        className="glass"
        onClick={(event) => event.stopPropagation()}
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
          {title}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            type="button"
            onClick={onOccurrence}
            style={{
              height: 46,
              width: '100%',
              borderRadius: 14,
              border: '1px solid var(--accent-45)',
              background: 'linear-gradient(180deg, var(--accent-18) 0%, var(--accent-04) 100%)',
              color: 'var(--gold-text-strong)',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Цей повтор
          </button>
          <button
            type="button"
            onClick={onSeries}
            style={{
              height: 46,
              width: '100%',
              borderRadius: 14,
              border: '1px solid var(--glass-stroke)',
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--txt-main)',
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Усі повтори
          </button>
        </div>
        <button
          type="button"
          onClick={onCancel}
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
