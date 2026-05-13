import { FormEvent, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/contexts/AuthContext';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      await navigate({ to: '/' });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не вдалося увійти');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppShell showToolbar={false}>
      <div className="flex min-h-[100dvh] items-center justify-center px-5 py-8">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-[28px] border border-white/10 bg-cardSoft/95 p-6"
        >
          <div className="mb-7">
            <p className="text-sm text-textMuted">Angels CRM</p>
            <h1 className="mt-1 text-3xl font-semibold text-textMain">Мої задачі</h1>
          </div>

          <label className="mb-4 block">
            <span className="mb-2 block text-sm text-textMuted">Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-cardDark px-4 text-base text-textMain"
              required
            />
          </label>

          <label className="mb-5 block">
            <span className="mb-2 block text-sm text-textMuted">Пароль</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full rounded-2xl border border-white/10 bg-cardDark px-4 text-base text-textMain"
              required
            />
          </label>

          {error && (
            <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-accent text-base font-semibold text-black disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Увійти'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
