// Pure helpers for mentor availability. Availability is a weekly schedule in the MENTOR's local time,
// stored with the mentor's UTC offset (minutes). Everything returned is a UTC instant.
const STEP_MIN = 30;

function toMinutes(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || ''));
  if (!m) return null;
  const h = Number(m[1]); const mi = Number(m[2]);
  if (h > 24 || mi > 59 || (h === 24 && mi !== 0)) return null;
  return h * 60 + mi;
}

// availability: [{ day: 0-6 (Sun-Sat, mentor local), start: 'HH:MM', end: 'HH:MM' }]
function generateSlots({ availability, utcOffsetMinutes = 0, durationMin = 60, from = new Date(), days = 14, minNoticeHours = 2, busy = [] }) {
  const slots = [];
  const earliest = from.getTime() + minNoticeHours * 3600 * 1000;
  const offsetMs = (Number(utcOffsetMinutes) || 0) * 60000;
  // "Today" in the mentor's local calendar
  const localNow = new Date(from.getTime() + offsetMs);
  const baseY = localNow.getUTCFullYear(); const baseM = localNow.getUTCMonth(); const baseD = localNow.getUTCDate();
  for (let i = 0; i <= days; i += 1) {
    const dayStartLocal = Date.UTC(baseY, baseM, baseD + i); // local midnight, expressed as if UTC
    const weekday = new Date(dayStartLocal).getUTCDay();
    for (const w of availability || []) {
      if (Number(w.day) !== weekday) continue;
      const a = toMinutes(w.start); const b = toMinutes(w.end);
      if (a === null || b === null || b <= a) continue;
      for (let t = a; t + durationMin <= b; t += STEP_MIN) {
        const startUtc = dayStartLocal + t * 60000 - offsetMs;
        const endUtc = startUtc + durationMin * 60000;
        if (startUtc < earliest) continue;
        if (busy.some((x) => startUtc < x.end && endUtc > x.start)) continue;
        slots.push(startUtc);
      }
    }
  }
  return [...new Set(slots)].sort((x, y) => x - y).map((ms) => new Date(ms).toISOString());
}

function isValidAvailability(list) {
  if (!Array.isArray(list) || list.length > 60) return false;
  return list.every((w) => Number.isInteger(Number(w.day)) && Number(w.day) >= 0 && Number(w.day) <= 6
    && toMinutes(w.start) !== null && toMinutes(w.end) !== null && toMinutes(w.end) > toMinutes(w.start));
}

module.exports = { generateSlots, isValidAvailability, toMinutes, STEP_MIN };
