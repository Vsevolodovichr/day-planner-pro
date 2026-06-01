import type { QueryClient } from '@tanstack/react-query';
import { openDB, type DBSchema } from 'idb';
import {
  createFolder,
  createNote,
  createTask,
  deleteFolder,
  deleteNote,
  deleteTask,
  updateFolder,
  updateNote,
  updateTask,
} from './api';
import type { Folder, Note, Task } from '../types';

export type OfflineKind = 'tasks' | 'notes' | 'folders';

type EntityByKind = {
  tasks: Task;
  notes: Note;
  folders: Folder;
};

type OfflinePayload = Task | Note | Folder | null;
type OfflineOperation = 'create' | 'update' | 'delete';

type SnapshotRecord = {
  id: string;
  userId: string;
  kind: OfflineKind;
  items: Task[] | Note[] | Folder[];
  updatedAt: number;
};

type OutboxItem = {
  id?: number;
  userId: string;
  kind: OfflineKind;
  operation: OfflineOperation;
  entityId: string;
  payload: OfflinePayload;
  createdAt: number;
  attempts: number;
  lastError?: string;
};

interface OfflineDb extends DBSchema {
  snapshots: {
    key: string;
    value: SnapshotRecord;
  };
  outbox: {
    key: number;
    value: OutboxItem;
    indexes: {
      'by-user': string;
    };
  };
}

type OfflineMutationInput<K extends OfflineKind> = {
  userId: string;
  kind: K;
  operation: OfflineOperation;
  entityId: string;
  payload: EntityByKind[K] | null;
  queryClient: QueryClient;
  execute: () => Promise<EntityByKind[K] | void>;
};

const DB_NAME = 'day-planner-offline-v1';
const DB_VERSION = 1;

const activeSyncTargets = new Map<string, QueryClient>();
let onlineListenerAttached = false;
const syncInFlight = new Set<string>();

function canUseOfflineStore() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function snapshotKey(userId: string, kind: OfflineKind) {
  return `${userId}:${kind}`;
}

function queryKey(kind: OfflineKind, userId: string) {
  return [kind, userId] as const;
}

async function getDb() {
  if (!canUseOfflineStore()) return null;
  return openDB<OfflineDb>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('outbox')) {
        const outbox = db.createObjectStore('outbox', { keyPath: 'id', autoIncrement: true });
        outbox.createIndex('by-user', 'userId');
      }
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function getOfflineSnapshot<K extends OfflineKind>(
  userId: string,
  kind: K,
): Promise<EntityByKind[K][] | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    const record = await db.get('snapshots', snapshotKey(userId, kind));
    if (!record || record.kind !== kind) return null;
    return record.items as EntityByKind[K][];
  } catch {
    return null;
  }
}

export async function setOfflineSnapshot<K extends OfflineKind>(
  userId: string,
  kind: K,
  items: EntityByKind[K][],
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    await db.put('snapshots', {
      id: snapshotKey(userId, kind),
      userId,
      kind,
      items,
      updatedAt: Date.now(),
    });
  } catch {
    return;
  }
}

export async function loadWithOfflineSnapshot<K extends OfflineKind>(
  userId: string,
  kind: K,
  load: () => Promise<EntityByKind[K][]>,
): Promise<EntityByKind[K][]> {
  try {
    const items = await load();
    void setOfflineSnapshot(userId, kind, items);
    return items;
  } catch {
    return (await getOfflineSnapshot(userId, kind)) ?? [];
  }
}

async function enqueueOutbox<K extends OfflineKind>(
  input: Pick<OfflineMutationInput<K>, 'userId' | 'kind' | 'operation' | 'entityId' | 'payload'>,
  error?: unknown,
) {
  const db = await getDb();
  if (!db) return;
  const { userId, kind, operation, entityId, payload } = input;
  await db.add('outbox', {
    userId,
    kind,
    operation,
    entityId,
    payload: payload as OfflinePayload,
    createdAt: Date.now(),
    attempts: 0,
    lastError: error ? errorMessage(error) : undefined,
  });
}

async function getOutboxItems(userId: string) {
  const db = await getDb();
  if (!db) return [];
  const items = await db.getAllFromIndex('outbox', 'by-user', userId);
  return items.sort((a, b) => a.createdAt - b.createdAt || (a.id ?? 0) - (b.id ?? 0));
}

async function updateOutboxItem(item: OutboxItem) {
  if (item.id === undefined) return;
  const db = await getDb();
  if (!db) return;
  await db.put('outbox', item);
}

async function deleteOutboxItem(item: OutboxItem) {
  if (item.id === undefined) return;
  const db = await getDb();
  if (!db) return;
  await db.delete('outbox', item.id);
}

function requirePayload<K extends OfflineKind>(item: OutboxItem): EntityByKind[K] {
  if (!item.payload) throw new Error('Missing offline payload');
  return item.payload as EntityByKind[K];
}

function replaceEntity<K extends OfflineKind>(
  items: EntityByKind[K][],
  oldId: string,
  nextEntity: EntityByKind[K],
) {
  return items.map((item) => (item.id === oldId ? nextEntity : item));
}

function replaceFolderId(items: Task[], oldId: string, newId: string) {
  return items.map((task) => (task.folderId === oldId ? { ...task, folderId: newId } : task));
}

