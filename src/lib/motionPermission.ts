export type MotionPermissionState = 'unsupported' | 'prompt' | 'granted' | 'denied';

const MOTION_PERMISSION_STATE_KEY = 'angel.motionPermissionState';
const MOTION_PERMISSION_GRANTED_AT_KEY = 'angel.motionPermissionGrantedAt';

type DeviceOrientationEventWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
};

function getDeviceOrientationEvent(): DeviceOrientationEventWithPermission | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as Window & { DeviceOrientationEvent?: DeviceOrientationEventWithPermission })
    .DeviceOrientationEvent;
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
    if (state === 'unsupported' || state === 'prompt' || state === 'granted' || state === 'denied') {
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
  if (typeof DOE.requestPermission !== 'function') return 'granted';
  return readStoredState() ?? 'prompt';
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
