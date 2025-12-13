import { supabase } from '../lib/supabase';

/**
 * TransportFeeService - Manage transport fees for vehicle rentals
 * 
 * This service handles transport fee data that serves as the pricing
 * for delivery and pickup services in rental operations.
 */
class TransportFeeService {
  static TABLE_NAME = 'app_a94c9490e5_transport_fees';

  /**
   * Get all transport fees with location information
   */
  static async getAllTransportFees() {
    try {
      console.log('🚚 Loading all transport fees...');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading transport fees:', error);
        throw error;
      }

      console.log('✅ Transport fees loaded:', data);
      return data || [];
    } catch (err) {
      console.error('Error in getAllTransportFees:', err);
      throw new Error(`Failed to load transport fees: ${err.message}`);
    }
  }

  /**
   * Get transport fee by ID
   */
  static async getTransportFeeById(feeId) {
    try {
      console.log('🚚 Loading transport fee by ID:', feeId);
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('id', feeId)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading transport fee:', error);
        throw error;
      }

      console.log('✅ Transport fee loaded:', data);
      return data;
    } catch (err) {
      console.error('Error in getTransportFeeById:', err);
      return null;
    }
  }

  /**
   * Get transport fee by location pair
   */
  static async getTransportFeeByLocations(locationFrom, locationTo, vehicleType = null) {
    try {
      console.log('🚚 Loading transport fee for locations:', { locationFrom, locationTo, vehicleType });
      
      let query = supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('location_from', locationFrom)
        .eq('location_to', locationTo)
        .eq('is_active', true);

      if (vehicleType) {
        query = query.eq('vehicle_type', vehicleType);
      }

      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading transport fee by locations:', error);
        throw error;
      }

      console.log('✅ Transport fee loaded for locations:', data);
      return data;
    } catch (err) {
      console.error('Error in getTransportFeeByLocations:', err);
      return null;
    }
  }

  /**
   * Create or update transport fee
   */
  static async upsertTransportFee(feeData) {
    try {
      console.log('💾 Upserting transport fee:', feeData);

      // Validate required fields
      if (!feeData.location_from || !feeData.location_to) {
        throw new Error('Location from and location to are required');
      }

      if (!feeData.fee_amount || parseFloat(feeData.fee_amount) <= 0) {
        throw new Error('Valid fee amount is required');
      }

      // First, deactivate any existing fee for this location pair and vehicle type
      if (!feeData.id) {
        await this.deactivateExistingFee(feeData.location_from, feeData.location_to, feeData.vehicle_type);
      }

      // Prepare the data
      const transportFee = {
        location_from: feeData.location_from.trim(),
        location_to: feeData.location_to.trim(),
        fee_amount: parseFloat(feeData.fee_amount),
        vehicle_type: feeData.vehicle_type || 'all',
        description: feeData.description || null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // If updating existing fee, include the ID
      if (feeData.id) {
        transportFee.id = feeData.id;
        transportFee.created_at = feeData.created_at; // Preserve original created_at
      }

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .upsert(transportFee, {
          onConflict: 'id'
        })
        .select('*')
        .single();

      if (error) {
        console.error('Error upserting transport fee:', error);
        throw error;
      }

      console.log('✅ Transport fee upserted successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in upsertTransportFee:', err);
      throw new Error(`Failed to save transport fee: ${err.message}`);
    }
  }

  /**
   * Deactivate existing active fee for location pair and vehicle type
   */
  static async deactivateExistingFee(locationFrom, locationTo, vehicleType = null) {
    try {
      console.log('🔄 Deactivating existing fees for locations:', { locationFrom, locationTo, vehicleType });

      let query = supabase
        .from(this.TABLE_NAME)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('location_from', locationFrom)
        .eq('location_to', locationTo)
        .eq('is_active', true);

      if (vehicleType) {
        query = query.eq('vehicle_type', vehicleType);
      }

      const { error } = await query;

      if (error) {
        console.error('Error deactivating existing fees:', error);
        throw error;
      }

      console.log('✅ Existing fees deactivated for locations:', { locationFrom, locationTo, vehicleType });
    } catch (err) {
      console.error('Error in deactivateExistingFee:', err);
      // Don't throw here, as this is a preparatory step
      console.warn('Could not deactivate existing fees, continuing...');
    }
  }

  /**
   * Delete (deactivate) a transport fee
   */
  static async deleteTransportFee(feeId) {
    try {
      console.log('🗑️ Deactivating transport fee:', feeId);

      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .update({ 
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', feeId)
        .select()
        .single();

      if (error) {
        console.error('Error deactivating transport fee:', error);
        throw error;
      }

      console.log('✅ Transport fee deactivated successfully:', data);
      return data;
    } catch (err) {
      console.error('Error in deleteTransportFee:', err);
      throw new Error(`Failed to delete transport fee: ${err.message}`);
    }
  }

  /**
   * Get transport fee for rental calculation
   */
  static async getTransportFeeForRental(locationFrom, locationTo, vehicleType = null) {
    try {
      console.log('🚚 Getting transport fee for rental:', { locationFrom, locationTo, vehicleType });

      const transportFee = await this.getTransportFeeByLocations(locationFrom, locationTo, vehicleType);
      
      if (!transportFee) {
        // Try to find a general fee (vehicle_type = 'all')
        const generalFee = await this.getTransportFeeByLocations(locationFrom, locationTo, 'all');
        if (generalFee) {
          console.log('✅ General transport fee found:', generalFee.fee_amount);
          return generalFee.fee_amount || 0;
        }
        
        console.warn('No transport fee found for locations:', { locationFrom, locationTo, vehicleType });
        return 0;
      }

      console.log('✅ Transport fee for rental:', transportFee.fee_amount);
      return transportFee.fee_amount || 0;
    } catch (err) {
      console.error('Error in getTransportFeeForRental:', err);
      return 0;
    }
  }

  /**
   * Get unique locations for dropdowns
   */
  static async getUniqueLocations() {
    try {
      console.log('🚚 Loading unique locations...');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('location_from, location_to')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading locations:', error);
        throw error;
      }

      // Extract unique locations
      const locations = new Set();
      data.forEach(fee => {
        if (fee.location_from) locations.add(fee.location_from);
        if (fee.location_to) locations.add(fee.location_to);
      });

      const uniqueLocations = Array.from(locations).sort();
      console.log('✅ Unique locations loaded:', uniqueLocations);
      return uniqueLocations;
    } catch (err) {
      console.error('Error in getUniqueLocations:', err);
      return [];
    }
  }

  /**
   * Get vehicle types for dropdowns
   */
  static async getVehicleTypes() {
    try {
      console.log('🚚 Loading vehicle types...');
      
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('vehicle_type')
        .eq('is_active', true);

      if (error) {
        console.error('Error loading vehicle types:', error);
        throw error;
      }

      // Extract unique vehicle types
      const types = new Set();
      data.forEach(fee => {
        if (fee.vehicle_type) types.add(fee.vehicle_type);
      });

      const uniqueTypes = Array.from(types).sort();
      console.log('✅ Vehicle types loaded:', uniqueTypes);
      return uniqueTypes;
    } catch (err) {
      console.error('Error in getVehicleTypes:', err);
      return ['all', 'ATV', 'Quad', 'Buggy'];
    }
  }

  /**
   * Format location name for display
   */
  static formatLocationName(location) {
    if (!location) return 'Unknown Location';
    
    // Convert to title case
    return location.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Initialize transport fees table
   */
  static async initializeTransportFeesTable() {
    try {
      console.log('🚚 Initializing transport fees table...');
      
      // The table should already exist, just verify we can access it
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('id')
        .limit(1);

      if (error) {
        console.error('Transport fees table not accessible:', error);
        throw error;
      }

      console.log('✅ Transport fees table is accessible');
      return true;
    } catch (err) {
      console.error('Error initializing transport fees table:', err);
      throw new Error(`Failed to initialize transport fees table: ${err.message}`);
    }
  }
}

export default TransportFeeService;