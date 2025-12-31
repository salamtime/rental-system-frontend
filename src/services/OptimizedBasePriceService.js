import { supabase } from '../lib/supabase';
import TABLE_NAMES from '../config/tableNames';

/**
 * OptimizedBasePriceService
 * 
 * High-performance base price service with advanced caching and batch operations
 */
class OptimizedBasePriceService {
  static BASE_PRICES_TABLE = TABLE_NAMES.BASE_PRICES;
  static VEHICLE_MODELS_TABLE = TABLE_NAMES.VEHICLE_MODELS;
  
  // Advanced cache with TTL
  static cache = new Map();
  static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cached value or fetch from database
   */
  static async getCachedOrFetch(key, fetchFn) {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
      console.log(`📦 Cache hit for: ${key}`);
      return cached.data;
    }

    console.log(`🔧 Cache miss for: ${key}, fetching...`);
    const data = await fetchFn();
    this.cache.set(key, { data, timestamp: now });
    return data;
  }

  /**
   * Clear cache for a specific key or all keys
   */
  static clearCache(key = null) {
    if (key) {
      this.cache.delete(key);
      console.log(`🗑️ Cache cleared for: ${key}`);
    } else {
      this.cache.clear();
      console.log('🗑️ All cache cleared');
    }
  }

  /**
   * Get all base prices with vehicle models (cached)
   */
  static async getAllBasePrices() {
    return await this.getCachedOrFetch('base_prices_with_models', async () => {
      const { data, error } = await supabase
        .from(this.BASE_PRICES_TABLE)
        .select(`
          *,
          vehicle_model:${this.VEHICLE_MODELS_TABLE}(
            id,
            name,
            model,
            vehicle_type
          )
        `)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) throw new Error(`Failed to fetch base prices: ${error.message}`);
      return data || [];
    });
  }

  /**
   * Get base price by vehicle model ID (cached)
   */
  static async getBasePriceByModelId(vehicleModelId) {
    return await this.getCachedOrFetch(`base_price_${vehicleModelId}`, async () => {
      const { data, error } = await supabase
        .from(this.BASE_PRICES_TABLE)
        .select(`
          *,
          vehicle_model:${this.VEHICLE_MODELS_TABLE}(
            id,
            name,
            model,
            vehicle_type
          )
        `)
        .eq('vehicle_model_id', vehicleModelId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw new Error(`Failed to fetch base price: ${error.message}`);
      }

      return data;
    });
  }

  /**
   * Get all vehicle models (cached)
   */
  static async getAllVehicleModels() {
    return await this.getCachedOrFetch('vehicle_models', async () => {
      const { data, error } = await supabase
        .from(this.VEHICLE_MODELS_TABLE)
        .select('id, name, model, vehicle_type')
        .eq('is_active', true)
        .order('name');

      if (error) throw new Error(`Failed to fetch vehicle models: ${error.message}`);
      return data || [];
    });
  }

  /**
   * Batch get base prices for multiple vehicle models
   */
  static async getBatchBasePrices(vehicleModelIds) {
    try {
      console.log('🔧 Batch fetching base prices for models:', vehicleModelIds);

      const { data, error } = await supabase
        .from(this.BASE_PRICES_TABLE)
        .select(`
          *,
          vehicle_model:${this.VEHICLE_MODELS_TABLE}(
            id,
            name,
            model,
            vehicle_type
          )
        `)
        .in('vehicle_model_id', vehicleModelIds)
        .eq('is_active', true);

      if (error) throw new Error(`Failed to batch fetch base prices: ${error.message}`);

      // Cache individual results
      data?.forEach(price => {
        this.cache.set(`base_price_${price.vehicle_model_id}`, {
          data: price,
          timestamp: Date.now()
        });
      });

      console.log('✅ Batch fetched and cached:', data?.length || 0, 'base prices');
      return data || [];
    } catch (err) {
      console.error('Error in getBatchBasePrices:', err);
      throw err;
    }
  }

  /**
   * Upsert base price (invalidates cache)
   */
  static async upsertBasePrice(priceData) {
    try {
      console.log('💾 Upserting base price:', priceData);

      if (!priceData.vehicle_model_id) {
        throw new Error('Vehicle model ID is required');
      }

      // Deactivate existing prices
      await supabase
        .from(this.BASE_PRICES_TABLE)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_model_id', priceData.vehicle_model_id)
        .eq('is_active', true);

      // Prepare data
      const basePrice = {
        vehicle_model_id: priceData.vehicle_model_id,
        hourly_price: parseFloat(priceData.hourly_price) || 0,
        daily_price: parseFloat(priceData.daily_price) || 0,
        weekly_price: parseFloat(priceData.weekly_price) || 0,
        is_active: true,
        created_at: priceData.id ? priceData.created_at : new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (priceData.id) {
        basePrice.id = priceData.id;
      }

      const { data, error } = await supabase
        .from(this.BASE_PRICES_TABLE)
        .upsert(basePrice, { onConflict: 'id' })
        .select(`
          *,
          vehicle_model:${this.VEHICLE_MODELS_TABLE}(
            id,
            name,
            model,
            vehicle_type
          )
        `)
        .single();

      if (error) throw new Error(`Failed to upsert base price: ${error.message}`);

      // Invalidate relevant caches
      this.clearCache('base_prices_with_models');
      this.clearCache(`base_price_${priceData.vehicle_model_id}`);

      console.log('✅ Base price upserted successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in upsertBasePrice:', err);
      throw err;
    }
  }

  /**
   * Delete base price (invalidates cache)
   */
  static async deleteBasePrice(priceId, vehicleModelId) {
    try {
      console.log('🗑️ Deactivating base price:', priceId);

      const { data, error } = await supabase
        .from(this.BASE_PRICES_TABLE)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', priceId)
        .select()
        .single();

      if (error) throw new Error(`Failed to delete base price: ${error.message}`);

      // Invalidate relevant caches
      this.clearCache('base_prices_with_models');
      if (vehicleModelId) {
        this.clearCache(`base_price_${vehicleModelId}`);
      }

      console.log('✅ Base price deactivated successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in deleteBasePrice:', err);
      throw err;
    }
  }
}

export default OptimizedBasePriceService;