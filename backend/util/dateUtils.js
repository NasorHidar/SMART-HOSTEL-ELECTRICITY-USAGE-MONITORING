/*
 * util/dateUtils.js
 * Utility functions for date operations used across services.
 */

/**
 * Get the start of the current day (UTC midnight).
 * @returns {Date} Start of today's date
 */
const startOfDay = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get the end of the current day (23:59:59.999).
 * @param {Date} [date] - Optional date to use (defaults to current date)
 * @returns {Date} End of day's date
 */
const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Get the start of the current month (first day at midnight).
 * @returns {Date} Start of current month
 */
const startOfMonth = () => {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get a Date object for n days ago.
 * @param {number} n - Number of days to go back
 * @returns {Date} Date n days ago
 */
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

/**
 * Check if a date is today (UTC).
 * @param {Date} date - Date to check
 * @returns {boolean} True if date is today
 */
const isToday = (date) => {
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

/**
 * Calculate days between two dates (inclusive).
 * @param {Date} start - Start date
 * @param {Date} end - End date
 * @returns {number} Number of days between dates
 */
const daysBetween = (start, end) => {
  const oneDay = 24 * 60 * 60 * 1000;
  const startMs = new Date(start).setHours(0, 0, 0, 0);
  const endMs = new Date(end).setHours(0, 0, 0, 0);
  return Math.round(Math.abs((endMs - startMs) / oneDay));
};

module.exports = {
  startOfDay,
  endOfDay,
  startOfMonth,
  daysAgo,
  isToday,
  daysBetween,
};