export const EVENT_CATEGORIES = ['All', 'General', 'Workshop', 'Webinar', 'Study session', 'Career', 'Networking', 'Admissions', 'Social'];
export const fmtEventDate = (iso) => new Date(iso).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const pad = (n) => String(n).padStart(2, '0');
export const toDateInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeInput = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
// Parse "YYYY-MM-DD" + "HH:MM" as LOCAL time. Returns null if invalid.
export const parseLocal = (date, time) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date).trim()); const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(time).trim());
  if (!m || !t) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]));
  return d.getMonth() === Number(m[2]) - 1 ? d : null;
};
