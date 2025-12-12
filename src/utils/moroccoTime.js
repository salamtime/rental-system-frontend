/**
 * Morocco Timezone Utility
 * 
 * Provides centralized Morocco timezone handling for all date operations.
 * Uses "Africa/Casablanca" timezone (GMT+1 with automatic DST handling).
 */

const MOROCCO_TIMEZONE = 'Africa/Casablanca';

/**
 * Get current date in Morocco timezone
 * @returns {Date} Current date in Morocco timezone
 */
export const getMoroccoToday = () => {
  const now = new Date();
  // Convert to Morocco timezone and get the date components
  const moroccoDate = new Date(now.toLocaleString("en-US", { timeZone: MOROCCO_TIMEZONE }));
  return moroccoDate;
};

/**
 * Get today's date string in YYYY-MM-DD format (Morocco timezone)
 * @returns {string} Today's date in YYYY-MM-DD format
 */
export const getMoroccoTodayString = () => {
  const moroccoToday = getMoroccoToday();
  return moroccoToday.toISOString().split('T')[0];
};

/**
 * Get tomorrow's date string in YYYY-MM-DD format (Morocco timezone)
 * @returns {string} Tomorrow's date in YYYY-MM-DD format
 */
export const getMoroccoTomorrowString = () => {
  const moroccoToday = getMoroccoToday();
  const tomorrow = new Date(moroccoToday);
  tomorrow.setDate(moroccoToday.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

/**
 * Get a date N days from a given date in Morocco timezone
 * @param {number} daysOffset - Number of days to add (can be negative)
 * @param {string} [baseDateStr] - The base date string in YYYY-MM-DD format. Defaults to today.
 * @returns {string} Date string in YYYY-MM-DD format
 */
export const getMoroccoDateOffset = (daysOffset, baseDateStr = null) => {
    const baseDate = baseDateStr ? parseMoroccoDate(baseDateStr) : getMoroccoToday();
    const targetDate = new Date(baseDate);
    targetDate.setDate(targetDate.getDate() + daysOffset);
    return targetDate.toISOString().split('T')[0];
};

/**
 * Convert a date string to Morocco timezone date object
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {Date} Date object in Morocco timezone
 */
export const parseMoroccoDate = (dateString) => {
  if (!dateString) return null;
  
  // Parse the date string and ensure it's interpreted in Morocco timezone
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  
  return date;
};

/**
 * Get an array of date strings for the next N days from today (Morocco timezone)
 * @param {number} days - Number of days to include
 * @returns {string[]} Array of date strings in YYYY-MM-DD format
 */
export const getMoroccoNextDays = (days = 7) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    dates.push(getMoroccoDateOffset(i));
  }
  return dates;
};

/**
 * Check if a date string represents today in Morocco timezone
 * @param {string} dateString - Date string in YYYY-MM-DD format
 * @returns {boolean} True if the date is today in Morocco
 */
export const isMoroccoToday = (dateString) => {
  return dateString === getMoroccoTodayString();
};

/**
 * Get the current week range in Morocco timezone
 * @returns {object} Object with start and end date strings
 */
export const getMoroccoWeekRange = () => {
  const today = getMoroccoToday();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  
  return {
    start: startOfWeek.toISOString().split('T')[0],
    end: endOfWeek.toISOString().split('T')[0]
  };
};

/**
 * Get current Morocco time and calculate auto-populated times for hourly rentals
 * @returns {object} Object with startTime and endTime in HH:MM format
 */
export const getMoroccoHourlyTimes = () => {
  // Get current time in Morocco timezone
  const now = new Date();
  const moroccoTime = new Date(now.toLocaleString("en-US", { timeZone: MOROCCO_TIMEZONE }));
  
  // Round to nearest 30-minute increment and add 30 minutes
  const minutes = moroccoTime.getMinutes();
  const roundedMinutes = minutes < 30 ? 30 : 0;
  const hourOffset = minutes < 30 ? 0 : 1;
  
  // Calculate start time (current time + 30 minutes, rounded to 30-min increments)
  const startTime = new Date(moroccoTime);
  startTime.setHours(moroccoTime.getHours() + hourOffset);
  startTime.setMinutes(roundedMinutes);
  startTime.setSeconds(0);
  startTime.setMilliseconds(0);
  
  // Calculate end time (start time + 1 hour)
  const endTime = new Date(startTime);
  endTime.setHours(startTime.getHours() + 1);
  
  // Format times as HH:MM
  const formatTime = (date) => {
    return date.toTimeString().slice(0, 5); // HH:MM format
  };
  
  return {
    startTime: formatTime(startTime),
    endTime: formatTime(endTime)
  };
};

/**
 * Get current Morocco time in HH:MM format
 * @returns {string} Current time in Morocco in HH:MM format
 */
export const getMoroccoCurrentTime = () => {
  const now = new Date();
  const moroccoTime = new Date(now.toLocaleString("en-US", { timeZone: MOROCCO_TIMEZONE }));
  return moroccoTime.toTimeString().slice(0, 5); // HH:MM format
};

/**
 * Checks if the first date is after the second date.
 * @param {Date} date1 - The first date.
 * @param {Date} date2 - The second date.
 * @returns {boolean} - True if date1 is after date2.
 */
export const isAfter = (date1, date2) => {
  if (!date1 || !date2) {
    return false;
  }
  return date1.getTime() > date2.getTime();
};