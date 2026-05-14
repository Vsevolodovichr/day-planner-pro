import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, Trash2, Check } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { useNotes } from '../components/Hooks';
import { uid } from '../lib/storage';

export const Route = createFileRoute('/notes/$id')({ component: NoteEditor });

function NoteEditor() {
  const { id } = useParams({ from: '/notes/$id' });
  const navigate = useNavigate();
  const { notes, save } = useNotes();
  const existing = notes.find((n) => n.id === id);
  const [title, setTitle] = useState(existing?.title || '');
  const [text, setText] = useState(existing?.text || '');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setText(existing.text);
    }
  }, [existing]);

  const persist = async () => {
    const now = new Date().toISOString();
    if (existing) {
      await save(notes.map((n) => (n.id === id ? { ...n, title, text, updatedAt: now } : n)));
    } else if (title || text) {
      await save([
        ...notes,
        { id: id === 'new' ? uid() : id, title, text, createdAt: now, updatedAt: now },
      ]);
    }
    navigate({ to: '/notes' });
  };

  const topBtn: React.CSSProperties = {
    height: 38,
    borderRadius: 999,
    background: 'var(--accent-08)',
    border: '1px solid var(--accent-22)',
    padding: '0 12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    cursor: 'pointer',
    color: 'var(--gold-text-strong)',
  };

  return (
    <AppShell showToolbar={false}>
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px',
          background: 'linear-gradient(180deg, rgba(0,0,0,0.85) 70%, transparent 100%)',

        }}
      >
        <button onClick={() => navigate({ to: '/notes' })} style={topBtn} aria-label="Назад">
          <ChevronLeft size={20} />
          <span className="gold-text" style={{ fontSize: 14, fontWeight: 500 }}>
            Назад
          </span>
        </button>

        <span style={{ fontSize: 14, color: 'var(--txt-muted)' }}>
          {existing ? 'Редагування' : 'Нова нотатка'}
        </span>

        {existing ? (
          <button
            onClick={() => {
              if (window.confirm('Видалити нотатку?')) {
                save(notes.filter((n) => n.id !== id));
                navigate({ to: '/notes' });
              }
            }}
            style={{
              ...topBtn,
              background: 'rgba(255,90,90,0.10)',
              border: '1px solid rgba(255,90,90,0.25)',
              color: '#FF8B8B',
            }}
            aria-label="Видалити"
          >
            <Trash2 size={16} />
          </button>
        ) : (
          <button
            onClick={() => void persist()}
            disabled={!title.trim() && !text.trim()}
            style={{
              ...topBtn,
              background: 'var(--gold-shine)',
              border: '1px solid var(--accent-light-50)',
              color: '#1A1308',
              opacity: !title.trim() && !text.trim() ? 0.5 : 1,
            }}
          >
            <Check size={18} strokeWidth={2.2} color="#1A1308" />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1308' }}>Створити</span>
          </button>
        )}
      </div>

      <div
        style={{ padding: '4px 14px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}
      >
        <div className="glass" style={{ borderRadius: 22, padding: '12px 14px' }}>
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 18,
              fontWeight: 500,
              color: 'var(--txt-main)',
            }}
          />
        </div>
        <div className="glass" style={{ borderRadius: 22, padding: '14px 16px', flex: 1 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст…"
            rows={16}
            style={{
              width: '100%',
              minHeight: 320,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 15,
              lineHeight: 1.55,
              color: 'var(--txt-main)',
              resize: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>
    </AppShell>
  );
}
