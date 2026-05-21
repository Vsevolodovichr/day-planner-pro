import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { toast } from 'sonner';
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { uk } from 'date-fns/locale';
import { AppShell } from '../components/AppShell';
import { ContextActionSheet } from '../components/ContextActionSheet';
import { SortableTaskList } from '../components/SortableTaskList';
import { Calendar } from '../components/ui/calendar';
import { useFolders, useTasks } from '../components/Hooks';
import { fromISO, toISO } from '../lib/date';
import { uid } from '../lib/storage';
import {
  cloneTask,
  folderTasksForPlanner,
  generalTasksForPlanner,
  newSubtask,
  reorderFolderTasks,
  reorderGeneralTasks,
  taskText,
  toggleTaskCompletion,
} from '../lib/task-utils';
import type { Folder, Task } from '../types';

export const Route = createFileRoute('/general')({ component: General });

const EXPANDED_FOLDERS_STORAGE_KEY = 'mz_general_expanded_folders';
const LEGACY_COLLAPSED_FOLDERS_STORAGE_KEY = 'mz_general_collapsed_folders';

function parseFolderIdList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

type RecurrenceScope = 'occurrence' | 'series';

function isRepeatingTask(task?: Task) {
  return Boolean(task?.repeat && task.repeat !== 'none');
}

function withRepeatException(task: Task, date: string) {
  const repeatExceptions = task.repeatExceptions ?? [];
  if (repeatExceptions.includes(date)) return task;
  return { ...task, repeatExceptions: [...repeatExceptions, date] };
}

function RecurrenceDeleteSheet({
  onOccurrence,
  onSeries,
  onCancel,
}: {
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
          Видалити повтор?
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
            borderRadius: 14,
            border: 'none',
            background: 'rgba(255,255,255,0.08)',
            color: 'var(--txt-muted)',
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

function SortableFolderCard({ folder, children }: { folder: Folder; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: folder.id,
  });

  return (
    <section
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="glass"
      style={{
        borderRadius: 18,
        overflow: 'hidden',
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.72 : 1,
        position: 'relative',
        zIndex: isDragging ? 2 : undefined,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
    >
      {children}
    </section>
  );
}

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
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
        padding:
          '0 14px calc(var(--app-shell-main-bottom, calc(96px + env(safe-area-inset-bottom))) + var(--kb-offset, 0px))',
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
          ref={(node) => {
            textareaRef.current = node;
            if (!node) return;
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
          }}
          onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
          placeholder="Завдання"
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
            minHeight: 124,
            maxHeight: 'min(52dvh, 420px)',
            overflowY: 'auto',
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
  heading = 'Нова підзадача',
  placeholder = 'Підзадача',
  initialValue = '',
}: {
  onClose: () => void;
  onSave: (title: string) => void;
  heading?: string;
  placeholder?: string;
  initialValue?: string;
}) {
  const [title, setTitle] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

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
        padding:
          '0 14px calc(var(--app-shell-main-bottom, calc(96px + env(safe-area-inset-bottom))) + var(--kb-offset, 0px))',
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
          {heading}
        </span>
        <textarea
          autoFocus
          ref={(node) => {
            textareaRef.current = node;
            if (!node) return;
            node.style.height = 'auto';
            node.style.height = `${node.scrollHeight}px`;
          }}
          onFocus={(event) => event.currentTarget.scrollIntoView({ block: 'center', behavior: 'smooth' })}
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            e.currentTarget.style.height = 'auto';
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
          }}
          placeholder={placeholder}
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

