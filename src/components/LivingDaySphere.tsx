import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { toISO } from '../lib/date';
import { getMotionPermissionState, loadAngelAnimationTempo } from '../lib/motionPermission';
import { useTasks } from './Hooks';

type ModeId = 'focus' | 'motion' | 'silence' | 'night' | 'recovery';

type ModeDef = {
  id: ModeId;
  label: string;
  tagline: string;
  accent: string;
  glow: number;
  speed: number;
};

const MODES: ModeDef[] = [
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
  return 'focus';
}

type LivingDaySphereProps = {
  greeting: string;
  name: string;
  actions?: ReactNode;
};

export function LivingDaySphere({ greeting, name, actions }: LivingDaySphereProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { tasks } = useTasks();
  const [now, setNow] = useState(() => new Date());
  const [motionEnabled, setMotionEnabled] = useState(false);
  const [animationTempo] = useState(() => loadAngelAnimationTempo());

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
  const autoMode = resolveModeByDay(today, todayTaskCount);
  const mode = autoMode;
  const currentMode = MODES.find((m) => m.id === mode) ?? MODES[1];
  const tempoScale = 100 / animationTempo;

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
        '--lds-tempo-scale': String(tempoScale),
        '--lds-duration-100': `${100 * tempoScale}s`,
        '--lds-duration-120': `${120 * tempoScale}s`,
        '--lds-duration-140': `${140 * tempoScale}s`,
        '--lds-duration-260': `${260 * tempoScale}s`,
        '--lds-duration-280': `${280 * tempoScale}s`,
        '--lds-duration-340': `${340 * tempoScale}s`,
        '--lds-duration-360': `${360 * tempoScale}s`,
        '--lds-duration-420': `${420 * tempoScale}s`,
        '--angel-tint': currentMode.accent,
        '--angel-depth': mode === 'focus' ? '0.72' : mode === 'night' || mode === 'silence' ? '0.62' : '0.56',
        '--angel-fx-opacity': mode === 'silence' ? '0.18' : mode === 'night' ? '0.32' : '0.46',
      } as CSSProperties}
    >
      <style>{LDS_STYLES}</style>
      <div className="lds-content">
        <div className="lds-text">
          <div className="lds-greeting">
            <span className="lds-greeting-main">{greeting},</span>
            <span className="lds-greeting-name">{name}</span>
          </div>
          {actions ? <div className="lds-actions">{actions}</div> : null}
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
@property --lds-anim-scale { syntax: '<number>'; initial-value: 1; inherits: true; }
@property --lds-anim-bright { syntax: '<number>'; initial-value: 1; inherits: true; }
@property --lds-anim-contrast { syntax: '<number>'; initial-value: 1; inherits: true; }
@property --lds-anim-saturate { syntax: '<number>'; initial-value: 1; inherits: true; }
@property --lds-anim-x { syntax: '<length>'; initial-value: 0px; inherits: true; }
@property --lds-anim-y { syntax: '<length>'; initial-value: 0px; inherits: true; }
@property --lds-anim-rot { syntax: '<angle>'; initial-value: 0deg; inherits: true; }

