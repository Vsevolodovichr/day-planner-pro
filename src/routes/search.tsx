import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useFolders, useTasks, useNotes } from '../components/Hooks';
import { taskText } from '../lib/task-utils';

export const Route = createFileRoute('/search')({ component: SearchScreen });

function SearchScreen() {
  const [q, setQ] = useState('');
  const navigate = useNavigate();
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const { folders } = useFolders();
  const ql = q.toLowerCase();
  const t = q
    ? tasks.filter((x) =>
        [taskText(x), ...x.subtasks.map(taskText)].join('\n').toLowerCase().includes(ql),
      )
    : [];
  const n = q ? notes.filter((x) => (x.title + x.text).toLowerCase().includes(ql)) : [];
  const f = q ? folders.filter((x) => x.name.toLowerCase().includes(ql)) : [];

  return (
    <AppShell>
      <div className="px-3 pt-3">
        <div className="rounded-2xl p-3" style={{ background: 'var(--card-soft)' }}>
          <div
            className="flex items-center gap-3 px-3 h-11 rounded-xl"
            style={{ background: '#3A3D42' }}
          >
            <SearchIcon size={18} color="var(--text-muted)" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Пошук..."
              className="field-input field-input--bare flex-1"
            />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {t.map((x) => (
            <button
              key={x.id}
              onClick={() =>
                x.date
                  ? navigate({ to: '/task/$date', params: { date: x.date }, search: { id: x.id } })
                  : navigate({ to: '/general' })
              }
              className="rounded-xl px-4 py-3"
              style={{
                width: '100%',
                background: 'var(--card-soft)',
                color: 'var(--txt-main)',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {taskText(x)}
            </button>
          ))}
          {n.map((x) => (
            <button
              key={x.id}
              onClick={() => navigate({ to: '/notes/$id', params: { id: x.id } })}
              className="rounded-xl px-4 py-3"
              style={{
                width: '100%',
                background: 'var(--card-soft)',
                color: 'var(--txt-main)',
                textAlign: 'left',
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
              }}
            >
              {x.title || x.text.slice(0, 40)}
            </button>
          ))}
          {f.map((x) => (
            <button
              key={x.id}
              onClick={() => navigate({ to: '/general' })}
              className="rounded-xl px-4 py-3"
              style={{
                width: '100%',
                background: 'var(--card-soft)',
                color: 'var(--txt-main)',
                textAlign: 'left',
              }}
            >
              {x.name}
            </button>
          ))}
          {q && t.length === 0 && n.length === 0 && f.length === 0 && (
            <p className="text-center mt-20" style={{ color: 'var(--text-muted)' }}>
              Нічого не знайдено
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
