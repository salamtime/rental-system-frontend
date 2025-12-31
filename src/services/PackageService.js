import { supabase } from '../lib/supabase';
import TABLE_NAMES from '../config/tableNames';

/**
 * PackageService - Manages rental packages with kilometer tracking
 */
class PackageService {
  /**
   * Get all rental packages with rate type details and vehicle model info
   */
  async getPackages(includeInactive = false) {
    try {
      let query = supabase
        .from(TABLE_NAMES.RENTAL_PACKAGES)
        .select(`
          *,
          rate_type:${TABLE_NAMES.RATE_TYPES}(id, name, is_kilometer_based),
          vehicle_model:${TABLE_NAMES.VEHICLE_MODELS}(id, name, model, vehicle_type),
          vehicle_mappings:${TABLE_NAMES.PACKAGE_VEHICLE_TYPE_MAPPING}(vehicle_type, custom_extra_rate)
        `)
        .order('created_at', { ascending: false });
      
      if (!includeInactive) {
        query = query.eq('is_active', true);
      }
      
      const { data, error } = await query;
      
      if (error) throw new Error(`Failed to fetch packages: ${error.message}`);
      return data || [];
    } catch (error) {
      console.error('Error in getPackages:', error);
      throw error;
    }
  }
  
  /**
   * Get package by ID
   */
  async getPackageById(packageId) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.RENTAL_PACKAGES)
        .select(`
          *,
          rate_type:${TABLE_NAMES.RATE_TYPES}(id, name, is_kilometer_based),
          vehicle_model:${TABLE_NAMES.VEHICLE_MODELS}(id, name, model, vehicle_type),
          vehicle_mappings:${TABLE_NAMES.PACKAGE_VEHICLE_TYPE_MAPPING}(vehicle_type, custom_extra_rate)
        `)
        .eq('id', packageId)
        .single();
      
      if (error) throw new Error(`Failed to fetch package: ${error.message}`);
      return data;
    } catch (error) {
      console.error('Error in getPackageById:', error);
      throw error;
    }
  }
  
  /**
   * Get packages by rate type
   */
  async getPackagesByRateType(rateTypeId) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.RENTAL_PACKAGES)
        .select('*')
        .eq('rate_type_id', rateTypeId)
        .eq('is_active', true);
      
      if (error) throw new Error(`Failed to fetch packages: ${error.message}`);
      return data || [];
    } catch (error) {
      console.error('Error in getPackagesByRateType:', error);
      throw error;
    }
  }
  
  /**
   * Get packages by vehicle model
   */
  async getPackagesByVehicleModel(vehicleModelId) {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.RENTAL_PACKAGES)
        .select(`
          *,
          rate_type:${TABLE_NAMES.RATE_TYPES}(id, name, is_kilometer_based),
          vehicle_model:${TABLE_NAMES.VEHICLE_MODELS}(id, name, model, vehicle_type)
        `)
        .eq('vehicle_model_id', vehicleModelId)
        .eq('is_active', true);
      
      if (error) throw new Error(`Failed to fetch packages: ${error.message}`);
      return data || [];
    } catch (error) {
      console.error('Error in getPackagesByVehicleModel:', error);
      throw error;
    }
  }
  
  /**
   * Get all vehicle models for dropdown
   */
  async getVehicleModels() {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.VEHICLE_MODELS)
        .select('id, name, model, vehicle_type')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw new Error(`Failed to fetch vehicle models: ${error.message}`);
      return data || [];
    } catch (error) {
      console.error('Error in getVehicleModels:', error);
      throw error;
    }
  }
  
  /**
   * Get base price for a vehicle model from base_prices table
   * Note: The table only has hourly_price and daily_price columns.
   * Weekly price is calculated dynamically as: daily_price × 7 × 0.85 (15% discount)
   */
  async getBasePriceForModel(vehicleModelId, rateType = 'daily') {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.BASE_PRICES)
        .select('hourly_price, daily_price')
        .eq('vehicle_model_id', vehicleModelId)
        .eq('is_active', true)
        .single();
      
      if (error && error.code !== 'PGRST116') {
        console.warn(`No base price found for vehicle model ${vehicleModelId}:`, error.message);
        return 0;
      }
      
      if (!data) {
        console.warn(`No base price data found for vehicle model ${vehicleModelId}`);
        return 0;
      }
      
      switch (rateType.toLowerCase()) {
        case 'hourly':
          return data.hourly_price || 0;
        case 'daily':
          return data.daily_price || 0;
        case 'weekly':
          // Calculate weekly price as 7 days with 15% discount
          return Math.round((data.daily_price || 0) * 7 * 0.85);
        default:
          return data.daily_price || 0;
      }
    } catch (error) {
      console.error('Error in getBasePriceForModel:', error);
      return 0;
    }
  }
  
  /**
   * Create new rental package
   */
  async createPackage(formData) {
    try {
      // Validate required fields
      if (!formData.vehicle_model_id) {
        throw new Error('Vehicle model is required');
      }
      
      // Validate kilometer-based requirements
      const { data: rateType } = await supabase
        .from(TABLE_NAMES.RATE_TYPES)
        .select('is_kilometer_based')
        .eq('id', formData.rate_type_id)
        .single();
      
      if (rateType?.is_kilometer_based) {
        if (!formData.included_kilometers || !formData.extra_km_rate) {
          throw new Error('Kilometer-based packages require included_kilometers and extra_km_rate');
        }
      } else {
        // Hourly packages should not have kilometer values
        formData.included_kilometers = null;
        formData.extra_km_rate = null;
      }
      
      // Insert package
      const { data: packageData, error: packageError } = await supabase
        .from(TABLE_NAMES.RENTAL_PACKAGES)
        .insert({
          name: formData.name,
          description: formData.description,
          vehicle_model_id: formData.vehicle_model_id,
          base_price: formData.base_price,
          included_kilometers: formData.included_kilometers,
          extra_km_rate: formData.extra_km_rate,
          rate_type_id: formData.rate_type_id,
          is_active: true
        })
        .select()
        .single();
      
      if (packageError) throw new Error(`Failed to create package: ${packageError.message}`);
      
      // Insert vehicle type mappings if provided
      if (formData.vehicle_type_mappings && formData.vehicle_type_mappings.length > 0) {
        const mappings = formData.vehicle_type_mappings.map(m => ({
          package_id: packageData.id,
          vehicle_type: m.vehicle_type,
          custom_extra_rate: m.custom_extra_rate
        }));
        
        const { error: mappingError } = await supabase
          .from(TABLE_NAMES.PACKAGE_VEHICLE_TYPE_MAPPING)
          .insert(mappings);
        
        if (mappingError) {
          console.error('Failed to create vehicle mappings:', mappingError);
        }
      }
      
      return packageData;
    } catch (error) {
      console.error('Error in createPackage:', error);
      throw error;
    }
  }
  
  /**
   * Update existing package
   */
  async updatePackage(id, formData) {
    try {
      // Update package
      const { data: packageData, error: packageError } = await supabase
        .from(TABLE_NAMES.RENTAL_PACKAGES)
        .update({
          name: formData.name,
          description: formData.description,
          vehicle_model_id: formData.vehicle_model_id,
          base_price: formData.base_price,
          included_kilometers: formData.included_kilometers,
          extra_km_rate: formData.extra_km_rate,
          rate_type_id: formData.rate_type_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
      
      if (packageError) throw new Error(`Failed to update package: ${packageError.message}`);
      
      // Delete existing vehicle mappings
      await supabase
        .from(TABLE_NAMES.PACKAGE_VEHICLE_TYPE_MAPPING)
        .delete()
        .eq('package_id', id);
      
      // Insert new mappings
      if (formData.vehicle_type_mappings && formData.vehicle_type_mappings.length > 0) {
        const mappings = formData.vehicle_type_mappings.map(m => ({
          package_id: id,
          vehicle_type: m.vehicle_type,
          custom_extra_rate: m.custom_extra_rate
        }));
        
        await supabase
          .from(TABLE_NAMES.PACKAGE_VEHICLE_TYPE_MAPPING)
          .insert(mappings);
      }
      
      return packageData;
    } catch (error) {
      console.error('Error in updatePackage:', error);
      throw error;
    }
  }
  
  /**
   * Soft delete package (set is_active = false)
   */
  async deletePackage(id) {
    try {
      const { error } = await supabase
        .from(TABLE_NAMES.RENTAL_PACKAGES)
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw new Error(`Failed to delete package: ${error.message}`);
    } catch (error) {
      console.error('Error in deletePackage:', error);
      throw error;
    }
  }
  
  /**
   * Get rate types
   */
  async getRateTypes() {
    try {
      const { data, error } = await supabase
        .from(TABLE_NAMES.RATE_TYPES)
        .select('*')
        .order('id');
      
      if (error) throw new Error(`Failed to fetch rate types: ${error.message}`);
      return data || [];
    } catch (error) {
      console.error('Error in getRateTypes:', error);
      throw error;
    }
  }
  
  /**
   * Apply package to rental during creation
   */
  async applyPackageToRental(rentalId, packageId) {
    try {
      // Get package details
      const packageData = await this.getPackageById(packageId);
      
      if (!packageData) {
        throw new Error('Package not found');
      }
      
      // Update rental with package details
      const { data, error } = await supabase
        .from(TABLE_NAMES.RENTALS)
        .update({
          package_id: packageId,
          included_kilometers: packageData.included_kilometers,
          extra_km_rate_applied: packageData.extra_km_rate,
          updated_at: new Date().toISOString()
        })
        .eq('id', rentalId)
        .select()
        .single();
      
      if (error) throw new Error(`Failed to apply package to rental: ${error.message}`);
      return data;
    } catch (error) {
      console.error('Error in applyPackageToRental:', error);
      throw error;
    }
  }
}

export default new PackageService();