import type { Task } from '../types';
import { toISO } from './date';
import { uid } from './storage';

const KYIV_TIME_ZONE = 'Europe/Kyiv';
const AUTO_MOVE_CUTOFF_MINUTES = 23 * 60 + 45;
const TASK_ORDERS_STORAGE_KEY = 'mz_task_orders_v2';
const FULL_MOON_DATES = [
  '2026-05-31',
  '2026-06-30',
  '2026-07-29',
  '2026-08-28',
  '2026-09-26',
  '2026-10-26',
  '2026-11-24',
  '2026-12-24',
  '2027-01-22',
  '2027-02-21',
  '2027-03-22',
  '2027-04-21',
  '2027-05-20',
] as const;

type PlannerTaskEntry = { task: Task; index: number };

function taskOrderScope(kind: 'date' | 'folder' | 'general', value?: string): string {
  if (kind === 'general') return 'general';
  return `${kind}:${value ?? ''}`;
}

function readStoredTaskOrders(): Record<string, string[]> {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TASK_ORDERS_STORAGE_KEY) ?? '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(
          (entry): entry is [string, unknown[]] =>
            typeof entry[0] === 'string' && Array.isArray(entry[1]),
        )
        .map(([key, value]) => [key, value.filter((id): id is string => typeof id === 'string')]),
    );
  } catch {
    return {};
  }
}

function storedTaskOrder(scope: string): string[] {
  return readStoredTaskOrders()[scope] ?? [];
}

function saveStoredTaskOrder(scope: string, orderedIds: string[]) {
  if (typeof window === 'undefined') return;
  const orders = readStoredTaskOrders();
  orders[scope] = orderedIds;
  window.localStorage.setItem(TASK_ORDERS_STORAGE_KEY, JSON.stringify(orders));
}

function sortPlannerTaskEntries(entries: PlannerTaskEntry[], orderedIds: string[]): PlannerTaskEntry[] {
  const storedOrder = new Map(orderedIds.map((id, index) => [id, index + 1]));
  return entries.sort((a, b) => {
    const storedA = storedOrder.get(a.task.id);
    const storedB = storedOrder.get(b.task.id);
    if (storedA !== undefined || storedB !== undefined) {
      if (storedA === undefined) return 1;
      if (storedB === undefined) return -1;
      return storedA === storedB ? a.index - b.index : storedA - storedB;
    }

    const orderA = typeof a.task.plannerOrder === 'number' ? a.task.plannerOrder : a.index;
    const orderB = typeof b.task.plannerOrder === 'number' ? b.task.plannerOrder : b.index;
    return orderA === orderB ? a.index - b.index : orderA - orderB;
  });
}

export function taskText(task: Task): string {
  return [task.title, task.note].filter(Boolean).join('\n');
}

export function cloneTask(task: Task, overrides: Partial<Task> = {}): Task {
  const completed = overrides.completed ?? task.completed;
  return {
    ...task,
    ...overrides,
    id: uid(),
    subtasks: task.subtasks.map((subtask) => cloneTask(subtask)),
    completedAt: completed ? new Date().toISOString() : undefined,
    createdAt: new Date().toISOString(),
  };
}

export function newSubtask(title: string): Task {
  return {
    id: uid(),
    title,
    completed: false,
    subtasks: [],
    createdAt: new Date().toISOString(),
  };
}

export function toggleTaskCompletion(task: Task): Task {
  const completed = !task.completed;
  return {
    ...task,
    completed,
    completedAt: completed ? new Date().toISOString() : undefined,
  };
}

function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDay();
}

function monthDay(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDate();
}

