export type Task = {
  id: string;
  title: string;
  note?: string;
  date?: string;
  completed: boolean;
  subtasks: Task[];
  time?: string;
  repeat?: "none" | "daily" | "weekly" | "monthly";
  autoMove?: boolean;
  contact?: string;
  photos?: string[];
  createdAt: string;
  plannerOrder?: number;
  folderId?: string;
};
export type Note = { id: string; title: string; text: string; createdAt: string; updatedAt: string; };
export type Folder = { id: string; name: string };
export type NotificationSettings = {
  enabled: boolean;
  silent: boolean;
  notifyBefore: string;
  melody: string;
};
