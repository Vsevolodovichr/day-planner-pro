import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { AppShell } from '../components/AppShell';
import { DayCard } from '../components/DayCard';
import { ContextActionSheet } from '../components/ContextActionSheet';
import { useTasks, useUnreadNotifications } from '../components/Hooks';
import { getWeekDates, toISO, UA_DAYS_FULL, UA_MONTHS } from '../lib/date';
import {
  cloneTask,
  completedDayStreak,
  newSubtask,
  taskText,
  tasksForDate,
  toggleTaskCompletion,
} from '../lib/task-utils';
import { greetingByHour } from '../lib/theme';
import { ChevronLeft, ChevronRight, Search, Bell, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Мої Завдання — Список справ' },
      { name: 'description', content: 'Планер задач Black Glass · Gold.' },
    ],
  }),
  component: Home,
});

function ProgressRing({
  value = 0,
  size = 52,
  stroke = 4,
}: {
  value?: number;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const C = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
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
        stroke="url(#hero-ring)"
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${C * value} ${C}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

const XATOSFERA_URL =
  import.meta.env.VITE_XATOSFERA_URL?.trim().replace(/\/$/, '') || 'https://hatosfera-crm.pp.ua';

function IconChip({
  children,
  badge,
  onClick,
  ariaLabel,
}: {
  children: React.ReactNode;
  badge?: string;
  onClick?: () => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="glass"
      style={{
        width: 38,
        height: 38,
        borderRadius: 999,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        border: 'none',
        cursor: 'pointer',
      }}
    >
      {children}
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: -3,
            right: -3,
            minWidth: 16,
            height: 16,
            padding: '0 4px',
            borderRadius: 999,
            background: 'var(--gold-grad)',
            color: '#1A1308',
            fontSize: 10,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function SubtaskModal({
  title,
  initialValue = '',
  onClose,
  onSave,
}: {
  title: string;
  initialValue?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 80,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.68)',
        padding: '0 14px var(--app-shell-main-bottom, calc(96px + env(safe-area-inset-bottom)))',
      }}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        className="glass"
        style={{
          width: '100%',
          maxWidth: 420,
          borderRadius: 24,
          padding: 16,
          background: 'rgba(18,18,20,0.96)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <span className="gold-text" style={{ fontSize: 18, fontWeight: 600 }}>
          {title}
        </span>
        <textarea
          autoFocus
          ref={(node) => {
            if (!node) return;
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
          }}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            event.currentTarget.style.height = 'auto';
            event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
          }}
          placeholder="Підзадача"
          rows={1}
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-stroke)',
            borderRadius: 14,
            padding: '12px 14px',
            fontSize: 15,
            color: 'var(--txt-main)',
            outline: 'none',
            resize: 'none',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            minHeight: 108,
            maxHeight: 'min(52dvh, 420px)',
            overflowY: 'auto',
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: 44,
              borderRadius: 999,
              border: '1px solid var(--glass-stroke)',
              background: 'rgba(255,255,255,0.08)',
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
              if (value.trim()) onSave(value.trim());
            }}
            style={{
              height: 44,
              borderRadius: 999,
              border: '1px solid var(--accent-light-50)',
              background: 'var(--gold-shine)',
              color: '#1A1308',
              fontWeight: 600,
              fontSize: 15,
              cursor: 'pointer',
            }}
          >
            Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}