function monthDayKey(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getMonth() + 1}-${date.getDate()}`;
}

export function taskOccursOnDate(task: Task, iso: string): boolean {
  if (!task.date) return false;
  if (task.repeatExceptions?.includes(iso)) return false;
  if (task.date === iso) return true;
  if (!task.repeat || task.repeat === 'none' || iso < task.date) return false;

  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekdays') {
    const day = weekday(iso);
    return day >= 1 && day <= 5;
  }
  if (task.repeat === 'weekly') return weekday(iso) === weekday(task.date);
  if (task.repeat === 'monthly') return monthDay(iso) === monthDay(task.date);
  if (task.repeat === 'yearly') return monthDayKey(iso) === monthDayKey(task.date);
  return task.repeat === 'flexible';
}

export function tasksForDate(tasks: Task[], iso: string): Task[] {
  return sortPlannerTaskEntries(
    tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => taskOccursOnDate(task, iso)),
    storedTaskOrder(taskOrderScope('date', iso)),
  )
    .map(({ task }) => task);
}

export function reorderTasksForDate(tasks: Task[], iso: string, orderedIds: string[]): Task[] {
  const ordered = new Map(orderedIds.map((id, index) => [id, index + 1]));
  const dayTaskIds = new Set(tasksForDate(tasks, iso).map((task) => task.id));
  saveStoredTaskOrder(taskOrderScope('date', iso), orderedIds);

  return tasks.map((task) => {
    if (!dayTaskIds.has(task.id)) return task;
    const plannerOrder = ordered.get(task.id);
    return typeof plannerOrder === 'number' ? { ...task, plannerOrder } : task;
  });
}

export function generalTasksForPlanner(tasks: Task[]): Task[] {
  return sortPlannerTaskEntries(
    tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => !task.date && !task.folderId),
    storedTaskOrder(taskOrderScope('general')),
  )
    .map(({ task }) => task);
}

export function reorderGeneralTasks(tasks: Task[], orderedIds: string[]): Task[] {
  const ordered = new Map(orderedIds.map((id, index) => [id, index + 1]));
  const generalTaskIds = new Set(generalTasksForPlanner(tasks).map((task) => task.id));
  saveStoredTaskOrder(taskOrderScope('general'), orderedIds);

  return tasks.map((task) => {
    if (!generalTaskIds.has(task.id)) return task;
    const plannerOrder = ordered.get(task.id);
    return typeof plannerOrder === 'number' ? { ...task, plannerOrder } : task;
  });
}

export function folderTasksForPlanner(tasks: Task[], folderId: string): Task[] {
  return sortPlannerTaskEntries(
    tasks
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => task.folderId === folderId),
    storedTaskOrder(taskOrderScope('folder', folderId)),
  )
    .map(({ task }) => task);
}

export function reorderFolderTasks(
  tasks: Task[],
  folderId: string,
  orderedIds: string[],
): Task[] {
  const ordered = new Map(orderedIds.map((id, index) => [id, index + 1]));
  const folderTaskIds = new Set(folderTasksForPlanner(tasks, folderId).map((task) => task.id));
  saveStoredTaskOrder(taskOrderScope('folder', folderId), orderedIds);

  return tasks.map((task) => {
    if (!folderTaskIds.has(task.id)) return task;
    const plannerOrder = ordered.get(task.id);
    return typeof plannerOrder === 'number' ? { ...task, plannerOrder } : task;
  });
}

function addDaysISO(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function autoMoveBaseDate(now: Date | string): string {
  if (typeof now === 'string') return now;
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: KYIV_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '00';
  const iso = `${value('year')}-${value('month')}-${value('day')}`;
  const minutes = Number(value('hour')) * 60 + Number(value('minute'));
  return minutes >= AUTO_MOVE_CUTOFF_MINUTES ? addDaysISO(iso, 1) : iso;
}

function autoMoveTargetDate(mode: Task['autoMoveMode'], baseDate: string): string | undefined {
  if (mode === 'next_full_moon') return FULL_MOON_DATES.find((date) => date >= baseDate);
  return baseDate;
}

export function applyAutoMove(tasks: Task[], now: Date | string = new Date()): Task[] {
  const baseDate = autoMoveBaseDate(now);
  let changed = false;
  const moved = tasks.map((task) => {
    const targetDate = autoMoveTargetDate(task.autoMoveMode ?? 'next_day', baseDate);
    if (
      task.autoMove &&
      !task.completed &&
      task.date &&
      targetDate &&
      task.date < targetDate &&
      (!task.repeat || task.repeat === 'none')
    ) {
      changed = true;
      return { ...task, date: targetDate };
    }
    return task;
  });
  return changed ? moved : tasks;
}

export function completedDayStreak(tasks: Task[], todayISO = toISO(new Date())): number {
  let streak = 0;
  const cursor = new Date(`${todayISO}T00:00:00`);
  cursor.setDate(cursor.getDate() - 1);

  while (true) {
    const iso = toISO(cursor);
    const dayTasks = tasksForDate(tasks, iso);
    const endOfDay = new Date(`${iso}T23:59:59.999`).getTime();
    const hasUnfinishedTask = dayTasks.some((task) => {
      if (!task.completed || !task.completedAt) return true;
      if (task.repeat && task.repeat !== 'none' && task.date !== iso) return true;
      return new Date(task.completedAt).getTime() > endOfDay;
    });
    if (dayTasks.length === 0 || hasUnfinishedTask) return streak;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
}
