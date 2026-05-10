import type { Task, Note, Folder, NotificationSettings } from "../types";

const KEYS = { tasks:"mz_tasks", notes:"mz_notes", folders:"mz_folders", notif:"mz_notif", seeded:"mz_seeded_v1" };

function read<T>(k: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) as T : fallback; } catch { return fallback; }
}
function write<T>(k: string, v: T) { if (typeof window !== "undefined") localStorage.setItem(k, JSON.stringify(v)); }

export const storage = {
  getTasks: (): Task[] => read<Task[]>(KEYS.tasks, []),
  setTasks: (t: Task[]) => write(KEYS.tasks, t),
  getNotes: (): Note[] => read<Note[]>(KEYS.notes, []),
  setNotes: (n: Note[]) => write(KEYS.notes, n),
  getFolders: (): Folder[] => read<Folder[]>(KEYS.folders, []),
  setFolders: (f: Folder[]) => write(KEYS.folders, f),
  getNotif: (): NotificationSettings => read<NotificationSettings>(KEYS.notif, { enabled:false, silent:true, notifyBefore:"20 хвилин", melody:"За замовчуванням" }),
  setNotif: (n: NotificationSettings) => write(KEYS.notif, n),
  seed() {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(KEYS.seeded)) return;
    const now = new Date().toISOString();
    const tasks: Task[] = [
      { id: "s1", title:"Chiffon", date:"2026-05-04", completed:false, subtasks:[], createdAt:now },
      { id: "s2", title:"Hdtvm", date:"2026-05-04", completed:true, subtasks:[], createdAt:now },
      { id: "s3", title:"Nanak", date:"2026-05-04", completed:true, subtasks:[], createdAt:now },
    ];
    write(KEYS.tasks, tasks);
    localStorage.setItem(KEYS.seeded, "1");
  }
};
export const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);
