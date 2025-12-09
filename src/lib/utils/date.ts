/**
 * Date formatting utilities
 */

export type DateFormatOptions = {
  month?: 'short' | 'long' | 'numeric' | '2-digit';
  day?: 'numeric' | '2-digit';
  year?: 'numeric' | '2-digit';
};

/**
 * Format a date string to a short format (e.g., "Dec 9")
 */
export function formatDateShort(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a date string to a full date format (e.g., "Dec 9, 2024")
 */
export function formatDateFull(dateString: string | null | undefined): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a date string with custom options
 */
export function formatDate(
  dateString: string | null | undefined,
  options: DateFormatOptions = {}
): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString(undefined, options as Intl.DateTimeFormatOptions);
}

/**
 * Get relative time string (e.g., "2 days ago")
 */
export function getRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} months ago`;
  return `${Math.floor(diffInSeconds / 31536000)} years ago`;
}
