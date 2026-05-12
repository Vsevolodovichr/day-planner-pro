import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { AppShell } from '../components/AppShell';
import { TaskRow } from '../components/TaskRow';
import { useFolders, useTasks } from '../components/Hooks';
import { uid } from '../lib/storage';
import { Plus } from 'lucide-react';

export const Route = createFileRoute('/general')({ component: General });

function General() {
  const [tab, setTab] = useState<'tasks' | 'folders'>('tasks');
  const { tasks, save: saveTasks } = useTasks();
  const { folders, save: saveFolders } = useFolders();
  const generalTasks = tasks.filter((task) => !task.date && !task.folderId);
  const add = () => {
    if (tab === 'folders') {
      const name = window.prompt('Назва папки');
      if (name) saveFolders([...folders, { id: uid(), name }]);
      return;
    }
    const title = window.prompt('Назва завдання');
    if (title)
      saveTasks([
        ...tasks,
        { id: uid(), title, completed: false, subtasks: [], createdAt: new Date().toISOString() },
      ]);
  };
  const toggle = (id: string) =>
    saveTasks(
      tasks.map((task) => (task.id === id ? { ...task, completed: !task.completed } : task)),
    );
  const moveToDate = (id: string) => {
    const date = window.prompt('Дата у форматі YYYY-MM-DD');
    if (date) saveTasks(tasks.map((task) => (task.id === id ? { ...task, date } : task)));
  };
  return (
    <AppShell>
      <div className="px-[18px] pt-6">
        <div
          className="flex items-center gap-3 rounded-[20px] px-4 h-[66px]"
          style={{ background: 'var(--card-dark)', boxShadow: '0 10px 22px rgba(0,0,0,0.26)' }}
        >
          <div className="flex-1 flex h-full">
            {(['tasks', 'folders'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className="flex-1 text-left text-[23px] transition-colors"
                style={{ color: tab === k ? 'var(--accent)' : 'var(--text-dim)' }}
              >
                {k === 'tasks' ? (
                  <>
                    Загальні завдання <sup className="text-[12px]">{generalTasks.length}</sup>
                  </>
                ) : (
                  'Папки'
                )}
              </button>
            ))}
          </div>
          <button
            onClick={add}
            className="h-[52px] w-[52px] rounded-full flex items-center justify-center shrink-0"
            style={{
              background: 'var(--accent-strong)',
              boxShadow: '0 0 16px color-mix(in srgb, var(--accent) 28%, transparent)',
            }}
          >
            <Plus size={30} strokeWidth={1.6} color="#D7FFFC" />
          </button>
        </div>
        {tab === 'tasks' && generalTasks.length > 0 && (
          <div
            className="overflow-hidden rounded-b-[18px]"
            style={{ background: 'var(--card-soft)' }}
          >
            {generalTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                variant="list"
                onToggle={() => toggle(task.id)}
                onSelect={() => moveToDate(task.id)}
                onMenu={() => moveToDate(task.id)}
              />
            ))}
          </div>
        )}
        {tab === 'folders' && folders.length > 0 && (
          <div
            className="overflow-hidden rounded-b-[18px]"
            style={{ background: 'var(--card-soft)' }}
          >
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="border-b last:border-b-0"
                style={{ borderColor: 'rgba(255,255,255,0.07)' }}
              >
                <div className="px-5 py-4 text-[22px]">{folder.name}</div>
                {tasks
                  .filter((task) => task.folderId === folder.id)
                  .map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      variant="list"
                      onToggle={() => toggle(task.id)}
                      onSelect={() => moveToDate(task.id)}
                      onMenu={() => moveToDate(task.id)}
                    />
                  ))}
              </div>
            ))}
          </div>
        )}
        {((tab === 'tasks' && generalTasks.length === 0) ||
          (tab === 'folders' && folders.length === 0)) && (
          <div className="flex flex-col items-center justify-center text-center mt-44 px-10">
            <p className="text-[17px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              {tab === 'tasks'
                ? "Створюйте завдання\nбез прив'язки до дати та часу"
                : 'Створіть папку,\nщоб організувати завдання'}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