export function Home() {
  const { tasks, save } = useTasks();
  const { notifications, markRead } = useUnreadNotifications();
  const navigate = useNavigate();
  const todayISO = toISO(new Date());
  const [selectedDate, setSelectedDate] = useState(todayISO);
  const week = useMemo(() => getWeekDates(selectedDate), [selectedDate]);
  const [selection, setSelection] = useState<string[]>([]);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [subtaskDraft, setSubtaskDraft] = useState<{
    taskId: string;
    subtaskId?: string;
    initialValue?: string;
  } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const today = new Date();
  const todayTasks = tasksForDate(tasks, todayISO);
  const todayDone = todayTasks.filter((t) => t.completed).length;
  const todayPct = todayTasks.length ? todayDone / todayTasks.length : 0;
  const streak = useMemo(() => completedDayStreak(tasks, todayISO), [tasks, todayISO]);

  const shiftWeek = (delta: number) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + delta * 7);
    setSelectedDate(toISO(next));
  };

  const toggle = (id: string) =>
    save(tasks.map((t) => (t.id === id ? toggleTaskCompletion(t) : t)));
  const select = (id: string) =>
    setSelection((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const action = (k: string, ids = selection) => {
    if (k === 'delete') {
      save(tasks.filter((t) => !ids.includes(t.id)));
      setSelection([]);
    } else if (k === 'copy') {
      const dup = tasks.filter((t) => ids.includes(t.id)).map((t) => cloneTask(t));
      save([...tasks, ...dup]);
      setSelection([]);
    } else if (k === 'edit' && ids.length === 1) {
      const task = tasks.find((t) => t.id === ids[0]);
      navigate({
        to: '/task/$date',
        params: { date: task?.date || todayISO },
        search: { id: ids[0] },
      });
    } else if (k === 'transfer') {
      const date = window.prompt('Дата у форматі YYYY-MM-DD', selectedDate);
      if (date) save(tasks.map((t) => (ids.includes(t.id) ? { ...t, date } : t)));
      setSelection([]);
      if (date) setSelectedDate(date);
    } else if (k === 'subtask' && ids.length === 1) {
      setSubtaskDraft({ taskId: ids[0] });
    } else if (k === 'send') {
      const text = tasks
        .filter((t) => ids.includes(t.id))
        .map(taskText)
        .join('\n\n');
      if (text && navigator.share) void navigator.share({ text }).catch(() => undefined);
      if (text && !navigator.share) void navigator.clipboard?.writeText(text);
      setSelection([]);
    } else {
      setSelection([]);
    }
  };

  const saveSubtaskDraft = (value: string) => {
    if (!subtaskDraft) return;
    save(
      tasks.map((task) => {
        if (task.id !== subtaskDraft.taskId) return task;
        if (subtaskDraft.subtaskId) {
          return {
            ...task,
            subtasks: task.subtasks.map((subtask) =>
              subtask.id === subtaskDraft.subtaskId ? { ...subtask, title: value } : subtask,
            ),
          };
        }
        if (task.subtasks.length >= 4) return task;
        return { ...task, subtasks: [...task.subtasks, newSubtask(value)] };
      }),
    );
    setSubtaskDraft(null);
  };

  const toggleSubtask = (taskId: string, subtaskId: string) => {
    save(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((subtask) =>
                subtask.id === subtaskId
                  ? toggleTaskCompletion(subtask)
                  : subtask,
              ),
            }
          : task,
      ),
    );
  };

  const editSubtask = (taskId: string, subtaskId: string) => {
    const subtask = tasks
      .find((task) => task.id === taskId)
      ?.subtasks.find((item) => item.id === subtaskId);
    if (subtask) setSubtaskDraft({ taskId, subtaskId, initialValue: taskText(subtask) });
  };

  const deleteSubtask = (taskId: string, subtaskId: string) => {
    save(
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, subtasks: task.subtasks.filter((subtask) => subtask.id !== subtaskId) }
          : task,
      ),
    );
  };

  const openNotification = (id: string, entityType?: string, entityId?: string) => {
    markRead(id);
    setShowNotifications(false);
    if (entityType === 'task' && entityId) {
      const task = tasks.find((item) => item.id === entityId);
      if (!task) {
        window.location.href = `${XATOSFERA_URL}/notes`;
        return;
      }
      navigate({
        to: '/task/$date',
        params: { date: task.date || todayISO },
        search: { id: entityId },
      });
      return;
    }
    if (entityType === 'note') {
      window.location.href = `${XATOSFERA_URL}/notes`;
      return;
    }

    const paths: Record<string, string> = {
      client: entityId ? `/clients/${entityId}` : '/clients',
      property: entityId ? `/properties/${entityId}` : '/properties',
      deal: '/deals',
      'calendar-event': '/calendar',
    };
    window.location.href = `${XATOSFERA_URL}${paths[entityType || ''] || '/notifications'}`;
  };

  return (
    <AppShell>
      <div
        onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
        onTouchEnd={(event) => {
          if (touchStart === null) return;
          const delta = event.changedTouches[0]?.clientX - touchStart;
          if (delta > 60) shiftWeek(-1);
          if (delta < -60) shiftWeek(1);
          setTouchStart(null);
        }}
        style={{ position: 'relative' }}
      >
        {/* Hero */}
        <div style={{ padding: '24px 18px 10px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 10,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: 'var(--txt-dim)',
                  fontWeight: 500,
                }}
              >
                {UA_DAYS_FULL[today.getDay()]}, {today.getDate()} {UA_MONTHS[today.getMonth()]}
              </div>
              <div
                className="gold-text"
                style={{
                  marginTop: 4,
                  lineHeight: 1.1,
                  fontWeight: 500,
                  fontSize: 20,
                  letterSpacing: 0.5,
                }}
              >
                {greetingByHour(today)},<br />
              </div>
              <div className="gold-text"
              style={{
                fontWeight: 400,
                fontSize: 26,
                letterSpacing: 1.2,
                lineHeight: 1.5,
              }}
              >Анастасіє
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <IconChip ariaLabel="Пошук" onClick={() => navigate({ to: '/search' })}>
                <Search size={17} color="var(--gold-text-strong)" />
              </IconChip>
              <IconChip
                ariaLabel="Сповіщення"
                badge={notifications.length ? String(notifications.length) : undefined}
                onClick={() => setShowNotifications((open) => !open)}
              >
                <Bell size={17} color="var(--gold-text-strong)" />
              </IconChip>
            </div>
          </div>

          {/* Today progress */}
          <div
            className="glass"
            style={{
              marginTop: 14,
              borderRadius: 12,
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <ProgressRing value={todayPct} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  color: 'var(--txt-muted)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                }}
              >
                Сьогодні
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                <span
                  className="gold-text"
                  style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}
                >
                  {todayDone}
                  <span
                    style={{
                      WebkitTextFillColor: 'rgba(244,245,247,0.35)',
                    }}
                  >
                    /{todayTasks.length}
                  </span>
                </span>
                <span style={{ fontSize: 13, color: 'var(--txt-muted)' }}>виконано</span>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: 'var(--txt-dim)', letterSpacing: 0.5 }}>
                СЕРІЯ
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  justifyContent: 'flex-end',
                  marginTop: 2,
                }}
              >
                <Sparkles size={13} color="var(--gold-text)" />
                <span className="gold-text" style={{ fontWeight: 600, fontSize: 13 }}>
                  {streak} днів
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop arrow controls */}
        <button
          type="button"
          onClick={() => shiftWeek(-1)}
          aria-label="Попередній тиждень"
          className="hidden lg:flex"
          style={{
            position: 'absolute',
            left: -56,
            top: '50%',
            width: 44,
            height: 44,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gold-text-strong)',
            background: 'var(--accent-08)',
            border: '1px solid var(--accent-25)',
          }}
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          onClick={() => shiftWeek(1)}
          aria-label="Наступний тиждень"
          className="hidden lg:flex"
          style={{
            position: 'absolute',
            right: -56,
            top: '50%',
            width: 44,
            height: 44,
            borderRadius: 999,
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--gold-text-strong)',
            background: 'var(--accent-08)',
            border: '1px solid var(--accent-25)',
          }}
        >
          <ChevronRight size={22} />
        </button>

        {/* Week cards — 3px gap */}
        <div
          style={{
            padding: '4px 12px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          {week.map((iso, index) => (
            <DayCard
              key={iso}
              iso={iso}
              isToday={iso === todayISO}
              tasks={tasksForDate(tasks, iso)}
              position={index === 0 ? 'first' : index === week.length - 1 ? 'last' : 'middle'}
              onToggle={toggle}
              onToggleSubtask={toggleSubtask}
              onEditSubtask={editSubtask}
              onDeleteSubtask={deleteSubtask}
              onSelect={select}
              onMenu={(id) => setMenuFor(id)}
              selectedIds={selection}
            />
          ))}
        </div>
      </div>

      {showNotifications && (
        <div
          onClick={() => setShowNotifications(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 70,
            background: 'rgba(0,0,0,0.58)',
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="glass"
            style={{
              position: 'absolute',
              top: 'calc(78px + env(safe-area-inset-top))',
              left: 14,
              right: 14,
              maxWidth: 420,
              margin: '0 auto',
              borderRadius: 22,
              padding: 12,
              background: 'rgba(18,18,20,0.96)',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
            }}
          >
            {notifications.length === 0 ? (
              <div style={{ padding: 14, color: 'var(--txt-muted)', fontSize: 14 }}>
                Немає непрочитаних сповіщень
              </div>
            ) : (
              notifications.slice(0, 5).map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() =>
                    openNotification(
                      notification.id,
                      notification.entityType,
                      notification.entityId,
                    )
                  }
                  style={{
                    border: '1px solid var(--glass-stroke)',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: 16,
                    padding: '10px 12px',
                    color: 'var(--txt-main)',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600, overflowWrap: 'anywhere' }}>
                    {notification.title}
                  </div>
                  <div
                    style={{
                      marginTop: 3,
                      fontSize: 12.5,
                      color: 'var(--txt-muted)',
                      overflowWrap: 'anywhere',
                    }}
                  >
                    {notification.message}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {subtaskDraft && (
        <SubtaskModal
          title={subtaskDraft.subtaskId ? 'Редагування підзадачі' : 'Нова підзадача'}
          initialValue={subtaskDraft.initialValue}
          onClose={() => setSubtaskDraft(null)}
          onSave={saveSubtaskDraft}
        />
      )}

      {menuFor && (
        <ContextActionSheet
          onClose={() => setMenuFor(null)}
          onAction={(k) => {
            action(k, [menuFor]);
          }}
        />
      )}
    </AppShell>
  );
}
