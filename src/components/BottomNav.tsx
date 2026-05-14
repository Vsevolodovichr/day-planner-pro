import { Link, useLocation } from '@tanstack/react-router';
import { ListChecks, Folder, FileText, ClipboardPen, CalendarDays, Settings, BookOpen } from 'lucide-react';

const items = [
  { to: '/', Icon: ListChecks, label: 'Головна' },
  { to: '/general', Icon: BookOpen, label: 'Завдання' },
  { to: '/notes', Icon: ClipboardPen, label: 'Нотатки' },
  { to: '/calendar', Icon: CalendarDays, label: 'Календар' },
  { to: '/settings/notifications', Icon: Settings, label: 'Налаштування' },
] as const;

export function BottomNav() {
  const loc = useLocation();
  return (
    <nav className="glass app-bottom-nav">
      {items.map(({ to, Icon, label }) => {
        const active =
          loc.pathname === to ||
          (to === '/settings/notifications' && loc.pathname.startsWith('/settings'));
        return (
          <Link
            key={to}
            to={to}
            aria-label={label}
            className={`app-bottom-nav__item${active ? ' is-active' : ''}`}
          >
            <Icon size={36} strokeWidth={active ? 1.2 : 1.0} />

          </Link>
        );
      })}
    </nav>
  );
}
