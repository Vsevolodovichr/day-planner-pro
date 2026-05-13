import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import {
  Check,
  Folder as FolderIcon,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { ContextActionSheet } from '../components/ContextActionSheet';
import { TaskRow } from '../components/TaskRow';
import { useFolders, useTasks } from '../components/Hooks';
import { uid } from '../lib/storage';
import { cloneTask, newSubtask, taskText, toggleTaskCompletion } from '../lib/task-utils';
import type { Task } from '../types';

export const Route = createFileRoute('/general')({ component: General });

function EditModal({
  task,
  onClose,
  onSave,
}: {
  task: Task;
  onClose: () => void;
  onSave: (next: Task) => void;
}) {
  const [text, setText] = useState(taskText(task));

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.55)',
        padding: '0 14px var(--app-shell-main-bottom, calc(96px + env(safe-area-inset-bottom)))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="gold-text" style={{ fontSize: 18, fontWeight: 600 }}>
            Редагування завдання
          </span>
          <button
            onClick={onClose}
            aria-label="Закрити"
            style={{
              border: 'none',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: 999,
              width: 32,
              height: 32,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--txt-muted)',
              cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>
        </div>

        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Завдання"
          rows={5}
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
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onClose}
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
            onClick={() => {
              const [firstLine = '', ...rest] = text.trim().split(/\r?\n/);
              onSave({
                ...task,
                title: firstLine.trim() || task.title,
                note: rest.join('\n').trim() || undefined,
              });
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
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <Check size={17} strokeWidth={2.2} /> Зберегти
          </button>
        </div>
      </div>
    </div>
  );
}

function SubtaskModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (title: string) => void;
}) {
  const [title, setTitle] = useState('');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.68)',
        padding: '0 14px var(--app-shell-main-bottom, calc(96px + env(safe-area-inset-bottom)))',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
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
          Нова підзадача
        </span>
        <textarea
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Підзадача"
          rows={4}
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
          }}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
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
            onClick={() => {
              if (title.trim()) onSave(title.trim());
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
            Додати
          </button>
        </div>
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onToggle,
  onEdit,
  onMenu,
  onToggleSub,
  onSubEdit,
  onSubDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onAddSubtask: () => void;
  onToggleSub: (id: string) => void;
  onMenu: () => void;
  onSubEdit: (id: string) => void;
  onSubCopy: (id: string) => void;
  onSubDelete: (id: string) => void;
}) {
  return (
    <section
      className="glass"
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(18,18,20,0.76)',
      }}
    >
      <TaskRow
        task={task}
        variant="list"
        onToggle={onToggle}
        onSelect={onEdit}
        onMenu={onMenu}
        onToggleSubtask={onToggleSub}
        onEditSubtask={onSubEdit}
        onDeleteSubtask={onSubDelete}
      />
    </section>
  );
}

