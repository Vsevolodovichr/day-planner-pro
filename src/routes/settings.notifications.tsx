import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { storage } from '../lib/storage';
import type { NotificationSettings } from '../types';

export const Route = createFileRoute('/settings/notifications')({ component: NotifSettings });

function NotifSettings() {
  const navigate = useNavigate();
  const [accentColor, setAccentColor] = useState('#42FFF4');
  const [s, setS] = useState<NotificationSettings>({
    enabled: false,
    silent: true,
    notifyBefore: '20 хвилин',
    melody: 'За замовчуванням',
  });
  useEffect(() => {
    const color = localStorage.getItem('mz_accent_color') || '#42FFF4';
    setAccentColor(color);
    applyAccentColor(color);
    setS(storage.getNotif());
  }, []);
  const updateAccentColor = (color: string) => {
    setAccentColor(color);
    localStorage.setItem('mz_accent_color', color);
    applyAccentColor(color);
  };

  return (
    <AppShell showToolbar={false}>
      <div
        className="flex items-center px-4 h-14 border-b"
        style={{ borderColor: 'var(--border-soft)' }}
      >
        <button
          onClick={() => navigate({ to: '/' })}
          className="w-10 h-10 flex items-center justify-center"
        >
          <ChevronLeft size={28} color="var(--accent)" />
        </button>
        <span className="flex-1 text-center text-[17px]">Налаштування</span>
        <div className="w-10" />
      </div>
      <div className="mt-2">
        <SRow
          label="Колір"
          right={
            <input
              type="color"
              value={accentColor}
              onChange={(e) => updateAccentColor(e.target.value)}
              className="h-10 w-14 rounded-xl border-0 bg-transparent p-0"
            />
          }
        />
        <SRow
          label="Повідомити за"
          right={
            <span style={{ color: 'var(--accent)' }} className="text-[17px]">
              {s.notifyBefore}
            </span>
          }
        />
      </div>
    </AppShell>
  );
}
function applyAccentColor(color: string) {
  document.documentElement.style.setProperty('--accent', color);
  document.documentElement.style.setProperty('--accent-strong', color);
  document.documentElement.style.setProperty('--accent-dark', color);
  document.documentElement.style.setProperty('--date-panel-active', color);
}
function SRow({ label, right }: { label: string; right: React.ReactNode }) {
  return (
    <div
      className="flex items-center justify-between px-5 h-[80px] border-b"
      style={{ borderColor: 'var(--border-soft)' }}
    >
      <span className="text-[17px]">{label}</span>
      {right}
    </div>
  );
}
