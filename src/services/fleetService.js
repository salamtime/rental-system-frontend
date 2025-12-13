import { supabase } from '../lib/supabase';

export class FleetService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // ============================================================================
  // CORE FLEET OPERATIONS - FIXED SCHEMA
  // ============================================================================

  async getAllVehicles(filters = {}) {
    try {
      console.log('🚗 Fetching all fleet vehicles...');
      
      let query = supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*');

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.vehicleType) {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      if (filters.search) {
        query = query.or(
          `name.ilike.%${filters.search}%,model.ilike.%${filters.search}%,vehicle_type.ilike.%${filters.search}%,plate_number.ilike.%${filters.search}%`
        );
      }

      const { data: vehicles, error } = await query.order('name');

      if (error) {
        console.error('❌ Error fetching vehicles:', error);
        return [];
      }

      console.log(`✅ Fetched ${vehicles?.length || 0} vehicles`);
      return vehicles || [];

    } catch (error) {
      console.error('❌ Error in getAllVehicles:', error);
      return [];
    }
  }

  async getVehicleById(id) {
    try {
      const { data: vehicle, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('❌ Error fetching vehicle:', error);
        return null;
      }

      return vehicle;
    } catch (error) {
      console.error('❌ Error in getVehicleById:', error);
      return null;
    }
  }

  async createVehicle(vehicleData) {
    try {
      console.log('➕ Creating new vehicle...');
      
      // Clean and validate data
      const cleanData = this.cleanVehicleData(vehicleData);
      
      const { data: vehicle, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .insert([cleanData])
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating vehicle:', error);
        throw error;
      }

      console.log('✅ Vehicle created successfully:', vehicle.id);
      this.clearCache();
      return vehicle;

    } catch (error) {
      console.error('❌ Error in createVehicle:', error);
      throw error;
    }
  }

  async updateVehicle(id, updateData) {
    try {
      console.log('✏️ Updating vehicle:', id);
      
      // Clean and validate data
      const cleanData = this.cleanVehicleData(updateData);
      cleanData.updated_at = new Date().toISOString();
      
      const { data: vehicle, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .update(cleanData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating vehicle:', error);
        throw error;
      }

      console.log('✅ Vehicle updated successfully');
      this.clearCache();
      return vehicle;

    } catch (error) {
      console.error('❌ Error in updateVehicle:', error);
      throw error;
    }
  }

  async deleteVehicle(id) {
    try {
      console.log('🗑️ Deleting vehicle:', id);
      
      // Check if vehicle has active rentals
      const { data: activeRentals, error: rentalError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('id')
        .eq('vehicle_id', id)
        .in('status', ['active', 'confirmed']);

      if (rentalError) {
        console.warn('⚠️ Could not check active rentals');
      }

      if (activeRentals && activeRentals.length > 0) {
        throw new Error('Cannot delete vehicle with active rentals');
      }

      const { error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting vehicle:', error);
        throw error;
      }

      console.log('✅ Vehicle deleted successfully');
      this.clearCache();
      return true;

    } catch (error) {
      console.error('❌ Error in deleteVehicle:', error);
      throw error;
    }
  }

  // ============================================================================
  // FLEET ANALYTICS & REPORTING
  // ============================================================================

  async getFleetStatistics() {
    try {
      console.log('📊 Calculating fleet statistics...');
      
      const { data: vehicles, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('status, vehicle_type, year');

      if (error) {
        console.error('❌ Error fetching fleet data:', error);
        return this.getDefaultStats();
      }

      const stats = {
        total: vehicles?.length || 0,
        byStatus: {},
        byType: {},
        byYear: {},
        averageAge: 0
      };

      const currentYear = new Date().getFullYear();
      let totalAge = 0;
      let vehiclesWithYear = 0;

      vehicles?.forEach(vehicle => {
        // Count by status
        const status = vehicle.status || 'unknown';
        stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

        // Count by type
        const type = vehicle.vehicle_type || 'unknown';
        stats.byType[type] = (stats.byType[type] || 0) + 1;

        // Count by year and calculate age
        if (vehicle.year) {
          const year = vehicle.year;
          stats.byYear[year] = (stats.byYear[year] || 0) + 1;
          totalAge += currentYear - year;
          vehiclesWithYear++;
        }
      });

      stats.averageAge = vehiclesWithYear > 0 ? Math.round(totalAge / vehiclesWithYear) : 0;

      console.log('✅ Fleet statistics calculated');
      return stats;

    } catch (error) {
      console.error('❌ Error in getFleetStatistics:', error);
      return this.getDefaultStats();
    }
  }

  async getVehicleUtilization(startDate, endDate) {
    try {
      console.log('📈 Calculating vehicle utilization...');
      
      // Get all vehicles
      const { data: vehicles, error: vehicleError } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('id, name, model, vehicle_type, plate_number');

      if (vehicleError) {
        console.error('❌ Error fetching vehicles:', vehicleError);
        return [];
      }

      // Get rental data for the period
      const { data: rentals, error: rentalError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('vehicle_id, rental_start_date, rental_end_date, total_amount')
        .gte('rental_start_date', startDate)
        .lte('rental_end_date', endDate)
        .in('status', ['completed', 'active']);

      if (rentalError) {
        console.error('❌ Error fetching rentals:', rentalError);
        return [];
      }

      // Calculate utilization for each vehicle
      const totalDays = this.calculateDays(startDate, endDate);
      const utilization = vehicles?.map(vehicle => {
        const vehicleRentals = rentals?.filter(r => r.vehicle_id === vehicle.id) || [];
        
        let rentedDays = 0;
        let totalRevenue = 0;

        vehicleRentals.forEach(rental => {
          const rentalDays = this.calculateDays(rental.rental_start_date, rental.rental_end_date);
          rentedDays += rentalDays;
          totalRevenue += Number(rental.total_amount) || 0;
        });

        const utilizationRate = totalDays > 0 ? (rentedDays / totalDays) * 100 : 0;

        return {
          vehicle,
          rentedDays,
          totalDays,
          utilizationRate: Math.round(utilizationRate * 10) / 10,
          rentalCount: vehicleRentals.length,
          totalRevenue,
          averageRevenue: vehicleRentals.length > 0 ? totalRevenue / vehicleRentals.length : 0
        };
      }) || [];

      // Sort by utilization rate
      utilization.sort((a, b) => b.utilizationRate - a.utilizationRate);

      console.log(`✅ Vehicle utilization calculated for ${utilization.length} vehicles`);
      return utilization;

    } catch (error) {
      console.error('❌ Error in getVehicleUtilization:', error);
      return [];
    }
  }

  // ============================================================================
  // MAINTENANCE & SERVICE TRACKING
  // ============================================================================

  async getMaintenanceSchedule() {
    try {
      console.log('🔧 Fetching maintenance schedule...');
      
      const { data: vehicles, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*')
        .eq('status', 'available');

      if (error) {
        console.error('❌ Error fetching vehicles for maintenance:', error);
        return [];
      }

      // Generate maintenance schedule based on vehicle data
      const schedule = vehicles?.map(vehicle => {
        const lastMaintenance = vehicle.last_maintenance_date || vehicle.created_at;
        const nextMaintenance = this.calculateNextMaintenance(lastMaintenance);
        const daysUntilMaintenance = this.calculateDays(new Date().toISOString(), nextMaintenance);

        return {
          vehicle,
          lastMaintenanceDate: lastMaintenance,
          nextMaintenanceDate: nextMaintenance,
          daysUntilMaintenance,
          maintenanceType: this.getMaintenanceType(daysUntilMaintenance),
          priority: this.getMaintenancePriority(daysUntilMaintenance)
        };
      }) || [];

      // Sort by priority and days until maintenance
      schedule.sort((a, b) => {
        if (a.priority !== b.priority) {
          const priorityOrder = { 'urgent': 0, 'high': 1, 'medium': 2, 'low': 3 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.daysUntilMaintenance - b.daysUntilMaintenance;
      });

      console.log(`✅ Maintenance schedule generated for ${schedule.length} vehicles`);
      return schedule;

    } catch (error) {
      console.error('❌ Error in getMaintenanceSchedule:', error);
      return [];
    }
  }

  // ============================================================================
  // SEARCH & FILTERING
  // ============================================================================

  async searchVehicles(searchTerm, filters = {}) {
    try {
      if (!searchTerm || searchTerm.trim().length < 2) {
        return [];
      }

      console.log('🔍 Searching vehicles...');
      
      let query = supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*')
        .or(`name.ilike.%${searchTerm}%,model.ilike.%${searchTerm}%,vehicle_type.ilike.%${searchTerm}%,plate_number.ilike.%${searchTerm}%`);

      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      if (filters.vehicleType) {
        query = query.eq('vehicle_type', filters.vehicleType);
      }

      const { data: vehicles, error } = await query.limit(20);

      if (error) {
        console.error('❌ Error searching vehicles:', error);
        return [];
      }

      // Add search relevance scoring
      const scoredResults = vehicles?.map(vehicle => ({
        ...vehicle,
        searchText: `${vehicle.name} ${vehicle.model} ${vehicle.vehicle_type} ${vehicle.plate_number}`.toLowerCase(),
        relevanceScore: this.calculateRelevanceScore(vehicle, searchTerm.toLowerCase())
      })) || [];

      // Sort by relevance score
      scoredResults.sort((a, b) => b.relevanceScore - a.relevanceScore);

      console.log(`✅ Found ${scoredResults.length} vehicles matching "${searchTerm}"`);
      return scoredResults;

    } catch (error) {
      console.error('❌ Error in searchVehicles:', error);
      return [];
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  cleanVehicleData(data) {
    const cleanData = { ...data };
    
    // Remove undefined/null values
    Object.keys(cleanData).forEach(key => {
      if (cleanData[key] === undefined || cleanData[key] === null) {
        delete cleanData[key];
      }
    });

    // Trim string values
    ['name', 'model', 'plate_number', 'vehicle_type'].forEach(field => {
      if (cleanData[field] && typeof cleanData[field] === 'string') {
        cleanData[field] = cleanData[field].trim();
      }
    });

    // Ensure required fields have defaults
    if (!cleanData.status) {
      cleanData.status = 'available';
    }

    if (!cleanData.created_at) {
      cleanData.created_at = new Date().toISOString();
    }

    return cleanData;
  }

  calculateDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  calculateNextMaintenance(lastMaintenanceDate) {
    const lastMaintenance = new Date(lastMaintenanceDate);
    const nextMaintenance = new Date(lastMaintenance);
    nextMaintenance.setDate(nextMaintenance.getDate() + 90); // 90 days interval
    return nextMaintenance.toISOString().split('T')[0];
  }

  getMaintenanceType(daysUntil) {
    if (daysUntil <= 0) return 'Overdue';
    if (daysUntil <= 7) return 'Urgent';
    if (daysUntil <= 30) return 'Scheduled';
    return 'Routine';
  }

  getMaintenancePriority(daysUntil) {
    if (daysUntil <= 0) return 'urgent';
    if (daysUntil <= 7) return 'high';
    if (daysUntil <= 30) return 'medium';
    return 'low';
  }

  calculateRelevanceScore(vehicle, searchTerm) {
    let score = 0;
    const fields = [
      { field: vehicle.name?.toLowerCase() || '', weight: 3 },
      { field: vehicle.model?.toLowerCase() || '', weight: 2 },
      { field: vehicle.vehicle_type?.toLowerCase() || '', weight: 2 },
      { field: vehicle.plate_number?.toLowerCase() || '', weight: 1 }
    ];

    fields.forEach(({ field, weight }) => {
      if (field.includes(searchTerm)) {
        score += weight;
        if (field.startsWith(searchTerm)) {
          score += weight; // Bonus for prefix match
        }
      }
    });

    return score;
  }

  getDefaultStats() {
    return {
      total: 0,
      byStatus: {},
      byType: {},
      byYear: {},
      averageAge: 0
    };
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  getCacheKey(method, params) {
    return `${method}_${JSON.stringify(params)}`;
  }

  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
    console.log('✅ Fleet service cache cleared');
  }
}

export const fleetService = new FleetService();
export default fleetService;