function General() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'tasks' | 'folders'>('tasks');
  const { tasks, save: saveTasks } = useTasks();
  const { folders, save: saveFolders } = useFolders();
  const [editing, setEditing] = useState<Task | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [subtaskFor, setSubtaskFor] = useState<string | null>(null);
  const generalTasks = tasks.filter((t) => !t.date && !t.folderId);

  const add = () => {
    if (tab === 'folders') {
      const name = window.prompt('Назва папки');
      if (name) saveFolders([...folders, { id: uid(), name }]);
      return;
    }
    const value = window.prompt('Назва завдання');
    const titles = value
      ?.split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (titles?.length)
      saveTasks([
        ...tasks,
        ...titles.map((title) => ({
          id: uid(),
          title,
          completed: false,
          subtasks: [],
          createdAt: new Date().toISOString(),
        })),
      ]);
  };

  const toggle = (id: string) =>
    saveTasks(
      tasks.map((task) => (task.id === id ? toggleTaskCompletion(task) : task)),
    );

  const toggleSub = (taskId: string, subId: string) =>
    saveTasks(
      tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((s) =>
                s.id === subId ? toggleTaskCompletion(s) : s,
              ),
            }
          : task,
      ),
    );

  const remove = (id: string) => {
    if (window.confirm('Видалити завдання?')) {
      saveTasks(tasks.filter((t) => t.id !== id));
    }
  };

  const addSubtask = (id: string) => setSubtaskFor(id);

  const saveSubtask = (id: string, title: string) => {
    saveTasks(
      tasks.map((t) =>
        t.id === id && t.subtasks.length < 4
          ? {
              ...t,
              subtasks: [
                ...t.subtasks,
                {
                  ...newSubtask(title),
                },
              ],
            }
          : t,
      ),
    );
    setSubtaskFor(null);
  };

  const addToFolder = (folderId: string) => {
    const value = window.prompt('Назва завдання');
    const titles = value
      ?.split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!titles?.length) return;
    saveTasks([
      ...tasks,
      ...titles.map((title) => ({
        id: uid(),
        title,
        completed: false,
        subtasks: [],
        folderId,
        createdAt: new Date().toISOString(),
      })),
    ]);
  };

  const openEditor = (task: Task) => {
    if (task.date) {
      navigate({ to: '/task/$date', params: { date: task.date }, search: { id: task.id } });
    } else {
      setEditing(task);
    }
  };

  const onSaveEdit = (next: Task) => {
    saveTasks(tasks.map((t) => (t.id === next.id ? next : t)));
    setEditing(null);
  };

  const copyTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (task) saveTasks([...tasks, cloneTask(task)]);
  };

  const transferTask = (id: string) => {
    const date = window.prompt('Дата у форматі YYYY-MM-DD');
    if (date) saveTasks(tasks.map((task) => (task.id === id ? { ...task, date, folderId: undefined } : task)));
  };

  const sendTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const text = taskText(task);
    if (text && navigator.share) void navigator.share({ text }).catch(() => undefined);
    if (text && !navigator.share) void navigator.clipboard?.writeText(text);
  };

  const subtaskAction = (taskId: string, subId: string, action: 'edit' | 'copy' | 'delete') => {
    saveTasks(
      tasks.map((task) => {
        if (task.id !== taskId) return task;
        const subtask = task.subtasks.find((item) => item.id === subId);
        if (!subtask) return task;
        if (action === 'delete') {
          return { ...task, subtasks: task.subtasks.filter((item) => item.id !== subId) };
        }
        if (action === 'copy') {
          return { ...task, subtasks: [...task.subtasks, cloneTask(subtask)] };
        }
        const title = window.prompt('Текст підзадачі', taskText(subtask));
        if (!title) return task;
        return {
          ...task,
          subtasks: task.subtasks.map((item) => (item.id === subId ? { ...item, title } : item)),
        };
      }),
    );
  };

  const menuAction = (key: string) => {
    if (!menuFor) return;
    if (key === 'subtask') addSubtask(menuFor);
    if (key === 'edit') {
      const task = tasks.find((item) => item.id === menuFor);
      if (task) openEditor(task);
    }
    if (key === 'transfer') transferTask(menuFor);
    if (key === 'copy') copyTask(menuFor);
    if (key === 'send') sendTask(menuFor);
    if (key === 'delete') remove(menuFor);
  };

  const totalDone = generalTasks.filter((t) => t.completed).length;

  return (
    <AppShell>
      {/* Hero */}
      <div style={{ padding: '24px 18px 12px' }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'var(--txt-dim)',
            fontWeight: 500,
          }}
        >
          Без дати
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div
            className="gold-text"
            style={{
              marginTop: 4,
              lineHeight: 1.1,
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: 0.5,
            }}
          >
            Завдання
          </div>
          <div style={{ fontSize: 13, color: 'var(--txt-muted)' }}>
            {totalDone}/{generalTasks.length}
          </div>
        </div>

        {/* Tabs */}
        <div
          className="glass"
          style={{
            marginTop: 14,
            borderRadius: 22,
            padding: 4,
            display: 'flex',
            gap: 4,
          }}
        >
          {(
            [
              { k: 'tasks', label: `Загальні · ${generalTasks.length}` },
              { k: 'folders', label: `Папки · ${folders.length}` },
            ] as const
          ).map((t) => {
            const active = tab === t.k;
            return (
              <button
                key={t.k}
                onClick={() => setTab(t.k)}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 18,
                  border: active ? '1px solid var(--accent-45)' : '1px solid transparent',
                  background: active
                    ? 'linear-gradient(180deg, var(--accent-18) 0%, var(--accent-04) 100%)'
                    : 'transparent',
                  color: active ? 'var(--gold-text-strong)' : 'var(--txt-muted)',
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  cursor: 'pointer',
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {tab === 'tasks' && generalTasks.length > 0 ? (
          generalTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onToggle={() => toggle(task.id)}
              onEdit={() => openEditor(task)}
              onDelete={() => remove(task.id)}
              onAddSubtask={() => addSubtask(task.id)}
              onToggleSub={(sid) => toggleSub(task.id, sid)}
              onMenu={() => setMenuFor(task.id)}
              onSubEdit={(sid) => subtaskAction(task.id, sid, 'edit')}
              onSubCopy={(sid) => subtaskAction(task.id, sid, 'copy')}
              onSubDelete={(sid) => subtaskAction(task.id, sid, 'delete')}
            />
          ))
        ) : tab === 'folders' && folders.length > 0 ? (
          folders.map((folder) => (
            <section
              key={folder.id}
              className="glass"
              style={{ borderRadius: 18, overflow: 'hidden' }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--hairline)',
                }}
              >
                <FolderIcon size={16} color="var(--gold-text)" />
                <span
                  className="gold-text"
                  style={{ fontSize: 16, fontWeight: 600, flex: 1, minWidth: 0 }}
                >
                  {folder.name}
                </span>
                <button
                  onClick={() => addToFolder(folder.id)}
                  aria-label="Додати завдання"
                  style={{
                    border: 'none',
                    background: 'var(--accent-08)',
                    color: 'var(--gold-text-strong)',
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} />
                </button>
                <button
                  onClick={() => {
                    if (window.confirm('Видалити папку?'))
                      saveFolders(folders.filter((f) => f.id !== folder.id));
                  }}
                  style={{
                    border: 'none',
                    background: 'rgba(255,90,90,0.10)',
                    color: '#FF8B8B',
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {tasks
                .filter((task) => task.folderId === folder.id)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onToggle={() => toggle(task.id)}
                    onEdit={() => openEditor(task)}
                    onDelete={() => remove(task.id)}
                    onAddSubtask={() => addSubtask(task.id)}
                    onToggleSub={(sid) => toggleSub(task.id, sid)}
                    onMenu={() => setMenuFor(task.id)}
                    onSubEdit={(sid) => subtaskAction(task.id, sid, 'edit')}
                    onSubCopy={(sid) => subtaskAction(task.id, sid, 'copy')}
                    onSubDelete={(sid) => subtaskAction(task.id, sid, 'delete')}
                  />
                ))}
            </section>
          ))
        ) : (
          <div
            className="glass"
            style={{
              borderRadius: 22,
              padding: '28px 18px',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--txt-muted)', whiteSpace: 'pre-line' }}>
              {tab === 'tasks'
                ? "Створюйте завдання\nбез прив'язки до дати та часу"
                : 'Створіть папку,\nщоб організувати завдання'}
            </div>
            <button
              onClick={add}
              style={{
                marginTop: 14,
                height: 44,
                borderRadius: 999,
                border: '1px solid var(--accent-light-50)',
                background: 'var(--gold-shine)',
                color: '#1A1308',
                fontWeight: 600,
                fontSize: 14.5,
                padding: '0 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} strokeWidth={2.2} /> Додати
            </button>
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={add}
        aria-label="Створити"
        style={{
          position: 'fixed',
          bottom: 'var(--app-shell-action-bottom, calc(96px + env(safe-area-inset-bottom)))',
          right: 18,
          width: 52,
          height: 52,
          borderRadius: 999,
          border: '1px solid var(--accent-light-50)',
          background: 'var(--gold-shine)',
          color: '#1A1308',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 35,
        }}
      >
        <Plus size={22} strokeWidth={2.4} />
      </button>

      {editing && (
        <EditModal task={editing} onClose={() => setEditing(null)} onSave={onSaveEdit} />
      )}
      {subtaskFor && (
        <SubtaskModal
          onClose={() => setSubtaskFor(null)}
          onSave={(title) => saveSubtask(subtaskFor, title)}
        />
      )}
      {menuFor && (
        <ContextActionSheet
          onClose={() => setMenuFor(null)}
          onAction={(key) => {
            menuAction(key);
          }}
        />
      )}
    </AppShell>
  );
}
