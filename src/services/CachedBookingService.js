import BookingService from './BookingService';
import cacheService from './CacheService';

/**
 * Cached wrapper for BookingService
 */
class CachedBookingService {
  
  /**
   * Get all bookings with caching
   */
  static async getAllBookings(filters = {}) {
    return await cacheService.cachedQuery(
      'bookings',
      'getAllBookings',
      () => BookingService.getAllBookings(filters),
      filters,
      2 * 60 * 1000 // 2 minutes TTL for bookings
    );
  }

  /**
   * Get booking by ID with caching
   */
  static async getBookingById(bookingId) {
    return await cacheService.cachedQuery(
      'bookings',
      'getBookingById',
      () => BookingService.getBookingById(bookingId),
      { bookingId }
    );
  }

  /**
   * Get bookings by date range with caching
   */
  static async getBookingsByDateRange(startDate, endDate, filters = {}) {
    return await cacheService.cachedQuery(
      'bookings',
      'getBookingsByDateRange',
      () => BookingService.getBookingsByDateRange(startDate, endDate, filters),
      { startDate, endDate, ...filters },
      5 * 60 * 1000 // 5 minutes TTL for date range queries
    );
  }

  /**
   * Get upcoming bookings with caching
   */
  static async getUpcomingBookings(limit = 10) {
    return await cacheService.cachedQuery(
      'bookings',
      'getUpcomingBookings',
      () => BookingService.getUpcomingBookings(limit),
      { limit },
      1 * 60 * 1000 // 1 minute TTL for upcoming bookings
    );
  }

  /**
   * Create booking (invalidates cache)
   */
  static async createBooking(bookingData) {
    const result = await BookingService.createBooking(bookingData);
    cacheService.invalidateRelated('bookings');
    return result;
  }

  /**
   * Update booking (invalidates cache)
   */
  static async updateBooking(bookingId, bookingData) {
    const result = await BookingService.updateBooking(bookingId, bookingData);
    cacheService.invalidateRelated('bookings');
    return result;
  }

  /**
   * Delete booking (invalidates cache)
   */
  static async deleteBooking(bookingId) {
    const result = await BookingService.deleteBooking(bookingId);
    cacheService.invalidateRelated('bookings');
    return result;
  }

  /**
   * Get booking statistics with caching
   */
  static async getBookingStatistics(dateRange = {}) {
    return await cacheService.cachedQuery(
      'bookings',
      'getBookingStatistics',
      () => BookingService.getBookingStatistics(dateRange),
      dateRange,
      10 * 60 * 1000 // 10 minutes TTL for statistics
    );
  }

  /**
   * Check availability with caching
   */
  static async checkAvailability(vehicleId, startDate, endDate) {
    return await cacheService.cachedQuery(
      'bookings',
      'checkAvailability',
      () => BookingService.checkAvailability(vehicleId, startDate, endDate),
      { vehicleId, startDate, endDate },
      2 * 60 * 1000 // 2 minutes TTL for availability checks
    );
  }
}

export default CachedBookingService;