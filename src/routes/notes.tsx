import { createFileRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router';
import { Pencil, Trash2, Plus, FileText } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useNotes } from '../components/Hooks';

export const Route = createFileRoute('/notes')({ component: Notes });

function Notes() {
  const { notes, save } = useNotes();
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname !== '/notes') return <Outlet />;

  return (
    <AppShell>
      {/* Hero */}
      <div style={{ padding: '24px 18px 12px' }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'var(--txt-dim)',
            fontWeight: 500,
          }}
        >
          Особисті записи
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div
            className="gold-text"
            style={{
              marginTop: 4,
              lineHeight: 1.1,
              fontWeight: 600,
              fontSize: 28,
              letterSpacing: 0.5,
            }}
          >
            Нотатки
          </div>
          <div style={{ fontSize: 13, color: 'var(--txt-muted)' }}>{notes.length}</div>
        </div>
      </div>

      <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
        {notes.length === 0 ? (
          <div
            className="glass"
            style={{
              borderRadius: 22,
              padding: '32px 18px',
              textAlign: 'center',
              marginTop: 12,
            }}
          >
            <div style={{ fontSize: 14, color: 'var(--txt-muted)' }}>
              Створіть свою першу нотатку
            </div>
            <button
              onClick={() => navigate({ to: '/notes/$id', params: { id: 'new' } })}
              style={{
                marginTop: 14,
                height: 44,
                borderRadius: 999,
                border: '1px solid var(--accent-light-50)',
                background: 'var(--gold-shine)',
                color: '#1A1308',
                fontWeight: 600,
                fontSize: 14.5,
                padding: '0 18px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} strokeWidth={2.2} /> Створити
            </button>
          </div>
        ) : (
          notes.map((n) => (
            <section
              key={n.id}
              className="glass"
              style={{
                borderRadius: 18,
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 14px',
                minHeight: 70,
              }}
            >
              <span
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  background: 'var(--accent-10)',
                  border: '1px solid var(--accent-22)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--gold-text-strong)',
                  flexShrink: 0,
                }}
              >
                <FileText size={17} />
              </span>

              <button
                onClick={() => navigate({ to: '/notes/$id', params: { id: n.id } })}
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <div
                  style={{
                    fontSize: 15.5,
                    fontWeight: 500,
                    color: 'var(--txt-main)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {n.title || 'Без назви'}
                </div>
                {n.text && (
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 12.5,
                      color: 'var(--txt-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {n.text}
                  </div>
                )}
              </button>

              <button
                onClick={() => navigate({ to: '/notes/$id', params: { id: n.id } })}
                aria-label="Редагувати"
                style={{
                  border: 'none',
                  background: 'var(--accent-08)',
                  color: 'var(--gold-text-strong)',
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Видалити нотатку?'))
                    save(notes.filter((note) => note.id !== n.id));
                }}
                aria-label="Видалити"
                style={{
                  border: 'none',
                  background: 'rgba(255,90,90,0.10)',
                  color: '#FF8B8B',
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={14} />
              </button>
            </section>
          ))
        )}
      </div>

      {/* FAB */}
      {notes.length > 0 && (
        <button
          onClick={() => navigate({ to: '/notes/$id', params: { id: 'new' } })}
          aria-label="Створити нотатку"
          style={{
            position: 'fixed',
            bottom: 'var(--app-shell-action-bottom, calc(96px + env(safe-area-inset-bottom)))',
            right: 18,
            width: 52,
            height: 52,
            borderRadius: 999,
            border: '1px solid var(--accent-light-50)',
            background: 'var(--gold-shine)',
            color: '#1A1308',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 35,
          }}
        >
          <Plus size={22} strokeWidth={2.4} />
        </button>
      )}
    </AppShell>
  );
}
