export const IOS_ALARM_SHORTCUT_NAME = "PWA Будильник";
export const IOS_ALARM_SHORTCUT_INSTALL_URL = "https://www.icloud.com/shortcuts/722425ee7a5a426bb941d717fa3f5768";
export const IOS_ALARM_SHORTCUT_INSTALL_FALLBACK_URL = "shortcuts://create-shortcut";
export const IOS_ALARM_SHORTCUT_INSTALL_OPENED_KEY = "ios_alarm_shortcut_install_opened";

export type IosAlarmOffsetMinutes = 15 | 30 | 60;

type CreateIosShortcutAlarmsParams = {
  shortcutName: string;
  taskId: string | number;
  taskTitle?: string | null;
  taskDateTime: string | Date;
  offsetsMinutes: IosAlarmOffsetMinutes[];
};

export function isIosDevice() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function formatTimeHHMM(date: Date) {
  return new Intl.DateTimeFormat("uk-UA", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function createIosShortcutAlarms({
  shortcutName,
  taskId,
  taskTitle,
  taskDateTime,
  offsetsMinutes,
}: CreateIosShortcutAlarmsParams) {
  if (!isIosDevice()) return;

  const baseDate = new Date(taskDateTime);

  if (Number.isNaN(baseDate.getTime())) {
    throw new Error("Invalid taskDateTime");
  }

  if (!offsetsMinutes.length) {
    throw new Error("offsetsMinutes is empty");
  }

  const alarmLabel = taskTitle?.trim() || "Нагадування про задачу";
  const uniqueOffsets = Array.from(new Set(offsetsMinutes)).sort((a, b) => b - a);

  const alarms = uniqueOffsets.map((offsetMinutes) => {
    const alarmDate = new Date(baseDate.getTime() - offsetMinutes * 60 * 1000);

    return {
      offsetMinutes,
      alarmDateTime: alarmDate.toISOString(),
      alarmTime: formatTimeHHMM(alarmDate),
      alarmLabel,
    };
  });

  const payload = {
    source: "pwa-task-app",
    taskId,
    taskTitle: taskTitle || "",
    alarmLabel,
    taskDateTime: baseDate.toISOString(),
    offsetsMinutes: uniqueOffsets,
    alarms,
  };

  const url =
    "shortcuts://run-shortcut" +
    `?name=${encodeURIComponent(shortcutName)}` +
    "&input=text" +
    `&text=${encodeURIComponent(JSON.stringify(payload))}`;

  window.location.href = url;
}
