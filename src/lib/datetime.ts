/** Date/time helpers for form ↔ ISO conversion. */

export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromLocalInputValue(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

export function toDateInputValue(isoOrDate: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
  let d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) {
    // Reclaim 2.0 due values use nanosecond fractions, which Date cannot parse.
    d = new Date(isoOrDate.replace(/(\.\d{3})\d+/, "$1"));
  }
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Exclusive end date for all-day Google events: day after start. */
export function allDayExclusiveEnd(startDate: string): string {
  const d = new Date(startDate + "T00:00:00");
  d.setDate(d.getDate() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addMinutesIso(iso: string, minutes: number): string {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
}

export function nowPlusMinutesLocal(minutes: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() + minutes, 0, 0);
  return toLocalInputValue(d.toISOString());
}

export function minutesToChunks(minutes: number, chunkMinutes = 15): number {
  return Math.max(1, Math.ceil(minutes / chunkMinutes));
}

export function chunksToMinutes(chunks: number, chunkMinutes = 15): number {
  return Math.max(chunkMinutes, chunks * chunkMinutes);
}
