import { supabase } from '../lib/supabase';
import TABLE_NAMES from '../config/tableNames';

/**
 * BasePriceService - Manage base pricing for vehicle models
 * 
 * This service handles the core pricing data that serves as the single source
 * of truth for rental form pricing calculations.
 */
class BasePriceService {
  static TABLE_NAME = TABLE_NAMES.BASE_PRICES;
  static VEHICLE_MODELS_TABLE = TABLE_NAMES.VEHICLE_MODELS;

  /**
   * Get all base prices with vehicle model information
   */
  static async getAllBasePrices() {
    try {
      console.log('🔧 Loading all base prices with vehicle models...');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
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

      console.log('✅ Base prices loaded:', data);
      return data || [];
    } catch (err) {
      console.error('Error in getAllBasePrices:', err);
      throw new Error(`Failed to load base prices: ${err.message}`);
    }
  }

  /**
   * Get base price for a specific vehicle model
   */
  static async getBasePriceByModelId(vehicleModelId) {
    try {
      console.log('🔧 Loading base price for model:', vehicleModelId);
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
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
   * Create or update base price for a vehicle model
   */
  static async upsertBasePrice(priceData) {
    try {
      console.log('💾 Upserting base price:', priceData);

      // Validate required fields
      if (!priceData.vehicle_model_id) {
        throw new Error('Vehicle model ID is required');
      }

      // First, deactivate any existing price for this model
      await this.deactivateExistingPrice(priceData.vehicle_model_id);

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
        basePrice.created_at = priceData.created_at; // Preserve original created_at
      }

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
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

      console.log('✅ Base price upserted successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in upsertBasePrice:', err);
      throw new Error(`Failed to save base price: ${err.message}`);
    }
  }

  /**
   * Deactivate existing active price for a vehicle model
   */
  static async deactivateExistingPrice(vehicleModelId) {
    try {
      console.log('🔄 Deactivating existing prices for model:', vehicleModelId);

      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_model_id', vehicleModelId)
        .eq('is_active', true);

      if (error) {
        console.error('Error deactivating existing prices:', error);
        throw error;
      }

      console.log('✅ Existing prices deactivated for model:', vehicleModelId);
    } catch (err) {
      console.error('Error in deactivateExistingPrice:', err);
      // Don't throw here, as this is a preparatory step
      console.warn('Could not deactivate existing prices, continuing...');
    }
  }

  /**
   * Delete (deactivate) a base price
   */
  static async deleteBasePrice(priceId) {
    try {
      console.log('🗑️ Deactivating base price:', priceId);

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
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

      console.log('✅ Base price deactivated successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in deleteBasePrice:', err);
      throw new Error(`Failed to delete base price: ${err.message}`);
    }
  }

  /**
   * Get all vehicle models for the dropdown
   */
  static async getAllVehicleModels() {
    try {
      console.log('🔧 Loading all vehicle models...');
      
      const { data, error } = await supabase
        .from(this.VEHICLE_MODELS_TABLE)
        .select('id, name, model, vehicle_type')
        .order('name');

      if (error) {
        console.error('Error loading vehicle models:', error);
        throw error;
      }

      console.log('✅ Vehicle models loaded:', data);
      return data || [];
    } catch (err) {
      console.error('Error in getAllVehicleModels:', err);
      throw new Error(`Failed to load vehicle models: ${err.message}`);
    }
  }

  /**
   * Get pricing for rental form auto-population
   */
  static async getPricingForRental(vehicleModelId, rentalType) {
    try {
      console.log('🔧 Getting pricing for rental:', { vehicleModelId, rentalType });

      const basePrice = await this.getBasePriceByModelId(vehicleModelId);
      
      if (!basePrice) {
        console.warn('No base price found for model:', vehicleModelId);
        return 0;
      }

      let unitPrice = 0;
      switch (rentalType) {
        case 'hourly':
          unitPrice = basePrice.hourly_price;
          break;
        case 'daily':
          unitPrice = basePrice.daily_price;
          break;
        case 'weekly':
          unitPrice = basePrice.weekly_price;
          break;
        default:
          unitPrice = basePrice.daily_price; // Default to daily
      }

      console.log('✅ Unit price for rental:', unitPrice);
      return unitPrice || 0;
    } catch (err) {
      console.error('Error in getPricingForRental:', err);
      return 0;
    }
  }

  /**
   * Format model name for display (fix duplicates like "SEGWAY AT5 AT5")
   */
  static formatModelName(vehicleModel) {
    if (!vehicleModel) return 'Unknown Model';
    
    const { name, model } = vehicleModel;
    
    // If name already contains the model, don't duplicate
    if (name && model && name.toLowerCase().includes(model.toLowerCase())) {
      return this.toTitleCase(name);
    }
    
    // If both name and model exist, combine them
    if (name && model) {
      return this.toTitleCase(`${name} ${model}`);
    }
    
    // Fallback to name or model
    return this.toTitleCase(name || model || 'Unknown');
  }

  /**
   * Convert string to Title Case
   */
  static toTitleCase(str) {
    return str.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Initialize base prices table
   */
  static async initializeBasePricesTable() {
    try {
      console.log('🔧 Initializing base prices table...');
      
      // The table should already exist, just verify we can access it
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('id')
        .limit(1);

      if (error) {
        console.error('Base prices table not accessible:', error);
        throw error;
      }

      console.log('✅ Base prices table is accessible');
      return true;
    } catch (err) {
      console.error('Error initializing base prices table:', err);
      throw new Error(`Failed to initialize base prices table: ${err.message}`);
    }
  }
}

export default BasePriceService;