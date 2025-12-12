import { supabase } from '../lib/supabase';

export const apiService = {
  // Vehicle operations
  async getVehicles() {
    const { data, error } = await supabase.from('saharax_0u4w4d_vehicles').select('*');
    if (error) throw error;
    return data;
  },

  async createVehicle(vehicle) {
    const { data, error } = await supabase
      .from('saharax_0u4w4d_vehicles')
      .insert([vehicle])
      .select();
    if (error) throw error;
    return data[0];
  },

  async updateVehicle(id, updates) {
    const { data, error } = await supabase
      .from('saharax_0u4w4d_vehicles')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteVehicle(id) {
    const { error } = await supabase
      .from('saharax_0u4w4d_vehicles')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async getVehicleById(id) {
    const { data, error } = await supabase
      .from('saharax_0u4w4d_vehicles')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },

  // Rental operations
  async getRentals() {
    const { data, error } = await supabase.from('rentals').select('*');
    if (error) throw error;
    return data;
  },

  async createRental(rental) {
    const { data, error } = await supabase
      .from('rentals')
      .insert([rental])
      .select();
    if (error) throw error;
    return data[0];
  },

  async updateRental(id, updates) {
    const { data, error } = await supabase
      .from('rentals')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteRental(id) {
    const { error } = await supabase
      .from('rentals')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  // Customer operations
  async getCustomers() {
    const { data, error } = await supabase.from('customers').select('*');
    if (error) throw error;
    return data;
  },

  async createCustomer(customer) {
    const { data, error } = await supabase
      .from('customers')
      .insert([customer])
      .select();
    if (error) throw error;
    return data[0];
  },

  async updateCustomer(id, updates) {
    const { data, error } = await supabase
      .from('customers')
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  },

  async deleteCustomer(id) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

export default apiService;