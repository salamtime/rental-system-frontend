import { supabase } from '../utils/supabaseClient';
import { TBL } from '../config/tables.js';
import cacheService from './CacheService';

/**
 * Cached Rental Service with comprehensive caching strategies
 */
class CachedRentalService {
  
  /**
   * Get all rentals with caching
   */
  static async getAllRentals(filters = {}) {
    return await cacheService.cachedQuery(
      'rentals',
      'getAllRentals',
      async () => {
        let query = supabase
          .from(TBL.RENTALS)
          .select(`
            *,
            vehicle:${TBL.VEHICLES}(id, name, model, plate_number),
            customer:${TBL.CUSTOMERS}(id, name, email, phone)
          `)
          .order('created_at', { ascending: false });

        // Apply filters
        if (filters.status) {
          query = query.eq('status', filters.status);
        }
        if (filters.vehicleId) {
          query = query.eq('vehicle_id', filters.vehicleId);
        }
        if (filters.customerId) {
          query = query.eq('customer_id', filters.customerId);
        }
        if (filters.startDate) {
          query = query.gte('start_date', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('end_date', filters.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
      },
      filters,
      2 * 60 * 1000 // 2 minutes TTL
    );
  }

  /**
   * Get rental by ID with caching
   */
  static async getRentalById(rentalId) {
    return await cacheService.cachedQuery(
      'rentals',
      'getRentalById',
      async () => {
        const { data, error } = await supabase
          .from(TBL.RENTALS)
          .select(`
            *,
            vehicle:${TBL.VEHICLES}(id, name, model, plate_number, vehicle_type),
            customer:${TBL.CUSTOMERS}(id, name, email, phone),
            pricing:${TBL.PRICING}(hourly_mad, daily_mad)
          `)
          .eq('id', rentalId)
          .single();

        if (error) throw error;
        return data;
      },
      { rentalId }
    );
  }

  /**
   * Get active rentals with caching
   */
  static async getActiveRentals() {
    return await cacheService.cachedQuery(
      'rentals',
      'getActiveRentals',
      async () => {
        const { data, error } = await supabase
          .from(TBL.RENTALS)
          .select(`
            *,
            vehicle:${TBL.VEHICLES}(id, name, model, plate_number),
            customer:${TBL.CUSTOMERS}(id, name, email, phone)
          `)
          .in('status', ['Active', 'In Progress'])
          .order('start_date', { ascending: true });

        if (error) throw error;
        return data || [];
      },
      {},
      1 * 60 * 1000 // 1 minute TTL for active rentals
    );
  }

  /**
   * Get rental statistics with caching
   */
  static async getRentalStatistics(dateRange = {}) {
    return await cacheService.cachedQuery(
      'rentals',
      'getRentalStatistics',
      async () => {
        let query = supabase
          .from(TBL.RENTALS)
          .select('status, total_amount, start_date, end_date');

        if (dateRange.startDate) {
          query = query.gte('start_date', dateRange.startDate);
        }
        if (dateRange.endDate) {
          query = query.lte('end_date', dateRange.endDate);
        }

        const { data, error } = await query;
        if (error) throw error;

        const stats = {
          total: data.length,
          active: data.filter(r => r.status === 'Active').length,
          completed: data.filter(r => r.status === 'Completed').length,
          cancelled: data.filter(r => r.status === 'Cancelled').length,
          totalRevenue: data.reduce((sum, r) => sum + (r.total_amount || 0), 0),
          averageRental: data.length > 0 ? data.reduce((sum, r) => sum + (r.total_amount || 0), 0) / data.length : 0
        };

        return stats;
      },
      dateRange,
      10 * 60 * 1000 // 10 minutes TTL for statistics
    );
  }

  /**
   * Create rental (invalidates cache)
   */
  static async createRental(rentalData) {
    const { data, error } = await supabase
      .from(TBL.RENTALS)
      .insert([rentalData])
      .select()
      .single();

    if (error) throw error;
    
    cacheService.invalidateRelated('rentals');
    return data;
  }

  /**
   * Update rental (invalidates cache)
   */
  static async updateRental(rentalId, rentalData) {
    const { data, error } = await supabase
      .from(TBL.RENTALS)
      .update(rentalData)
      .eq('id', rentalId)
      .select()
      .single();

    if (error) throw error;
    
    cacheService.invalidateRelated('rentals');
    return data;
  }

  /**
   * Delete rental (invalidates cache)
   */
  static async deleteRental(rentalId) {
    const { error } = await supabase
      .from(TBL.RENTALS)
      .delete()
      .eq('id', rentalId);

    if (error) throw error;
    
    cacheService.invalidateRelated('rentals');
    return true;
  }

  /**
   * Get rentals by vehicle with caching
   */
  static async getRentalsByVehicle(vehicleId, limit = 10) {
    return await cacheService.cachedQuery(
      'rentals',
      'getRentalsByVehicle',
      async () => {
        const { data, error } = await supabase
          .from(TBL.RENTALS)
          .select(`
            *,
            customer:${TBL.CUSTOMERS}(id, name, email, phone)
          `)
          .eq('vehicle_id', vehicleId)
          .order('start_date', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data || [];
      },
      { vehicleId, limit }
    );
  }

  /**
   * Get rentals by customer with caching
   */
  static async getRentalsByCustomer(customerId, limit = 10) {
    return await cacheService.cachedQuery(
      'rentals',
      'getRentalsByCustomer',
      async () => {
        const { data, error } = await supabase
          .from(TBL.RENTALS)
          .select(`
            *,
            vehicle:${TBL.VEHICLES}(id, name, model, plate_number)
          `)
          .eq('customer_id', customerId)
          .order('start_date', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data || [];
      },
      { customerId, limit }
    );
  }
}

export default CachedRentalService;