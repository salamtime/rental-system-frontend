/**
 * Extension Pricing Service
 * Handles rental extension price calculations with tiered pricing support
 */

import { supabase } from '../lib/supabase';

class ExtensionPricingService {
  /**
   * Calculate extension price for a rental
   * @param {string} rentalId - The rental ID
   * @param {number} extensionHours - Number of hours to extend
   * @returns {Promise<Object>} Price calculation result
   */
  static async calculateExtensionPrice(rentalId, extensionHours) {
    try {
      console.log('🧮 Calculating extension price for rental', rentalId, 'with', extensionHours, 'hours');
      console.log('🔍 Parameter types:', typeof rentalId, typeof extensionHours);

      // Validate parameters
      if (!rentalId) {
        throw new Error('Rental ID is required');
      }
      
      const hoursNum = parseInt(extensionHours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        throw new Error(`Invalid extension hours: ${extensionHours}`);
      }

      // First, try to use the database function if it exists
      try {
        const { data, error } = await supabase.rpc('calculate_extension_price', {
          p_extension_hours: hoursNum,  // FIXED: Correct parameter order
          p_rental_id: rentalId
        });

        if (error) {
          console.error('❌ Database calculation error:', error);
          throw error;
        }

        if (data) {
          console.log('✅ Database calculation successful:', data);
          return data;
        }
      } catch (dbError) {
        console.error('❌ Database function not available:', dbError.message);
        console.log('⚠️ Using fallback calculation method');
      }

      // Fallback: Calculate manually using existing pricing rules
      return await this.calculateExtensionPriceFallback(rentalId, hoursNum);
      
    } catch (error) {
      console.error('❌ Error calculating extension price:', error);
      throw new Error(`Failed to calculate extension price: ${error.message}`);
    }
  }

