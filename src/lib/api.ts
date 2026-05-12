import { getApiUrl } from '@/lib/api-url';
import { authFetch } from '@/integrations/cloudflare/client';
import type { Folder, Note, Task } from '../types';

const API_URL = getApiUrl();

type ApiList<T> = T[] | { data?: T[] };

type ApiTask = {
  id: string;
  title: string;
  description?: string | null;
  status?: string | null;
  due_date?: string | null;
  completed_at?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  folder_id?: string | null;
  repeat_rule?: string | null;
  auto_move?: boolean | number | null;
  color?: string | null;
  planner_order?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type ApiFolder = {
  id: string;
  name: string;
};

type ApiSubtask = {
  id: string;
  title: string;
  completed?: boolean | number | null;
  created_at?: string | null;
};

type ApiNote = {
  id: string;
  title: string;
  content?: string | null;
  created_by?: string | null;
  assigned_to?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function listPayload<T>(payload: ApiList<T>): T[] {
  return Array.isArray(payload) ? payload : (payload.data ?? []);
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await authFetch(`${API_URL}${path}`, options);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return (await response.json()) as T;
}

function taskFromApi(task: ApiTask): Task {
  const dueDate = task.due_date ?? undefined;
  return {
    id: task.id,
    title: task.title,
    note: task.description ?? undefined,
    date: dueDate?.slice(0, 10),
    time: dueDate?.includes('T') ? dueDate.slice(11, 16) : undefined,
    completed: task.status === 'done' || Boolean(task.completed_at),
    subtasks: [],
    repeat: (task.repeat_rule as Task['repeat']) ?? 'none',
    autoMove: Boolean(task.auto_move),
    color: task.color ?? undefined,
    plannerOrder: task.planner_order ?? undefined,
    folderId: task.folder_id ?? undefined,
    createdAt: task.created_at ?? new Date().toISOString(),
  };
}

function noteFromApi(note: ApiNote): Note {
  return {
    id: note.id,
    title: note.title,
    text: note.content ?? '',
    createdAt: note.created_at ?? new Date().toISOString(),
    updatedAt: note.updated_at ?? note.created_at ?? new Date().toISOString(),
  };
}

export async function getTasks(userId?: string): Promise<Task[]> {
  const payload = await requestJson<ApiList<ApiTask>>('/api/tasks?limit=100');
  const tasks = listPayload(payload)
    .filter((task) => !userId || task.created_by === userId || task.assigned_to === userId)
    .map(taskFromApi);
  const withSubtasks = await Promise.all(
    tasks.map(async (task) => {
      const subtasks = await getSubtasks(task.id).catch(() => []);
      return { ...task, subtasks };
    }),
  );
  return withSubtasks;
}

function dueDatePayload(task: Task): string | null {
  if (!task.date) return null;
  return task.time ? `${task.date}T${task.time}:00` : task.date;
}

export async function createTask(task: Task): Promise<Task> {
  const created = await requestJson<ApiTask>('/api/tasks', {
    method: 'POST',
    body: JSON.stringify({
      title: task.title,
      description: task.note ?? null,
      status: task.completed ? 'done' : 'todo',
      priority: 'medium',
      due_date: dueDatePayload(task),
      folder_id: task.folderId ?? null,
      repeat_rule: task.repeat ?? null,
      auto_move: task.autoMove ?? false,
      color: task.color ?? null,
      planner_order: task.plannerOrder ?? null,
    }),
  });
  const createdTask = taskFromApi(created);
  await syncSubtasks(createdTask.id, task.subtasks);
  return { ...createdTask, subtasks: task.subtasks };
}

export async function updateTask(task: Task): Promise<Task> {
  const updated = await requestJson<ApiTask>(`/api/tasks/${task.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: task.title,
      description: task.note ?? null,
      status: task.completed ? 'done' : 'todo',
      due_date: dueDatePayload(task),
      folder_id: task.folderId ?? null,
      repeat_rule: task.repeat ?? null,
      auto_move: task.autoMove ?? false,
      color: task.color ?? null,
      planner_order: task.plannerOrder ?? null,
    }),
  });
  await syncSubtasks(task.id, task.subtasks);
  return { ...taskFromApi({ ...updated, ...task }), subtasks: task.subtasks };
}

export async function deleteTask(id: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/tasks/${id}`, { method: 'DELETE' });
}

export async function getNotes(userId?: string): Promise<Note[]> {
  const payload = await requestJson<ApiList<ApiNote>>('/api/notes?limit=100');
  return listPayload(payload)
    .filter((note) => !userId || note.created_by === userId || note.assigned_to === userId)
    .map(noteFromApi);
}

export async function createNote(note: Note): Promise<Note> {
  const created = await requestJson<ApiNote>('/api/notes', {
    method: 'POST',
    body: JSON.stringify({
      title: note.title || 'Без назви',
      content: note.text,
      priority: 'medium',
      status: 'pending',
    }),
  });
  return noteFromApi(created);
}

export async function updateNote(note: Note): Promise<Note> {
  const updated = await requestJson<ApiNote>(`/api/notes/${note.id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      title: note.title || 'Без назви',
      content: note.text,
    }),
  });
  return noteFromApi({ ...updated, ...note });
}

export async function deleteNote(id: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/notes/${id}`, { method: 'DELETE' });
}

function subtaskFromApi(subtask: ApiSubtask): Task {
  return {
    id: subtask.id,
    title: subtask.title,
    completed: Boolean(subtask.completed),
    subtasks: [],
    createdAt: subtask.created_at ?? new Date().toISOString(),
  };
}

export async function getFolders(): Promise<Folder[]> {
  const payload = await requestJson<ApiList<ApiFolder>>('/api/tasks/folders');
  return listPayload(payload).map((folder) => ({ id: folder.id, name: folder.name }));
}

export async function createFolder(folder: Folder): Promise<Folder> {
  const created = await requestJson<ApiFolder>('/api/tasks/folders', {
    method: 'POST',
    body: JSON.stringify({ name: folder.name }),
  });
  return { id: created.id, name: created.name };
}

export async function updateFolder(folder: Folder): Promise<Folder> {
  const updated = await requestJson<ApiFolder>(`/api/tasks/folders/${folder.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ name: folder.name }),
  });
  return { id: updated.id, name: updated.name };
}

export async function deleteFolder(id: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/tasks/folders/${id}`, { method: 'DELETE' });
}

async function getSubtasks(taskId: string): Promise<Task[]> {
  const payload = await requestJson<ApiList<ApiSubtask>>(`/api/tasks/${taskId}/subtasks`);
  return listPayload(payload).map(subtaskFromApi);
}

async function createSubtask(taskId: string, subtask: Task): Promise<Task> {
  const created = await requestJson<ApiSubtask>(`/api/tasks/${taskId}/subtasks`, {
    method: 'POST',
    body: JSON.stringify({ title: subtask.title, completed: subtask.completed }),
  });
  return subtaskFromApi(created);
}

async function updateSubtask(taskId: string, subtask: Task): Promise<Task> {
  const updated = await requestJson<ApiSubtask>(`/api/tasks/${taskId}/subtasks/${subtask.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title: subtask.title, completed: subtask.completed }),
  });
  return subtaskFromApi(updated);
}

async function deleteSubtask(taskId: string, subtaskId: string): Promise<void> {
  await requestJson<{ success: boolean }>(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
    method: 'DELETE',
  });
}

async function syncSubtasks(taskId: string, subtasks: Task[]): Promise<void> {
  const current = await getSubtasks(taskId).catch(() => []);
  const currentIds = new Set(current.map((subtask) => subtask.id));
  const nextIds = new Set(subtasks.map((subtask) => subtask.id));
  await Promise.all(
    current
      .filter((subtask) => !nextIds.has(subtask.id))
      .map((subtask) => deleteSubtask(taskId, subtask.id)),
  );
  await Promise.all(
    subtasks
      .slice(0, 4)
      .map((subtask) =>
        currentIds.has(subtask.id)
          ? updateSubtask(taskId, subtask)
          : createSubtask(taskId, subtask),
      ),
  );
}
