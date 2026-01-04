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
      console.log(`🧮 Calculating extension price for rental ${rentalId} with ${extensionHours} hours`);

      // Validate parameters
      if (!rentalId) {
        throw new Error('Rental ID is required');
      }
      
      const hoursNum = parseInt(extensionHours);
      if (isNaN(hoursNum) || hoursNum <= 0) {
        throw new Error(`Invalid extension hours: ${extensionHours}`);
      }

      // 1. Get rental with ALL related data including vehicle model and base price
      const { data: rental, error: rentalError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(
            *,
            vehicle_model:saharax_0u4w4d_vehicle_models(*)
          )
        `)
        .eq('id', rentalId)
        .single();
      
      if (rentalError) throw rentalError;
      
      console.log('🔍 Rental data for pricing:', {
        rentalId: rental.id,
        vehicleId: rental.vehicle_id,
        vehicleModelId: rental.vehicle?.vehicle_model_id,
        vehicleModel: rental.vehicle?.vehicle_model
      });

      // 2. Get base price for this vehicle model
      const { data: basePrice, error: basePriceError } = await supabase
        .from('app_4c3a7a6153_base_prices')
        .select('*')
        .eq('vehicle_model_id', rental.vehicle?.vehicle_model_id)
        .eq('is_active', true)
        .single();

      if (basePriceError || !basePrice) {
        console.warn('⚠️ No base price found for this vehicle model');
        return {
          totalPrice: 0,
          extension_price: 0,
          message: "No pricing configured for this vehicle model",
          requires_manual_entry: true,
          error_code: 'NO_BASE_PRICE'
        };
      }

      console.log('💰 Base price found:', {
        basePriceId: basePrice.id,
        hourlyPrice: basePrice.hourly_price,
        priceSource: basePrice.price_source
      });
      
      // 3. Get the hourly rate from base price
      const hourlyRate = basePrice.hourly_price;
      
      if (!hourlyRate || hourlyRate <= 0) {
        console.warn('⚠️ No hourly rate configured');
        return {
          totalPrice: 0,
          extension_price: 0,
          message: "Hourly rate not configured for this vehicle",
          requires_manual_entry: true,
          error_code: 'NO_HOURLY_RATE'
        };
      }
      
      // 4. Check for pricing tiers
      let finalHourlyRate = hourlyRate;
      let tierBreakdown = [];
      let appliedTier = null;
      
      try {
        const { data: pricingTiers, error: tiersError } = await supabase
          .from('app_4c3a7a6153_pricing_tiers')
          .select('*')
          .eq('vehicle_model_id', rental.vehicle?.vehicle_model_id)
          .eq('is_active', true)
          .lte('min_hours', hoursNum)
          .order('min_hours', { ascending: false });
        
        if (!tiersError && pricingTiers && pricingTiers.length > 0) {
          // Find the best matching tier
          for (const tier of pricingTiers) {
            if (hoursNum >= tier.min_hours && (!tier.max_hours || hoursNum <= tier.max_hours)) {
              appliedTier = tier;
              break;
            }
          }

          if (appliedTier) {
            console.log('✅ Found pricing tier:', appliedTier);
            
            if (appliedTier.calculation_method === 'percentage' && appliedTier.discount_percentage) {
              // Apply percentage discount
              const discount = appliedTier.discount_percentage / 100;
              finalHourlyRate = hourlyRate * (1 - discount);
              
              tierBreakdown.push({
                hours: hoursNum,
                rate: Math.round(finalHourlyRate),
                discount: appliedTier.discount_percentage,
                subtotal: Math.round(finalHourlyRate * hoursNum)
              });
            } else if (appliedTier.calculation_method === 'fixed') {
              // Use fixed price
              finalHourlyRate = appliedTier.price_amount;
              
              tierBreakdown.push({
                hours: hoursNum,
                rate: Math.round(finalHourlyRate),
                discount: 0,
                subtotal: Math.round(finalHourlyRate * hoursNum)
              });
            }
          }
        }
      } catch (tierError) {
        console.log('⚠️ No pricing tiers found, using base rate:', tierError.message);
      }

      // If no tier was applied, use base rate
      if (!appliedTier) {
        tierBreakdown.push({
          hours: hoursNum,
          rate: Math.round(hourlyRate),
          discount: 0,
          subtotal: Math.round(hourlyRate * hoursNum)
        });
      }
      
      // 5. Calculate total price
      const totalPrice = finalHourlyRate * hoursNum;
      
      // Calculate new end date
      const currentEndDate = new Date(rental.rental_end_date);
      const newEndDate = new Date(currentEndDate.getTime() + (hoursNum * 60 * 60 * 1000));

      // Calculate savings
      const fullPriceTotal = hoursNum * hourlyRate;
      const totalSavings = fullPriceTotal - totalPrice;
      
      console.log('💰 Final price calculation:', {
        baseHourlyRate: hourlyRate,
        finalHourlyRate: finalHourlyRate,
        hours: hoursNum,
        totalPrice: totalPrice,
        source: basePrice.price_source || 'base',
        appliedTier: appliedTier ? `${appliedTier.min_hours}-${appliedTier.max_hours || '∞'}h` : 'none'
      });
      
      return {
        totalPrice: Math.round(totalPrice),
        extension_price: Math.round(totalPrice),
        averageHourlyRate: Math.round(totalPrice / hoursNum),
        hourly_rate: Math.round(finalHourlyRate),
        tierBreakdown,
        newEndDate: newEndDate.toISOString(),
        totalSavings: Math.round(totalSavings),
        extensionHours: hoursNum,
        message: `Calculated at ${Math.round(finalHourlyRate)} MAD/hour (${hoursNum} hours)`,
        requires_manual_entry: false,
        source: 'auto_calculated',
        dynamicPricingEnabled: !!appliedTier
      };
      
    } catch (error) {
      console.error('❌ Error calculating extension price:', error);
      return {
        totalPrice: 0,
        extension_price: 0,
        message: `Error calculating price: ${error.message}`,
        requires_manual_entry: true,
        error_code: 'CALCULATION_ERROR'
      };
    }
  }

  /**
   * Fallback calculation method using existing pricing rules (DEPRECATED - kept for compatibility)
   */
  static async calculateExtensionPriceFallback(rentalId, extensionHours) {
    console.warn('⚠️ Using deprecated fallback method, redirecting to main calculation');
    return await this.calculateExtensionPrice(rentalId, extensionHours);
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
      
      const { data: rental, error: fetchError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select('*')
        .eq('id', rentalId)
        .single();

      if (fetchError) throw fetchError;

      console.log('📋 Current rental:', {
        id: rental.id,
        current_end: rental.rental_end_date,
        current_total: rental.total_amount,
        current_extension_price: rental.total_extension_price,
        current_extension_count: rental.extension_count
      });

      const currentEndDate = new Date(rental.rental_end_date);
      const newEndDate = new Date(currentEndDate.getTime() + (extensionHours * 60 * 60 * 1000));

      console.log('📅 New end date:', newEndDate.toISOString());

      const currentExtensionPrice = parseFloat(rental.total_extension_price) || 0;
      const newTotalExtensionPrice = currentExtensionPrice + parseFloat(extensionPrice);
      
      const currentExtensionCount = parseInt(rental.extension_count) || 0;
      const newExtensionCount = currentExtensionCount + 1;
      
      const currentExtendedHours = parseFloat(rental.total_extended_hours) || 0;
      const newTotalExtendedHours = currentExtendedHours + parseFloat(extensionHours);

      const baseAmount = parseFloat(rental.unit_price || rental.total_amount) || 0;
      const overageCharge = parseFloat(rental.overage_charge) || 0;
      const newGrandTotal = baseAmount + overageCharge + newTotalExtensionPrice;

      console.log('💰 Price update:', {
        base: baseAmount,
        overage: overageCharge,
        previous_extensions: currentExtensionPrice,
        new_extension: extensionPrice,
        new_total_extensions: newTotalExtensionPrice,
        new_grand_total: newGrandTotal
      });

      const { error: updateError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({
          rental_end_date: newEndDate.toISOString(),
          total_extension_price: newTotalExtensionPrice,
          extension_count: newExtensionCount,
          total_extended_hours: newTotalExtendedHours,
          remaining_amount: Math.max(0, newGrandTotal - (parseFloat(rental.deposit_amount) || 0)),
          updated_at: new Date().toISOString()
        })
        .eq('id', rentalId);

      if (updateError) throw updateError;

      console.log('✅ Rental updated successfully with extension fields');

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

      return { extensions: data || [] };
    } catch (error) {
      console.error('❌ Error fetching extension history:', error);
      throw error;
    }
  }

  /**
   * Get extensions by rental ID (alias for getExtensionHistory)
   */
  static async getExtensionsByRental(rentalId) {
    return await this.getExtensionHistory(rentalId);
  }
}

export default ExtensionPricingService;
