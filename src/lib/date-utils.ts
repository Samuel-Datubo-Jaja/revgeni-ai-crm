import { formatDistanceToNow, format, add, parseISO, isValid, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';

/**
 * Enhanced date utilities for CRM application
 */

// Parse date safely
function parseDate(date: Date | string | number): Date {
  if (date instanceof Date) return date;
  if (typeof date === 'string') return parseISO(date);
  if (typeof date === 'number') return new Date(date);
  throw new Error('Invalid date input');
}

// Check if date is valid
function isValidDate(date: Date | string | number): boolean {
  try {
    return isValid(parseDate(date));
  } catch {
    return false;
  }
}

/**
 * Format time ago with better granularity
 * "just now", "2 minutes ago", "3 hours ago", "2 days ago"
 */
export function formatTimeAgo(date: Date | string | number): string {
  try {
    if (!isValidDate(date)) return 'Unknown time';
    
    const parsedDate = parseDate(date);
    const now = new Date();
    
    const minutes = differenceInMinutes(now, parsedDate);
    const hours = differenceInHours(now, parsedDate);
    const days = differenceInDays(now, parsedDate);
    
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
    
    return formatDistanceToNow(parsedDate, { addSuffix: true });
  } catch {
    return 'Unknown time';
  }
}

/**
 * Format date in readable format
 * "Nov 2, 2024 at 8:30 PM"
 */
export function formatDateReadable(date: Date | string | number): string {
  try {
    if (!isValidDate(date)) return 'Invalid date';
    return format(parseDate(date), 'MMM d, yyyy \'at\' h:mm a');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date in short format
 * "11/02/24"
 */
export function formatDateShort(date: Date | string | number): string {
  try {
    if (!isValidDate(date)) return 'Invalid date';
    return format(parseDate(date), 'MM/dd/yy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date for CRM contexts
 * "Nov 2, 2024"
 */
export function formatDateCRM(date: Date | string | number): string {
  try {
    if (!isValidDate(date)) return 'Invalid date';
    return format(parseDate(date), 'MMM d, yyyy');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Format date and time for detailed views
 * "November 2, 2024 at 8:30:45 PM"
 */
export function formatDateTimeFull(date: Date | string | number): string {
  try {
    if (!isValidDate(date)) return 'Invalid date';
    return format(parseDate(date), 'MMMM d, yyyy \'at\' h:mm:ss a');
  } catch {
    return 'Invalid date';
  }
}

/**
 * Add days to a date
 */
export function addDays(date: Date | string | number, days: number): Date {
  try {
    return add(parseDate(date), { days });
  } catch {
    return new Date();
  }
}

/**
 * Add hours to a date
 */
export function addHours(date: Date | string | number, hours: number): Date {
  try {
    return add(parseDate(date), { hours });
  } catch {
    return new Date();
  }
}

/**
 * Format email delay for sequences
 */
export function formatEmailDelay(delayDays: number): string {
  if (delayDays === 0) return 'Send immediately';
  if (delayDays === 1) return 'Send tomorrow';
  return `Send in ${delayDays} days`;
}

/**
 * Check if date is in the past
 */
export function isPast(date: Date | string | number): boolean {
  try {
    return parseDate(date) < new Date();
  } catch {
    return false;
  }
}

/**
 * Check if date is in the future
 */
export function isFuture(date: Date | string | number): boolean {
  try {
    return parseDate(date) > new Date();
  } catch {
    return false;
  }
}

/**
 * Get business days between two dates
 */
export function getBusinessDays(startDate: Date | string | number, endDate: Date | string | number): number {
  try {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    
    let businessDays = 0;
    let currentDate = new Date(start);
    
    while (currentDate <= end) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
        businessDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return businessDays;
  } catch {
    return 0;
  }
}

/**
 * Format duration between two dates
 */
export function formatDuration(startDate: Date | string | number, endDate: Date | string | number): string {
  try {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const days = differenceInDays(end, start);
    
    if (days === 0) return 'Same day';
    if (days === 1) return '1 day';
    return `${days} days`;
  } catch {
    return 'Unknown duration';
  }
}

/**
 * Get next business day
 */
export function getNextBusinessDay(date: Date | string | number): Date {
  try {
    let nextDay = add(parseDate(date), { days: 1 });
    
    while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
      nextDay = add(nextDay, { days: 1 });
    }
    
    return nextDay;
  } catch {
    return new Date();
  }
}

/**
 * Format date for API requests (ISO string)
 */
export function formatForAPI(date: Date | string | number): string {
  try {
    return parseDate(date).toISOString();
  } catch {
    return new Date().toISOString();
  }
}

/**
 * Get timezone-aware date display
 */
export function formatWithTimezone(date: Date | string | number): string {
  try {
    const parsedDate = parseDate(date);
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return `${formatDateReadable(parsedDate)} (${timezone})`;
  } catch {
    return 'Invalid date';
  }
}