import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bell, Palette, Clock, Music2 } from 'lucide-react';
import { AppShell } from '../components/AppShell';
import { storage } from '../lib/storage';
import { applyAccent, getGoldPresets, loadAccent, saveAccent } from '../lib/theme';
import type { NotificationSettings } from '../types';

export const Route = createFileRoute('/settings/notifications')({ component: NotifSettings });

function NotifSettings() {
  const [accentColor, setAccentColor] = useState<string>(loadAccent());
  const [s, setS] = useState<NotificationSettings>({
    enabled: false,
    silent: true,
    notifyBefore: '20 хвилин',
    melody: 'За замовчуванням',
  });

  useEffect(() => {
    applyAccent(accentColor);
    setS(storage.getNotif());
  }, [accentColor]);

  const presets = getGoldPresets();

  const updateAccent = (color: string) => {
    setAccentColor(color);
    saveAccent(color);
  };

  const updateNotif = (patch: Partial<NotificationSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    storage.setNotif(next);
  };

  return (
    <AppShell>
      {/* Hero */}
      <div style={{ padding: '24px 18px 12px' }}>
        <div
          style={{
            fontSize: 12,
            letterSpacing: 1.2,
            textTransform: 'uppercase',
            color: 'var(--txt-dim)',
            fontWeight: 500,
          }}
        >
          Персоналізація
        </div>
        <div
          className="gold-text"
          style={{
            marginTop: 4,
            lineHeight: 1.1,
            fontWeight: 600,
            fontSize: 28,
            letterSpacing: 0.5,
          }}
        >
          Налаштування
        </div>
      </div>

      <div style={{ padding: '4px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Accent color */}
        <section className="glass" style={{ borderRadius: 22, padding: '14px 16px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 10,
                background: 'var(--accent-10)',
                border: '1px solid var(--accent-18)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold-text-strong)',
              }}
            >
              <Palette size={16} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, color: 'var(--txt-main)', fontWeight: 500 }}>
                Акцентний колір
              </div>
              <div style={{ fontSize: 12, color: 'var(--txt-dim)' }}>
                Застосовується до інтерфейсу
              </div>
            </div>
            <input
              type="color"
              value={accentColor}
              onChange={(e) => updateAccent(e.target.value)}
              aria-label="Власний колір"
              className="field-input field-input--color"
              style={{
                borderRadius: 10,
              }}
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
            }}
          >
            {presets.map((p) => {
              const active = p.color.toLowerCase() === accentColor.toLowerCase();
              return (
                <button
                  key={p.key}
                  onClick={() => updateAccent(p.color)}
                  title={p.label}
                  aria-label={p.label}
                  style={{
                    height: 40,
                    borderRadius: 12,
                    border: active
                      ? '2px solid var(--accent-light-85)'
                      : '1px solid var(--glass-stroke)',
                    background: p.color,
                    cursor: 'pointer',
                    padding: 0,
                  }}
                />
              );
            })}
          </div>
        </section>

        {/* Notifications group */}
        <section
          className="glass"
          style={{
            borderRadius: 22,
            padding: '4px 16px',
          }}
        >
          <SRow
            icon={<Bell size={16} color="var(--gold-text)" />}
            label="Повідомлення"
            sublabel={s.enabled ? 'Увімкнено' : 'Вимкнено'}
            right={
              <Toggle
                checked={s.enabled}
                onChange={(v) => updateNotif({ enabled: v })}
              />
            }
          />
          <Divider />
          <SRow
            icon={<Clock size={16} color="var(--gold-text)" />}
            label="Повідомити за"
            right={
              <select
                value={s.notifyBefore}
                onChange={(e) => updateNotif({ notifyBefore: e.target.value })}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-stroke)',
                  borderRadius: 10,
                  padding: '6px 10px',
                  fontSize: 14,
                  color: 'var(--gold-text-strong)',
                  outline: 'none',
                }}
              >
                {['5 хвилин', '10 хвилин', '20 хвилин', '1 година', '1 день'].map((opt) => (
                  <option key={opt} value={opt} style={{ background: '#1A1308' }}>
                    {opt}
                  </option>
                ))}
              </select>
            }
          />
          <Divider />
        </section>
      </div>
    </AppShell>
  );
}

function Divider() {
  return <div style={{ height: 1, background: 'var(--hairline)' }} />;
}

function SRow({
  icon,
  label,
  sublabel,
  right,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  right: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 0',
        minHeight: 56,
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: 'var(--accent-10)',
          border: '1px solid var(--accent-18)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, color: 'var(--txt-main)', fontWeight: 500 }}>{label}</div>
        {sublabel && (
          <div style={{ fontSize: 12, color: 'var(--txt-dim)', marginTop: 1 }}>{sublabel}</div>
        )}
      </div>
      {right}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 51,
        height: 31,
        borderRadius: 999,
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        background: checked ? 'var(--gold-grad)' : 'rgba(255,255,255,0.12)',
        position: 'relative',
        transition: 'background 0.2s',
      }}
      aria-pressed={checked}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: checked ? 22 : 2,
          width: 27,
          height: 27,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}
