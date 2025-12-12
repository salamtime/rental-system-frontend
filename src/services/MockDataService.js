// Mock data service for development and testing
export class MockDataService {
  static mockVehicleModels = [
    { id: 1, make: 'Segway', model: 'AT6', active: true },
    { id: 2, make: 'Segway', model: 'GT2', active: true },
    { id: 3, make: 'Xiaomi', model: 'Pro 2', active: true },
    { id: 4, make: 'Ninebot', model: 'Max G30', active: true },
    { id: 5, make: 'Dualtron', model: 'Thunder', active: true },
    { id: 6, make: 'Kaabo', model: 'Mantis 10', active: true },
    { id: 7, make: 'Zero', model: '10X', active: true },
    { id: 8, make: 'Inokim', model: 'OX Super', active: true }
  ];

  static mockBasePrices = [
    {
      vehicle_model_id: 1,
      hourly_price: 15.00,
      daily_base_price: 85.00,
      weekly_price: 450.00,
      make: 'Segway',
      model: 'AT6'
    },
    {
      vehicle_model_id: 2,
      hourly_price: 12.00,
      daily_base_price: 70.00,
      weekly_price: 380.00,
      make: 'Segway',
      model: 'GT2'
    }
  ];

  static mockDailyTiers = [
    {
      id: 1,
      vehicle_model_id: 1,
      min_days: 1,
      max_days: 2,
      price_per_day: 85.00,
      active: true,
      saharax_0u4w4d_vehicle_models: { id: 1, make: 'Segway', model: 'AT6' }
    },
    {
      id: 2,
      vehicle_model_id: 1,
      min_days: 3,
      max_days: 6,
      price_per_day: 75.00,
      active: true,
      saharax_0u4w4d_vehicle_models: { id: 1, make: 'Segway', model: 'AT6' }
    },
    {
      id: 3,
      vehicle_model_id: 1,
      min_days: 7,
      max_days: null,
      price_per_day: 65.00,
      active: true,
      saharax_0u4w4d_vehicle_models: { id: 1, make: 'Segway', model: 'AT6' }
    }
  ];

  /**
   * Get mock vehicle models
   */
  static async getVehicleModels() {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));
    return this.mockVehicleModels.filter(model => model.active);
  }

  /**
   * Get mock base prices
   */
  static async getBasePrices() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.mockBasePrices;
  }

  /**
   * Get mock daily tiers
   */
  static async getDailyTiers() {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.mockDailyTiers;
  }

  /**
   * Mock upsert pricing rule
   */
  static async upsertPricingRule(vehicleModelId, priceType, price) {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Mock: Upserting pricing rule for model ${vehicleModelId}, type ${priceType}, price ${price}`);
    return { success: true };
  }

  /**
   * Mock upsert daily tier
   */
  static async upsertDailyTier(vehicleModelId, minDays, maxDays, pricePerDay) {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`Mock: Upserting daily tier for model ${vehicleModelId}, ${minDays}-${maxDays} days, price ${pricePerDay}`);
    return { success: true };
  }

  /**
   * Mock calculate rental price
   */
  static async calculateRentalPrice(vehicleModelId, startDate, endDate) {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Find applicable tier
    const applicableTier = this.mockDailyTiers.find(tier => {
      return tier.vehicle_model_id === parseInt(vehicleModelId) &&
             diffDays >= tier.min_days && 
             (tier.max_days === null || diffDays <= tier.max_days);
    });

    if (applicableTier) {
      return {
        totalPrice: applicableTier.price_per_day * diffDays,
        pricePerDay: applicableTier.price_per_day,
        days: diffDays,
        tierUsed: `${applicableTier.min_days}-${applicableTier.max_days || '∞'} days`
      };
    }

    // Fallback to base price
    const basePrice = this.mockBasePrices.find(p => p.vehicle_model_id === parseInt(vehicleModelId));
    if (basePrice) {
      return {
        totalPrice: basePrice.daily_base_price * diffDays,
        pricePerDay: basePrice.daily_base_price,
        days: diffDays,
        tierUsed: 'Base daily rate'
      };
    }

    throw new Error('No pricing found for this vehicle model');
  }
}

export default MockDataService;