  /**
   * Fallback calculation method using existing pricing rules
   */
  static async calculateExtensionPriceFallback(rentalId, extensionHours) {
    try {
      console.log('🔄 Starting fallback calculation for rental:', rentalId, 'hours:', extensionHours);

      // Get rental details with vehicle information
      const { data: rental, error: rentalError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(*)
        `)
        .eq('id', rentalId)
        .single();

      if (rentalError) {
        console.error('❌ Error fetching rental:', rentalError);
        throw rentalError;
      }
      
      if (!rental) {
        throw new Error('Rental not found');
      }

      console.log('✅ Rental found:', {
        id: rental.id,
        vehicle_id: rental.vehicle_id,
        start: rental.rental_start_date,
        end: rental.rental_end_date,
        total: rental.total_amount
      });

      // Get vehicle pricing
      const vehicleId = rental.vehicle_id;
      const baseHourlyRate = rental.vehicle?.hourly_rate || rental.vehicle?.price_per_hour || 100;

      console.log('💰 Base hourly rate:', baseHourlyRate);

      // Check if tiered pricing exists
      const { data: pricingRules, error: pricingError } = await supabase
        .from('app_4c3a7a6153_pricing_rules')
        .select('*')
        .eq('vehicle_id', vehicleId)
        .eq('rental_type', 'hourly')
        .order('min_hours', { ascending: true });

      if (pricingError) {
        console.warn('⚠️ Error fetching pricing rules:', pricingError.message);
      }

      console.log('📊 Pricing rules found:', pricingRules?.length || 0);

      let totalPrice = 0;
      let tierBreakdown = [];

      // Calculate current rental duration
      const startDate = new Date(rental.rental_start_date);
      const endDate = new Date(rental.rental_end_date);
      const currentDuration = Math.round((endDate - startDate) / (1000 * 60 * 60));

      console.log('⏱️ Current duration:', currentDuration, 'hours');

      if (!pricingError && pricingRules && pricingRules.length > 0) {
        // Use tiered pricing
        console.log('🎯 Using tiered pricing calculation');
        let remainingHours = extensionHours;
        let totalHoursSoFar = currentDuration;

        for (const rule of pricingRules) {
          if (remainingHours <= 0) break;

          const tierStart = rule.min_hours;
          const tierEnd = rule.max_hours || Infinity;
          
          console.log(`📍 Checking tier: ${tierStart}-${tierEnd} hours`);
          
          // Calculate how many hours fall into this tier
          let hoursInThisTier = 0;
          
          if (totalHoursSoFar < tierEnd) {
            const hoursAvailableInTier = tierEnd - Math.max(totalHoursSoFar, tierStart);
            hoursInThisTier = Math.min(remainingHours, hoursAvailableInTier);
            
            if (hoursInThisTier > 0) {
              const ratePerHour = rule.price_per_hour || baseHourlyRate;
              const discountMultiplier = 1 - (rule.discount_percentage || 0) / 100;
              const effectiveRate = ratePerHour * discountMultiplier;
              const tierTotal = hoursInThisTier * effectiveRate;

              console.log(`  ✓ ${hoursInThisTier}h @ MAD ${effectiveRate}/h = MAD ${tierTotal}`);

              tierBreakdown.push({
                hours: hoursInThisTier,
                rate: Math.round(effectiveRate),
                discount: rule.discount_percentage || 0,
                subtotal: Math.round(tierTotal)
              });

              totalPrice += tierTotal;
              remainingHours -= hoursInThisTier;
              totalHoursSoFar += hoursInThisTier;
            }
          }
        }

        // If there are still remaining hours, use the last tier's rate
        if (remainingHours > 0) {
          console.log(`⚠️ ${remainingHours} hours remaining, using last tier rate`);
          const lastRule = pricingRules[pricingRules.length - 1];
          const ratePerHour = lastRule.price_per_hour || baseHourlyRate;
          const discountMultiplier = 1 - (lastRule.discount_percentage || 0) / 100;
          const effectiveRate = ratePerHour * discountMultiplier;
          const tierTotal = remainingHours * effectiveRate;

          tierBreakdown.push({
            hours: remainingHours,
            rate: Math.round(effectiveRate),
            discount: lastRule.discount_percentage || 0,
            subtotal: Math.round(tierTotal)
          });

          totalPrice += tierTotal;
        }
      } else {
        // No tiered pricing, use flat rate
        console.log('📊 Using flat rate calculation');
        totalPrice = extensionHours * baseHourlyRate;
        tierBreakdown = [{
          hours: extensionHours,
          rate: baseHourlyRate,
          discount: 0,
          subtotal: Math.round(totalPrice)
        }];
      }

      // Calculate new end date
      const newEndDate = new Date(rental.rental_end_date);
      newEndDate.setHours(newEndDate.getHours() + extensionHours);

      // Calculate savings
      const fullPriceTotal = extensionHours * baseHourlyRate;
      const totalSavings = fullPriceTotal - totalPrice;

      const result = {
        totalPrice: Math.round(totalPrice),
        extension_price: Math.round(totalPrice),  // Add this for compatibility
        averageHourlyRate: Math.round(totalPrice / extensionHours),
        tierBreakdown,
        newEndDate: newEndDate.toISOString(),
        totalSavings: Math.round(totalSavings),
        currentHours: currentDuration,
        extensionHours,
        dynamicPricingEnabled: pricingRules && pricingRules.length > 0
      };

      console.log('✅ Fallback calculation result:', result);

      return result;

    } catch (error) {
      console.error('❌ Fallback calculation error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
  }

  /**
   * Create an extension request
   */
  static async createExtensionRequest(extensionData) {
    try {
      console.log('📝 Creating extension request:', extensionData);
      
      const { data, error } = await supabase
        .from('rental_extensions')
        .insert([extensionData])
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Extension request created:', data);

      // If approved immediately, update the rental
      if (extensionData.status === 'approved') {
        console.log('🔄 Extension approved immediately, updating rental...');
        await this.updateRentalWithExtension(extensionData.rental_id, extensionData.extension_hours, extensionData.extension_price);
      }

      return { extension: data };
    } catch (error) {
      console.error('❌ Error creating extension request:', error);
      throw error;
    }
  }

  /**
   * Update rental with approved extension
   * @param {string} rentalId - The rental ID
   * @param {number} extensionHours - Number of hours to extend
   * @param {number} extensionPrice - Price of the extension
   */
  static async updateRentalWithExtension(rentalId, extensionHours, extensionPrice) {
    try {
      console.log('🔄 Updating rental with extension:', { rentalId, extensionHours, extensionPrice });
      
      // Fetch current rental details
      const { data: rental, error: fetchError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('*')
        .eq('id', rentalId)
        .single();

      if (fetchError) throw fetchError;

      console.log('📋 Current rental:', {
        id: rental.id,
        current_end: rental.rental_end_date,
        current_total: rental.total_amount
      });

      // Calculate new end date
      const currentEndDate = new Date(rental.rental_end_date);
      const newEndDate = new Date(currentEndDate.getTime() + (extensionHours * 60 * 60 * 1000));

      console.log('📅 New end date:', newEndDate.toISOString());

      // Calculate new total amount
      const currentTotal = parseFloat(rental.total_amount) || 0;
      const newTotal = currentTotal + parseFloat(extensionPrice);

      console.log('💰 Price update:', {
        current: currentTotal,
        extension: extensionPrice,
        new_total: newTotal
      });

      // Update rental
      const { error: updateError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          rental_end_date: newEndDate.toISOString(),
          total_amount: newTotal,
          remaining_amount: Math.max(0, newTotal - (parseFloat(rental.deposit_amount) || 0)),
          updated_at: new Date().toISOString()
        })
        .eq('id', rentalId);

      if (updateError) throw updateError;

      console.log('✅ Rental updated successfully');

      return true;
    } catch (error) {
      console.error('❌ Error updating rental with extension:', error);
      throw error;
    }
  }

  /**
   * Approve an extension request
   */
  static async approveExtension(extensionId, approvedById) {
    try {
      console.log('✅ Approving extension:', extensionId, 'by user:', approvedById);
      
      // Get extension details
      const { data: extension, error: fetchError } = await supabase
        .from('rental_extensions')
        .select('*')
        .eq('id', extensionId)
        .single();

      if (fetchError) throw fetchError;

      console.log('📋 Extension details:', extension);

      // Update extension status
      const { error: updateError } = await supabase
        .from('rental_extensions')
        .update({
          status: 'approved',
          approved_by: approvedById,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', extensionId);

      if (updateError) throw updateError;

      console.log('✅ Extension status updated to approved');

      // Update the rental with the extension
      await this.updateRentalWithExtension(
        extension.rental_id, 
        extension.extension_hours, 
        extension.extension_price
      );

      return { success: true, rental_id: extension.rental_id };
    } catch (error) {
      console.error('❌ Error approving extension:', error);
      throw error;
    }
  }

  /**
   * Reject an extension request - NO NOTE REQUIRED
   */
  static async rejectExtension(extensionId, rejectedById) {
    try {
      console.log('🚫 Rejecting extension:', extensionId, 'by user:', rejectedById);
      
      const { error } = await supabase
        .from('rental_extensions')
        .update({
          status: 'rejected',
          approved_by: rejectedById,
          approved_at: new Date().toISOString(),
          approval_notes: 'Cancelled by user',
          updated_at: new Date().toISOString()
        })
        .eq('id', extensionId);

      if (error) throw error;

      console.log('✅ Extension rejected successfully');

      return { success: true };
    } catch (error) {
      console.error('❌ Error rejecting extension:', error);
      throw error;
    }
  }

  /**
   * Get extension history for a rental
   */
  static async getExtensionHistory(rentalId) {
    try {
      const { data, error } = await supabase
        .from('rental_extensions')
        .select('*')
        .eq('rental_id', rentalId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { extensions: data || [] };  // Wrap in object for consistency
    } catch (error) {
      console.error('❌ Error fetching extension history:', error);
      throw error;
    }
  }

  /**
   * Get extensions by rental ID (alias for getExtensionHistory)
   * This method provides backward compatibility for components that use this naming
   */
  static async getExtensionsByRental(rentalId) {
    return await this.getExtensionHistory(rentalId);
  }
}

export default ExtensionPricingService;