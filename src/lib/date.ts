export const UA_MONTHS = ["Січня","Лютого","Березня","Квітня","Травня","Червня","Липня","Серпня","Вересня","Жовтня","Листопада","Грудня"];
export const UA_MONTHS_NOM = ["Січень","Лютий","Березень","Квітень","Травень","Червень","Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];
export const UA_DAYS_SHORT = ["Нд","Пн","Вт","Ср","Чт","Пт","Сб"];
export const UA_DAYS_FULL = ["Неділя","Понеділок","Вівторок","Середа","Четвер","Пʼятниця","Субота"];
export const UA_WEEKDAY_HEADER = ["ПН","ВТ","СР","ЧТ","ПТ","СБ","НД"];

export function toISO(d: Date): string {
  const y = d.getFullYear(); const m = String(d.getMonth()+1).padStart(2,"0"); const day = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
}
export function fromISO(iso: string): Date { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d); }
export function getWeekDates(centerISO: string): string[] {
  const d = fromISO(centerISO);
  const day = d.getDay(); // 0 sun
  const monIdx = day === 0 ? -6 : 1 - day;
  const monday = new Date(d); monday.setDate(d.getDate() + monIdx);
  return Array.from({length:7}, (_,i)=>{ const x = new Date(monday); x.setDate(monday.getDate()+i); return toISO(x); });
}
export function formatLong(iso: string): string { const d = fromISO(iso); return `${d.getDate()} ${UA_MONTHS[d.getMonth()].toLowerCase()} ${d.getFullYear()}`; }
