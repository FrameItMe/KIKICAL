/**
 * Date and Time utilities
 * Provides consistent date/time formatting across the application
 */

/**
 * Get today's date in YYYY-MM-DD format (local timezone)
 * Used for daily grouping of meal logs, workout logs, and achievements
 */
export function getToday(): string {
  return new Date().toLocaleDateString('sv-SE');
}

/**
 * Get current date/time in local timezone as YYYY-MM-DD HH:mm:ss
 * Used for precise logging timestamps across all routes
 */
export function nowLocalDateTime(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}