async function updateSnapshotAndCache<K extends OfflineKind>(
  userId: string,
  kind: K,
  queryClient: QueryClient,
  updater: (items: EntityByKind[K][]) => EntityByKind[K][],
) {
  const snapshot = await getOfflineSnapshot(userId, kind);
  if (snapshot) await setOfflineSnapshot(userId, kind, updater(snapshot));
  queryClient.setQueryData<EntityByKind[K][]>(queryKey(kind, userId), (current = []) =>
    updater(current),
  );
}

async function rewriteOutboxReferences<K extends OfflineKind>(
  userId: string,
  kind: K,
  oldId: string,
  newEntity: EntityByKind[K],
) {
  const nextId = newEntity.id;
  const items = await getOutboxItems(userId);

  await Promise.all(
    items.map((item) => {
      let changed = false;
      let payload = item.payload;

      if (item.kind === kind && item.entityId === oldId) {
        item.entityId = nextId;
        changed = true;
      }

      if (item.kind === kind && payload && payload.id === oldId) {
        payload = { ...payload, id: nextId } as OfflinePayload;
        changed = true;
      }

      if (kind === 'folders' && item.kind === 'tasks' && payload && 'folderId' in payload) {
        if (payload.folderId === oldId) {
          payload = { ...payload, folderId: nextId } as Task;
          changed = true;
        }
      }

      if (!changed) return Promise.resolve();
      return updateOutboxItem({ ...item, payload });
    }),
  );
}

async function replaceCreatedEntity<K extends OfflineKind>(
  userId: string,
  kind: K,
  oldId: string,
  newEntity: EntityByKind[K],
  queryClient: QueryClient,
) {
  await updateSnapshotAndCache(userId, kind, queryClient, (items) =>
    replaceEntity(items, oldId, newEntity),
  );

  if (kind === 'folders') {
    await updateSnapshotAndCache(userId, 'tasks', queryClient, (items) =>
      replaceFolderId(items, oldId, newEntity.id),
    );
  }

  await rewriteOutboxReferences(userId, kind, oldId, newEntity);
}

async function executeOutboxItem(item: OutboxItem): Promise<OfflinePayload> {
  if (item.kind === 'tasks') {
    if (item.operation === 'delete') {
      await deleteTask(item.entityId);
      return null;
    }
    const payload = requirePayload<'tasks'>(item);
    return item.operation === 'create' ? createTask(payload) : updateTask(payload);
  }

  if (item.kind === 'notes') {
    if (item.operation === 'delete') {
      await deleteNote(item.entityId);
      return null;
    }
    const payload = requirePayload<'notes'>(item);
    return item.operation === 'create' ? createNote(payload) : updateNote(payload);
  }

  if (item.operation === 'delete') {
    await deleteFolder(item.entityId);
    return null;
  }
  const payload = requirePayload<'folders'>(item);
  return item.operation === 'create' ? createFolder(payload) : updateFolder(payload);
}

export async function runOfflineMutation<K extends OfflineKind>(
  input: OfflineMutationInput<K>,
): Promise<EntityByKind[K] | null> {
  const hasPendingOutbox = (await getOutboxItems(input.userId)).length > 0;

  if (isOffline() || hasPendingOutbox) {
    await enqueueOutbox(input);
    if (!isOffline()) void flushOfflineOutbox(input.userId, input.queryClient);
    return null;
  }

  try {
    const result = await input.execute();
    if (input.operation === 'create' && result) {
      await replaceCreatedEntity(input.userId, input.kind, input.entityId, result, input.queryClient);
      void flushOfflineOutbox(input.userId, input.queryClient);
      return result;
    }
    void flushOfflineOutbox(input.userId, input.queryClient);
    return (result as EntityByKind[K] | undefined) ?? null;
  } catch (error) {
    await enqueueOutbox(input, error);
    return null;
  }
}

export async function flushOfflineOutbox(userId: string, queryClient: QueryClient) {
  if (isOffline() || syncInFlight.has(userId)) return;

  syncInFlight.add(userId);
  try {
    const items = await getOutboxItems(userId);

    for (const item of items) {
      try {
        const result = await executeOutboxItem(item);
        if (item.operation === 'create' && result) {
          await replaceCreatedEntity(
            userId,
            item.kind,
            item.entityId,
            result as EntityByKind[typeof item.kind],
            queryClient,
          );
        }
        await deleteOutboxItem(item);
      } catch (error) {
        await updateOutboxItem({
          ...item,
          attempts: item.attempts + 1,
          lastError: errorMessage(error),
        });
        if (isOffline()) break;
      }
    }
  } finally {
    syncInFlight.delete(userId);
  }
}

export function startOfflineSync(userId: string, queryClient: QueryClient) {
  activeSyncTargets.set(userId, queryClient);

  if (typeof window !== 'undefined' && !onlineListenerAttached) {
    onlineListenerAttached = true;
    window.addEventListener('online', () => {
      activeSyncTargets.forEach((client, targetUserId) => {
        void flushOfflineOutbox(targetUserId, client);
      });
    });
  }

  void flushOfflineOutbox(userId, queryClient);

  return () => {
    if (activeSyncTargets.get(userId) === queryClient) activeSyncTargets.delete(userId);
  };
}
