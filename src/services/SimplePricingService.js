import { supabase } from '../utils/supabaseClient';
import { TBL } from '../config/tables.js';

/**
 * Service for managing simple pricing system
 */
class SimplePricingService {
  constructor() {
    this.pricingTable = TBL.PRICING;
    this.durationTiersTable = `${TBL.PRICING}_duration_tiers`;
    this.promosTable = `${TBL.PRICING}_promos`;
  }

  /**
   * Get all simple pricing records
   */
  async getAllPricing() {
    try {
      const { data, error } = await supabase
        .from(this.pricingTable)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching pricing:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Get pricing by vehicle model ID
   */
  async getPricingByVehicleModel(vehicleModelId) {
    try {
      const { data, error } = await supabase
        .from(this.pricingTable)
        .select('*')
        .eq('vehicle_model_id', vehicleModelId)
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching pricing by vehicle model:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update pricing for a vehicle model
   */
  async updatePricing(vehicleModelId, pricingData) {
    try {
      const { data, error } = await supabase
        .from(this.pricingTable)
        .update({
          ...pricingData,
          updated_at: new Date().toISOString()
        })
        .eq('vehicle_model_id', vehicleModelId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating pricing:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all duration tiers
   */
  async getDurationTiers() {
    try {
      const { data, error } = await supabase
        .from(this.durationTiersTable)
        .select('*')
        .eq('is_active', true)
        .order('min_days', { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching duration tiers:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create duration tier
   */
  async createDurationTier(tierData) {
    try {
      const { data, error } = await supabase
        .from(this.durationTiersTable)
        .insert(tierData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating duration tier:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update duration tier
   */
  async updateDurationTier(id, tierData) {
    try {
      const { data, error } = await supabase
        .from(this.durationTiersTable)
        .update({ ...tierData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating duration tier:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete duration tier
   */
  async deleteDurationTier(id) {
    try {
      const { error } = await supabase
        .from(this.durationTiersTable)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting duration tier:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get all promotional offers
   */
  async getPromotionalOffers() {
    try {
      const { data, error } = await supabase
        .from(this.promosTable)
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Error fetching promotional offers:', error);
      return { success: false, error: error.message, data: [] };
    }
  }

  /**
   * Create promotional offer
   */
  async createPromotionalOffer(promoData) {
    try {
      const { data, error } = await supabase
        .from(this.promosTable)
        .insert(promoData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating promotional offer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Update promotional offer
   */
  async updatePromotionalOffer(id, promoData) {
    try {
      const { data, error } = await supabase
        .from(this.promosTable)
        .update({ ...promoData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating promotional offer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete promotional offer
   */
  async deletePromotionalOffer(id) {
    try {
      const { error } = await supabase
        .from(this.promosTable)
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting promotional offer:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new SimplePricingService();