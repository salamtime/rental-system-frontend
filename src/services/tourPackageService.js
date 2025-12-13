import { supabase } from '../lib/supabase.js';

/**
 * Tour Package Service for managing tour packages
 * Handles CRUD operations for the tour packages table
 */

// The app-specific tour packages table name
const TOUR_PACKAGES_TABLE = 'app_cf88e679bb_tour_packages';

/**
 * Fetch all active tour packages
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export const fetchTourPackages = async () => {
  try {
    console.log(`Fetching tour packages from ${TOUR_PACKAGES_TABLE}...`);
    
    const { data, error } = await supabase
      .from(TOUR_PACKAGES_TABLE)
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error(`Error fetching tour packages from ${TOUR_PACKAGES_TABLE}:`, error);
      return { data: null, error };
    }

    console.log('Tour packages fetched successfully:', data);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Unexpected exception in fetchTourPackages:', err);
    return { data: null, error: err };
  }
};

/**
 * Create a new tour package
 * @param {Object} tourPackage - Tour package data
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const createTourPackage = async (tourPackage) => {
  try {
    const { data, error } = await supabase
      .from(TOUR_PACKAGES_TABLE)
      .insert({
        ...tourPackage,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tour package:', error);
      return { data: null, error };
    }

    console.log('Tour package created successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected exception in createTourPackage:', err);
    return { data: null, error: err };
  }
};

/**
 * Update an existing tour package
 * @param {string} id - Tour package ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const updateTourPackage = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from(TOUR_PACKAGES_TABLE)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating tour package:', error);
      return { data: null, error };
    }

    console.log('Tour package updated successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected exception in updateTourPackage:', err);
    return { data: null, error: err };
  }
};

/**
 * Delete (deactivate) a tour package
 * @param {string} id - Tour package ID
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export const deleteTourPackage = async (id) => {
  try {
    const { data, error } = await supabase
      .from(TOUR_PACKAGES_TABLE)
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting tour package:', error);
      return { data: null, error };
    }

    console.log('Tour package deleted successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Unexpected exception in deleteTourPackage:', err);
    return { data: null, error: err };
  }
};

/**
 * Get pricing for a specific tour package
 * @param {Object} tourPackage - Tour package object
 * @param {number} duration - Duration in hours (1 or 2)
 * @param {boolean} isVip - Whether it's VIP pricing
 * @returns {number} - Price for the tour
 */
export const getTourPackagePrice = (tourPackage, duration, isVip = false) => {
  if (!tourPackage) return 0;
  
  if (duration === 1) {
    return isVip ? (tourPackage.vip_rate_1h || 0) : (tourPackage.default_rate_1h || 0);
  } else if (duration === 2) {
    return isVip ? (tourPackage.vip_rate_2h || 0) : (tourPackage.default_rate_2h || 0);
  }
  
  return 0;
};