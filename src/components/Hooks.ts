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
import { loadWithOfflineSnapshot, runOfflineMutation, setOfflineSnapshot } from '../lib/offlineStore';
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
      if (!user?.id) return [];
      return loadWithOfflineSnapshot(user.id, 'tasks', async () => {
        const loaded = await getTasks();
        const moved = applyAutoMove(loaded);
        moved
          .filter((task) => loaded.find((item) => item.id === task.id)?.date !== task.date)
          .forEach((task) => {
            void runOfflineMutation({
              userId: user.id,
              kind: 'tasks',
              operation: 'update',
              entityId: task.id,
              payload: task,
              queryClient,
              execute: () => updateTask(task, { syncSubtasks: false }),
            });
          });
        return moved;
      });
    },
  });

  useEffect(() => {
    if (!user?.id) queryClient.setQueryData(queryKey, []);
  }, [queryClient, queryKey, user?.id]);

  const save = useCallback((nextTasks: Task[]) => {
    if (!user?.id) {
      queryClient.setQueryData(queryKey, nextTasks);
      return;
    }

    const userId = user.id;
    const previousTasks = queryClient.getQueryData<Task[]>(queryKey) ?? [];
    queryClient.setQueryData(queryKey, nextTasks);
    const previousById = new Map(previousTasks.map((task) => [task.id, task]));
    const nextById = new Map(nextTasks.map((task) => [task.id, task]));

    void setOfflineSnapshot(userId, 'tasks', nextTasks);

    previousTasks
      .filter((task) => !nextById.has(task.id))
      .forEach((task) => {
        void runOfflineMutation({
          userId,
          kind: 'tasks',
          operation: 'delete',
          entityId: task.id,
          payload: null,
          queryClient,
          execute: () => deleteTask(task.id),
        });
      });

    nextTasks.forEach((task) => {
      const previous = previousById.get(task.id);
      if (!previous) {
        void runOfflineMutation({
          userId,
          kind: 'tasks',
          operation: 'create',
          entityId: task.id,
          payload: task,
          queryClient,
          execute: () => createTask(task),
        });
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(task)) {
        void runOfflineMutation({
          userId,
          kind: 'tasks',
          operation: 'update',
          entityId: task.id,
          payload: task,
          queryClient,
          execute: () =>
            updateTask(task, {
              syncSubtasks: JSON.stringify(previous.subtasks) !== JSON.stringify(task.subtasks),
            }),
        });
      }
    });
  }, [queryClient, queryKey, user?.id]);

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
    queryFn: () => (user?.id ? loadWithOfflineSnapshot(user.id, 'notes', getNotes) : []),
  });

  const save = useCallback(async (nextNotes: Note[]) => {
    if (!user?.id) {
      queryClient.setQueryData(queryKey, nextNotes);
      return;
    }

    const userId = user.id;
    const previousNotes = queryClient.getQueryData<Note[]>(queryKey) ?? [];
    queryClient.setQueryData(queryKey, nextNotes);
    void setOfflineSnapshot(userId, 'notes', nextNotes);
    const previousById = new Map(previousNotes.map((note) => [note.id, note]));
    const nextById = new Map(nextNotes.map((note) => [note.id, note]));
    const operations: Promise<unknown>[] = [];

    previousNotes
      .filter((note) => !nextById.has(note.id))
      .forEach((note) => {
        operations.push(
          runOfflineMutation({
            userId,
            kind: 'notes',
            operation: 'delete',
            entityId: note.id,
            payload: null,
            queryClient,
            execute: () => deleteNote(note.id),
          }),
        );
      });

    nextNotes.forEach((note) => {
      const previous = previousById.get(note.id);
      if (!previous) {
        operations.push(
          runOfflineMutation({
            userId,
            kind: 'notes',
            operation: 'create',
            entityId: note.id,
            payload: note,
            queryClient,
            execute: () => createNote(note),
          }),
        );
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(note)) {
        operations.push(
          runOfflineMutation({
            userId,
            kind: 'notes',
            operation: 'update',
            entityId: note.id,
            payload: note,
            queryClient,
            execute: () => updateNote(note),
          }),
        );
      }
    });

    await Promise.all(operations);
  }, [queryClient, queryKey, user?.id]);

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
    queryFn: () => (user?.id ? loadWithOfflineSnapshot(user.id, 'folders', getFolders) : []),
  });

  const save = useCallback((nextFolders: Folder[]) => {
    if (!user?.id) {
      queryClient.setQueryData(queryKey, nextFolders);
      return;
    }

    const userId = user.id;
    const previousFolders = queryClient.getQueryData<Folder[]>(queryKey) ?? [];
    queryClient.setQueryData(queryKey, nextFolders);

    const previousById = new Map(previousFolders.map((folder) => [folder.id, folder]));
    const nextById = new Map(nextFolders.map((folder) => [folder.id, folder]));

    void setOfflineSnapshot(userId, 'folders', nextFolders);

    previousFolders
      .filter((folder) => !nextById.has(folder.id))
      .forEach((folder) => {
        void runOfflineMutation({
          userId,
          kind: 'folders',
          operation: 'delete',
          entityId: folder.id,
          payload: null,
          queryClient,
          execute: () => deleteFolder(folder.id),
        });
      });

    nextFolders.forEach((folder) => {
      const previous = previousById.get(folder.id);
      if (!previous) {
        void runOfflineMutation({
          userId,
          kind: 'folders',
          operation: 'create',
          entityId: folder.id,
          payload: folder,
          queryClient,
          execute: () => createFolder(folder),
        });
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(folder)) {
        void runOfflineMutation({
          userId,
          kind: 'folders',
          operation: 'update',
          entityId: folder.id,
          payload: folder,
          queryClient,
          execute: () => updateFolder(folder),
        });
      }
    });
  }, [queryClient, queryKey, user?.id]);

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
