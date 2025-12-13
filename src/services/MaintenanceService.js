import { supabase } from '../lib/supabase';

class MaintenanceService {
  async getOpenMaintenanceCount() {
    const { data, error } = await supabase
      .from('app_687f658e98_maintenance')
      .select('vehicle_id', { count: 'exact' })
      .in('status', ['scheduled', 'in_progress']);
      
    if (error) {
      console.error('❌ Supabase Error', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      throw error;
    }
    
    // Count unique vehicle IDs
    const uniqueVehicleIds = new Set(data.map(item => item.vehicle_id));
    return uniqueVehicleIds.size;
  }

  async getAllMaintenanceRecords(filters = {}) {
    try {
      let query = supabase
        .from('app_687f658e98_maintenance')
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!app_687f658e98_maintenance_vehicle_id_fkey(*),
          parts:app_687f658e98_maintenance_parts(*)
        `)
        .order('service_date', { ascending: false });

      if (filters.vehicle_id) {
        query = query.eq('vehicle_id', filters.vehicle_id);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Supabase Error', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      return [];
    }
  }
}

const maintenanceService = new MaintenanceService();
export default maintenanceService;