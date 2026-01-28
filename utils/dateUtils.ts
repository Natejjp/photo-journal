/**
 * Converts a timestamp (milliseconds) to YYYY-MM-DD format
 */
export function timestampToDateString(timestamp: number): string {
  const dateObj = new Date(timestamp);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date string (YYYY-MM-DD) to a readable format
 */
export function formatDateString(dateString: string): string {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Gets today's date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return timestampToDateString(Date.now());
}

/**
 * Checks if a photo timestamp is from today
 */
export function isPhotoFromToday(timestamp: number): boolean {
  return timestampToDateString(timestamp) === getTodayDateString();
}
