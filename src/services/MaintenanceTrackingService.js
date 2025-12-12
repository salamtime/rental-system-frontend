import { supabase } from '../lib/supabase';
import MaintenanceService from './MaintenanceService';

/**
 * MaintenanceTrackingService - Enhanced with comprehensive parts tracking
 * 
 * This service now delegates parts-related operations to MaintenanceService
 * while maintaining backward compatibility for existing functionality
 */
class MaintenanceTrackingService {
  // Table references
  static MAINTENANCE_RECORDS_TABLE = 'app_687f658e98_maintenance';
  static MAINTENANCE_PARTS_TABLE = 'app_687f658e98_maintenance_parts';
  static VEHICLES_TABLE = 'saharax_0u4w4d_vehicles';
  static PRICING_CATALOG_TABLE = 'app_687f658e98_maintenance_parts';

  // System settings
  static SYSTEM_SETTINGS = {
    include_scheduled_in_monthly_cost: true // Default setting
  };

  // Maintenance types mapping
  static MAINTENANCE_TYPES = [
    'Oil Change',
    'Filter Replacement', 
    'Brake Service',
    'Tire Service',
    'Engine Service',
    'Transmission Service',
    'Electrical Service',
    'Body Work',
    'General Inspection',
    'Other'
  ];

  // Type mapping for display
  static TYPE_MAPPING = {
    'oil_change': 'Oil Change',
    'brake_service': 'Brake Service',
    'filter_replacement': 'Filter Replacement',
    'tire_service': 'Tire Service',
    'engine_service': 'Engine Service',
    'transmission_service': 'Transmission Service',
    'electrical_service': 'Electrical Service',
    'body_work': 'Body Work',
    'general_inspection': 'General Inspection',
    'other': 'Other'
  };

