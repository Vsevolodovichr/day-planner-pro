import { Link, useLocation } from '@tanstack/react-router';
import { ListChecks, FilePlus2, FilePenLine, CalendarDays, Search, Settings } from 'lucide-react';

const items = [
  { to: '/', Icon: ListChecks },
  { to: '/general', Icon: FilePlus2 },
  { to: '/notes', Icon: FilePenLine },
  { to: '/calendar', Icon: CalendarDays },
  { to: '/search', Icon: Search },
  { to: '/settings/notifications', Icon: Settings },
] as const;

export function TopToolbar() {
  const loc = useLocation();
  return (
    <div className="bg-topBar h-16 flex items-center justify-between px-4 sm:px-6 border-b border-borderSoft rounded-2xl shrink-0">
      {items.map(({ to, Icon }) => {
        const active =
          loc.pathname === to ||
          (to === '/settings/notifications' && loc.pathname.startsWith('/settings'));
        return (
          <Link key={to} to={to} className="flex items-center justify-center w-9 h-9">
            <Icon
              size={26}
              strokeWidth={1.25}
              color="var(--accent)"
              style={{ opacity: active ? 1 : 0.78 }}
            />
          </Link>
        );
      })}
    </div>
  );
}
