import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, Check, ChevronDown, MessageSquare } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { IOSSwitch } from '../components/IOSSwitch';
import { useTasks } from '../components/Hooks';
import { uid } from '../lib/storage';
import { formatLong } from '../lib/date';

const repeatOptions = [
  { value: 'daily', label: 'Кожен день' },
  { value: 'weekdays', label: 'Кожен день Пн-Пт' },
  { value: 'weekly', label: 'Щотижня' },
  { value: 'monthly', label: 'Кожен місяць' },
  { value: 'flexible', label: 'Гнучкий графік' },
] as const;

type RepeatValue = 'none' | (typeof repeatOptions)[number]['value'];

const repeatLabels: Record<RepeatValue, string> = {
  none: 'Не повторювати',
  daily: 'Кожен день',
  weekdays: 'Кожен день Пн-Пт',
  weekly: 'Щотижня',
  monthly: 'Кожен місяць',
  flexible: 'Гнучкий графік',
};

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
  const [title, setTitle] = useState(existing?.title ?? '');
  const [note, setNote] = useState(existing?.note ?? '');
  const [time, setTime] = useState(existing?.time ?? '');
  const [color, setColor] = useState(existing?.color ?? '#42FFF4');
  const [hasTime, setHasTime] = useState(Boolean(existing?.time));
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [repeat, setRepeat] = useState<RepeatValue>(existing?.repeat ?? 'none');
  const [showRepeatPicker, setShowRepeatPicker] = useState(false);
  const [autoMove, setAutoMove] = useState(Boolean(existing?.autoMove));

  useEffect(() => {
    if (!existing) return;
    setTitle(existing.title);
    setNote(existing.note ?? '');
    setTime(existing.time ?? '');
    setHasTime(Boolean(existing.time));
    setRepeat(existing.repeat ?? 'none');
    setAutoMove(Boolean(existing.autoMove));
    setColor(existing.color ?? '#42FFF4');
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

  const submit = () => {
    if (!title.trim()) return navigate({ to: '/' });
    const next = {
      id: existing?.id ?? uid(),
      title: title.trim(),
      note: note.trim() || undefined,
      date,
      time: hasTime && time ? time : undefined,
      completed: existing?.completed ?? false,
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

  return (
    <AppShell showToolbar={false}>
      <div
        className="flex items-center justify-between px-4 h-14 border-b"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <button
          onClick={() => navigate({ to: '/' })}
          className="w-10 h-10 flex items-center justify-center"
        >
          <ChevronLeft size={28} color="var(--accent)" />
        </button>
        <button className="flex items-center gap-1.5">
          <span className="text-[17px]">{formatLong(date)}</span>
          <ChevronDown size={16} color="var(--text-muted)" />
        </button>
        <button onClick={submit} className="w-10 h-10 flex items-center justify-center">
          <Check size={26} color="var(--accent)" strokeWidth={2} />
        </button>
      </div>
      <div className="px-4 pt-5 space-y-4">
        <div
          className="rounded-2xl flex items-center gap-3 px-4 h-16"
          style={{ background: 'var(--card-soft)' }}
        >
          <div
            className="w-[22px] h-[22px] rounded-full border"
            style={{ borderColor: 'var(--text-dim)' }}
          />
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Завдання"
            className="flex-1 bg-transparent text-[18px] border-b"
            style={{ borderColor: 'var(--border-soft)', color: 'var(--text-main)' }}
          />
          <MessageSquare size={22} color="var(--accent)" />
        </div>
        <div className="rounded-2xl px-4 py-4" style={{ background: 'var(--card-soft)' }}>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Коментар"
            className="w-full bg-transparent text-[17px] resize-none"
            style={{ minHeight: 96, color: 'var(--text-main)' }}
          />
        </div>
        <Row
          label="Вказати час"
          right={
            <div className="flex items-center gap-3">
              {hasTime && (
                <button
                  type="button"
                  onClick={() => setShowTimePicker(true)}
                  className="text-[16px]"
                  style={{ color: 'var(--accent)' }}
                >
                  {time}
                </button>
              )}
              <IOSSwitch checked={hasTime} onChange={toggleTime} />
            </div>
          }
        />
        <Row
          label="Повтор завдання"
          right={
            <div className="flex items-center gap-3">
              {repeat !== 'none' && (
                <button
                  type="button"
                  onClick={() => setShowRepeatPicker(true)}
                  className="max-w-[132px] truncate text-right text-[15px]"
                  style={{ color: 'var(--accent)' }}
                >
                  {repeatLabels[repeat]}
                </button>
              )}
              <IOSSwitch checked={repeat !== 'none'} onChange={toggleRepeat} />
            </div>
          }
        />
        {showTimePicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-6">
            <div
              className="w-full max-w-sm rounded-3xl p-4"
              style={{ background: 'var(--card-soft)' }}
            >
              <div className="mb-4 text-center text-[18px]">Виберіть час</div>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mb-4 h-12 w-full rounded-2xl bg-transparent px-4 text-center text-[24px]"
                style={{ color: 'var(--accent)', border: '1px solid var(--border-soft)' }}
              />
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setHasTime(false);
                    setTime('');
                    setShowTimePicker(false);
                  }}
                  className="h-12 rounded-2xl text-[17px]"
                  style={{ background: 'rgba(255,255,255,0.08)' }}
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
                  className="h-12 rounded-2xl text-[17px]"
                  style={{ background: 'var(--accent)', color: '#050506' }}
                >
                  Готово
                </button>
              </div>
            </div>
          </div>
        )}
        {showRepeatPicker && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-4 pb-6">
            <div
              className="w-full max-w-sm rounded-3xl p-3"
              style={{ background: 'var(--card-soft)' }}
            >
              <div className="px-2 pb-3 pt-1 text-center text-[18px]">Повтор завдання</div>
              <div className="space-y-2">
                {repeatOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setRepeat(option.value);
                      setShowRepeatPicker(false);
                    }}
                    className="flex h-12 w-full items-center justify-between rounded-2xl px-4 text-left text-[17px]"
                    style={{ background: 'rgba(255,255,255,0.08)' }}
                  >
                    <span>{option.label}</span>
                    {repeat === option.value && <Check size={20} color="var(--accent)" />}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (repeat === 'none') setRepeat('none');
                  setShowRepeatPicker(false);
                }}
                className="mt-3 h-12 w-full rounded-2xl text-[17px]"
                style={{ color: 'var(--accent)', background: 'rgba(255,255,255,0.08)' }}
              >
                Скасувати
              </button>
            </div>
          </div>
        )}
        <Row
          label="Автоперенесення завдань"
          right={<IOSSwitch checked={autoMove} onChange={setAutoMove} />}
        />
        <Row
          label="Колір"
          right={
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 w-12 bg-transparent"
            />
          }
        />
      </div>
    </AppShell>
  );
}
function Row({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between rounded-2xl px-4 h-16"
      style={{ background: 'var(--card-soft)' }}
    >
      <span className="text-[17px]">{label}</span>
      {right}
    </div>
  );
}
