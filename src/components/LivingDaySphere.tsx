import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { UA_DAYS_FULL, UA_MONTHS, toISO } from '../lib/date';
import { getMotionPermissionState } from '../lib/motionPermission';
import { useTasks } from './Hooks';

type ModeId = 'calm' | 'focus' | 'motion' | 'silence' | 'night' | 'recovery';

type ModeDef = {
  id: ModeId;
  label: string;
  tagline: string;
  accent: string;
  glow: number;
  speed: number;
};

const MODES: ModeDef[] = [
  { id: 'calm',     label: 'Спокій',      tagline: 'Легкий ритм без шуму.', accent: '232, 196, 116', glow: 0.45, speed: 18 },
  { id: 'focus',    label: 'Фокус',       tagline: 'Один чіткий напрям.',   accent: '245, 197, 92',  glow: 0.65, speed: 14 },
  { id: 'motion',   label: 'Рух',         tagline: 'День у динаміці.',      accent: '248, 220, 138', glow: 0.70, speed: 10 },
  { id: 'silence',  label: 'Тиша',        tagline: 'Менше сигналів.',       accent: '210, 180, 110', glow: 0.35, speed: 22 },
  { id: 'night',    label: 'Ніч',         tagline: 'Темний режим дня.',     accent: '180, 150, 90',  glow: 0.30, speed: 24 },
  { id: 'recovery', label: 'Відновлення', tagline: 'Пауза теж має вагу.',   accent: '220, 185, 110', glow: 0.40, speed: 20 },
];

const ANGEL_ASSET = '/assets/angel-gold.png';

function getKyivMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat('uk-UA', {
    timeZone: 'Europe/Kiev',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);
  return hour * 60 + minute;
}

function resolveModeByDay(date: Date, taskCount: number): ModeId {
  const minutes = getKyivMinutes(date);
  if (taskCount >= 8) return 'motion';
  if (minutes >= 22 * 60 + 7 && minutes <= 23 * 60 + 53) return 'recovery';
  if (minutes >= 22 * 60 || minutes < 6 * 60) return 'night';
  if (minutes >= 19 * 60) return 'silence';
  if (minutes >= 9 * 60) return 'focus';
  return 'calm';
}

