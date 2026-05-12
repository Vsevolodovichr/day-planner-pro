import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router';
import { Pencil, Trash2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { CircularPlusButton } from '../components/CircularPlusButton';
import { useNotes } from '../components/Hooks';
import { useNavigate } from '@tanstack/react-router';

export const Route = createFileRoute('/notes')({ component: Notes });

function Notes() {
  const { notes, save } = useNotes();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname !== '/notes') return <Outlet />;

  return (
    <AppShell>
      <div className="px-3 pt-3">
        <div
          className="flex items-center justify-between rounded-2xl px-5 h-[68px]"
          style={{ background: 'var(--card-soft)' }}
        >
          <span className="text-[20px]" style={{ color: 'var(--accent)' }}>
            Нотатки
          </span>
          <CircularPlusButton
            accent
            size={48}
            onClick={() => navigate({ to: '/notes/$id', params: { id: 'new' } })}
          />
        </div>
        {notes.length === 0 ? (
          <div className="flex justify-center mt-44">
            <p className="text-[17px]" style={{ color: 'var(--text-muted)' }}>
              Створіть нотатку
            </p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {notes.map((n) => (
              <div
                key={n.id}
                className="flex items-center gap-3 rounded-2xl px-4 py-3"
                style={{ background: 'var(--card-soft)' }}
              >
                <button
                  onClick={() => navigate({ to: '/notes/$id', params: { id: n.id } })}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-[17px]">{n.title || 'Без назви'}</div>
                  <div className="text-[14px] truncate" style={{ color: 'var(--text-muted)' }}>
                    {n.text}
                  </div>
                </button>
                <button
                  onClick={() => navigate({ to: '/notes/$id', params: { id: n.id } })}
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    color: 'var(--accent)',
                    background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
                  }}
                >
                  <Pencil size={19} strokeWidth={1.6} />
                </button>
                <button
                  onClick={() => save(notes.filter((note) => note.id !== n.id))}
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{ color: '#FF6961', background: 'rgba(255,105,97,0.10)' }}
                >
                  <Trash2 size={19} strokeWidth={1.6} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