.living-day-sphere {
  --lds-base-bright: 0.96;
  --lds-base-contrast: 1.06;
  --lds-base-saturate: 1.12;
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
.lds-text {
  align-self: stretch;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 18px;
}
.lds-greeting {
  min-width: 0;
  color: var(--gold-text-strong);
  filter: drop-shadow(0 0 12px rgba(var(--lds-accent), 0.12));
}
.lds-greeting-main,
.lds-greeting-name {
  display: block;
}
.lds-greeting-main {
  font-size: clamp(17px, 4vw, 22px);
  font-weight: 500;
  line-height: 1.12;
  color: var(--gold-text);
}
.lds-greeting-name {
  margin-top: 4px;
  font-size: clamp(27px, 7vw, 38px);
  font-weight: 600;
  letter-spacing: 1.2px;
  line-height: 1.1;
  color: var(--gold-text-strong);
}
.lds-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
  min-height: 36px;
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
  transition: transform 3.8s cubic-bezier(0.2, 0.8, 0.2, 1);
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
    translate3d(
      calc(8px - var(--lds-tx) * 3px + var(--lds-anim-x, 0px)),
      calc(9px - var(--lds-ty) * 2px + var(--lds-anim-y, 0px)),
      -24px
    )
    rotateX(calc(var(--lds-ty) * -4deg))
    rotateY(calc(var(--lds-tx) * 5deg))
    rotate(var(--lds-anim-rot, 0deg))
    scale(var(--lds-anim-scale, 1));
  filter:
    brightness(calc(0.20 * var(--lds-anim-bright, 1)))
    sepia(1)
    saturate(1.8)
    hue-rotate(346deg)
    blur(1.4px)
    drop-shadow(0 18px 18px rgba(0, 0, 0, 0.62));
}
.lds-angel-img {
  z-index: 2;
  transform:
    translate3d(
      calc(var(--lds-tx) * 8px + var(--lds-anim-x, 0px)),
      calc(var(--lds-ty) * 8px + var(--lds-anim-y, 0px)),
      0
    )
    rotateX(calc(var(--lds-ty) * -7deg))
    rotateY(calc(var(--lds-tx) * 9deg))
    rotate(var(--lds-anim-rot, 0deg))
    scale(var(--lds-anim-scale, 1));
  filter:
    saturate(calc(var(--lds-base-saturate) * var(--lds-anim-saturate, 1)))
    contrast(calc(var(--lds-base-contrast) * var(--lds-anim-contrast, 1)))
    brightness(calc(var(--lds-base-bright) * var(--lds-anim-bright, 1)))
    drop-shadow(0 18px 22px rgba(0, 0, 0, 0.58))
    drop-shadow(0 0 18px rgba(var(--lds-accent), calc(var(--lds-glow) * 0.32)));
  transition: filter 3.8s ease;
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
.living-day-sphere[data-mode="night"] {
  --lds-base-bright: 0.74;
  --lds-base-saturate: 0.92;
  --lds-base-contrast: 1.10;
}
.living-day-sphere[data-mode="night"] .lds-angel-img {
  animation: lds-night-float var(--lds-duration-120) ease-in-out infinite;
}
.living-day-sphere[data-mode="night"] .lds-angel-depth {
  animation: lds-night-float-depth var(--lds-duration-120) ease-in-out infinite;
}
.living-day-sphere[data-mode="night"] .lds-angel-orbit {
  inset: auto;
  top: -6%;
  right: 8%;
  width: 20%;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate3d(0, 0, -80px);
  background:
    radial-gradient(circle at 50% 50%,
      rgba(var(--lds-accent), 1) 0%,
      rgba(var(--lds-accent), 1) 60%,
      rgba(var(--lds-accent), 0.7) 82%,
      rgba(var(--lds-accent), 0.18) 96%,
      transparent 100%);
  opacity: 0.95;
  filter: drop-shadow(0 0 6px rgba(var(--lds-accent), 0.35));
}
.living-day-sphere[data-mode="night"] .lds-mode-fx {
  overflow: hidden;
  transform: translate3d(calc(var(--lds-tx) * -5px), calc(var(--lds-ty) * -4px), -140px);
  background:
    radial-gradient(circle at 22% 32%, rgba(var(--lds-accent), 0.85) 0 0.8px, transparent 1.6px),
    radial-gradient(circle at 72% 24%, rgba(var(--lds-accent), 0.72) 0 0.7px, transparent 1.4px),
    radial-gradient(circle at 48% 70%, rgba(var(--lds-accent), 0.85) 0 0.9px, transparent 1.7px),
    radial-gradient(circle at 84% 58%, rgba(var(--lds-accent), 0.66) 0 0.7px, transparent 1.4px),
    radial-gradient(circle at 14% 78%, rgba(var(--lds-accent), 0.80) 0 0.8px, transparent 1.6px),
    radial-gradient(circle at 60% 14%, rgba(var(--lds-accent), 0.62) 0 0.6px, transparent 1.3px);
  filter: blur(0.4px);
  opacity: 0.9;
  animation: lds-night-twinkle var(--lds-duration-100) ease-in-out infinite;
}
.living-day-sphere[data-mode="night"] .lds-mode-fx::before,
.living-day-sphere[data-mode="night"] .lds-mode-fx::after {
  content: '';
  position: absolute;
  left: -100%;
  right: 0;
  pointer-events: none;
  background-repeat: repeat-x;
  filter: blur(3px);
}
.living-day-sphere[data-mode="night"] .lds-mode-fx::before {
  top: 14%;
  height: 18%;
  background-image:
    radial-gradient(ellipse 14% 70% at 10% 50%, rgba(var(--lds-accent), 0.40) 0%, transparent 78%),
    radial-gradient(ellipse 18% 80% at 32% 55%, rgba(var(--lds-accent), 0.36) 0%, transparent 80%),
    radial-gradient(ellipse 12% 60% at 56% 50%, rgba(var(--lds-accent), 0.30) 0%, transparent 75%);
  background-size: 50% 100%;
  animation: lds-drift-x var(--lds-duration-260) linear infinite;
}
.living-day-sphere[data-mode="night"] .lds-mode-fx::after {
  top: 30%;
  height: 14%;
  background-image:
    radial-gradient(ellipse 15% 75% at 18% 55%, rgba(var(--lds-accent), 0.32) 0%, transparent 78%),
    radial-gradient(ellipse 12% 65% at 42% 50%, rgba(var(--lds-accent), 0.28) 0%, transparent 76%),
    radial-gradient(ellipse 16% 70% at 70% 55%, rgba(var(--lds-accent), 0.30) 0%, transparent 78%);
  background-size: 40% 100%;
  filter: blur(3.6px);
  animation: lds-drift-x var(--lds-duration-340) linear infinite;
  animation-delay: -22s;
}
.living-day-sphere[data-mode="focus"] {
  --lds-base-bright: 1.0;
  --lds-base-saturate: 1.16;
  --lds-base-contrast: 1.10;
}
.living-day-sphere[data-mode="focus"] .lds-angel-img {
  animation: lds-focus-pulse var(--lds-duration-120) ease-in-out infinite;
}
.living-day-sphere[data-mode="focus"] .lds-angel-depth {
  opacity: 0.8;
}
.living-day-sphere[data-mode="focus"] .lds-angel-orbit {
  opacity: 0.74;
  background:
    radial-gradient(circle, transparent 47%, rgba(var(--lds-accent), 0.24) 48%, transparent 50%),
    radial-gradient(circle, transparent 62%, rgba(var(--lds-accent), 0.16) 63%, transparent 65%),
    radial-gradient(circle, transparent 75%, rgba(var(--lds-accent), 0.08) 76%, transparent 78%);
  animation: lds-focus-spin var(--lds-duration-420) linear infinite;
}
.living-day-sphere[data-mode="focus"] .lds-mode-fx {
  inset: 22% 26%;
  border-radius: 50%;
  background:
    conic-gradient(from 0deg, transparent 0deg, rgba(var(--lds-accent), 0.32) 24deg, transparent 52deg);
  filter: blur(9px);
  opacity: 0.55;
  mix-blend-mode: screen;
  animation: lds-focus-beam var(--lds-duration-360) linear infinite;
}
.living-day-sphere[data-mode="motion"] {
  --lds-base-bright: 1.05;
  --lds-base-saturate: 1.28;
  --lds-base-contrast: 1.10;
}
.living-day-sphere[data-mode="motion"] .lds-angel-img {
  animation: lds-motion-fly var(--lds-duration-120) ease-in-out infinite;
}
.living-day-sphere[data-mode="motion"] .lds-angel-depth {
  animation: lds-motion-fly-depth var(--lds-duration-120) ease-in-out infinite;
}
.living-day-sphere[data-mode="motion"] .lds-mode-fx {
  inset: 0;
  overflow: hidden;
  background: none;
  opacity: 0;
  animation: none;
}
.living-day-sphere[data-mode="silence"] {
  --lds-base-bright: 0.78;
  --lds-base-saturate: 0.86;
  --lds-base-contrast: 1.06;
}
.living-day-sphere[data-mode="silence"] .lds-angel-img {
  animation: lds-silence-fade var(--lds-duration-140) ease-in-out infinite;
}
.living-day-sphere[data-mode="silence"] .lds-angel-depth {
  opacity: 0.5;
}
.living-day-sphere[data-mode="silence"] .lds-angel-orbit {
  opacity: 0;
}
.living-day-sphere[data-mode="silence"] .lds-mode-fx {
  inset: 0;
  overflow: hidden;
  background: none;
  opacity: 1;
  animation: none;
}
.living-day-sphere[data-mode="silence"] .lds-mode-fx::before,
.living-day-sphere[data-mode="silence"] .lds-mode-fx::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: -100%;
  right: 0;
  pointer-events: none;
  background-repeat: repeat-x;
}
.living-day-sphere[data-mode="silence"] .lds-mode-fx::before {
  background-image:
    radial-gradient(circle at 6% 22%,  rgba(var(--lds-accent), 0.62) 0 1.4px, transparent 2.2px),
    radial-gradient(circle at 18% 48%, rgba(var(--lds-accent), 0.55) 0 1.1px, transparent 1.8px),
    radial-gradient(circle at 28% 18%, rgba(var(--lds-accent), 0.60) 0 1.3px, transparent 2px),
    radial-gradient(circle at 38% 62%, rgba(var(--lds-accent), 0.52) 0 1px,   transparent 1.6px),
    radial-gradient(circle at 46% 32%, rgba(var(--lds-accent), 0.58) 0 1.2px, transparent 1.9px),
    radial-gradient(circle at 56% 76%, rgba(var(--lds-accent), 0.54) 0 1.1px, transparent 1.8px),
    radial-gradient(circle at 66% 14%, rgba(var(--lds-accent), 0.60) 0 1.3px, transparent 2px),
    radial-gradient(circle at 78% 54%, rgba(var(--lds-accent), 0.56) 0 1.2px, transparent 1.9px),
    radial-gradient(circle at 88% 28%, rgba(var(--lds-accent), 0.58) 0 1.2px, transparent 1.9px),
    radial-gradient(circle at 96% 70%, rgba(var(--lds-accent), 0.54) 0 1.1px, transparent 1.8px);
  background-size: 50% 100%;
  animation: lds-drift-x var(--lds-duration-280) linear infinite;
}
.living-day-sphere[data-mode="silence"] .lds-mode-fx::after {
  background-image:
    radial-gradient(circle at 10% 38%, rgba(var(--lds-accent), 0.40) 0 0.9px, transparent 1.4px),
    radial-gradient(circle at 26% 70%, rgba(var(--lds-accent), 0.42) 0 0.8px, transparent 1.3px),
    radial-gradient(circle at 42% 12%, rgba(var(--lds-accent), 0.38) 0 0.9px, transparent 1.4px),
    radial-gradient(circle at 58% 46%, rgba(var(--lds-accent), 0.44) 0 0.8px, transparent 1.3px),
    radial-gradient(circle at 74% 82%, rgba(var(--lds-accent), 0.40) 0 0.9px, transparent 1.4px),
    radial-gradient(circle at 90% 24%, rgba(var(--lds-accent), 0.42) 0 0.8px, transparent 1.3px);
  background-size: 40% 100%;
  animation: lds-drift-x var(--lds-duration-360) linear infinite;
}
.living-day-sphere[data-mode="recovery"] {
  --lds-base-bright: 0.95;
  --lds-base-saturate: 1.06;
  --lds-base-contrast: 1.04;
}
.living-day-sphere[data-mode="recovery"] .lds-angel-img {
  animation: lds-recovery-breathe var(--lds-duration-140) ease-in-out infinite;
}
.living-day-sphere[data-mode="recovery"] .lds-angel-depth {
  animation: lds-recovery-breathe var(--lds-duration-140) ease-in-out infinite;
}
.living-day-sphere[data-mode="recovery"] .lds-mode-fx {
  inset: 12% 20%;
  border-radius: 50%;
  background:
    radial-gradient(circle, rgba(var(--lds-accent), 0.36) 0%, rgba(var(--lds-accent), 0.18) 22%, transparent 50%),
    radial-gradient(circle, transparent 56%, rgba(var(--lds-accent), 0.22) 58%, transparent 62%);
  filter: blur(2px);
  animation: lds-recovery-heartbeat var(--lds-duration-140) ease-in-out infinite;
}
.living-day-sphere[data-mode="recovery"] .lds-angel-stage::before {
  animation: lds-recovery-heartbeat var(--lds-duration-140) ease-in-out infinite;
}

