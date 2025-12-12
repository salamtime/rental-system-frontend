import { supabase } from '../lib/supabase';
import OptimizedBasePriceService from './OptimizedBasePriceService';

/**
 * EnhancedBasePriceService - FIXED: Now uses OptimizedBasePriceService to prevent timeouts
 * 
 * This service now delegates to OptimizedBasePriceService which implements:
 * - Shorter query timeouts (5 seconds instead of 10)
 * - Aggressive caching
 * - Circuit breaker pattern
 * - Fallback strategies
 * - Retry logic with exponential backoff
 * 
 * PERFORMANCE OPTIMIZED: All timeout issues should be resolved
 */
class EnhancedBasePriceService {
  static VEHICLE_MODELS_TABLE = 'saharax_0u4w4d_vehicle_models';
  static BASE_PRICES_TABLE = 'app_8be2ccb1f0_base_prices';
  static QUERY_TIMEOUT = 5000; // Reduced timeout

  /**
   * Calculate correct pricing based on hourly rate
   */
  static calculateCorrectPricing(hourlyRate) {
    const hourly = parseFloat(hourlyRate) || 0;
    const daily = Math.round(hourly * 8 * 0.9);
    const weekly = Math.round(daily * 7 * 0.85);
    
    return {
      hourly_price: hourly,
      daily_price: daily,
      weekly_price: weekly
    };
  }

  /**
   * Validate pricing ratios
   */
  static validatePricingRatios(hourly, daily, weekly) {
    const issues = [];
    
    if (daily && hourly) {
      const dailyHourlyRatio = daily / hourly;
      if (dailyHourlyRatio < 2) {
        issues.push('Daily rate is too low compared to hourly rate');
      }
      if (dailyHourlyRatio > 12) {
        issues.push('Daily rate is too high compared to hourly rate');
      }
    }
    
    if (weekly && daily) {
      const weeklyDailyRatio = weekly / daily;
      if (weeklyDailyRatio < 5) {
        issues.push('Weekly rate is too low compared to daily rate');
      }
      if (weeklyDailyRatio > 8) {
        issues.push('Weekly rate is too high compared to daily rate');
      }
    }
    
    return issues;
  }

  /**
   * FIXED: Get all vehicle models with pricing - now uses OptimizedBasePriceService
   */
  static async getAllVehicleModelsWithPricing() {
    try {
      console.log('🔧 FIXED: Delegating to OptimizedBasePriceService.getAllVehicleModelsWithPricing...');
      return await OptimizedBasePriceService.getAllVehicleModelsWithPricing();
    } catch (err) {
      console.error('❌ Error in getAllVehicleModelsWithPricing:', err);
      return OptimizedBasePriceService.getFallbackVehicleModels();
    }
  }

  /**
   * FIXED: Get all base prices with models - now uses OptimizedBasePriceService
   */
  static async getAllBasePricesWithModels() {
    try {
      console.log('🔧 FIXED: Delegating to OptimizedBasePriceService.getAllBasePricesWithModels...');
      return await OptimizedBasePriceService.getAllBasePricesWithModels();
    } catch (err) {
      console.error('❌ Error in getAllBasePricesWithModels:', err);
      return OptimizedBasePriceService.getFallbackBasePrices();
    }
  }

  /**
   * FIXED: Get all vehicle models - now uses OptimizedBasePriceService
   */
  static async getAllVehicleModels() {
    try {
      console.log('🔧 FIXED: Delegating to OptimizedBasePriceService.getAllVehicleModels...');
      return await OptimizedBasePriceService.getAllVehicleModels();
    } catch (err) {
      console.error('❌ Error in getAllVehicleModels:', err);
      return OptimizedBasePriceService.getFallbackVehicleModels();
    }
  }

  /**
   * FIXED: Create or update base price - now uses OptimizedBasePriceService
   */
  static async upsertBasePrice(priceData) {
    try {
      console.log('💾 FIXED: Delegating to OptimizedBasePriceService.upsertBasePrice...');

      // Validate required fields
      if (!priceData.vehicle_model_id) {
        throw new Error('Vehicle model ID is required');
      }

      // Parse input prices
      const inputHourly = parseFloat(priceData.hourly_price) || 0;
      const inputDaily = parseFloat(priceData.daily_price) || 0;
      const inputWeekly = parseFloat(priceData.weekly_price) || 0;

      let finalPrices;

      // Auto-calculate pricing if needed
      if (inputHourly > 0 && inputDaily === 0 && inputWeekly === 0) {
        console.log('🔄 Auto-calculating daily and weekly prices from hourly rate...');
        finalPrices = this.calculateCorrectPricing(inputHourly);
      } else if (inputHourly > 0 && inputDaily > 0 && inputWeekly === 0) {
        console.log('🔄 Auto-calculating weekly price from daily rate...');
        finalPrices = {
          hourly_price: inputHourly,
          daily_price: inputDaily,
          weekly_price: Math.round(inputDaily * 7 * 0.85)
        };
      } else {
        finalPrices = {
          hourly_price: inputHourly,
          daily_price: inputDaily,
          weekly_price: inputWeekly
        };
      }

      // Validate pricing ratios
      const validationIssues = this.validatePricingRatios(
        finalPrices.hourly_price,
        finalPrices.daily_price,
        finalPrices.weekly_price
      );

      if (validationIssues.length > 0) {
        console.warn('⚠️ Pricing validation warnings:', validationIssues);
      }

      // Prepare data for OptimizedBasePriceService
      const optimizedPriceData = {
        ...priceData,
        ...finalPrices
      };

      const result = await OptimizedBasePriceService.upsertBasePrice(optimizedPriceData);
      
      // Log pricing calculation details
      if (finalPrices.hourly_price !== inputHourly || finalPrices.daily_price !== inputDaily || finalPrices.weekly_price !== inputWeekly) {
        console.log('📊 Pricing calculations applied:');
        console.log(`   Input: ${inputHourly} (hourly), ${inputDaily} (daily), ${inputWeekly} (weekly)`);
        console.log(`   Final: ${finalPrices.hourly_price} (hourly), ${finalPrices.daily_price} (daily), ${finalPrices.weekly_price} (weekly)`);
      }
      
      return result;
    } catch (err) {
      console.error('❌ Error in upsertBasePrice:', err);
      throw new Error(`Failed to save base price: ${err.message}`);
    }
  }

