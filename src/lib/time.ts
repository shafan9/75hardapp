export function isValidTimezone(value: string | null | undefined): value is string {
  if (!value) return false;
  try {
    Intl.DateTimeFormat("en-US", { timeZone: value }).format(new Date());
    return true;
  } catch {
    return false;
  }
}

export function getTimezoneFromRequest(request: Request): string {
  const header = request.headers.get("x-timezone") ?? request.headers.get("X-Timezone");
  const url = new URL(request.url);
  const query = url.searchParams.get("tz");
  const tz = (header ?? query ?? "").trim();
  return isValidTimezone(tz) ? tz : "UTC";
}

export function getLocalDate(now: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const year = map.year ?? "1970";
  const month = map.month ?? "01";
  const day = map.day ?? "01";

  return `${year}-${month}-${day}`;
}

function parseDate(date: string): Date {
  // Interpret YYYY-MM-DD as a pure date (UTC midnight) to avoid locale drift.
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, deltaDays: number): string {
  const dt = parseDate(date);
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

export function diffDays(startDate: string, endDate: string): number {
  const start = parseDate(startDate).getTime();
  const end = parseDate(endDate).getTime();
  return Math.floor((end - start) / 86400000);
}
