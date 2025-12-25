import { supabase } from '../utils/supabaseClient';

export const TourService = {
  // Check if tour has existing bookings
  checkTourBookings: async (tourId) => {
    try {
      const { data: bookings, error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_bookings')
        .select('id, status, customer_name')
        .eq('tour_id', tourId);
      
      if (error) throw error;
      return bookings || [];
    } catch (error) {
      console.error('Error checking tour bookings:', error);
      throw new Error('Failed to check existing bookings');
    }
  },

  // Delete tour with booking validation
  deleteTour: async (tourId) => {
    try {
      // First check for existing bookings
      const bookings = await TourService.checkTourBookings(tourId);
      const confirmedBookings = bookings.filter(b => 
        b.status === 'confirmed' || b.status === 'pending'
      );
      
      if (confirmedBookings.length > 0) {
        throw new Error(
          `Cannot delete tour. ${confirmedBookings.length} active booking(s) exist. Please cancel or complete these bookings first.`
        );
      }
      
      // Delete the tour
      const { error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_tours')
        .delete()
        .eq('id', tourId);
      
      if (error) throw error;
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting tour:', error);
      throw new Error(error.message || 'Failed to delete tour');
    }
  },

  // Get all tours
  getTours: async () => {
    try {
      const { data, error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_tours')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tours:', error);
      throw new Error('Failed to fetch tours');
    }
  },

  // Create tour
  createTour: async (tourData) => {
    try {
      const { data, error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_tours')
        .insert([tourData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating tour:', error);
      throw new Error('Failed to create tour');
    }
  },

  // Update tour
  updateTour: async (tourId, tourData) => {
    try {
      const { data, error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_tours')
        .update(tourData)
        .eq('id', tourId)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating tour:', error);
      throw new Error('Failed to update tour');
    }
  }
};

export default TourService;