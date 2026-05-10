import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "../components/AppShell";
import { CircularPlusButton } from "../components/CircularPlusButton";
import { useNotes } from "../components/Hooks";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/notes")({ component: Notes });

function Notes() {
  const { notes } = useNotes();
  const navigate = useNavigate();
  return (
    <AppShell>
      <div className="px-3 pt-3">
        <div className="flex items-center justify-between rounded-2xl px-5 h-[68px]" style={{ background: "var(--card-soft)" }}>
          <span className="text-[20px]" style={{ color: "var(--accent)" }}>Нотатки</span>
          <CircularPlusButton accent size={48} onClick={()=>navigate({ to: "/notes/new" })} />
        </div>
        {notes.length === 0 ? (
          <div className="flex justify-center mt-44">
            <p className="text-[17px]" style={{ color: "var(--text-muted)" }}>Создайте заметку</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {notes.map(n => (
              <Link key={n.id} to="/notes/$id" params={{ id: n.id }} className="block rounded-2xl px-4 py-3" style={{ background: "var(--card-soft)" }}>
                <div className="text-[17px]">{n.title || "Без назви"}</div>
                <div className="text-[14px] truncate" style={{ color: "var(--text-muted)" }}>{n.text}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
