import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useTasks, useNotes } from '../components/Hooks';

export const Route = createFileRoute('/search')({ component: SearchScreen });

function SearchScreen() {
  const [q, setQ] = useState('');
  const { tasks } = useTasks();
  const { notes } = useNotes();
  const ql = q.toLowerCase();
  const t = q ? tasks.filter((x) => x.title.toLowerCase().includes(ql)) : [];
  const n = q ? notes.filter((x) => (x.title + x.text).toLowerCase().includes(ql)) : [];

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
              className="flex-1 bg-transparent text-[16px]"
            />
          </div>
        </div>
        <div className="mt-3 space-y-2">
          {t.map((x) => (
            <div
              key={x.id}
              className="rounded-xl px-4 py-3"
              style={{ background: 'var(--card-soft)' }}
            >
              {x.title}
            </div>
          ))}
          {n.map((x) => (
            <div
              key={x.id}
              className="rounded-xl px-4 py-3"
              style={{ background: 'var(--card-soft)' }}
            >
              {x.title || x.text.slice(0, 40)}
            </div>
          ))}
          {q && t.length === 0 && n.length === 0 && (
            <p className="text-center mt-20" style={{ color: 'var(--text-muted)' }}>
              Нічого не знайдено
            </p>
          )}
        </div>
      </div>
    </AppShell>
  );
}
