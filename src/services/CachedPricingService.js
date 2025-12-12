import PricingService from './PricingService';
import cacheService from './CacheService';

/**
 * Cached wrapper for PricingService
 */
class CachedPricingService {
  
  /**
   * Get all pricing with caching
   */
  static async getAllPricing() {
    return await cacheService.cachedQuery(
      'pricing',
      'getAllPricing',
      () => PricingService.getAllPricing(),
      {},
      15 * 60 * 1000 // 15 minutes TTL for pricing data
    );
  }

  /**
   * Get pricing by vehicle model with caching
   */
  static async getPricingByVehicleModel(modelId) {
    return await cacheService.cachedQuery(
      'pricing',
      'getPricingByVehicleModel',
      () => PricingService.getPricingByVehicleModel(modelId),
      { modelId },
      15 * 60 * 1000 // 15 minutes TTL
    );
  }

  /**
   * Get daily tiers with caching - FIXED: Added missing method
   */
  static async getDailyTiers() {
    return await cacheService.cachedQuery(
      'pricing',
      'getDailyTiers',
      () => PricingService.getDailyTiers(),
      {},
      30 * 60 * 1000 // 30 minutes TTL for daily tiers
    );
  }

  /**
   * Calculate rental cost with caching
   */
  static async calculateRentalCost(vehicleId, startDate, endDate, options = {}) {
    return await cacheService.cachedQuery(
      'pricing',
      'calculateRentalCost',
      () => PricingService.calculateRentalCost(vehicleId, startDate, endDate, options),
      { vehicleId, startDate, endDate, ...options },
      5 * 60 * 1000 // 5 minutes TTL for cost calculations
    );
  }

  /**
   * Get pricing rules with caching
   */
  static async getPricingRules() {
    return await cacheService.cachedQuery(
      'pricing',
      'getPricingRules',
      () => PricingService.getPricingRules(),
      {},
      30 * 60 * 1000 // 30 minutes TTL for pricing rules
    );
  }

  /**
   * Create pricing (invalidates cache)
   */
  static async createPricing(pricingData) {
    const result = await PricingService.createPricing(pricingData);
    cacheService.invalidateRelated('pricing');
    return result;
  }

  /**
   * Update pricing (invalidates cache)
   */
  static async updatePricing(pricingId, pricingData) {
    const result = await PricingService.updatePricing(pricingId, pricingData);
    cacheService.invalidateRelated('pricing');
    return result;
  }

  /**
   * Delete pricing (invalidates cache)
   */
  static async deletePricing(pricingId) {
    const result = await PricingService.deletePricing(pricingId);
    cacheService.invalidateRelated('pricing');
    return result;
  }

  /**
   * Create or update daily tier (invalidates cache)
   */
  static async upsertDailyTier(vehicleModelId, minDays, maxDays, pricePerDay) {
    const result = await PricingService.upsertDailyTier(vehicleModelId, minDays, maxDays, pricePerDay);
    cacheService.invalidateRelated('pricing');
    return result;
  }

  /**
   * Delete daily tier (invalidates cache)
   */
  static async deleteDailyTier(tierId) {
    const result = await PricingService.deleteDailyTier(tierId);
    cacheService.invalidateRelated('pricing');
    return result;
  }

  /**
   * Get seasonal pricing with caching
   */
  static async getSeasonalPricing(date) {
    return await cacheService.cachedQuery(
      'pricing',
      'getSeasonalPricing',
      () => PricingService.getSeasonalPricing(date),
      { date },
      60 * 60 * 1000 // 1 hour TTL for seasonal pricing
    );
  }
}

export default CachedPricingService;