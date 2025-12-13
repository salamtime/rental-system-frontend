import { supabase } from '../lib/supabase';

const CustomerService = {
  async getCustomers(page = 1, limit = 10, searchTerm = '') {
    try {
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('app_4c3a7a6153_customers')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching customers:', error);
      return { success: false, message: error.message };
    }
  },

  async getCustomerById(id) {
    try {
      const { data, error } = await supabase
        .from('app_4c3a7a6153_customers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error fetching customer by ID:', error);
      return { success: false, message: error.message };
    }
  },

  async getCustomerRentalHistory(customerName) {
    if (!customerName) {
      return { success: false, message: "Customer name is required." };
    }
    try {
      const { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          *,
          vehicle:app_4c3a7a6153_vehicles(name, type)
        `)
        .eq('customer_name', customerName)
        .order('rental_start_date', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching rental history:', error);
      return { success: false, message: error.message };
    }
  },

  async checkCustomerRentalHistory(customerName) {
    if (!customerName) {
      return { success: false, hasHistory: false, message: "Customer name is required." };
    }
    try {
      const { count, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('id', { count: 'exact', head: true })
        .eq('customer_name', customerName);

      if (error) throw error;

      return { success: true, hasHistory: count > 0 };
    } catch (error) {
      console.error('Error checking rental history:', error);
      return { success: false, hasHistory: false, message: error.message };
    }
  },

  async createCustomer(customerData) {
    try {
      const { data, error } = await supabase
        .from('app_4c3a7a6153_customers')
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error creating customer:', error);
      return { success: false, message: error.message };
    }
  },

  async updateCustomer(id, updatedData) {
    try {
      const { data, error } = await supabase
        .from('app_4c3a7a6153_customers')
        .update(updatedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return { success: true, data };
    } catch (error) {
      console.error('Error updating customer:', error);
      return { success: false, message: error.message };
    }
  },

  async deleteCustomer(id) {
    try {
      const { error } = await supabase
        .from('app_4c3a7a6153_customers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Error deleting customer:', error);
      return { success: false, message: error.message };
    }
  },

  async processOCRData(scannedData) {
    try {
      // 1. Check if a customer with the same name or email already exists
      let query = supabase.from('app_4c3a7a6153_customers').select('id, full_name, email');
      const conditions = [];
      if (scannedData.full_name) conditions.push(`full_name.eq.${scannedData.full_name}`);
      if (scannedData.email) conditions.push(`email.eq.${scannedData.email}`);
      
      if (conditions.length === 0) {
        // Not enough data to find an existing customer, so create a new one
        return this.createCustomer(scannedData);
      }
      
      query = query.or(conditions.join(','));

      const { data: existingCustomer, error: findError } = await query.maybeSingle();

      if (findError) throw findError;

      if (existingCustomer) {
        // 2. If customer exists, update their record with any new information
        const updates = {};
        if (scannedData.phone && !existingCustomer.phone) updates.phone = scannedData.phone;
        if (scannedData.address && !existingCustomer.address) updates.address = scannedData.address;
        if (scannedData.id_scan_url && !existingCustomer.id_scan_url) updates.id_scan_url = scannedData.id_scan_url;
        
        if (Object.keys(updates).length > 0) {
          return this.updateCustomer(existingCustomer.id, updates);
        }
        return { success: true, data: existingCustomer, message: "Customer already exists, no new information to add." };
      } else {
        // 3. If no customer exists, create a new one
        return this.createCustomer(scannedData);
      }
    } catch (error) {
      console.error("Error processing OCR data:", error);
      return { success: false, message: error.message };
    }
  },
};

export default CustomerService;