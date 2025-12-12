import { supabase } from '../lib/supabase';

/**
 * VehicleAvailabilityService - Frontend-based anti-double-booking system
 * 
 * This service provides immediate double-booking prevention using application-level
 * conflict detection while being ready for database constraints when available.
 */
class VehicleAvailabilityService {
  
  /**
   * Get all vehicle availability with real-time conflict detection
   */
  static async getAllVehicleAvailability() {
    console.log('🔍 Fetching all vehicle availability status...');
    
    try {
      const { data, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select(`
          id,
          name,
          model,
          plate_number,
          status,
          created_at,
          updated_at
        `)
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Error fetching vehicles:', error);
        throw error;
      }

      // Enhance with real-time availability status
      const enhancedVehicles = await Promise.all(
        (data || []).map(async (vehicle) => {
          const availability = await this.calculateVehicleStatus(vehicle.id);
          return {
            vehicle_id: vehicle.id,
            name: vehicle.name,
            model: vehicle.model,
            plate_number: vehicle.plate_number,
            base_status: vehicle.status,
            current_status: availability.current_status,
            next_reservation_start: availability.next_reservation_start,
            created_at: vehicle.created_at,
            updated_at: vehicle.updated_at
          };
        })
      );

      console.log('✅ Vehicle availability fetched successfully:', enhancedVehicles.length, 'vehicles');
      return enhancedVehicles;
    } catch (error) {
      console.error('❌ VehicleAvailabilityService.getAllVehicleAvailability error:', error);
      throw error;
    }
  }

