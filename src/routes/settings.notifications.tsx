import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Bell, Palette, Clock, Music2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '../components/AppShell';
import { useAuth } from '../contexts/AuthContext';
import {
  disableMotionPermission,
  getMotionPermissionState,
  loadAngelAnimationTempo,
  requestMotionPermission,
  saveAngelAnimationTempo,
  type MotionPermissionState,
} from '../lib/motionPermission';
import { storage } from '../lib/storage';
import { applyAccent, getGoldPresets, loadAccent, saveAccent } from '../lib/theme';
import {
  createPwaForceUpdate,
  getPwaForceUpdateAdmin,
  type PwaForceAgency,
  type PwaForceUpdateRow,
} from '../lib/pwaForceUpdate';
import type { NotificationSettings } from '../types';

export const Route = createFileRoute('/settings/notifications')({ component: NotifSettings });

const PWA_FORCE_ALL_AGENCIES = '__all__';

function formatPwaForceDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('uk-UA');
}

function NotifSettings() {
  const { user } = useAuth();
  const [accentColor, setAccentColor] = useState<string>(loadAccent());
  const [motionPermission, setMotionPermission] = useState<MotionPermissionState>('prompt');
  const [animationTempo, setAnimationTempo] = useState(() => loadAngelAnimationTempo());
  const [s, setS] = useState<NotificationSettings>({
    enabled: false,
    silent: true,
    notifyBefore: '20 хвилин',
    melody: 'За замовчуванням',
  });
  const [pwaForceAgencies, setPwaForceAgencies] = useState<PwaForceAgency[]>([]);
  const [pwaForceRecent, setPwaForceRecent] = useState<PwaForceUpdateRow[]>([]);
  const [pwaForceTarget, setPwaForceTarget] = useState(PWA_FORCE_ALL_AGENCIES);
  const [pwaForceLoading, setPwaForceLoading] = useState(false);
  const [pwaForceSubmitting, setPwaForceSubmitting] = useState(false);

  useEffect(() => {
    applyAccent(accentColor);
    setS(storage.getNotif());
  }, [accentColor]);

  useEffect(() => {
    setMotionPermission(getMotionPermissionState());
  }, []);

  const isSuperuser = user?.role === 'superuser';
  const presets = getGoldPresets();
  const latestPwaForceUpdate = pwaForceRecent[0];

  const updateAccent = (color: string) => {
    setAccentColor(color);
    saveAccent(color);
  };

  const updateNotif = (patch: Partial<NotificationSettings>) => {
    const next = { ...s, ...patch };
    setS(next);
    storage.setNotif(next);
  };

  const requestAngelMotion = async () => {
    const next = await requestMotionPermission();
    setMotionPermission(next);
    if (next === 'granted') toast.success('Рух увімкнено');
    if (next === 'denied') toast.error('Дозвіл не надано');
    if (next === 'unsupported') toast.error('На цьому пристрої рух недоступний');
  };

  const toggleAngelMotion = async (enabled: boolean) => {
    if (!enabled) {
      setMotionPermission(disableMotionPermission());
      toast.success('Рух вимкнено');
      return;
    }
    await requestAngelMotion();
  };

  const updateAnimationTempo = (value: number) => {
    setAnimationTempo(saveAngelAnimationTempo(value));
  };

  useEffect(() => {
    if (!isSuperuser) return;

    let cancelled = false;
    setPwaForceLoading(true);

    getPwaForceUpdateAdmin()
      .then((data) => {
        if (cancelled) return;
        setPwaForceAgencies(data.agencies);
        setPwaForceRecent(data.recent);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            `Не вдалося завантажити PWA оновлення: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      })
      .finally(() => {
        if (!cancelled) setPwaForceLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isSuperuser]);

  const handleForcePwaUpdate = async () => {
    if (pwaForceSubmitting) return;

    setPwaForceSubmitting(true);
    try {
      const row = await createPwaForceUpdate(
        pwaForceTarget === PWA_FORCE_ALL_AGENCIES ? null : pwaForceTarget,
      );
      setPwaForceRecent((recent) => [row, ...recent].slice(0, 10));
      toast.success('Примусове оновлення PWA запущено');
    } catch (error) {
      toast.error(
        `Не вдалося запустити PWA оновлення: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      setPwaForceSubmitting(false);
    }
  };

  const getPwaForceTargetName = (targetAgencyId: string | null) => {
    if (!targetAgencyId) return 'Усі агенції';
    return pwaForceAgencies.find((agency) => agency.id === targetAgencyId)?.name ?? targetAgencyId;
  };

  const motionStatus =
    motionPermission === 'granted'
      ? 'Увімкнено'
      : motionPermission === 'denied'
        ? 'Дозвіл не надано'
        : motionPermission === 'unsupported'
          ? 'Недоступно на цьому пристрої'
          : motionPermission === 'disabled'
            ? 'Вимкнено'
            : 'Дозвіл для нахилу ангела на iPhone';

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
        {isSuperuser && (
          <section className="glass" style={{ borderRadius: 22, padding: '4px 16px 14px' }}>
            <SRow
              icon={<RefreshCw size={16} color="var(--gold-text)" />}
              label="Примусове оновлення PWA"
              sublabel={
                latestPwaForceUpdate
                  ? `Останній запуск: ${formatPwaForceDate(latestPwaForceUpdate.created_at)}`
                  : 'Запусків ще не було'
              }
              right={null}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 40 }}>
              <select
                value={pwaForceTarget}
                onChange={(e) => setPwaForceTarget(e.target.value)}
                disabled={pwaForceLoading || pwaForceSubmitting}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid var(--glass-stroke)',
                  borderRadius: 10,
                  padding: '8px 10px',
                  fontSize: 14,
                  color: 'var(--gold-text-strong)',
                  outline: 'none',
                }}
              >
                <option value={PWA_FORCE_ALL_AGENCIES} style={{ background: '#1A1308' }}>
                  Усі агенції
                </option>
                {pwaForceAgencies.map((agency) => (
                  <option key={agency.id} value={agency.id} style={{ background: '#1A1308' }}>
                    {agency.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleForcePwaUpdate}
                disabled={pwaForceLoading || pwaForceSubmitting}
                style={{
                  height: 40,
                  borderRadius: 12,
                  border: '1px solid var(--accent-18)',
                  background: 'var(--gold-grad)',
                  color: '#1A1308',
                  fontSize: 14,
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  opacity: pwaForceLoading || pwaForceSubmitting ? 0.72 : 1,
                  cursor: pwaForceLoading || pwaForceSubmitting ? 'default' : 'pointer',
                }}
              >
                <RefreshCw size={16} />
                {pwaForceSubmitting ? 'Запускається...' : 'Запустити'}
              </button>
              {pwaForceRecent.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {pwaForceRecent.slice(0, 3).map((row) => (
                    <div
                      key={row.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        gap: 8,
                        fontSize: 12,
                        color: 'var(--txt-dim)',
                      }}
                    >
                      <span>{getPwaForceTargetName(row.target_agency_id)}</span>
                      <span>{formatPwaForceDate(row.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

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

        {/* Angel motion */}
        <section
          className="glass"
          style={{
            borderRadius: 22,
            padding: '4px 16px',
          }}
        >
          <SRow
            icon={<Music2 size={16} color="var(--gold-text)" />}
            label="Рух ангела"
            sublabel={motionStatus}
            right={
              <Toggle
                checked={motionPermission === 'granted'}
                disabled={motionPermission === 'unsupported'}
                onChange={toggleAngelMotion}
                ariaLabel="Рух Ангела"
              />
            }
          />
          <div style={{ padding: '0 0 14px 40px' }}>
            <input
              type="range"
              min={70}
              max={130}
              step={5}
              value={animationTempo}
              onChange={(e) => updateAnimationTempo(Number(e.target.value))}
              aria-label="Темп анімації ангела"
              style={{
                width: '100%',
                accentColor: 'var(--gold-text)',
              }}
            />
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 4,
                fontSize: 12,
                color: 'var(--txt-dim)',
              }}
            >
              <span>повільно</span>
              <span>швидко</span>
            </div>
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

function Toggle({
  checked,
  disabled,
  ariaLabel,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  ariaLabel?: string;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 51,
        height: 31,
        borderRadius: 999,
        border: 'none',
        padding: 0,
        cursor: disabled ? 'default' : 'pointer',
        background: checked ? 'var(--gold-grad)' : 'rgba(255,255,255,0.12)',
        opacity: disabled ? 0.72 : 1,
        position: 'relative',
        transition: 'background 0.2s',
      }}
      aria-label={ariaLabel}
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
