import ToursService from './ToursService';
import cacheService from './CacheService';

/**
 * Cached wrapper for ToursService
 */
class CachedToursService {
  
  /**
   * Get all tours with caching
   */
  static async getAllTours(filters = {}) {
    return await cacheService.cachedQuery(
      'tours',
      'getAllTours',
      () => ToursService.getAllTours(filters),
      filters,
      10 * 60 * 1000 // 10 minutes TTL for tours (less frequently changed)
    );
  }

  /**
   * Get tour by ID with caching
   */
  static async getTourById(tourId) {
    return await cacheService.cachedQuery(
      'tours',
      'getTourById',
      () => ToursService.getTourById(tourId),
      { tourId },
      15 * 60 * 1000 // 15 minutes TTL for individual tours
    );
  }

  /**
   * Get available tours with caching
   */
  static async getAvailableTours(date, filters = {}) {
    return await cacheService.cachedQuery(
      'tours',
      'getAvailableTours',
      () => ToursService.getAvailableTours(date, filters),
      { date, ...filters },
      5 * 60 * 1000 // 5 minutes TTL for availability
    );
  }

  /**
   * Get popular tours with caching
   */
  static async getPopularTours(limit = 5) {
    return await cacheService.cachedQuery(
      'tours',
      'getPopularTours',
      () => ToursService.getPopularTours(limit),
      { limit },
      30 * 60 * 1000 // 30 minutes TTL for popular tours
    );
  }

  /**
   * Create tour (invalidates cache)
   */
  static async createTour(tourData) {
    const result = await ToursService.createTour(tourData);
    cacheService.invalidateRelated('tours');
    return result;
  }

  /**
   * Update tour (invalidates cache)
   */
  static async updateTour(tourId, tourData) {
    const result = await ToursService.updateTour(tourId, tourData);
    cacheService.invalidateRelated('tours');
    return result;
  }

  /**
   * Delete tour (invalidates cache)
   */
  static async deleteTour(tourId) {
    const result = await ToursService.deleteTour(tourId);
    cacheService.invalidateRelated('tours');
    return result;
  }

  /**
   * Get tour statistics with caching
   */
  static async getTourStatistics() {
    return await cacheService.cachedQuery(
      'tours',
      'getTourStatistics',
      () => ToursService.getTourStatistics(),
      {},
      15 * 60 * 1000 // 15 minutes TTL for statistics
    );
  }

  /**
   * Search tours with caching
   */
  static async searchTours(searchTerm, filters = {}) {
    return await cacheService.cachedQuery(
      'tours',
      'searchTours',
      () => ToursService.searchTours(searchTerm, filters),
      { searchTerm, ...filters },
      5 * 60 * 1000 // 5 minutes TTL for search results
    );
  }
}

export default CachedToursService;