import type { Task } from '../types';
import { toISO } from './date';
import { uid } from './storage';

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
  return tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => taskOccursOnDate(task, iso))
    .sort((a, b) => {
      const orderA = typeof a.task.plannerOrder === 'number' ? a.task.plannerOrder : a.index;
      const orderB = typeof b.task.plannerOrder === 'number' ? b.task.plannerOrder : b.index;
      return orderA === orderB ? a.index - b.index : orderA - orderB;
    })
    .map(({ task }) => task);
}

export function reorderTasksForDate(tasks: Task[], iso: string, orderedIds: string[]): Task[] {
  const ordered = new Map(orderedIds.map((id, index) => [id, index + 1]));
  const dayTaskIds = new Set(tasksForDate(tasks, iso).map((task) => task.id));

  return tasks.map((task) => {
    if (!dayTaskIds.has(task.id)) return task;
    const plannerOrder = ordered.get(task.id);
    return typeof plannerOrder === 'number' ? { ...task, plannerOrder } : task;
  });
}

export function generalTasksForPlanner(tasks: Task[]): Task[] {
  return tasks
    .map((task, index) => ({ task, index }))
    .filter(({ task }) => !task.date && !task.folderId)
    .sort((a, b) => {
      const orderA = typeof a.task.plannerOrder === 'number' ? a.task.plannerOrder : a.index;
      const orderB = typeof b.task.plannerOrder === 'number' ? b.task.plannerOrder : b.index;
      return orderA === orderB ? a.index - b.index : orderA - orderB;
    })
    .map(({ task }) => task);
}

export function reorderGeneralTasks(tasks: Task[], orderedIds: string[]): Task[] {
  const ordered = new Map(orderedIds.map((id, index) => [id, index + 1]));
  const generalTaskIds = new Set(generalTasksForPlanner(tasks).map((task) => task.id));

  return tasks.map((task) => {
    if (!generalTaskIds.has(task.id)) return task;
    const plannerOrder = ordered.get(task.id);
    return typeof plannerOrder === 'number' ? { ...task, plannerOrder } : task;
  });
}

export function applyAutoMove(tasks: Task[], todayISO = toISO(new Date())): Task[] {
  let changed = false;
  const moved = tasks.map((task) => {
    if (
      task.autoMove &&
      !task.completed &&
      task.date &&
      task.date < todayISO &&
      (!task.repeat || task.repeat === 'none')
    ) {
      changed = true;
      return { ...task, date: todayISO };
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
