import { format, formatDistanceToNow } from 'date-fns';

export function formatRelativeOrDate(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const now = Date.now();
  const diffMs = Math.abs(now - date.getTime());
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 7) {
    return formatDistanceToNow(date, { addSuffix: true });
  }

  return format(date, 'MM/dd/yyyy');
}

export function formatShortDate(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return format(date, 'MM/dd');
}

export function formatSubmittedAt(input: string | number | Date): string {
  const date = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return `${format(date, 'MM/dd/yyyy')} at ${format(date, 'h:mm a')}`;
}
