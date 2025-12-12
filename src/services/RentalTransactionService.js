import { supabase } from '../lib/supabase';

// Helper function to safely convert empty strings to null for database integrity
const cleanPayload = (payload) => {
    const cleaned = {};
    for (const key in payload) {
        if (payload.hasOwnProperty(key)) {
            cleaned[key] = payload[key] === "" ? null : payload[key];
        }
    }
    return cleaned;
};

export class RentalTransactionService {
    static async createRental(rentalData) {
        try {
            // Clean the payload to convert empty strings to null
            const safeData = cleanPayload(rentalData);
            
            const { data, error } = await supabase
                .from('rentals')
                .insert([safeData])
                .select();

            if (error) {
                console.error('Error creating rental:', error);
                throw error;
            }

            return data[0];
        } catch (error) {
            console.error('RentalTransactionService.createRental error:', error);
            throw error;
        }
    }

    static async updateRental(id, rentalData) {
        try {
            // Clean the payload to convert empty strings to null
            const safeData = cleanPayload(rentalData);
            
            const { data, error } = await supabase
                .from('rentals')
                .update(safeData)
                .eq('id', id)
                .select();

            if (error) {
                console.error('Error updating rental:', error);
                throw error;
            }

            return data[0];
        } catch (error) {
            console.error('RentalTransactionService.updateRental error:', error);
            throw error;
        }
    }

    static async getRental(id) {
        try {
            const { data, error } = await supabase
                .from('rentals')
                .select('*')
                .eq('id', id)
                .single();

            if (error) {
                console.error('Error fetching rental:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('RentalTransactionService.getRental error:', error);
            throw error;
        }
    }

    static async getAllRentals() {
        try {
            const { data, error } = await supabase
                .from('rentals')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching rentals:', error);
                throw error;
            }

            return data;
        } catch (error) {
            console.error('RentalTransactionService.getAllRentals error:', error);
            throw error;
        }
    }

    static async deleteRental(id) {
        try {
            const { error } = await supabase
                .from('rentals')
                .delete()
                .eq('id', id);

            if (error) {
                console.error('Error deleting rental:', error);
                throw error;
            }

            return true;
        } catch (error) {
            console.error('RentalTransactionService.deleteRental error:', error);
            throw error;
        }
    }
}

// Export the createRental function for backward compatibility
export const createRental = RentalTransactionService.createRental;