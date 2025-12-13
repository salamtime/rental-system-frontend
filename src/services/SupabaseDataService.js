import { supabase } from '../utils/supabaseClient';

/**
 * Fetches all rentals from Supabase.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of rental objects.
 */
export const fetchRentals = async () => {
  try {
    const { data, error } = await supabase
      .from('app_4c3a7a6153_rentals')
      .select(`
        *,
        vehicle:saharax_0u4w4d_vehicles(
          id,
          name,
          model,
          plate_number,
          status,
          vehicle_type
        )
      `);

    if (error) {
      console.error({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      return [];
    }
    return data || [];
  } catch (error) {
    console.error({
        message: 'An unexpected error occurred while fetching rentals:',
        details: error?.message
    });
    return [];
  }
};

/**
 * Fetches the 5 most recent bookings from Supabase.
 *
 * @returns {Promise<Array>} A promise that resolves to an array of the 5 most recent bookings.
 */
export const fetchRecentBookings = async () => {
  try {
    const { data, error } = await supabase
      .from('app_4c3a7a6153_rentals')
      .select(`
        *,
        vehicle:saharax_0u4w4d_vehicles(
          id,
          name,
          model,
          plate_number,
          status,
          vehicle_type
        )
      `)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      return [];
    }
    return data || [];
  } catch (error) {
    console.error({
        message: 'An unexpected error occurred while fetching recent bookings:',
        details: error?.message
    });
    return [];
  }
};