export function LivingDaySphere() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { tasks } = useTasks();
  const [now, setNow] = useState(() => new Date());
  const [motionEnabled, setMotionEnabled] = useState(false);

  useEffect(() => {
    setMotionEnabled(getMotionPermissionState() === 'granted');
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const apply = () => {
      root.style.setProperty('--lds-tx', String(tx));
      root.style.setProperty('--lds-ty', String(ty));
      raf = 0;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const rect = root.getBoundingClientRect();
      tx = (e.clientX - rect.left) / rect.width - 0.5;
      ty = (e.clientY - rect.top) / rect.height - 0.5;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerleave', onLeave);
    return () => {
      root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerleave', onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (!motionEnabled) return;
    const root = rootRef.current;
    if (!root) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    const apply = () => {
      root.style.setProperty('--lds-tx', String(tx));
      root.style.setProperty('--lds-ty', String(ty));
      raf = 0;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      const g = e.gamma ?? 0;
      const b = e.beta ?? 0;
      tx = Math.max(-1, Math.min(1, g / 35));
      ty = Math.max(-1, Math.min(1, (b - 30) / 35));
      if (!raf) raf = requestAnimationFrame(apply);
    };
    window.addEventListener('deviceorientation', onOrient);
    return () => {
      window.removeEventListener('deviceorientation', onOrient);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [motionEnabled]);

  const today = now;
  const todayISO = toISO(today);
  const todayTaskCount = tasks.filter((task) => task.date === todayISO).length;
  const mode = resolveModeByDay(today, todayTaskCount);
  const dateLabel = `${UA_DAYS_FULL[today.getDay()]}, ${today.getDate()} ${UA_MONTHS[today.getMonth()].toLocaleLowerCase('uk-UA')}`;
  const [weekdayLabel, monthDayLabel] = dateLabel.split(', ');
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[1];

  return (
    <div
      ref={rootRef}
      className="living-day-sphere"
      data-mode={mode}
      style={{
        '--lds-tx': '0',
        '--lds-ty': '0',
        '--lds-accent': currentMode.accent,
        '--lds-glow': String(currentMode.glow),
        '--lds-speed': `${currentMode.speed}s`,
        '--angel-tint': currentMode.accent,
        '--angel-depth': mode === 'focus' ? '0.72' : mode === 'night' || mode === 'silence' ? '0.62' : '0.56',
        '--angel-fx-opacity': mode === 'silence' ? '0.18' : mode === 'night' ? '0.32' : '0.46',
      } as CSSProperties}
    >
      <style>{LDS_STYLES}</style>
      <div className="lds-content">
        <div className="lds-text">
          <div className="lds-date">
            <span className="lds-date-main">{monthDayLabel}</span>
            <span className="lds-date-weekday">{weekdayLabel}</span>
          </div>
        </div>
        <div className="lds-angel-stage" data-mode={mode} aria-hidden="true">
          <div className="lds-mode-fx" />
          <div className="lds-angel-orbit" />
          <img className="lds-angel-depth" src={ANGEL_ASSET} alt="" />
          <img className="lds-angel-img" src={ANGEL_ASSET} alt="" />
          <div className="lds-angel-shadow" />
        </div>
      </div>
    </div>
  );
}

const LDS_STYLES = `
.living-day-sphere {
  position: relative;
  margin-top: 14px;
  border-radius: 26px;
  padding: 18px;
  background:
    radial-gradient(90% 120% at 78% 34%, rgba(var(--lds-accent), 0.16) 0%, rgba(var(--lds-accent), 0.05) 28%, transparent 54%),
    radial-gradient(120% 100% at 0% 0%, rgba(255, 224, 156, 0.08) 0%, transparent 42%),
    linear-gradient(160deg, rgba(25, 22, 17, 0.96) 0%, rgba(9, 8, 7, 0.98) 47%, rgba(3, 3, 3, 0.99) 100%);
  border: 1px solid rgba(var(--lds-accent), 0.24);
  box-shadow:
    inset 0 1px 0 rgba(255, 232, 176, 0.10),
    inset 0 -28px 70px rgba(0, 0, 0, 0.58),
    0 24px 70px rgba(0, 0, 0, 0.62),
    0 1px 0 rgba(255, 231, 168, 0.04);
  overflow: hidden;
  isolation: isolate;
}
.living-day-sphere::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at calc(73% + var(--lds-tx) * 6%) calc(42% + var(--lds-ty) * 6%), rgba(var(--lds-accent), calc(var(--lds-glow) * 0.32)) 0%, transparent 30%),
    linear-gradient(180deg, rgba(255, 238, 190, 0.08) 0%, transparent 32%),
    repeating-radial-gradient(circle at 20% 12%, rgba(255, 255, 255, 0.025) 0px, rgba(255, 255, 255, 0.025) 1px, transparent 1px, transparent 5px);
  opacity: 0.88;
  pointer-events: none;
  z-index: 1;
}
.living-day-sphere::after {
  content: '';
  position: absolute;
  inset: 1px;
  border-radius: inherit;
  background:
    linear-gradient(115deg, rgba(255, 236, 185, 0.14) 0%, transparent 18%, transparent 70%, rgba(var(--lds-accent), 0.08) 100%),
    radial-gradient(65% 30% at 70% 100%, rgba(0, 0, 0, 0.62) 0%, transparent 72%);
  box-shadow: inset 0 0 0 1px rgba(255, 229, 168, 0.03);
  pointer-events: none;
  z-index: 1;
}
.lds-content {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}
.lds-text { flex: 1; min-width: 0; }
.lds-date {
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 0;
  line-height: 1.28;
  background: linear-gradient(135deg, #f7dfa0 0%, #d2aa52 32%, #92713a 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  -webkit-text-fill-color: transparent;
  filter: drop-shadow(0 0 12px rgba(var(--lds-accent), 0.12));
}
.lds-date span {
  display: block;
}
.lds-date-weekday {
  margin-top: 2px;
  font-size: 13px;
  font-weight: 500;
  color: rgba(235, 209, 147, 0.58);
  -webkit-text-fill-color: rgba(235, 209, 147, 0.58);
}

.lds-angel-stage {
  position: relative;
  width: clamp(160px, 27vw, 248px);
  height: clamp(146px, 24vw, 226px);
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  perspective: 820px;
  transform-style: preserve-3d;
  transform: translate3d(calc(var(--lds-tx) * 3px), calc(var(--lds-ty) * 3px), 0);
  transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}
.lds-angel-stage::before {
  content: '';
  position: absolute;
  inset: 5% 1% 10%;
  border-radius: 34% 34% 42% 42%;
  background:
    radial-gradient(circle at 50% 38%, rgba(var(--lds-accent), calc(var(--lds-glow) * 0.40)) 0%, rgba(var(--lds-accent), 0.16) 28%, transparent 66%);
  filter: blur(18px);
  opacity: 0.88;
  transform: translate3d(calc(var(--lds-tx) * -4px), calc(var(--lds-ty) * -3px), -40px);
  pointer-events: none;
}
.lds-angel-stage::after {
  content: '';
  position: absolute;
  inset: 9% 11% 17%;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 230, 160, 0.10) 0%, transparent 62%);
  filter: blur(2px);
  opacity: 0.75;
  pointer-events: none;
}
.lds-mode-fx,
.lds-angel-orbit,
.lds-angel-depth,
.lds-angel-img,
.lds-angel-shadow {
  position: absolute;
  pointer-events: none;
}
.lds-mode-fx {
  inset: 0;
  opacity: var(--angel-fx-opacity);
  transform: translate3d(calc(var(--lds-tx) * -5px), calc(var(--lds-ty) * -4px), -60px);
}
.lds-angel-orbit {
  inset: 13% 4% 18%;
  border-radius: 50%;
  background:
    radial-gradient(circle, transparent 53%, rgba(var(--lds-accent), 0.18) 54%, transparent 56%),
    radial-gradient(circle, transparent 66%, rgba(var(--lds-accent), 0.10) 67%, transparent 69%);
  opacity: 0.48;
  transform: rotateX(66deg) rotateZ(calc(var(--lds-tx) * 12deg));
}
.lds-angel-depth,
.lds-angel-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
}
.lds-angel-depth {
  opacity: var(--angel-depth);
  transform:
    translate3d(calc(8px - var(--lds-tx) * 3px), calc(9px - var(--lds-ty) * 2px), -24px)
    rotateX(calc(var(--lds-ty) * -4deg))
    rotateY(calc(var(--lds-tx) * 5deg));
  filter:
    brightness(0.20)
    sepia(1)
    saturate(1.8)
    hue-rotate(346deg)
    blur(1.4px)
    drop-shadow(0 18px 18px rgba(0, 0, 0, 0.62));
}
.lds-angel-img {
  z-index: 2;
  transform:
    translate3d(calc(var(--lds-tx) * 8px), calc(var(--lds-ty) * 8px), 0)
    rotateX(calc(var(--lds-ty) * -7deg))
    rotateY(calc(var(--lds-tx) * 9deg));
  filter:
    saturate(1.12)
    contrast(1.06)
    brightness(0.96)
    drop-shadow(0 18px 22px rgba(0, 0, 0, 0.58))
    drop-shadow(0 0 18px rgba(var(--lds-accent), calc(var(--lds-glow) * 0.32)));
  transition: transform 0.42s cubic-bezier(0.2, 0.8, 0.2, 1), filter 0.42s ease;
}
.living-day-sphere:hover .lds-angel-img {
  transform:
    translate3d(calc(var(--lds-tx) * 8px), calc(var(--lds-ty) * 8px - 2px), 0)
    rotateX(calc(var(--lds-ty) * -7deg))
    rotateY(calc(var(--lds-tx) * 9deg))
    scale(1.025);
}
.lds-angel-shadow {
  left: 18%;
  right: 18%;
  bottom: 7%;
  height: 19px;
  border-radius: 50%;
  background:
    radial-gradient(ellipse at center, rgba(var(--lds-accent), 0.20) 0%, rgba(0, 0, 0, 0.54) 58%, transparent 78%);
  filter: blur(6px);
  transform: translate3d(calc(var(--lds-tx) * -4px), calc(var(--lds-ty) * 2px), -30px);
}
.living-day-sphere[data-mode="night"] .lds-angel-img {
  filter:
    saturate(0.92)
    contrast(1.10)
    brightness(0.76)
    drop-shadow(0 20px 24px rgba(0, 0, 0, 0.68))
    drop-shadow(0 0 12px rgba(var(--lds-accent), 0.16));
}
.living-day-sphere[data-mode="night"] .lds-mode-fx {
  background:
    radial-gradient(circle at 76% 24%, rgba(214, 181, 104, 0.32) 0%, rgba(214, 181, 104, 0.18) 10%, transparent 11%),
    radial-gradient(ellipse at 32% 38%, rgba(86, 70, 44, 0.25) 0%, transparent 34%),
    radial-gradient(ellipse at 66% 64%, rgba(0, 0, 0, 0.52) 0%, transparent 42%);
  filter: blur(7px);
  animation: lds-night-drift 34s linear infinite;
}
.living-day-sphere[data-mode="calm"] .lds-mode-fx {
  inset: 8% 14% 12%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, rgba(var(--lds-accent), 0.10) 0%, transparent 58%),
    repeating-radial-gradient(circle at 50% 50%, transparent 0 12px, rgba(var(--lds-accent), 0.12) 13px, transparent 15px),
    radial-gradient(circle at 22% 34%, rgba(255, 232, 168, 0.34) 0 1px, transparent 2px),
    radial-gradient(circle at 60% 22%, rgba(255, 232, 168, 0.26) 0 1px, transparent 2px),
    radial-gradient(circle at 74% 68%, rgba(255, 232, 168, 0.20) 0 1px, transparent 2px);
  overflow: hidden;
  animation: lds-calm-particles 36s linear infinite;
}
.living-day-sphere[data-mode="focus"] .lds-angel-depth {
  opacity: 0.78;
  transform:
    translate3d(calc(10px - var(--lds-tx) * 3px), calc(11px - var(--lds-ty) * 2px), -28px)
    rotateX(calc(var(--lds-ty) * -4deg))
    rotateY(calc(var(--lds-tx) * 5deg));
}
.living-day-sphere[data-mode="focus"] .lds-angel-orbit {
  opacity: 0.72;
  background:
    radial-gradient(circle, transparent 47%, rgba(var(--lds-accent), 0.22) 48%, transparent 50%),
    radial-gradient(circle, transparent 62%, rgba(var(--lds-accent), 0.16) 63%, transparent 65%),
    radial-gradient(circle, transparent 75%, rgba(var(--lds-accent), 0.08) 76%, transparent 78%);
}
.living-day-sphere[data-mode="motion"] .lds-mode-fx {
  inset: 8% 14% 12%;
  border-radius: 50%;
  background:
    radial-gradient(circle at 50% 50%, rgba(var(--lds-accent), 0.14) 0%, transparent 58%),
    repeating-radial-gradient(circle at 50% 50%, transparent 0 12px, rgba(var(--lds-accent), 0.16) 13px, transparent 15px),
    radial-gradient(circle at 24% 70%, rgba(255, 232, 168, 0.34) 0 1px, transparent 2px),
    radial-gradient(circle at 56% 76%, rgba(255, 232, 168, 0.28) 0 1px, transparent 2px),
    radial-gradient(circle at 78% 62%, rgba(255, 232, 168, 0.22) 0 1px, transparent 2px);
  overflow: hidden;
  animation: lds-motion-particles-up 12s linear infinite;
}
.living-day-sphere[data-mode="motion"] .lds-angel-img {
  filter:
    saturate(1.16)
    contrast(1.08)
    brightness(1)
    drop-shadow(0 20px 22px rgba(0, 0, 0, 0.58))
    drop-shadow(0 0 22px rgba(var(--lds-accent), 0.36));
}
.living-day-sphere[data-mode="silence"] .lds-mode-fx {
  background:
    repeating-linear-gradient(90deg, transparent 0 17px, rgba(222, 198, 142, 0.14) 18px, transparent 19px),
    radial-gradient(circle, transparent 58%, rgba(var(--lds-accent), 0.10) 59%, transparent 61%);
  opacity: 0.16;
}
.living-day-sphere[data-mode="silence"] .lds-angel-img {
  filter:
    saturate(0.86)
    contrast(1.06)
    brightness(0.70)
    drop-shadow(0 18px 24px rgba(0, 0, 0, 0.68))
    drop-shadow(0 0 8px rgba(var(--lds-accent), 0.12));
}
.living-day-sphere[data-mode="recovery"] .lds-mode-fx {
  background:
    radial-gradient(circle at 50% 48%, rgba(var(--lds-accent), 0.28) 0%, transparent 28%),
    radial-gradient(circle at 50% 48%, transparent 38%, rgba(var(--lds-accent), 0.15) 39%, transparent 48%);
  animation: lds-recovery-breath 9s ease-in-out infinite;
}
.living-day-sphere[data-mode="recovery"] .lds-angel-stage::before {
  animation: lds-recovery-breath 10s ease-in-out infinite;
}

@keyframes lds-night-drift {
  to { transform: translate3d(calc(var(--lds-tx) * -5px + 18px), calc(var(--lds-ty) * -4px), -60px); }
}
@keyframes lds-calm-particles {
  to { background-position: 0 0, 0 0, 90px 90px, 124px 124px, 160px 160px; }
}
@keyframes lds-motion-particles-up {
  to { background-position: 0 0, 0 0, 0 -120px, 0 -170px, 0 -220px; }
}
@keyframes lds-recovery-breath {
  0%, 100% { transform: scale(0.96); opacity: 0.30; }
  50% { transform: scale(1.05); opacity: 0.58; }
}
@media (min-width: 640px) {
  .living-day-sphere { padding: 22px; }
  .lds-content { gap: 24px; }
  .lds-angel-stage {
    width: clamp(210px, 25vw, 260px);
    height: clamp(188px, 22vw, 232px);
  }
}

@media (max-width: 520px) {
  .living-day-sphere {
    padding: 12px 14px;
    border-radius: 22px;
  }
  .lds-content {
    align-items: center;
    gap: 6px;
  }
  .lds-text {
    flex: 1 1 0;
  }
  .lds-angel-stage {
    align-self: center;
    width: clamp(98px, 31vw, 124px);
    height: clamp(88px, 28vw, 112px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lds-mode-fx,
  .living-day-sphere[data-mode="recovery"] .lds-angel-stage::before {
    animation: none;
  }
  .lds-angel-stage,
  .lds-angel-img { transition: none; }
}
`;
