export type Task = {
  id: string;
  title: string;
  note?: string;
  date?: string;
  completed: boolean;
  completedAt?: string;
  subtasks: Task[];
  time?: string;
  repeat?: 'none' | 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly' | 'flexible';
  autoMove?: boolean;
  contact?: string;
  color?: string;
  plannerOrder?: number;
  createdAt: string;
  folderId?: string;
};
export type Note = {
  id: string;
  title: string;
  text: string;
  createdAt: string;
  updatedAt: string;
};
export type Folder = { id: string; name: string };
export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: string;
  entityType?: string;
  entityId?: string;
  isRead: boolean;
  createdAt: string;
};
export type NotificationSettings = {
  enabled: boolean;
  silent: boolean;
  notifyBefore: string;
  melody: string;
};
