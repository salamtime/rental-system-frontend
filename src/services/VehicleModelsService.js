import { supabase } from '../utils/supabaseClient';
import { TBL } from '../config/tables.js';

/**
 * Service for managing vehicle models and their pricing
 */
class VehicleModelsService {
  constructor() {
    this.tableName = TBL.PRICING;
  }

  /**
   * Get all vehicle models with pricing
   */
  async getAllVehicleModels() {
    try {
      const { data, error } = await supabase
        .from(TBL.VEHICLE_MODELS)
        .select(`
          *,
          pricing:${TBL.PRICING}(*)
        `)
        .order('name', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching vehicle models:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get vehicle model by ID
   */
  async getVehicleModelById(id) {
    try {
      const { data, error } = await supabase
        .from(TBL.VEHICLE_MODELS)
        .select(`
          *,
          pricing:${TBL.PRICING}(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching vehicle model:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update vehicle model pricing
   */
  async updateVehicleModelPricing(modelId, pricingData) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({
          ...pricingData,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_model_id', modelId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating vehicle model pricing:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new VehicleModelsService();