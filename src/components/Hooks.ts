import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  createFolder,
  createNote,
  createTask,
  deleteFolder,
  deleteNote,
  deleteTask,
  getFolders,
  getNotes,
  getTasks,
  getUnreadNotifications,
  markNotificationRead,
  updateFolder,
  updateNote,
  updateTask,
} from '../lib/api';
import { applyAutoMove } from '../lib/task-utils';
import type { AppNotification, Folder, Task, Note } from '../types';

const STALE_TIME_MS = 60_000;

export function useTasks() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['tasks', user?.id] as const, [user?.id]);

  const { data: tasks = [] } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    staleTime: STALE_TIME_MS,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const loaded = await getTasks();
      const moved = applyAutoMove(loaded);
      moved
        .filter((task) => loaded.find((item) => item.id === task.id)?.date !== task.date)
        .forEach((task) => {
          void updateTask(task, { syncSubtasks: false });
        });
      return moved;
    },
  });

  useEffect(() => {
    if (!user?.id) queryClient.setQueryData(queryKey, []);
  }, [queryClient, queryKey, user?.id]);

  const save = useCallback((nextTasks: Task[]) => {
    const previousTasks = queryClient.getQueryData<Task[]>(queryKey) ?? [];
    queryClient.setQueryData(queryKey, nextTasks);
    const previousById = new Map(previousTasks.map((task) => [task.id, task]));
    const nextById = new Map(nextTasks.map((task) => [task.id, task]));

    previousTasks
      .filter((task) => !nextById.has(task.id))
      .forEach((task) => {
        void deleteTask(task.id);
      });

    nextTasks.forEach((task) => {
      const previous = previousById.get(task.id);
      if (!previous) {
        void createTask(task).then((created) => {
          queryClient.setQueryData<Task[]>(queryKey, (current = []) =>
            current.map((item) => (item.id === task.id ? created : item)),
          );
        });
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(task)) {
        void updateTask(task, {
          syncSubtasks: JSON.stringify(previous.subtasks) !== JSON.stringify(task.subtasks),
        });
      }
    });
  }, [queryClient, queryKey]);

  return { tasks, save };
}
export function useNotes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['notes', user?.id] as const, [user?.id]);

  const { data: notes = [] } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    staleTime: STALE_TIME_MS,
    queryFn: getNotes,
  });

  const save = useCallback(async (nextNotes: Note[]) => {
    const previousNotes = queryClient.getQueryData<Note[]>(queryKey) ?? [];
    queryClient.setQueryData(queryKey, nextNotes);
    const previousById = new Map(previousNotes.map((note) => [note.id, note]));
    const nextById = new Map(nextNotes.map((note) => [note.id, note]));
    const operations: Promise<unknown>[] = [];

    previousNotes
      .filter((note) => !nextById.has(note.id))
      .forEach((note) => {
        operations.push(deleteNote(note.id));
      });

    nextNotes.forEach((note) => {
      const previous = previousById.get(note.id);
      if (!previous) {
        operations.push(
          createNote(note).then((created) => {
            queryClient.setQueryData<Note[]>(queryKey, (current = []) =>
              current.map((item) => (item.id === note.id ? created : item)),
            );
          }),
        );
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(note)) {
        operations.push(updateNote(note));
      }
    });

    await Promise.all(operations);
  }, [queryClient, queryKey]);

  return { notes, save };
}

export function useFolders() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['folders', user?.id] as const, [user?.id]);

  const { data: folders = [] } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    staleTime: STALE_TIME_MS,
    queryFn: getFolders,
  });

  const save = useCallback((nextFolders: Folder[]) => {
    const previousFolders = queryClient.getQueryData<Folder[]>(queryKey) ?? [];
    queryClient.setQueryData(queryKey, nextFolders);

    const previousById = new Map(previousFolders.map((folder) => [folder.id, folder]));
    const nextById = new Map(nextFolders.map((folder) => [folder.id, folder]));

    previousFolders
      .filter((folder) => !nextById.has(folder.id))
      .forEach((folder) => {
        void deleteFolder(folder.id);
      });

    nextFolders.forEach((folder) => {
      const previous = previousById.get(folder.id);
      if (!previous) {
        void createFolder(folder).then((created) => {
          queryClient.setQueryData<Folder[]>(queryKey, (current = []) =>
            current.map((item) => (item.id === folder.id ? created : item)),
          );
        });
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(folder)) {
        void updateFolder(folder);
      }
    });
  }, [queryClient, queryKey]);

  return { folders, save };
}

export function useUnreadNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['notifications', 'unread', user?.id] as const, [user?.id]);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    await queryClient.invalidateQueries({ queryKey });
  }, [queryClient, queryKey, user?.id]);

  const { data: notifications = [] } = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    staleTime: 15_000,
    queryFn: () => getUnreadNotifications().catch(() => []),
    refetchInterval: (query) => {
      if (typeof document !== 'undefined' && document.hidden) return false;
      return query.state.data?.length ? 30_000 : 60_000;
    },
  });

  useEffect(() => {
    if (!user?.id) queryClient.setQueryData(queryKey, []);
  }, [queryClient, queryKey, user?.id]);

  const markRead = useCallback((id: string) => {
    queryClient.setQueryData<AppNotification[]>(queryKey, (current = []) =>
      current.filter((notification) => notification.id !== id),
    );
    void markNotificationRead(id);
  }, [queryClient, queryKey]);

  return { notifications, refresh, markRead };
}
