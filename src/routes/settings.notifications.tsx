import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { IOSSwitch } from "../components/IOSSwitch";
import { storage } from "../lib/storage";
import type { NotificationSettings } from "../types";

export const Route = createFileRoute("/settings/notifications")({ component: NotifSettings });

function NotifSettings() {
  const navigate = useNavigate();
  const [s, setS] = useState<NotificationSettings>({ enabled:false, silent:true, notifyBefore:"20 хвилин", melody:"За замовчуванням" });
  useEffect(() => { setS(storage.getNotif()); }, []);
  const update = (p: Partial<NotificationSettings>) => { const n = { ...s, ...p }; setS(n); storage.setNotif(n); };

  return (
    <AppShell showToolbar={false}>
      <div className="flex items-center px-4 h-14 border-b" style={{ borderColor: "var(--border-soft)" }}>
        <button onClick={()=>navigate({ to: "/" })} className="w-10 h-10 flex items-center justify-center"><ChevronLeft size={28} color="var(--accent)" /></button>
        <span className="flex-1 text-center text-[17px]">Налаштування сповіщень</span>
        <div className="w-10" />
      </div>
      <div className="mt-2">
        <SRow label="Сповіщення" right={<IOSSwitch checked={s.enabled} onChange={v=>update({enabled:v})} />} />
        <SRow label="Без звуку" right={<IOSSwitch checked={s.silent} onChange={v=>update({silent:v})} />} />
        <SRow label="Повідомити за" right={<span style={{ color: "var(--accent)" }} className="text-[17px]">{s.notifyBefore}</span>} />
        <SRow label="Мелодія" right={<span style={{ color: "var(--accent)" }} className="text-[17px]">{s.melody}</span>} />
      </div>
    </AppShell>
  );
}
function SRow({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 h-[80px] border-b" style={{ borderColor: "var(--border-soft)" }}>
      <span className="text-[17px]">{label}</span>{right}
    </div>
  );
}
