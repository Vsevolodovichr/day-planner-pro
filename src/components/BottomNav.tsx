import { Link, useLocation } from '@tanstack/react-router';
import { ListChecks, Folder, FileText, CalendarDays, Settings } from 'lucide-react';

const items = [
  { to: '/', Icon: ListChecks, label: 'Головна' },
  { to: '/general', Icon: Folder, label: 'Завдання' },
  { to: '/notes', Icon: FileText, label: 'Нотатки' },
  { to: '/calendar', Icon: CalendarDays, label: 'Календар' },
  { to: '/settings/notifications', Icon: Settings, label: 'Налаштування' },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav
      className="glass"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: `calc(14px + env(safe-area-inset-bottom))`,
        width: 'calc(100% - 24px)',
        maxWidth: 406,
        zIndex: 40,
        borderRadius: 24,
        padding: '8px 6px',
        display: 'flex',
        alignItems: 'stretch',
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.02) 100%)',
      }}
    >
      {items.map(({ to, Icon, label }) => {
        const active =
          loc.pathname === to ||
          (to === '/settings/notifications' && loc.pathname.startsWith('/settings'));
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: 18,
              padding: '6px 2px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              textDecoration: 'none',
              color: active ? 'var(--gold-text-strong)' : 'rgba(244,245,247,0.46)',
              background: active
                ? 'linear-gradient(180deg, var(--accent-18) 0%, var(--accent-04) 100%)'
                : 'transparent',
              border: active ? '1px solid var(--accent-40)' : '1px solid transparent',
            }}
          >
            <Icon size={20} strokeWidth={active ? 2 : 1.6} />
            <span
              style={{
                fontSize: 9.5,
                letterSpacing: 0.1,
                fontWeight: active ? 600 : 500,
                whiteSpace: 'nowrap',
              }}
            >
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