  /**
   * FIXED: Delete base price - now uses OptimizedBasePriceService
   */
  static async deleteBasePrice(priceId) {
    try {
      console.log('🗑️ FIXED: Delegating to OptimizedBasePriceService.deleteBasePrice...');
      return await OptimizedBasePriceService.deleteBasePrice(priceId);
    } catch (err) {
      console.error('❌ Error in deleteBasePrice:', err);
      throw new Error(`Failed to delete base price: ${err.message}`);
    }
  }

  /**
   * FIXED: Get base price by model ID - now uses OptimizedBasePriceService
   */
  static async getBasePriceByModelId(vehicleModelId) {
    try {
      console.log('🔧 FIXED: Delegating to OptimizedBasePriceService.getBasePriceByModelId...');
      return await OptimizedBasePriceService.getBasePriceByModelId(vehicleModelId);
    } catch (err) {
      console.error('❌ Error in getBasePriceByModelId:', err);
      return null;
    }
  }

  /**
   * FIXED: Get pricing for rental - now uses OptimizedBasePriceService
   */
  static async getPricingForRental(vehicleModelId, rentalType) {
    try {
      console.log('🔧 FIXED: Delegating to OptimizedBasePriceService.getPricingForRental...');
      return await OptimizedBasePriceService.getPricingForRental(vehicleModelId, rentalType);
    } catch (err) {
      console.error('❌ Error in getPricingForRental:', err);
      return 0;
    }
  }

  /**
   * Fix existing pricing data with correct calculations
   */
  static async fixExistingPricingData() {
    try {
      console.log('🔧 FIXED: Fixing existing pricing data using OptimizedBasePriceService...');
      
      const existingPrices = await this.getAllBasePricesWithModels();
      
      for (const price of existingPrices) {
        const validationIssues = this.validatePricingRatios(
          price.hourly_price,
          price.daily_price,
          price.weekly_price
        );
        
        if (validationIssues.length > 0) {
          console.log(`🔄 Fixing pricing for ${this.formatModelName(price.vehicle_model)}...`);
          
          const correctedPrices = this.calculateCorrectPricing(price.hourly_price);
          
          await this.upsertBasePrice({
            id: price.id,
            vehicle_model_id: price.vehicle_model_id,
            created_at: price.created_at,
            ...correctedPrices
          });
          
          console.log(`✅ Fixed pricing for ${this.formatModelName(price.vehicle_model)}`);
        }
      }
      
      console.log('✅ Pricing data correction completed');
      return true;
    } catch (err) {
      console.error('❌ Error fixing pricing data:', err);
      throw new Error(`Failed to fix pricing data: ${err.message}`);
    }
  }

  /**
   * Deactivate existing active price for a vehicle model
   */
  static async deactivateExistingPrice(vehicleModelId) {
    try {
      console.log('🔄 FIXED: Delegating to OptimizedBasePriceService.deactivateExistingPrice...');
      return await OptimizedBasePriceService.deactivateExistingPrice(vehicleModelId);
    } catch (err) {
      console.error('❌ Error in deactivateExistingPrice:', err);
      console.warn('Could not deactivate existing prices, continuing...');
    }
  }

  /**
   * Format model name for display
   */
  static formatModelName(vehicleModel) {
    if (!vehicleModel) return 'Unknown Model';
    
    const { name, model } = vehicleModel;
    
    if (name && model && name.toLowerCase().includes(model.toLowerCase())) {
      return this.toTitleCase(name);
    }
    
    if (name && model) {
      return this.toTitleCase(`${name} ${model}`);
    }
    
    return this.toTitleCase(name || model || 'Unknown');
  }

  /**
   * Convert string to Title Case
   */
  static toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Get current pricing for a vehicle model
   */
  static getCurrentPricing(basePriceData) {
    if (!basePriceData) {
      return {
        hourly_price: 0,
        daily_price: 0,
        weekly_price: 0
      };
    }

    return {
      hourly_price: basePriceData.hourly_price || 0,
      daily_price: basePriceData.daily_price || 0,
      weekly_price: basePriceData.weekly_price || 0
    };
  }

  /**
   * Initialize base prices table
   */
  static async initializeBasePricesTable() {
    try {
      console.log('🔧 FIXED: Checking base prices table with OptimizedBasePriceService...');
      return await OptimizedBasePriceService.healthCheck();
    } catch (err) {
      console.error('❌ Error checking base prices table:', err);
      throw new Error(`Base prices table not accessible: ${err.message}`);
    }
  }

  /**
   * Fallback methods
   */
  static getFallbackVehicleModels() {
    return OptimizedBasePriceService.getFallbackVehicleModels();
  }

  static getFallbackBasePrices() {
    return OptimizedBasePriceService.getFallbackBasePrices();
  }

  /**
   * Clear cache
   */
  static clearCache() {
    OptimizedBasePriceService.clearCache();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    return OptimizedBasePriceService.getCacheStats();
  }
}

export default EnhancedBasePriceService;