import { supabase } from '../lib/supabase';

class MaintenanceService {
  async getOpenMaintenanceCount() {
    const { data, error } = await supabase
      .from('app_687f658e98_maintenance')
      .select('vehicle_id', { count: 'exact' })
      .in('status', ['scheduled', 'in_progress']);
      
    if (error) {
      console.error('Error fetching open maintenance records:', error);
      throw error;
    }
    
    // Count unique vehicle IDs
    const uniqueVehicleIds = new Set(data.map(item => item.vehicle_id));
    return uniqueVehicleIds.size;
  }
}

const maintenanceService = new MaintenanceService();
export default maintenanceService;