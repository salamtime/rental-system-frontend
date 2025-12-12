import { supabase } from '../utils/supabaseClient';
import { TBL } from '../config/tables.js';

/**
 * FleetAvailabilityService handles vehicle availability checking and fleet management
 */
class FleetAvailabilityService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
  }

  /**
   * Check vehicle availability for given criteria
   * @param {Object} criteria - Search criteria
   * @param {string} criteria.startDate - Start date ISO string
   * @param {string} criteria.endDate - End date ISO string
   * @param {string} criteria.location - Location filter
   * @param {string} criteria.vehicleType - Vehicle type filter
   * @returns {Promise<Object>} Availability results
   */
  async checkAvailability(criteria) {
    try {
      const { startDate, endDate, location, vehicleType } = criteria;
      const cacheKey = `availability_${JSON.stringify(criteria)}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      // Fetch available vehicles from database
      let query = supabase
        .from(TBL.VEHICLES)
        .select('*')
        .eq('is_active', true)
        .eq('status', 'available');

      if (location) {
        query = query.eq('location', location);
      }

      if (vehicleType && vehicleType !== 'all') {
        query = query.eq('type', vehicleType);
      }

      const { data: vehicles, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch vehicles: ${error.message}`);
      }

      // Check for booking conflicts
      const availableVehicles = [];
      
      for (const vehicle of vehicles || []) {
        const isAvailable = await this.isVehicleAvailable(vehicle.id, startDate, endDate);
        if (isAvailable) {
          availableVehicles.push(vehicle);
        }
      }

      const result = {
        availableVehicles,
        totalCount: availableVehicles.length,
        criteria,
        timestamp: new Date().toISOString()
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      return result;
    } catch (error) {
      console.error('FleetAvailabilityService.checkAvailability error:', error);
      throw error;
    }
  }

  /**
   * Check if a specific vehicle is available for the given time period
   * @param {string} vehicleId - Vehicle ID
   * @param {string} startDate - Start date ISO string
   * @param {string} endDate - End date ISO string
   * @returns {Promise<boolean>} Vehicle availability status
   */
  async isVehicleAvailable(vehicleId, startDate, endDate) {
    try {
      // Check rental bookings
      const { data: rentalBookings, error: rentalError } = await supabase
        .from(TBL.RENTALS)
        .select('*')
        .eq('vehicle_id', vehicleId)
        .not('status', 'eq', 'cancelled')
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (rentalError) {
        throw new Error(`Failed to check rental bookings: ${rentalError.message}`);
      }

      // Check tour bookings
      const { data: tourBookings, error: tourError } = await supabase
        .from(TBL.TOURS)
        .select('*')
        .contains('vehicle_ids', [vehicleId])
        .not('status', 'eq', 'cancelled')
        .or(`tour_date.lte.${endDate},tour_date.gte.${startDate}`);

      if (tourError) {
        throw new Error(`Failed to check tour bookings: ${tourError.message}`);
      }

      // Vehicle is available if no conflicting bookings exist
      return (!rentalBookings || rentalBookings.length === 0) && 
             (!tourBookings || tourBookings.length === 0);
    } catch (error) {
      console.error('FleetAvailabilityService.isVehicleAvailable error:', error);
      return false; // Default to unavailable on error
    }
  }

  /**
   * Book vehicles for a reservation
   * @param {Object} bookingData - Booking information
   * @returns {Promise<Object>} Booking result
   */
  async bookVehicles(bookingData) {
    try {
      const { vehicleIds, bookingType, ...bookingDetails } = bookingData;

      // Validate vehicle availability before booking
      const availabilityChecks = await Promise.all(
        vehicleIds.map(vehicleId => 
          this.isVehicleAvailable(vehicleId, bookingDetails.startDate, bookingDetails.endDate)
        )
      );

      const unavailableVehicles = vehicleIds.filter((_, index) => !availabilityChecks[index]);
      
      if (unavailableVehicles.length > 0) {
        throw new Error(`Vehicles not available: ${unavailableVehicles.join(', ')}`);
      }

      // Create booking record
      const tableName = bookingType === 'rental' 
        ? TBL.RENTALS 
        : TBL.TOURS;

      const { data: booking, error } = await supabase
        .from(tableName)
        .insert({
          ...bookingDetails,
          vehicle_ids: vehicleIds,
          status: 'confirmed',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create booking: ${error.message}`);
      }

      // Clear cache to reflect new bookings
      this.clearCache();

      return {
        success: true,
        booking,
        vehicleIds
      };
    } catch (error) {
      console.error('FleetAvailabilityService.bookVehicles error:', error);
      throw error;
    }
  }

  /**
   * Get status of specific vehicles
   * @param {Array<string>} vehicleIds - Array of vehicle IDs
   * @returns {Promise<Object>} Vehicle status information
   */
  async getVehicleStatus(vehicleIds) {
    try {
      const { data: vehicles, error } = await supabase
        .from(TBL.VEHICLES)
        .select('id, name, status, location, type')
        .in('id', vehicleIds);

      if (error) {
        throw new Error(`Failed to fetch vehicle status: ${error.message}`);
      }

      // Get current bookings for these vehicles
      const statusInfo = {};
      
      for (const vehicle of vehicles || []) {
        statusInfo[vehicle.id] = {
          ...vehicle,
          currentBookings: await this.getCurrentBookings(vehicle.id)
        };
      }

      return statusInfo;
    } catch (error) {
      console.error('FleetAvailabilityService.getVehicleStatus error:', error);
      throw error;
    }
  }

  /**
   * Get current bookings for a vehicle
   * @param {string} vehicleId - Vehicle ID
   * @returns {Promise<Array>} Current bookings
   */
  async getCurrentBookings(vehicleId) {
    try {
      const now = new Date().toISOString();

      // Fetch active rental bookings
      const { data: rentalBookings } = await supabase
        .from(TBL.RENTALS)
        .select('*')
        .eq('vehicle_id', vehicleId)
        .gte('end_date', now)
        .not('status', 'eq', 'cancelled');

      // Fetch active tour bookings
      const { data: tourBookings } = await supabase
        .from(TBL.TOURS)
        .select('*')
        .contains('vehicle_ids', [vehicleId])
        .gte('tour_date', now)
        .not('status', 'eq', 'cancelled');

      return [
        ...(rentalBookings || []).map(booking => ({ ...booking, type: 'rental' })),
        ...(tourBookings || []).map(booking => ({ ...booking, type: 'tour' }))
      ];
    } catch (error) {
      console.error('FleetAvailabilityService.getCurrentBookings error:', error);
      return [];
    }
  }

  /**
   * Clear the availability cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Create singleton instance
const fleetAvailabilityService = new FleetAvailabilityService();

// Export the service for use across the app
export default fleetAvailabilityService;

// Global initialization - attach to window for easy access
if (typeof window !== 'undefined') {
  window.__FLEET_AVAILABILITY_SERVICE__ = fleetAvailabilityService;
}

// Helper functions for common use cases
export const useFleetAvailability = (criteria) => {
  return fleetAvailabilityService.checkAvailability(criteria);
};

export const bookFleetVehicles = (bookingData) => {
  return fleetAvailabilityService.bookVehicles(bookingData);
};

export const getVehicleStatus = (vehicleIds) => {
  return fleetAvailabilityService.getVehicleStatus(vehicleIds);
};