  /**
   * Get current month boundaries in Africa/Casablanca timezone
   */
  static getCurrentMonthBoundaries() {
    const now = new Date();
    const casablancaTime = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Casablanca',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    const [year, month] = casablancaTime.split('-');
    
    // Start of month in Casablanca timezone
    const startOfMonth = new Date(`${year}-${month}-01T00:00:00`);
    
    // End of month in Casablanca timezone
    const endOfMonth = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
    
    return {
      start: startOfMonth.toISOString(),
      end: endOfMonth.toISOString(),
      monthName: new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { 
        month: 'long', 
        year: 'numeric' 
      })
    };
  }

  /**
   * Get current time in Africa/Casablanca timezone
   */
  static getCurrentCasablancaTime() {
    return new Date().toLocaleString('en-CA', {
      timeZone: 'Africa/Casablanca',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  }

  /**
   * Safely coerce total_cost to numeric
   */
  static safeCostToNumber(cost) {
    if (cost === null || cost === undefined || cost === '') {
      return 0;
    }
    
    const numericCost = parseFloat(cost);
    if (isNaN(numericCost)) {
      console.warn(`Invalid cost value encountered: ${cost}, treating as 0`);
      return 0;
    }
    
    return numericCost;
  }

  /**
   * Safely parse date with timezone handling
   */
  static safeDateParse(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        console.warn(`Invalid date encountered: ${dateString}`);
        return null;
      }
      return date;
    } catch (error) {
      console.warn(`Error parsing date: ${dateString}`, error);
      return null;
    }
  }

  /**
   * Create maintenance record - ENHANCED with parts tracking
   * Now delegates to MaintenanceService for comprehensive parts management
   */
  static async createMaintenanceRecord(recordData) {
    try {
      console.log('💾 Creating maintenance record via enhanced service:', recordData);

      // Use the new MaintenanceService for complete parts tracking
      const result = await MaintenanceService.createMaintenanceRecord(recordData);
      
      console.log('✅ Maintenance record created with parts tracking:', result.maintenance);
      return result.maintenance; // Return maintenance record for backward compatibility

    } catch (err) {
      console.error('Error in createMaintenanceRecord:', err);
      throw new Error(`Failed to create maintenance record: ${err.message}`);
    }
  }

  /**
   * Update maintenance record - ENHANCED with parts reconciliation
   * Now delegates to MaintenanceService for comprehensive parts management
   */
  static async updateMaintenanceRecord(recordId, updateData) {
    try {
      console.log('💾 Updating maintenance record via enhanced service:', recordId, updateData);

      // Use the new MaintenanceService for complete parts tracking
      const result = await MaintenanceService.updateMaintenanceRecord(recordId, updateData);
      
      console.log('✅ Maintenance record updated with parts tracking:', result.maintenance);
      return result.maintenance; // Return maintenance record for backward compatibility

    } catch (err) {
      console.error('Error in updateMaintenanceRecord:', err);
      throw new Error(`Failed to update maintenance record: ${err.message}`);
    }
  }

  /**
   * Delete maintenance record - ENHANCED with inventory restoration
   * Now delegates to MaintenanceService for comprehensive parts management
   */
  static async deleteMaintenanceRecord(recordId) {
    try {
      console.log('🗑️ Deleting maintenance record via enhanced service:', recordId);

      // Use the new MaintenanceService for complete parts tracking
      const result = await MaintenanceService.deleteMaintenanceRecord(recordId);
      
      console.log('✅ Maintenance record deleted with inventory restoration');
      return true; // Return boolean for backward compatibility

    } catch (err) {
      console.error('Error in deleteMaintenanceRecord:', err);
      throw new Error(`Failed to delete maintenance record: ${err.message}`);
    }
  }

  /**
   * Get maintenance record by ID - ENHANCED with parts details
   */
  static async getMaintenanceById(recordId) {
    try {
      const result = await MaintenanceService.getMaintenanceById(recordId);
      return result;
    } catch (err) {
      console.error('Error in getMaintenanceById:', err);
      throw new Error(`Failed to get maintenance record: ${err.message}`);
    }
  }

  /**
   * Get all maintenance records - ENHANCED with optional parts
   */
  static async getAllMaintenanceRecords(filters = {}) {
    try {
      const result = await MaintenanceService.getAllMaintenanceRecords(filters);
      return result;
    } catch (err) {
      console.error('Error in getAllMaintenanceRecords:', err);
      return [];
    }
  }

  // FIXED: Dashboard data methods with proper business logic

  /**
   * Get vehicles in maintenance - Count distinct vehicle_id with open statuses
   */
  static async getVehiclesInMaintenance() {
    try {
      console.log('🔧 Loading vehicles in maintenance from:', this.MAINTENANCE_RECORDS_TABLE);
      
      // Get all maintenance records with open status - NO JOINS
      const { data: maintenanceRecords, error: maintenanceError } = await supabase
        .from(this.MAINTENANCE_RECORDS_TABLE)
        .select('vehicle_id, status, maintenance_type, id')
        .in('status', ['scheduled', 'in_progress']);

      if (maintenanceError) {
        console.error('Error loading maintenance records:', maintenanceError);
        return []; // ALWAYS RETURN ARRAY
      }

      // Get all vehicles - separate query
      const { data: vehicles, error: vehiclesError } = await supabase
        .from(this.VEHICLES_TABLE)
        .select('id, name, model, plate_number, vehicle_type, status');

      if (vehiclesError) {
        console.error('Error loading vehicles:', vehiclesError);
        return []; // ALWAYS RETURN ARRAY
      }

      // Ensure we have arrays to work with
      const safeMaintenanceRecords = maintenanceRecords || [];
      const safeVehicles = vehicles || [];

      // Combine data manually - no joins
      const vehiclesInMaintenance = [];
      const vehicleMap = new Map(safeVehicles.map(v => [v.id, v]));
      
      // Group maintenance records by vehicle
      const maintenanceByVehicle = new Map();
      safeMaintenanceRecords.forEach(record => {
        if (!maintenanceByVehicle.has(record.vehicle_id)) {
          maintenanceByVehicle.set(record.vehicle_id, []);
        }
        maintenanceByVehicle.get(record.vehicle_id).push(record);
      });

      // Create combined data structure
      maintenanceByVehicle.forEach((records, vehicleId) => {
        const vehicle = vehicleMap.get(vehicleId);
        if (vehicle) {
          vehiclesInMaintenance.push({
            vehicle,
            maintenance_records: records || [] // ALWAYS ARRAY
          });
        }
      });

      console.log('✅ Vehicles in maintenance:', vehiclesInMaintenance.length);
      return vehiclesInMaintenance; // ALWAYS RETURN ARRAY
    } catch (err) {
      console.error('Error in getVehiclesInMaintenance:', err);
      return []; // ALWAYS RETURN ARRAY ON ERROR
    }
  }

  /**
   * Get upcoming maintenance - FIXED with proper timezone and business rules
   */
  static async getUpcomingMaintenance() {
    try {
      console.log('🔧 Loading upcoming maintenance from:', this.MAINTENANCE_RECORDS_TABLE);
      
      const { data: maintenanceRecords, error } = await supabase
        .from(this.MAINTENANCE_RECORDS_TABLE)
        .select('*')
        .eq('status', 'scheduled')
        .order('service_date', { ascending: true });

      if (error) {
        console.error('Error loading upcoming maintenance:', error);
        return []; // ALWAYS RETURN ARRAY
      }

      // Get vehicles separately
      const { data: vehicles } = await supabase
        .from(this.VEHICLES_TABLE)
        .select('id, name, plate_number');

      const safeMaintenanceRecords = maintenanceRecords || [];
      const safeVehicles = vehicles || [];
      const vehicleMap = new Map(safeVehicles.map(v => [v.id, v]));

      // Get current time in Casablanca timezone
      const now = new Date();
      const casablancaNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
      const sevenDaysFromNow = new Date(casablancaNow.getTime() + (7 * 24 * 60 * 60 * 1000));

      // Process records with proper timezone handling
      const processedRecords = safeMaintenanceRecords.map(record => {
        const vehicle = vehicleMap.get(record.vehicle_id) || { name: 'Unknown', plate_number: 'N/A' };
        const serviceDate = this.safeDateParse(record.service_date);
        
        if (!serviceDate) {
          return {
            ...record,
            vehicle,
            isOverdue: false,
            isDueSoon: false,
            priority: 'low',
            scheduled_date: record.service_date,
            maintenance_type: this.TYPE_MAPPING[record.maintenance_type] || record.maintenance_type || 'Unknown Type'
          };
        }

        const isOverdue = serviceDate < casablancaNow;
        const isDueSoon = !isOverdue && serviceDate >= casablancaNow && serviceDate <= sevenDaysFromNow;
        
        return {
          ...record,
          vehicle,
          isOverdue,
          isDueSoon,
          priority: isOverdue ? 'high' : isDueSoon ? 'medium' : 'low',
          scheduled_date: record.service_date,
          maintenance_type: this.TYPE_MAPPING[record.maintenance_type] || record.maintenance_type || 'Unknown Type'
        };
      });

      // Sort: OVERDUE first (oldest → newest), then DUE SOON (soonest → latest)
      const sortedRecords = processedRecords.sort((a, b) => {
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        
        if (a.isOverdue && b.isOverdue) {
          // Both overdue, sort oldest first
          return new Date(a.service_date) - new Date(b.service_date);
        }
        
        if (a.isDueSoon && b.isDueSoon) {
          // Both due soon, sort soonest first
          return new Date(a.service_date) - new Date(b.service_date);
        }
        
        // Default sort by date
        return new Date(a.service_date) - new Date(b.service_date);
      });

      console.log('✅ Upcoming maintenance loaded:', sortedRecords.length);
      return sortedRecords; // ALWAYS RETURN ARRAY
    } catch (err) {
      console.error('Error in getUpcomingMaintenance:', err);
      return []; // ALWAYS RETURN ARRAY ON ERROR
    }
  }

  /**
   * Get maintenance history - FIXED with proper sorting and data mapping
   */
  static async getMaintenanceHistory(options = {}) {
    try {
      console.log('🔧 Loading maintenance history from:', this.MAINTENANCE_RECORDS_TABLE);
      
      let query = supabase
        .from(this.MAINTENANCE_RECORDS_TABLE)
        .select('*')
        .order('service_date', { ascending: false });

      if (options.limit) {
        query = query.limit(options.limit);
      }

      const { data: maintenanceRecords, error } = await query;

      if (error) {
        console.error('Error loading maintenance history:', error);
        return []; // ALWAYS RETURN ARRAY
      }

      // Get vehicles separately
      const { data: vehicles } = await supabase
        .from(this.VEHICLES_TABLE)
        .select('id, name, plate_number');

      const safeMaintenanceRecords = maintenanceRecords || [];
      const safeVehicles = vehicles || [];
      const vehicleMap = new Map(safeVehicles.map(v => [v.id, v]));

      // Add vehicle data and proper field mapping
      const historyWithVehicles = safeMaintenanceRecords.map(record => ({
        ...record,
        vehicle: vehicleMap.get(record.vehicle_id) || { name: 'Unknown', plate_number: 'N/A' },
        scheduled_date: record.service_date, // Map for compatibility
        total_cost_mad: this.safeCostToNumber(record.cost), // Safe cost conversion
        maintenance_type: this.TYPE_MAPPING[record.maintenance_type] || record.maintenance_type || 'Unknown Type'
      }));

      console.log('✅ Maintenance history loaded:', historyWithVehicles.length);
      return historyWithVehicles; // ALWAYS RETURN ARRAY
    } catch (err) {
      console.error('Error in getMaintenanceHistory:', err);
      return []; // ALWAYS RETURN ARRAY ON ERROR
    }
  }

  /**
   * Get maintenance pricing catalog - ALWAYS RETURN ARRAY
   */
  static async getMaintenancePricingCatalog() {
    try {
      console.log('💰 Loading maintenance pricing catalog from:', this.PRICING_CATALOG_TABLE);
      
      const { data, error } = await supabase
        .from(this.PRICING_CATALOG_TABLE)
        .select('*')
        .order('part_name');

      if (error) {
        console.error('Error loading maintenance pricing catalog:', error);
        return []; // ALWAYS RETURN ARRAY
      }

      const safeCatalog = data || [];
      console.log('✅ Maintenance pricing catalog loaded:', safeCatalog.length, 'items');
      return safeCatalog; // ALWAYS RETURN ARRAY
    } catch (err) {
      console.error('Error in getMaintenancePricingCatalog:', err);
      return []; // ALWAYS RETURN ARRAY ON ERROR
    }
  }

  /**
   * Get all vehicles - ALWAYS RETURN ARRAY
   */
  static async getAllVehicles() {
    try {
      console.log('🚗 Loading vehicles from:', this.VEHICLES_TABLE);
      
      const { data, error } = await supabase
        .from(this.VEHICLES_TABLE)
        .select('id, name, model, plate_number, vehicle_type, status, current_odometer, next_oil_change_odometer')
        .order('name');

      if (error) {
        console.error('Error loading vehicles:', error);
        return []; // ALWAYS RETURN ARRAY
      }

      console.log('✅ Vehicles loaded:', (data || []).length);
      return data || []; // ALWAYS RETURN ARRAY
    } catch (err) {
      console.error('Error in getAllVehicles:', err);
      return []; // ALWAYS RETURN ARRAY ON ERROR
    }
  }

  /**
   * FIXED: Get maintenance statistics with proper business rules
   */
  static async getMaintenanceStatistics() {
    try {
      console.log('🔧 Loading maintenance statistics from:', this.MAINTENANCE_RECORDS_TABLE);
      
      // Get current month boundaries in Casablanca timezone
      const monthBoundaries = this.getCurrentMonthBoundaries();
      console.log('📅 Current month boundaries (Casablanca):', monthBoundaries);

      // Get all maintenance records for analysis
      const { data: allRecords, error: allRecordsError } = await supabase
        .from(this.MAINTENANCE_RECORDS_TABLE)
        .select('id, vehicle_id, status, service_date, cost, maintenance_type');

      if (allRecordsError) {
        console.error('Error loading maintenance records:', allRecordsError);
        throw allRecordsError;
      }

      const safeAllRecords = allRecords || [];
      console.log('📊 Total maintenance records:', safeAllRecords.length);

      // 1. MONTHLY COST CALCULATION
      const includeScheduled = this.SYSTEM_SETTINGS.include_scheduled_in_monthly_cost;
      const validStatusesForCost = includeScheduled 
        ? ['scheduled', 'in_progress', 'completed']
        : ['in_progress', 'completed'];

      const monthlyRecords = safeAllRecords.filter(record => {
        // Check if record is in current month
        const recordDate = this.safeDateParse(record.service_date);
        if (!recordDate) return false;

        const recordDateStr = recordDate.toISOString();
        const inCurrentMonth = recordDateStr >= monthBoundaries.start && recordDateStr <= monthBoundaries.end;
        
        // Check if status is valid for cost calculation
        const validStatus = validStatusesForCost.includes(record.status);
        
        // Exclude canceled/deleted if they exist
        const notExcluded = !['canceled', 'deleted'].includes(record.status);
        
        return inCurrentMonth && validStatus && notExcluded;
      });

      const totalCostThisMonth = monthlyRecords.reduce((sum, record) => {
        return sum + this.safeCostToNumber(record.cost);
      }, 0);

      console.log('💰 Monthly cost calculation:', {
        monthlyRecords: monthlyRecords.length,
        totalCostThisMonth,
        includeScheduled,
        validStatuses: validStatusesForCost
      });

      // 2. VEHICLES IN MAINTENANCE COUNT
      const openRecords = safeAllRecords.filter(record => 
        ['scheduled', 'in_progress'].includes(record.status)
      );
      
      const uniqueVehiclesInMaintenance = new Set(
        openRecords.map(record => record.vehicle_id)
      ).size;

      // 3. OVERDUE AND DUE SOON COUNTS
      const casablancaNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Casablanca' }));
      const sevenDaysFromNow = new Date(casablancaNow.getTime() + (7 * 24 * 60 * 60 * 1000));

      const scheduledRecords = safeAllRecords.filter(record => record.status === 'scheduled');
      
      let overdueCount = 0;
      let dueSoonCount = 0;

      scheduledRecords.forEach(record => {
        const serviceDate = this.safeDateParse(record.service_date);
        if (serviceDate) {
          if (serviceDate < casablancaNow) {
            overdueCount++;
          } else if (serviceDate >= casablancaNow && serviceDate <= sevenDaysFromNow) {
            dueSoonCount++;
          }
        }
      });

      // 4. GENERAL STATISTICS
      const completedRecords = safeAllRecords.filter(record => record.status === 'completed');
      const totalCompletedCost = completedRecords.reduce((sum, record) => {
        return sum + this.safeCostToNumber(record.cost);
      }, 0);
      
      const avgCostPerMaintenance = completedRecords.length > 0 
        ? totalCompletedCost / completedRecords.length 
        : 0;

      // 5. MAINTENANCE BY TYPE
      const maintenanceByType = {};
      safeAllRecords.forEach(record => {
        const type = this.TYPE_MAPPING[record.maintenance_type] || record.maintenance_type || 'Other';
        maintenanceByType[type] = (maintenanceByType[type] || 0) + 1;
      });

      const statistics = {
        totalRecords: safeAllRecords.length,
        openRecords: openRecords.length,
        completedThisMonth: monthlyRecords.filter(r => r.status === 'completed').length,
        totalCostThisMonth: totalCostThisMonth,
        avgCostPerMaintenance: avgCostPerMaintenance,
        maintenanceByType: maintenanceByType,
        vehiclesInMaintenance: uniqueVehiclesInMaintenance,
        // Additional metrics for dashboard
        overdueCount: overdueCount,
        dueSoonCount: dueSoonCount,
        monthName: monthBoundaries.monthName,
        includeScheduledInCost: includeScheduled
      };

      console.log('✅ Maintenance statistics calculated:', {
        totalRecords: statistics.totalRecords,
        monthlyRecords: monthlyRecords.length,
        totalCostThisMonth: statistics.totalCostThisMonth,
        vehiclesInMaintenance: statistics.vehiclesInMaintenance,
        overdueCount: statistics.overdueCount,
        dueSoonCount: statistics.dueSoonCount
      });

      return statistics; // ALWAYS RETURN OBJECT
    } catch (err) {
      console.error('Error in getMaintenanceStatistics:', err);
      // ALWAYS RETURN DEFAULT OBJECT ON ERROR
      return {
        totalRecords: 0,
        openRecords: 0,
        completedThisMonth: 0,
        totalCostThisMonth: 0,
        avgCostPerMaintenance: 0,
        maintenanceByType: {},
        vehiclesInMaintenance: 0,
        overdueCount: 0,
        dueSoonCount: 0,
        monthName: 'Unknown',
        includeScheduledInCost: true
      };
    }
  }

  // Utility methods
  static formatCurrency(amount) {
    const safeAmount = this.safeCostToNumber(amount);
    return `MAD ${safeAmount.toFixed(2)}`;
  }

  static formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = this.safeDateParse(dateString);
    if (!date) return 'N/A';
    
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'Africa/Casablanca'
    });
  }

  static getStatusColor(status) {
    switch (status) {
      case 'scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'deleted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  static getPriorityColor(priority) {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  /**
   * Update system setting for monthly cost calculation
   */
  static updateSystemSetting(key, value) {
    if (key === 'include_scheduled_in_monthly_cost') {
      this.SYSTEM_SETTINGS.include_scheduled_in_monthly_cost = Boolean(value);
      console.log('⚙️ System setting updated:', key, '=', value);
    }
  }

  /**
   * Get system setting
   */
  static getSystemSetting(key) {
    return this.SYSTEM_SETTINGS[key];
  }
}

export default MaintenanceTrackingService;