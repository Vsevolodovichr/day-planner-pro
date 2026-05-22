export type MotionPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied' | 'disabled';

const MOTION_PERMISSION_STATE_KEY = 'angel.motionPermissionState';
const MOTION_PERMISSION_GRANTED_AT_KEY = 'angel.motionPermissionGrantedAt';
const ANGEL_ANIMATION_TEMPO_KEY = 'angel.animationTempo';
const MIN_ANGEL_ANIMATION_TEMPO = 70;
const MAX_ANGEL_ANIMATION_TEMPO = 130;
const DEFAULT_ANGEL_ANIMATION_TEMPO = 100;

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

function getDeviceOrientationEvent(): DeviceOrientationEventWithPermission | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { DeviceOrientationEvent?: DeviceOrientationEventWithPermission })
    .DeviceOrientationEvent;
}

function clampAngelAnimationTempo(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_ANGEL_ANIMATION_TEMPO;
  return Math.min(MAX_ANGEL_ANIMATION_TEMPO, Math.max(MIN_ANGEL_ANIMATION_TEMPO, value));
}

function saveMotionPermissionState(state: MotionPermissionState) {
  try {
    window.localStorage.setItem(MOTION_PERMISSION_STATE_KEY, state);
    if (state === 'granted') {
      window.localStorage.setItem(MOTION_PERMISSION_GRANTED_AT_KEY, new Date().toISOString());
    }
  } catch {
    /* ignore */
  }
}

function readStoredState(): MotionPermissionState | null {
  try {
    const state = window.localStorage.getItem(MOTION_PERMISSION_STATE_KEY);
    if (
      state === 'unsupported' ||
      state === 'prompt' ||
      state === 'granted' ||
      state === 'denied' ||
      state === 'disabled'
    ) {
      return state;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function getMotionPermissionState(): MotionPermissionState {
  const DOE = getDeviceOrientationEvent();
  if (!DOE) return 'unsupported';
  const storedState = readStoredState();
  if (storedState === 'disabled') return 'disabled';
  if (typeof DOE.requestPermission !== 'function') return 'granted';
  return storedState ?? 'prompt';
}

export function disableMotionPermission(): MotionPermissionState {
  saveMotionPermissionState('disabled');
  return 'disabled';
}

export function loadAngelAnimationTempo(): number {
  if (typeof window === 'undefined') return DEFAULT_ANGEL_ANIMATION_TEMPO;
  try {
    const stored = window.localStorage.getItem(ANGEL_ANIMATION_TEMPO_KEY);
    if (stored === null) return DEFAULT_ANGEL_ANIMATION_TEMPO;
    return clampAngelAnimationTempo(Number(stored));
  } catch {
    return DEFAULT_ANGEL_ANIMATION_TEMPO;
  }
}

export function saveAngelAnimationTempo(value: number): number {
  const next = clampAngelAnimationTempo(value);
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(ANGEL_ANIMATION_TEMPO_KEY, String(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export async function requestMotionPermission(): Promise<MotionPermissionState> {
  const DOE = getDeviceOrientationEvent();
  if (!DOE) {
    saveMotionPermissionState('unsupported');
    return 'unsupported';
  }
  if (typeof DOE.requestPermission !== 'function') {
    saveMotionPermissionState('granted');
    return 'granted';
  }

  try {
    const result = await DOE.requestPermission();
    const state: MotionPermissionState =
      result === 'granted' ? 'granted' : result === 'denied' ? 'denied' : 'prompt';
    saveMotionPermissionState(state);
    return state;
  } catch {
    saveMotionPermissionState('denied');
    return 'denied';
  }
}