  /**
   * Calculate current status for a specific vehicle with conflict detection
   */
  static async calculateVehicleStatus(vehicleId) {
    try {
      const now = new Date();
      
      // Get all active rentals for this vehicle
      const { data: rentals, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('rental_start_date, rental_end_date, rental_status, customer_name')
        .eq('vehicle_id', vehicleId)
        .not('rental_status', 'in', '(cancelled,completed,void)')
        .order('rental_start_date', { ascending: true });

      if (error) {
        console.error('❌ Error fetching rentals for vehicle:', vehicleId, error);
        return { current_status: 'available', next_reservation_start: null };
      }

      if (!rentals || rentals.length === 0) {
        return { current_status: 'available', next_reservation_start: null };
      }

      // Check if currently rented (now overlaps an active rental)
      const currentRental = rentals.find(rental => {
        const startTime = new Date(rental.rental_start_date);
        const endTime = new Date(rental.rental_end_date);
        return now >= startTime && now < endTime;
      });

      if (currentRental) {
        return { current_status: 'rented', next_reservation_start: null };
      }

      // Check for future reservations
      const futureRentals = rentals.filter(rental => {
        const startTime = new Date(rental.rental_start_date);
        return startTime > now;
      });

      if (futureRentals.length > 0) {
        return {
          current_status: 'reserved',
          next_reservation_start: futureRentals[0].rental_start_date
        };
      }

      return { current_status: 'available', next_reservation_start: null };
    } catch (error) {
      console.error('❌ Error calculating vehicle status:', error);
      return { current_status: 'available', next_reservation_start: null };
    }
  }

  /**
   * CRITICAL: Get vehicles available for date range with strict overlap detection
   * This is the core anti-double-booking function
   */
  static async getAvailableVehiclesForDateRange(startDate, endDate, excludeRentalId = null) {
    console.log('🔍 ANTI-DOUBLE-BOOKING: Checking availability for:', { startDate, endDate, excludeRentalId });
    
    try {
      // Get all vehicles
      const { data: allVehicles, error: vehiclesError } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('id, name, model, plate_number, status');

      if (vehiclesError) {
        console.error('❌ Error fetching vehicles:', vehiclesError);
        throw vehiclesError;
      }

      // Convert input dates to proper Date objects for comparison
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);

      console.log('📅 Request period:', {
        start: requestStart.toISOString(),
        end: requestEnd.toISOString()
      });

      // Get ALL active rentals to check for conflicts
      const { data: allRentals, error: rentalsError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('id, vehicle_id, rental_start_date, rental_end_date, rental_status, customer_name')
        .not('rental_status', 'in', '(cancelled,completed,void)');

      if (rentalsError) {
        console.error('❌ Error fetching rentals:', rentalsError);
        throw rentalsError;
      }

      console.log('📊 Total active rentals to check:', allRentals?.length || 0);

      // Find conflicting vehicles using strict overlap detection
      const conflictedVehicleIds = new Set();

      (allRentals || []).forEach(rental => {
        // Skip if this is the rental being edited
        if (excludeRentalId && rental.id === excludeRentalId) {
          return;
        }

        const rentalStart = new Date(rental.rental_start_date);
        const rentalEnd = new Date(rental.rental_end_date);

        // STRICT OVERLAP CHECK: [start, end) semantics
        // Overlap occurs if: requestStart < rentalEnd AND requestEnd > rentalStart
        const hasOverlap = requestStart < rentalEnd && requestEnd > rentalStart;

        if (hasOverlap) {
          console.log('⚠️ CONFLICT DETECTED:', {
            vehicleId: rental.vehicle_id,
            customer: rental.customer_name,
            existingPeriod: `${rentalStart.toISOString()} to ${rentalEnd.toISOString()}`,
            requestedPeriod: `${requestStart.toISOString()} to ${requestEnd.toISOString()}`,
            overlapReason: 'requestStart < rentalEnd AND requestEnd > rentalStart'
          });
          conflictedVehicleIds.add(rental.vehicle_id);
        }
      });

      console.log('🚫 Conflicted vehicle IDs:', Array.from(conflictedVehicleIds));

      // Filter available vehicles
      const availableVehicles = await Promise.all(
        allVehicles
          .filter(vehicle => {
            // Skip vehicles that are out of service or in maintenance
            if (vehicle.status === 'out_of_service' || vehicle.status === 'maintenance') {
              console.log('🔧 Skipping vehicle due to status:', vehicle.id, vehicle.status);
              return false;
            }
            // Skip vehicles with conflicts
            if (conflictedVehicleIds.has(vehicle.id)) {
              console.log('❌ Skipping vehicle due to conflict:', vehicle.id);
              return false;
            }
            return true;
          })
          .map(async (vehicle) => {
            const availability = await this.calculateVehicleStatus(vehicle.id);
            return {
              vehicle_id: vehicle.id,
              name: vehicle.name,
              model: vehicle.model,
              plate_number: vehicle.plate_number,
              base_status: vehicle.status,
              current_status: 'available', // Available for the requested range
              next_reservation_start: availability.next_reservation_start
            };
          })
      );

      console.log('✅ ANTI-DOUBLE-BOOKING RESULT:', {
        totalVehicles: allVehicles.length,
        conflictedVehicles: conflictedVehicleIds.size,
        availableVehicles: availableVehicles.length,
        availableIds: availableVehicles.map(v => v.vehicle_id)
      });

      return availableVehicles;
    } catch (error) {
      console.error('❌ VehicleAvailabilityService.getAvailableVehiclesForDateRange error:', error);
      throw error;
    }
  }

  /**
   * CRITICAL: Validate rental dates with strict conflict detection
   * This prevents double-booking at the application level
   */
  static async validateRentalDates(vehicleId, startDate, endDate, excludeRentalId = null) {
    console.log('🔍 VALIDATING RENTAL DATES:', { vehicleId, startDate, endDate, excludeRentalId });
    
    try {
      const requestStart = new Date(startDate);
      const requestEnd = new Date(endDate);

      // Get all active rentals for this vehicle
      let conflictQuery = supabase
        .from('app_4c3a7a6153_rentals')
        .select('id, customer_name, rental_start_date, rental_end_date, rental_status')
        .eq('vehicle_id', vehicleId)
        .not('rental_status', 'in', '(cancelled,completed,void)');

      // Exclude current rental when editing
      if (excludeRentalId) {
        conflictQuery = conflictQuery.neq('id', excludeRentalId);
      }

      const { data: conflicts, error } = await conflictQuery;

      if (error) {
        console.error('❌ Error validating rental dates:', error);
        throw error;
      }

      console.log('📊 Checking conflicts against', conflicts?.length || 0, 'active rentals');

      // Check each rental for overlap
      const overlappingRentals = (conflicts || []).filter(rental => {
        const rentalStart = new Date(rental.rental_start_date);
        const rentalEnd = new Date(rental.rental_end_date);

        // STRICT OVERLAP CHECK: [start, end) semantics
        const hasOverlap = requestStart < rentalEnd && requestEnd > rentalStart;

        if (hasOverlap) {
          console.log('⚠️ OVERLAP DETECTED:', {
            conflictId: rental.id,
            customer: rental.customer_name,
            existingPeriod: `${rentalStart.toLocaleDateString()} to ${rentalEnd.toLocaleDateString()}`,
            requestedPeriod: `${requestStart.toLocaleDateString()} to ${requestEnd.toLocaleDateString()}`
          });
        }

        return hasOverlap;
      });

      if (overlappingRentals.length > 0) {
        const conflict = overlappingRentals[0];
        const conflictStart = new Date(conflict.rental_start_date).toLocaleDateString();
        const conflictEnd = new Date(conflict.rental_end_date).toLocaleDateString();
        
        const errorMessage = 
          `🚫 ANTI-DOUBLE-BOOKING PROTECTION ACTIVATED!\n\n` +
          `Vehicle ${vehicleId} is already rented during this period.\n\n` +
          `Existing rental: ${conflict.customer_name}\n` +
          `Dates: ${conflictStart} to ${conflictEnd}\n\n` +
          `Please choose different dates or another vehicle.`;
        
        console.log('❌ VALIDATION FAILED:', errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ VALIDATION PASSED: No conflicts found');
      return true;
    } catch (error) {
      console.error('❌ VehicleAvailabilityService.validateRentalDates error:', error);
      throw error;
    }
  }

  /**
   * Get status badge configuration for consistent UI display
   */
  static getStatusBadgeConfig(status) {
    const configs = {
      'available': {
        text: 'Available',
        className: 'bg-green-100 text-green-800',
        icon: '✅'
      },
      'rented': {
        text: 'Rented',
        className: 'bg-red-100 text-red-800',
        icon: '🚗'
      },
      'reserved': {
        text: 'Reserved',
        className: 'bg-yellow-100 text-yellow-800',
        icon: '📅'
      },
      'maintenance': {
        text: 'Maintenance',
        className: 'bg-orange-100 text-orange-800',
        icon: '🔧'
      },
      'out_of_service': {
        text: 'Out of Service',
        className: 'bg-gray-100 text-gray-800',
        icon: '❌'
      }
    };

    return configs[status] || configs['available'];
  }

  /**
   * Subscribe to real-time changes in vehicle availability
   */
  static subscribeToAvailabilityChanges(callback) {
    console.log('🔔 Setting up real-time availability subscription...');
    
    // Subscribe to rental changes
    const rentalSubscription = supabase
      .channel('rental_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'app_4c3a7a6153_rentals' 
        }, 
        (payload) => {
          console.log('🔔 Rental change detected:', payload);
          callback('rental', payload);
        }
      )
      .subscribe();

    // Subscribe to vehicle changes
    const vehicleSubscription = supabase
      .channel('vehicle_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'saharax_0u4w4d_vehicles' 
        }, 
        (payload) => {
          console.log('🔔 Vehicle change detected:', payload);
          callback('vehicle', payload);
        }
      )
      .subscribe();

    // Return unsubscribe function
    return () => {
      console.log('🔔 Unsubscribing from availability changes...');
      supabase.removeChannel(rentalSubscription);
      supabase.removeChannel(vehicleSubscription);
    };
  }

  /**
   * Format date for database operations
   */
  static formatDateForDatabase(dateString) {
    if (!dateString) return null;
    
    // Return ISO string for consistent database operations
    return new Date(dateString).toISOString();
  }

  /**
   * Validate date range
   */
  static validateDateRange(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (start >= end) {
      throw new Error('End date must be after start date');
    }
    
    if (start < new Date().setHours(0, 0, 0, 0)) {
      throw new Error('Start date cannot be in the past');
    }
    
    return true;
  }

  /**
   * Handle constraint errors with user-friendly messages
   */
  static handleConstraintError(error) {
    if (error.message && (
      error.message.includes('no_overlap_per_vehicle') ||
      error.message.includes('booking_range') ||
      error.message.includes('ANTI-DOUBLE-BOOKING')
    )) {
      return new Error('🚫 This vehicle is already booked for the selected period. Please choose different dates or another vehicle.');
    }
    
    return error;
  }

  /**
   * EMERGENCY: Force refresh availability data
   */
  static async forceRefreshAvailability() {
    console.log('🔄 FORCE REFRESH: Clearing availability cache...');
    // This can be extended to clear any caching if implemented
    return true;
  }
}

export default VehicleAvailabilityService;