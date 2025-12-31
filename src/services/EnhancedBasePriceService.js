import { supabase } from '../lib/supabase';
import TABLE_NAMES from '../config/tableNames';

/**
 * EnhancedBasePriceService
 * 
 * Provides advanced base price management with caching and optimization
 */
class EnhancedBasePriceService {
  static BASE_PRICES_TABLE = TABLE_NAMES.BASE_PRICES;
  static VEHICLE_MODELS_TABLE = TABLE_NAMES.VEHICLE_MODELS;
  
  // Cache for base prices
  static cache = {
    basePrices: null,
    vehicleModels: null,
    lastFetch: null,
    cacheDuration: 5 * 60 * 1000 // 5 minutes
  };

  /**
   * Check if cache is valid
   */
  static isCacheValid() {
    if (!this.cache.lastFetch) return false;
    const now = Date.now();
    return (now - this.cache.lastFetch) < this.cache.cacheDuration;
  }

  /**
   * Clear cache
   */
  static clearCache() {
    this.cache.basePrices = null;
    this.cache.vehicleModels = null;
    this.cache.lastFetch = null;
  }

  /**
   * Get all base prices with caching
   */
  static async getAllBasePrices(useCache = true) {
    try {
      // Return cached data if valid
      if (useCache && this.isCacheValid() && this.cache.basePrices) {
        console.log('📦 Returning cached base prices');
        return this.cache.basePrices;
      }

      console.log('🔧 Fetching base prices from database...');
      
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

      if (error) {
        console.error('Error loading base prices:', error);
        throw error;
      }

      // Update cache
      this.cache.basePrices = data || [];
      this.cache.lastFetch = Date.now();

      console.log('✅ Base prices loaded and cached:', data?.length || 0, 'records');
      return this.cache.basePrices;
    } catch (err) {
      console.error('Error in getAllBasePrices:', err);
      throw new Error(`Failed to load base prices: ${err.message}`);
    }
  }

  /**
   * Get base price for a specific vehicle model
   */
  static async getBasePriceByModelId(vehicleModelId, useCache = true) {
    try {
      // Try to get from cache first
      if (useCache && this.isCacheValid() && this.cache.basePrices) {
        const cachedPrice = this.cache.basePrices.find(
          bp => bp.vehicle_model_id === vehicleModelId
        );
        if (cachedPrice) {
          console.log('📦 Returning cached base price for model:', vehicleModelId);
          return cachedPrice;
        }
      }

      console.log('🔧 Fetching base price for model:', vehicleModelId);
      
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
        console.error('Error loading base price:', error);
        throw error;
      }

      console.log('✅ Base price loaded for model:', data);
      return data;
    } catch (err) {
      console.error('Error in getBasePriceByModelId:', err);
      return null;
    }
  }

  /**
   * Get all vehicle models with caching
   */
  static async getAllVehicleModels(useCache = true) {
    try {
      // Return cached data if valid
      if (useCache && this.isCacheValid() && this.cache.vehicleModels) {
        console.log('📦 Returning cached vehicle models');
        return this.cache.vehicleModels;
      }

      console.log('🔧 Fetching vehicle models from database...');
      
      const { data, error } = await supabase
        .from(this.VEHICLE_MODELS_TABLE)
        .select('id, name, model, vehicle_type')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error loading vehicle models:', error);
        throw error;
      }

      // Update cache
      this.cache.vehicleModels = data || [];
      this.cache.lastFetch = Date.now();

      console.log('✅ Vehicle models loaded and cached:', data?.length || 0, 'records');
      return this.cache.vehicleModels;
    } catch (err) {
      console.error('Error in getAllVehicleModels:', err);
      throw new Error(`Failed to load vehicle models: ${err.message}`);
    }
  }

  /**
   * Upsert base price (invalidates cache)
   */
  static async upsertBasePrice(priceData) {
    try {
      console.log('💾 Upserting base price:', priceData);

      // Validate required fields
      if (!priceData.vehicle_model_id) {
        throw new Error('Vehicle model ID is required');
      }

      // First, deactivate any existing price for this model
      await supabase
        .from(this.BASE_PRICES_TABLE)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_model_id', priceData.vehicle_model_id)
        .eq('is_active', true);

      // Prepare the data
      const basePrice = {
        vehicle_model_id: priceData.vehicle_model_id,
        hourly_price: parseFloat(priceData.hourly_price) || 0,
        daily_price: parseFloat(priceData.daily_price) || 0,
        weekly_price: parseFloat(priceData.weekly_price) || 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // If updating existing price, include the ID
      if (priceData.id) {
        basePrice.id = priceData.id;
        basePrice.created_at = priceData.created_at;
      }

      const { data, error } = await supabase
        .from(this.BASE_PRICES_TABLE)
        .upsert(basePrice, {
          onConflict: 'id'
        })
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

      if (error) {
        console.error('Error upserting base price:', error);
        throw error;
      }

      // Invalidate cache
      this.clearCache();

      console.log('✅ Base price upserted successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in upsertBasePrice:', err);
      throw new Error(`Failed to save base price: ${err.message}`);
    }
  }

  /**
   * Delete base price (invalidates cache)
   */
  static async deleteBasePrice(priceId) {
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

      if (error) {
        console.error('Error deactivating base price:', error);
        throw error;
      }

      // Invalidate cache
      this.clearCache();

      console.log('✅ Base price deactivated successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in deleteBasePrice:', err);
      throw new Error(`Failed to delete base price: ${err.message}`);
    }
  }
}

export default EnhancedBasePriceService;