function General() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<'tasks' | 'folders'>('tasks');
  const { tasks, save: saveTasks } = useTasks();
  const { folders, save: saveFolders } = useFolders();
  const [editing, setEditing] = useState<Task | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [subtaskFor, setSubtaskFor] = useState<string | null>(null);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [taskModalFolderId, setTaskModalFolderId] = useState<string | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [subtaskDraft, setSubtaskDraft] = useState<{
    taskId: string;
    subtaskId: string;
    initialValue: string;
  } | null>(null);
  const [transferDraft, setTransferDraft] = useState<{
    taskId: string;
    date: Date;
    time: string;
  } | null>(null);
  const [folderModal, setFolderModal] = useState<{ id?: string; initialValue?: string } | null>(null);
  const [recurrenceDelete, setRecurrenceDelete] = useState<{ taskId: string; date: string } | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return parseFolderIdList(window.localStorage.getItem(EXPANDED_FOLDERS_STORAGE_KEY));
  });
  const generalTasks = generalTasksForPlanner(tasks);
  const orderedFolders = [...folders].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  const folderIds = orderedFolders.map((folder) => folder.id);
  const folderSensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (typeof window === 'undefined' || folders.length === 0) return;
    if (window.localStorage.getItem(EXPANDED_FOLDERS_STORAGE_KEY) !== null) return;

    const legacyRaw = window.localStorage.getItem(LEGACY_COLLAPSED_FOLDERS_STORAGE_KEY);
    if (legacyRaw === null) return;

    const legacyCollapsedFolderIds = parseFolderIdList(legacyRaw);
    const next = folders
      .map((folder) => folder.id)
      .filter((id) => !legacyCollapsedFolderIds.includes(id));

    setExpandedFolderIds(next);
    window.localStorage.setItem(EXPANDED_FOLDERS_STORAGE_KEY, JSON.stringify(next));
  }, [folders]);

  const add = () => {
    if (tab === 'folders') {
      setFolderModal({});
      return;
    }
    setTaskModalFolderId(null);
    setTaskModalOpen(true);
  };

  const saveNewTask = (value: string) => {
    const titles = value
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);
    if (!titles.length) return;
    saveTasks([
      ...tasks,
      ...titles.map((title) => ({
        id: uid(),
        title,
        completed: false,
        subtasks: [],
        folderId: taskModalFolderId ?? undefined,
        createdAt: new Date().toISOString(),
      })),
    ]);
    setTaskModalOpen(false);
    setTaskModalFolderId(null);
  };

  const saveFolder = (name: string) => {
    if (!folderModal) return;
    const nextName = name.trim();
    if (!nextName) return;
    const nextSortOrder = folders.reduce((max, folder) => Math.max(max, folder.sortOrder ?? 0), -1) + 1;
    saveFolders(
      folderModal.id
        ? folders.map((folder) => (folder.id === folderModal.id ? { ...folder, name: nextName } : folder))
        : [...folders, { id: uid(), name: nextName, sortOrder: nextSortOrder }],
    );
    setFolderModal(null);
  };

  const toggleFolderCollapsed = (folderId: string) => {
    const next = expandedFolderIds.includes(folderId)
      ? expandedFolderIds.filter((id) => id !== folderId)
      : [...expandedFolderIds, folderId];
    setExpandedFolderIds(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(EXPANDED_FOLDERS_STORAGE_KEY, JSON.stringify(next));
    }
  };

  const handleFolderDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const oldIndex = folderIds.indexOf(String(active.id));
    const newIndex = folderIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    saveFolders(
      arrayMove(orderedFolders, oldIndex, newIndex).map((folder, sortOrder) => ({
        ...folder,
        sortOrder,
      })),
    );
  };

  const toggle = (id: string) =>
    saveTasks(
      tasks.map((task) => (task.id === id ? toggleTaskCompletion(task) : task)),
    );
  const select = (id: string) =>
    setSelection((items) => (items.includes(id) ? items.filter((item) => item !== id) : [...items, id]));

  const reorderGeneralTaskList = (orderedIds: string[]) => {
    saveTasks(reorderGeneralTasks(tasks, orderedIds));
  };

  const reorderFolderTaskList = (folderId: string, orderedIds: string[]) => {
    saveTasks(reorderFolderTasks(tasks, folderId, orderedIds));
  };

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

  const recurrenceTarget = (taskId: string, source = tasks) => {
    const target = source.find((task) => task.id === taskId);
    const parent = target?.recurrenceParentId
      ? source.find((task) => task.id === target.recurrenceParentId)
      : undefined;
    const base = isRepeatingTask(target) ? target : isRepeatingTask(parent) ? parent : undefined;
    return target && base ? { target, base } : undefined;
  };

  const deleteRecurringTask = (taskId: string, scope: RecurrenceScope, occurrenceDate: string) => {
    const recurrence = recurrenceTarget(taskId);
    if (!recurrence) return;
    const { target, base } = recurrence;
    const nextTasks = scope === 'series'
      ? tasks.filter((task) => task.id !== base.id && task.recurrenceParentId !== base.id)
      : target.recurrenceParentId
        ? tasks.filter((task) => task.id !== target.id)
        : tasks.map((task) =>
            task.id === base.id ? withRepeatException(task, occurrenceDate) : task,
          );
    saveTasks(nextTasks);
  };

  const remove = (id: string) => {
    const recurrence = recurrenceTarget(id);
    if (recurrence) {
      setRecurrenceDelete({
        taskId: id,
        date: recurrence.target.recurrenceDate ?? recurrence.target.date ?? recurrence.base.date ?? toISO(new Date()),
      });
      setMenuFor(null);
      return;
    }
    if (window.confirm('Видалити завдання?')) {
      saveTasks(tasks.filter((t) => t.id !== id));
    }
  };

  const addSubtask = (id: string) => setSubtaskFor(id);

  const saveSubtask = (id: string, title: string) => {
    saveTasks(
      tasks.map((t) =>
        t.id === id
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

  const saveSubtaskDraft = (title: string) => {
    if (!subtaskDraft) return;
    saveTasks(
      tasks.map((task) =>
        task.id === subtaskDraft.taskId
          ? {
              ...task,
              subtasks: task.subtasks.map((item) =>
                item.id === subtaskDraft.subtaskId ? { ...item, title } : item,
              ),
            }
          : task,
      ),
    );
    setSubtaskDraft(null);
  };

  const addToFolder = (folderId: string) => {
    setTaskModalFolderId(folderId);
    setTaskModalOpen(true);
  };

  const openEditor = (task: Task) => {
    if (task.date) {
      navigate({ to: '/task/$date', params: { date: task.date }, search: { id: task.id } });
    } else {
      setEditing(task);
    }
  };

  const closeEditor = () => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEditing(null);
    requestAnimationFrame(() => window.scrollTo(0, 0));
  };

  const onSaveEdit = (next: Task) => {
    saveTasks(tasks.map((t) => (t.id === next.id ? next : t)));
    closeEditor();
  };

  const copyTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    const text = task ? taskText(task) : '';
    if (text) {
      if (navigator.clipboard) {
        void navigator.clipboard
          .writeText(text)
          .then(() => toast.success('Скопійовано'))
          .catch(() => toast.error('Не вдалося скопіювати'));
      } else {
        toast.error('Буфер обміну недоступний');
      }
    }
  };

  const transferTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    setTransferDraft({
      taskId: id,
      date: task.date ? fromISO(task.date) : new Date(),
      time: task.time ?? '',
    });
    setMenuFor(null);
  };

  const saveTransfer = () => {
    if (!transferDraft || !transferDraft.time) return;
    const date = toISO(transferDraft.date);
    saveTasks(
      tasks.map((task) =>
        task.id === transferDraft.taskId
          ? { ...task, date, time: transferDraft.time, folderId: undefined }
          : task,
      ),
    );
    setTransferDraft(null);
  };

  const sendTask = (id: string) => {
    const task = tasks.find((item) => item.id === id);
    if (!task) return;
    const text = taskText(task);
    if (text && navigator.share) void navigator.share({ text }).catch(() => undefined);
    if (text && !navigator.share) void navigator.clipboard?.writeText(text);
  };

  const subtaskAction = (taskId: string, subId: string, action: 'edit' | 'copy' | 'delete') => {
    if (action === 'edit') {
      const subtask = tasks
        .find((task) => task.id === taskId)
        ?.subtasks.find((item) => item.id === subId);
      if (subtask) setSubtaskDraft({ taskId, subtaskId: subId, initialValue: taskText(subtask) });
      return;
    }
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
        return task;
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
  const stopFolderDragActivation = (event: { stopPropagation: () => void }) => {
    event.stopPropagation();
  };

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
          <SortableTaskList
            tasks={generalTasks}
            variant="list"
            selectedIds={selection}
            subtaskTogglePlacement="bottom-right"
            onToggle={toggle}
            onSelect={select}
            onMenu={(taskId) => setMenuFor(taskId)}
            onToggleSubtask={toggleSub}
            onEditSubtask={(taskId, subtaskId) => subtaskAction(taskId, subtaskId, 'edit')}
            onDeleteSubtask={(taskId, subtaskId) => subtaskAction(taskId, subtaskId, 'delete')}
            onAddSubtask={addSubtask}
            onEdit={(taskId) => {
              const task = tasks.find((item) => item.id === taskId);
              if (task) openEditor(task);
            }}
            onTransfer={transferTask}
            onSend={sendTask}
            onDelete={remove}
            onCopy={copyTask}
            onReorder={reorderGeneralTaskList}
            itemClassName="glass"
            itemStyle={{
              borderRadius: 12,
              overflow: 'hidden',
              background: 'rgba(0,0,0,0.76)',
            }}
          />
        ) : tab === 'folders' && folders.length > 0 ? (
          <DndContext
            sensors={folderSensors}
            collisionDetection={closestCenter}
            onDragEnd={handleFolderDragEnd}
          >
            <SortableContext items={folderIds} strategy={verticalListSortingStrategy}>
              {orderedFolders.map((folder) => {
                const collapsed = !expandedFolderIds.includes(folder.id);
                const folderTasks = folderTasksForPlanner(tasks, folder.id);

                return (
                  <SortableFolderCard key={folder.id} folder={folder}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 10,
                        padding: '14px 16px',
                        borderBottom: collapsed ? 'none' : '1px solid var(--hairline)',
                      }}
                    >
                      <button
                        onMouseDown={stopFolderDragActivation}
                        onTouchStart={stopFolderDragActivation}
                        onClick={() => toggleFolderCollapsed(folder.id)}
                        aria-label={collapsed ? 'Розгорнути папку' : 'Згорнути папку'}
                        style={{
                          border: 'none',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'var(--txt-muted)',
                          width: 30,
                          height: 30,
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        {collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <FolderIcon size={16} color="var(--gold-text)" />
                      <span
                        className="gold-text"
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          flex: 1,
                          minWidth: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {folder.name}
                      </span>
                      <button
                        onMouseDown={stopFolderDragActivation}
                        onTouchStart={stopFolderDragActivation}
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
                        onMouseDown={stopFolderDragActivation}
                        onTouchStart={stopFolderDragActivation}
                        onClick={() => setFolderModal({ id: folder.id, initialValue: folder.name })}
                        aria-label="Редагувати папку"
                        style={{
                          border: 'none',
                          background: 'rgba(255,255,255,0.08)',
                          color: 'var(--txt-muted)',
                          width: 30,
                          height: 30,
                          borderRadius: 999,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onMouseDown={stopFolderDragActivation}
                        onTouchStart={stopFolderDragActivation}
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
                    {!collapsed && folderTasks.length > 0 && (
                      <div
                        onMouseDown={stopFolderDragActivation}
                        onTouchStart={stopFolderDragActivation}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 3,
                          paddingTop: 3,
                        }}
                      >
                        <SortableTaskList
                          tasks={folderTasks}
                          variant="list"
                          selectedIds={selection}
                          subtaskTogglePlacement="bottom-right"
                          onToggle={toggle}
                          onSelect={select}
                          onMenu={(taskId) => setMenuFor(taskId)}
                          onToggleSubtask={toggleSub}
                          onEditSubtask={(taskId, subtaskId) =>
                            subtaskAction(taskId, subtaskId, 'edit')
                          }
                          onDeleteSubtask={(taskId, subtaskId) =>
                            subtaskAction(taskId, subtaskId, 'delete')
                          }
                          onAddSubtask={addSubtask}
                          onEdit={(taskId) => {
                            const task = tasks.find((item) => item.id === taskId);
                            if (task) openEditor(task);
                          }}
                          onTransfer={transferTask}
                          onSend={sendTask}
                          onDelete={remove}
                          onCopy={copyTask}
                          onReorder={(orderedIds) => reorderFolderTaskList(folder.id, orderedIds)}
                          itemClassName="glass"
                          itemStyle={{
                            borderRadius: 12,
                            overflow: 'hidden',
                            background: 'rgba(18,18,20,0.76)',
                          }}
                        />
                      </div>
                    )}
                  </SortableFolderCard>
                );
              })}
            </SortableContext>
          </DndContext>
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
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        className="app-shell-floating-action"
        onClick={add}
        aria-label="Створити"
        style={{
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
        <EditModal task={editing} onClose={closeEditor} onSave={onSaveEdit} />
      )}
      {taskModalOpen && (
        <SubtaskModal
          heading="Нове завдання"
          placeholder="Завдання"
          onClose={() => setTaskModalOpen(false)}
          onSave={saveNewTask}
        />
      )}
      {subtaskFor && (
        <SubtaskModal
          onClose={() => setSubtaskFor(null)}
          onSave={(title) => saveSubtask(subtaskFor, title)}
        />
      )}
      {subtaskDraft && (
        <SubtaskModal
          heading="Редагування підзадачі"
          initialValue={subtaskDraft.initialValue}
          onClose={() => setSubtaskDraft(null)}
          onSave={saveSubtaskDraft}
        />
      )}
      {folderModal && (
        <SubtaskModal
          heading={folderModal.id ? 'Редагування папки' : 'Нова папка'}
          placeholder="Назва папки"
          initialValue={folderModal.initialValue}
          onClose={() => setFolderModal(null)}
          onSave={saveFolder}
        />
      )}
      {transferDraft && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 18,
          }}
        >
          <div
            className="glass"
            style={{
              width: 'min(420px, 100%)',
              borderRadius: 24,
              padding: '0 0 18px',
              background: 'rgba(0,0,0,0.98)',
              border: '1px solid rgba(255,255,255,0.10)',
              overflow: 'hidden',
            }}
          >
            <Calendar
              mode="single"
              selected={transferDraft.date}
              onSelect={(date) => {
                if (!date) return;
                setTransferDraft((current) => (current ? { ...current, date } : current));
              }}
              locale={uk}
              formatters={{
                formatCaption: (date) =>
                  date.toLocaleDateString('uk-UA', { month: 'long', year: 'numeric' }),
                formatWeekdayName: (date) =>
                  date.toLocaleDateString('uk-UA', { weekday: 'short' }),
              }}
              className="w-full"
            />
            <div style={{ padding: '0 18px' }}>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                height: 48,
                marginTop: 12,
                borderRadius: 16,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(0,0,0,0.06)',
                color: 'var(--txt)',
                padding: '0 14px',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              <span style={{ color: 'var(--txt-muted)' }}>Час</span>
              <input
                type="time"
                value={transferDraft.time}
                onClick={(event) => event.currentTarget.showPicker?.()}
                onFocus={(event) => event.currentTarget.showPicker?.()}
                onChange={(event) =>
                  setTransferDraft((current) =>
                    current ? { ...current, time: event.target.value } : current,
                  )
                }
                style={{
                  flex: 1,
                  height: '100%',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--txt)',
                  fontSize: 16,
                  fontWeight: 700,
                  textAlign: 'right',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
            </label>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button
                onClick={() => setTransferDraft(null)}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 999,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'var(--txt-dim)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Скасувати
              </button>
              <button
                onClick={saveTransfer}
                disabled={!transferDraft.time}
                style={{
                  flex: 1,
                  height: 44,
                  borderRadius: 999,
                  border: 'var(--accent-45) 1px solid',
                  background: 'linear-gradient(135deg, var(--accent-18) 10%, var(--accent-06) 100%)',
                  color: 'var(--gold-text-strong)',
                  fontWeight: 700,
                  opacity: transferDraft.time ? 1 : 0.5,
                  cursor: transferDraft.time ? 'pointer' : 'not-allowed',
                }}
              >
                Зберегти
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {menuFor && (
        <ContextActionSheet
          onClose={() => setMenuFor(null)}
          onAction={(key) => {
            menuAction(key);
          }}
        />
      )}
      {recurrenceDelete && (
        <RecurrenceDeleteSheet
          onOccurrence={() => {
            const draft = recurrenceDelete;
            setRecurrenceDelete(null);
            deleteRecurringTask(draft.taskId, 'occurrence', draft.date);
          }}
          onSeries={() => {
            const draft = recurrenceDelete;
            setRecurrenceDelete(null);
            deleteRecurringTask(draft.taskId, 'series', draft.date);
          }}
          onCancel={() => setRecurrenceDelete(null)}
        />
      )}
    </AppShell>
  );
}
