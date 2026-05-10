import { Link, useLocation } from "@tanstack/react-router";
import { ListTodo, FilePlus, FileEdit, CalendarDays, Search, Settings } from "lucide-react";

const items = [
  { to: "/", Icon: ListTodo },
  { to: "/general", Icon: FilePlus },
  { to: "/notes", Icon: FileEdit },
  { to: "/calendar", Icon: CalendarDays },
  { to: "/search", Icon: Search },
  { to: "/settings/notifications", Icon: Settings },
] as const;

export function TopToolbar() {
  const loc = useLocation();
  return (
    <div className="bg-topBar h-[94px] flex items-center justify-between px-6 border-b border-borderSoft">
      {items.map(({ to, Icon }) => {
        const active = loc.pathname === to || (to === "/settings/notifications" && loc.pathname.startsWith("/settings"));
        return (
          <Link key={to} to={to} className="flex items-center justify-center w-10 h-10">
            <Icon size={28} strokeWidth={1.7} color="#42FFF4" style={{ opacity: active ? 1 : 0.85 }} />
          </Link>
        );
      })}
    </div>
  );
}
