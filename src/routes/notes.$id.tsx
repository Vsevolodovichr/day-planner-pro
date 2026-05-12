import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft, Trash2 } from 'lucide-react';
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
    if (existing)
      await save(notes.map((n) => (n.id === id ? { ...n, title, text, updatedAt: now } : n)));
    else if (title || text)
      await save([
        ...notes,
        { id: id === 'new' ? uid() : id, title, text, createdAt: now, updatedAt: now },
      ]);
  };

  return (
    <AppShell showToolbar={false}>
      <div
        className="flex items-center px-4 h-14 border-b"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <button
          onClick={() => navigate({ to: '/notes' })}
          className="w-10 h-10 flex items-center justify-center"
        >
          <ChevronLeft size={28} color="var(--accent)" />
        </button>
        <span className="flex-1 text-center text-[17px]">Нотатки</span>
        {existing ? (
          <button
            onClick={() => {
              save(notes.filter((n) => n.id !== id));
              navigate({ to: '/notes' });
            }}
            className="w-10 h-10 flex items-center justify-center"
          >
            <Trash2 size={22} color="#FF6961" strokeWidth={1.6} />
          </button>
        ) : (
          <button
            onClick={() => {
              void persist().then(() => navigate({ to: '/notes' }));
            }}
            disabled={!title.trim() && !text.trim()}
            className="h-10 px-3 text-[16px] disabled:opacity-40"
            style={{ color: 'var(--accent)' }}
          >
            Створити
          </button>
        )}
      </div>
      <div className="px-4 pt-5 space-y-4">
        <div
          className="rounded-2xl flex items-center gap-3 px-4 h-16"
          style={{ background: 'var(--card-soft)' }}
        >
          <div
            className="w-[22px] h-[22px] rounded-md border"
            style={{ borderColor: 'var(--text-dim)' }}
          />
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва"
            className="flex-1 bg-transparent text-[18px] border-b"
            style={{ borderColor: 'var(--border-soft)' }}
          />
        </div>
        <div
          className="rounded-2xl px-4 py-4"
          style={{ background: 'var(--card-soft)', minHeight: 380 }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Текст"
            className="w-full bg-transparent text-[17px] resize-none"
            style={{ minHeight: 360 }}
          />
        </div>
      </div>
    </AppShell>
  );
}
