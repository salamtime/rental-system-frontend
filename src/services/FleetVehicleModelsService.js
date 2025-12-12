import { supabase } from '../utils/supabaseClient';
import { TBL } from '../config/tables.js';

/**
 * Service for managing fleet vehicle models
 */
class FleetVehicleModelsService {
  constructor() {
    this.tableName = TBL.VEHICLE_MODELS;
  }

  /**
   * Get all vehicle models
   */
  async getAllVehicleModels() {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching vehicle models:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create a new vehicle model
   */
  async createVehicleModel(modelData) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .insert(modelData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating vehicle model:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update a vehicle model
   */
  async updateVehicleModel(id, modelData) {
    try {
      const { data, error } = await supabase
        .from(this.tableName)
        .update({ ...modelData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating vehicle model:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a vehicle model
   */
  async deleteVehicleModel(id) {
    try {
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting vehicle model:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new FleetVehicleModelsService();