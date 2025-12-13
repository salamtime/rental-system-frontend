import VehicleService from './VehicleService';
import cacheService from './CacheService';

/**
 * Cached wrapper for VehicleService
 */
class CachedVehicleService {
  
  /**
   * Get all vehicles with caching
   */
  static async getAllVehicles(filters = {}) {
    return await cacheService.cachedQuery(
      'vehicles',
      'getAllVehicles',
      () => VehicleService.getAllVehicles(filters),
      filters
    );
  }

  /**
   * Get vehicle by ID with caching
   */
  static async getVehicleById(vehicleId) {
    return await cacheService.cachedQuery(
      'vehicles',
      'getVehicleById',
      () => VehicleService.getVehicleById(vehicleId),
      { vehicleId }
    );
  }

  /**
   * Search vehicles with caching
   */
  static async searchVehicles(searchTerm, filters = {}) {
    return await cacheService.cachedQuery(
      'vehicles',
      'searchVehicles',
      () => VehicleService.searchVehicles(searchTerm, filters),
      { searchTerm, ...filters }
    );
  }

  /**
   * Get available vehicles with caching
   */
  static async getAvailableVehicles(criteria = {}) {
    return await cacheService.cachedQuery(
      'vehicles',
      'getAvailableVehicles',
      () => VehicleService.getAvailableVehicles(criteria),
      criteria,
      2 * 60 * 1000 // 2 minutes TTL for availability data
    );
  }

  /**
   * Create vehicle (invalidates cache)
   */
  static async createVehicle(vehicleData) {
    const result = await VehicleService.createVehicle(vehicleData);
    cacheService.invalidateRelated('vehicles');
    return result;
  }

  /**
   * Update vehicle (invalidates cache)
   */
  static async updateVehicle(vehicleId, vehicleData) {
    const result = await VehicleService.updateVehicle(vehicleId, vehicleData);
    cacheService.invalidateRelated('vehicles');
    return result;
  }

  /**
   * Delete vehicle (invalidates cache)
   */
  static async deleteVehicle(vehicleId) {
    const result = await VehicleService.deleteVehicle(vehicleId);
    cacheService.invalidateRelated('vehicles');
    return result;
  }

  /**
   * Get vehicle statistics with caching
   */
  static async getVehicleStatistics() {
    return await cacheService.cachedQuery(
      'vehicles',
      'getVehicleStatistics',
      () => VehicleService.getVehicleStatistics(),
      {},
      10 * 60 * 1000 // 10 minutes TTL for statistics
    );
  }
}

export default CachedVehicleService;