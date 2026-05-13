import { useCallback, useEffect, useRef, useState } from 'react';
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

let sharedNotes: Note[] = [];
const noteListeners = new Set<(notes: Note[]) => void>();

function emitNotes(notes: Note[]) {
  sharedNotes = notes;
  noteListeners.forEach((listener) => listener(notes));
}

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const tasksRef = useRef<Task[]>([]);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      tasksRef.current = [];
      setTasks([]);
      return;
    }
    void getTasks(user?.id).then((loaded) => {
      if (!active) return;
      const moved = applyAutoMove(loaded);
      tasksRef.current = moved;
      setTasks(moved);
      moved
        .filter((task) => loaded.find((item) => item.id === task.id)?.date !== task.date)
        .forEach((task) => {
          void updateTask(task);
        });
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const save = useCallback((nextTasks: Task[]) => {
    const previousTasks = tasksRef.current;
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
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
          setTasks((current) => {
            const updated = current.map((item) => (item.id === task.id ? created : item));
            tasksRef.current = updated;
            return updated;
          });
        });
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(task)) {
        void updateTask(task);
      }
    });
  }, []);

  return { tasks, save };
}
export function useNotes() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>(sharedNotes);
  const notesRef = useRef<Note[]>(sharedNotes);

  useEffect(() => {
    const listener = (nextNotes: Note[]) => {
      notesRef.current = nextNotes;
      setNotes(nextNotes);
    };
    noteListeners.add(listener);
    return () => {
      noteListeners.delete(listener);
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      emitNotes([]);
      return;
    }
    void getNotes(user?.id).then((loaded) => {
      if (!active) return;
      emitNotes(loaded);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const save = useCallback(async (nextNotes: Note[]) => {
    const previousNotes = notesRef.current;
    emitNotes(nextNotes);
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
            emitNotes(notesRef.current.map((item) => (item.id === note.id ? created : item)));
          }),
        );
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(note)) {
        operations.push(updateNote(note));
      }
    });

    await Promise.all(operations);
  }, []);

  return { notes, save };
}

export function useFolders() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const foldersRef = useRef<Folder[]>([]);

  useEffect(() => {
    let active = true;
    if (!user?.id) {
      foldersRef.current = [];
      setFolders([]);
      return;
    }
    void getFolders().then((loaded) => {
      if (!active) return;
      foldersRef.current = loaded;
      setFolders(loaded);
    });
    return () => {
      active = false;
    };
  }, [user?.id]);

  const save = useCallback((nextFolders: Folder[]) => {
    const previousFolders = foldersRef.current;
    foldersRef.current = nextFolders;
    setFolders(nextFolders);

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
          setFolders((current) => {
            const updated = current.map((item) => (item.id === folder.id ? created : item));
            foldersRef.current = updated;
            return updated;
          });
        });
        return;
      }
      if (JSON.stringify(previous) !== JSON.stringify(folder)) {
        void updateFolder(folder);
      }
    });
  }, []);

  return { folders, save };
}

export function useUnreadNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const refresh = useCallback(async () => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }
    const loaded = await getUnreadNotifications().catch(() => []);
    setNotifications(loaded);
  }, [user?.id]);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const markRead = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
    void markNotificationRead(id);
  }, []);

  return { notifications, refresh, markRead };
}