@keyframes lds-focus-pulse {
  0%, 100% { --lds-anim-bright: 0.99; --lds-anim-contrast: 1; }
  50%      { --lds-anim-bright: 1.02; --lds-anim-contrast: 1.01; }
}
@keyframes lds-focus-spin {
  to { transform: rotateX(66deg) rotateZ(360deg); }
}
@keyframes lds-focus-beam {
  to { transform: rotate(360deg); }
}
@keyframes lds-motion-fly {
  0%, 100% { --lds-anim-y: 0px;  --lds-anim-rot: -0.35deg; --lds-anim-scale: 1; }
  50%      { --lds-anim-y: -1px; --lds-anim-rot: 0.35deg;  --lds-anim-scale: 1.006; }
}
@keyframes lds-motion-fly-depth {
  0%, 100% { --lds-anim-y: 0px;  --lds-anim-rot: -0.2deg; }
  50%      { --lds-anim-y: -0.5px; --lds-anim-rot: 0.2deg; }
}
@keyframes lds-silence-fade {
  0%, 100% { --lds-anim-bright: 0.98; }
  50%      { --lds-anim-bright: 1.01; }
}
@keyframes lds-drift-x {
  from { transform: translateX(0); }
  to   { transform: translateX(50%); }
}
@keyframes lds-night-float {
  0%, 100% { --lds-anim-y: 0px; }
  50%      { --lds-anim-y: -0.75px; }
}
@keyframes lds-night-float-depth {
  0%, 100% { --lds-anim-y: 0px; }
  50%      { --lds-anim-y: -0.5px; }
}
@keyframes lds-night-twinkle {
  0%, 100% { opacity: 0.82; }
  50%      { opacity: 0.9; }
}
@keyframes lds-recovery-breathe {
  0%, 100% { --lds-anim-scale: 0.995; --lds-anim-bright: 0.99; }
  50%      { --lds-anim-scale: 1.006; --lds-anim-bright: 1.015; }
}
@keyframes lds-recovery-heartbeat {
  0%, 30%, 100% { transform: scale(0.985); opacity: 0.42; }
  10%, 20%      { transform: scale(1.01); opacity: 0.5; }
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
    gap: 14px;
    min-height: clamp(88px, 28vw, 112px);
  }
  .lds-greeting-main {
    font-size: 17px;
  }
  .lds-greeting-name {
    font-size: clamp(25px, 7.4vw, 30px);
    letter-spacing: 1px;
  }
  .lds-actions {
    gap: 7px;
  }
  .lds-angel-stage {
    align-self: center;
    width: clamp(98px, 31vw, 124px);
    height: clamp(88px, 28vw, 112px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .lds-mode-fx,
  .lds-angel-orbit,
  .living-day-sphere[data-mode="recovery"] .lds-angel-stage::before,
  .living-day-sphere .lds-angel-img,
  .living-day-sphere .lds-angel-depth {
    animation: none;
  }
  .lds-angel-stage,
  .lds-angel-img { transition: none; }
}
`;
