import { format as dateFnsFormat } from 'date-fns';

/**
 * Consistent date formatting utilities for the application
 */

export const formatDate = (date: string | Date, formatStr: string = 'MMM dd, yyyy'): string => {
  try {
    return dateFnsFormat(new Date(date), formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
};

export const formatDateTime = (date: string | Date): string => {
  return formatDate(date, 'MMM dd, yyyy HH:mm');
};

export const formatDateShort = (date: string | Date): string => {
  return formatDate(date, 'MMM dd');
};

export const formatTime = (date: string | Date): string => {
  return formatDate(date, 'HH:mm');
};

export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  return `${formatDate(startDate, 'MMM dd, HH:mm')} - ${formatTime(endDate)}`;
};
