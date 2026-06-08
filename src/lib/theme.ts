/* Theme: derive a gold-like palette from a single accent color,
   then push it into the CSS custom properties. */

export const DEFAULT_ACCENT = '#E5C26A'; // gold-2

const goldPresets: { key: string; label: string; color: string }[] = [
  { key: 'premium', label: 'Преміум золото', color: '#E5C26A' },
  { key: 'classic', label: 'Класичне золото', color: '#E5B850' },
  { key: 'warm', label: 'Тепле золото', color: '#E5C26A' },
  { key: 'bronze', label: 'Бронза', color: '#C49154' },
  { key: 'sand', label: 'Пісочний', color: '#B8A36A' },
  { key: 'rose', label: 'Рожевий', color: '#F2B5A6' },
  { key: 'leaf', label: 'Зелений', color: '#B8DBA0' },
  { key: 'smoke', label: 'Димчастий', color: '#8F876F' },
];

export function getGoldPresets() {
  return goldPresets;
}

function hexToRgb(hex: string) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (h.length !== 6) return { r: 229, g: 194, b: 106 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp255(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex(r: number, g: number, b: number) {
  return (
    '#' +
    [clamp255(r), clamp255(g), clamp255(b)]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function toRgbTriplet(r: number, g: number, b: number) {
  return `${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)}`;
}

function mix(a: number, b: number, t: number) {
  return a * (1 - t) + b * t;
}

/* Derive a 4-stop palette around the chosen base color. */
function derivePalette(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const c1 = toHex(mix(r, 255, 0.35), mix(g, 255, 0.35), mix(b, 255, 0.35)); // light
  const c2 = toHex(mix(r, 255, 0.12), mix(g, 255, 0.12), mix(b, 255, 0.12)); // mid-light
  const c3 = hex; // base
  const c4 = toHex(r * 0.5, g * 0.5, b * 0.5); // dark
  return { c1, c2, c3, c4 };
}

/* Alpha levels used across the app. Names mirror the alpha (e.g. a18 = 0.18). */
const ALPHAS = [
  0.04, 0.06, 0.08, 0.10, 0.12, 0.18, 0.20, 0.22, 0.25, 0.30, 0.32,
  0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70, 0.85,
];

export function applyAccent(hex: string) {
  if (typeof document === 'undefined') return;
  const { c1, c2, c3, c4 } = derivePalette(hex);
  const root = document.documentElement.style;

  root.setProperty('--gold-1', c1);
  root.setProperty('--gold-2', c2);
  root.setProperty('--gold-3', c3);
  root.setProperty('--gold-4', c4);
  root.setProperty(
    '--gold-grad',
    c3,
  );
  root.setProperty(
    '--gold-shine',
    c3,
  );
  root.setProperty('--gold-text', c2);
  root.setProperty('--gold-text-strong', c1);

  /* RGB triplet exports — used inside rgba(var(--accent-rgb), 0.x). */
  const baseRgb = hexToRgb(c3);
  const lightRgb = hexToRgb(c1);
  root.setProperty('--accent-rgb', toRgbTriplet(baseRgb.r, baseRgb.g, baseRgb.b));
  root.setProperty('--accent-rgb-light', toRgbTriplet(lightRgb.r, lightRgb.g, lightRgb.b));

  /* Pre-computed full rgba() strings so consumers don't need to compose them
     at runtime — bulletproof against any browser that misparses
     `rgba(var(--rgb), alpha)`. Names: --accent-<pp>, --accent-light-<pp>. */
  for (const a of ALPHAS) {
    const pp = String(Math.round(a * 100)).padStart(2, '0');
    root.setProperty(`--accent-${pp}`, `rgba(${baseRgb.r}, ${baseRgb.g}, ${baseRgb.b}, ${a})`);
    root.setProperty(
      `--accent-light-${pp}`,
      `rgba(${lightRgb.r}, ${lightRgb.g}, ${lightRgb.b}, ${a})`,
    );
  }

  /* Legacy aliases — kept so older components keep working. */
  root.setProperty('--accent', c2);
  root.setProperty('--accent-strong', c1);
  root.setProperty('--accent-dark', c4);
  root.setProperty('--date-panel-active', c2);
  root.setProperty('--warning-star', c1);
}

export function loadAccent(): string {
  if (typeof window === 'undefined') return DEFAULT_ACCENT;
  return localStorage.getItem('mz_accent_color') || DEFAULT_ACCENT;
}

export function saveAccent(hex: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('mz_accent_color', hex);
  applyAccent(hex);
}

export function greetingByHour(date = new Date()): string {
  const h = date.getHours();
  if (h >= 5 && h < 12) return 'Доброго ранку';
  if (h >= 12 && h < 18) return 'Доброго дня';
  if (h >= 18 && h < 23) return 'Доброго вечора';
  return 'Доброї ночі';
}
