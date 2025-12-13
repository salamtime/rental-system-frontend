/**
 * Utility functions for date formatting and manipulation
 */

/**
 * Format a date string or date object into a localized string
 * 
 * @param {Date|string|number} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatDate = (date, options = {}, locale = 'en-US') => {
  if (!date) return '';
  
  // Default formatting options
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric'
  };
  
  const mergedOptions = { ...defaultOptions, ...options };
  
  try {
    // Convert string or timestamp to Date object if needed
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    return new Intl.DateTimeFormat(locale, mergedOptions).format(dateObj);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Error formatting date';
  }
};

/**
 * Format a date relative to now (e.g., "5 minutes ago", "2 days ago")
 * 
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Relative time string
 */
export const formatRelativeTime = (date, locale = 'en-US') => {
  if (!date) return '';
  
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid date';
    }
    
    const now = new Date();
    const diffMs = now - dateObj;
    const diffSec = Math.round(diffMs / 1000);
    const diffMin = Math.round(diffSec / 60);
    const diffHr = Math.round(diffMin / 60);
    const diffDays = Math.round(diffHr / 24);
    
    if (diffSec < 60) {
      return 'just now';
    } else if (diffMin < 60) {
      return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
    } else if (diffHr < 24) {
      return `${diffHr} hour${diffHr > 1 ? 's' : ''} ago`;
    } else if (diffDays < 30) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else {
      // If more than a month, fall back to regular date format
      return formatDate(dateObj, { timeStyle: 'short', dateStyle: 'medium' }, locale);
    }
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return 'Error formatting date';
  }
};

/**
 * Format a date as just the date portion (no time)
 * 
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted date string
 */
export const formatDateOnly = (date, locale = 'en-US') => {
  return formatDate(date, { year: 'numeric', month: 'short', day: 'numeric' }, locale);
};

/**
 * Format a date as just the time portion
 * 
 * @param {Date|string|number} date - Date to format
 * @param {string} locale - Locale string (default: 'en-US')
 * @returns {string} Formatted time string
 */
export const formatTimeOnly = (date, locale = 'en-US') => {
  return formatDate(date, { hour: 'numeric', minute: 'numeric' }, locale);
};