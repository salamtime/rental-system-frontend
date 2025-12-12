/**
 * Enhanced Transactional Rental Service with CRITICAL CUSTOMER LINK ENFORCEMENT
 * AND PAYMENT STATUS TRACKING
 * 
 * CRITICAL FIX: Guarantees customer_id is properly saved during rental creation
 * NEW FEATURE: Payment Status tracking for financial management
 * BUG FIX: Added robust data sanitization to prevent db errors on empty time/date values.
 * BUG FIX: Stricter validation for excludeRentalId.
 * REGRESSION FIX: Added explicit sanitization for time fields to prevent "invalid input syntax for type time"
 */

import { supabase } from '../lib/supabase';

class EnhancedTransactionalRentalService {
  constructor() {
    this.tableName = 'app_4c3a7a6153_rentals';
    this.vehiclesTableName = 'saharax_0u4w4d_vehicles';
    this.customersTableName = 'app_4c3a7a6153_customers';
  }

  /**
   * CRITICAL FIX: Enhanced UUID validation
   */
  _validateUuid(uuid) {
    if (!uuid || typeof uuid !== 'string') return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  validateRentalId(rentalId) {
    const isValid = this._validateUuid(rentalId);
    if (!isValid) {
      console.error('❌ INVALID RENTAL ID FORMAT:', rentalId);
    }
    return isValid;
  }

  /**
   * CRITICAL FIX: Validate customer ID format
   */
  validateCustomerId(customerId) {
    if (!customerId) return false;
    const isValidFormat = customerId.startsWith('cust_');
    if (!isValidFormat) {
      console.error('❌ INVALID CUSTOMER ID FORMAT:', customerId);
    }
    return isValidFormat;
  }

  /**
   * NEW: Validate payment status
   */
  validatePaymentStatus(paymentStatus) {
    const validStatuses = ['Pending', 'Paid in Full', 'Partially Paid', 'Refunded'];
    if (!paymentStatus) return 'Pending';
    if (!validStatuses.includes(paymentStatus)) {
      console.warn('⚠️ INVALID PAYMENT STATUS:', paymentStatus, '- defaulting to Pending');
      return 'Pending';
    }
    return paymentStatus;
  }

  /**
   * BUG FIX: Centralized, robust data sanitization before DB operations.
   * REGRESSION FIX: Added explicit nullification for time fields.
   */
  _sanitizeDataForDB(data) {
    const sanitized = {};

    // General sanitization for all fields
    for (const key in data) {
      const value = data[key];
      // Convert empty strings, undefined, or explicit "null" strings to null
      if (value === '' || value === undefined || value === 'null') {
        sanitized[key] = null;
      } else {
        sanitized[key] = value;
      }
    }

    // REGRESSION FIX: Explicitly nullify empty time fields to prevent db errors
    const timeFields = ['rental_start_time', 'rental_end_time'];
    timeFields.forEach(field => {
      if (sanitized.hasOwnProperty(field) && sanitized[field] === '') {
        console.warn(`⚠️ REGRESSION FIX: Empty string for time field ${field}. Forcing to null.`);
        sanitized[field] = null;
      }
    });

    // Explicitly nullify invalid date fields
    const dateFields = ['start_date', 'end_date', 'rental_start_date', 'rental_end_date', 'started_at', 'completed_at'];
    dateFields.forEach(field => {
      if (sanitized.hasOwnProperty(field) && sanitized[field]) {
        // Check if it's a valid date string before creating a Date object
        if (typeof sanitized[field] === 'string' && isNaN(new Date(sanitized[field]).getTime())) {
          console.warn(`⚠️ Invalid date for ${field}: "${sanitized[field]}". Setting to null.`);
          sanitized[field] = null;
        }
      }
    });

    // Map payment status to correct DB values
    const paymentMap = {
      'partial': 'Partially Paid',
      'paid': 'Paid in Full',
      'pending': 'Pending',
      'refunded': 'Refunded',
      'unpaid': 'Pending'
    };
    if (sanitized.payment_status && paymentMap[sanitized.payment_status]) {
      sanitized.payment_status = paymentMap[sanitized.payment_status];
    } else if (!sanitized.payment_status) {
      sanitized.payment_status = 'Pending';
    }
    
    console.log('🧼 FINAL SANITIZED DATA being sent to DB:', JSON.stringify(sanitized, null, 2));
    return sanitized;
  }

  /**
   * CRITICAL FIX: Enhanced rental data sanitization with customer ID and payment status enforcement
   */
  sanitizeRentalData(rentalData) {
    console.log('🔍 SANITIZING RENTAL DATA with customer ID and payment status enforcement...');
    const sanitized = { ...rentalData };

    if (rentalData.customer_id) {
      if (!this.validateCustomerId(rentalData.customer_id)) {
        throw new Error(`Invalid customer ID format: ${rentalData.customer_id}. Must start with 'cust_'`);
      }
      console.log('✅ CUSTOMER ID VALIDATED:', sanitized.customer_id);
    } else {
      throw new Error('Customer ID is required for rental creation');
    }

    sanitized.payment_status = this.validatePaymentStatus(rentalData.payment_status);
    console.log('✅ PAYMENT STATUS VALIDATED:', sanitized.payment_status);

    if (sanitized.id && !this.validateRentalId(sanitized.id)) {
      console.error('❌ INVALID RENTAL ID - removing from sanitized data');
      delete sanitized.id;
    }

    if (sanitized.excludeRentalId && !this._validateUuid(sanitized.excludeRentalId)) {
        console.warn(`⚠️ Invalid excludeRentalId format: "${sanitized.excludeRentalId}". Removing.`);
        delete sanitized.excludeRentalId;
    }

    return sanitized;
  }

  /**
   * CRITICAL FIX: Enhanced vehicle availability check with proper UUID validation
   */
  async checkVehicleAvailability(vehicleId, startDate, endDate, excludeRentalId = null) {
    console.log('🔍 CHECKING VEHICLE AVAILABILITY with enhanced validation...');
    const sanitizedExcludeRentalId = this._validateUuid(excludeRentalId) ? excludeRentalId : null;
    if (excludeRentalId && !sanitizedExcludeRentalId) {
        console.warn(`⚠️ Invalid excludeRentalId format in availability check: "${excludeRentalId}". Ignoring.`);
    }
    console.log('📊 Parameters:', { vehicleId, startDate, endDate, excludeRentalId: sanitizedExcludeRentalId });

    try {
      let query = supabase
        .from(this.tableName)
        .select('id, start_date, end_date, rental_status')
        .eq('vehicle_id', vehicleId)
        .in('rental_status', ['active', 'confirmed', 'pending']);

      query = query.or(`and(start_date.lte.${endDate},end_date.gte.${startDate})`);

      if (sanitizedExcludeRentalId) {
        console.log('🔍 EXCLUDING RENTAL ID:', sanitizedExcludeRentalId);
        query = query.neq('id', sanitizedExcludeRentalId);
      }

      const { data: conflictingRentals, error } = await query;

      if (error) {
        throw new Error(`Availability check failed: ${error.message}`);
      }

      const isAvailable = !conflictingRentals || conflictingRentals.length === 0;
      console.log('📊 AVAILABILITY RESULT:', { isAvailable, conflictingRentals: conflictingRentals?.length || 0 });

      return { available: isAvailable, conflictingRentals: conflictingRentals || [] };

    } catch (error) {
      console.error('❌ AVAILABILITY CHECK FAILED:', error);
      throw error;
    }
  }

  /**
   * CRITICAL FIX: Enhanced rental creation with GUARANTEED customer ID and payment status enforcement
   */
  async createRental(rentalData) {
    console.log('🆕 CREATING RENTAL with GUARANTEED customer ID and payment status enforcement...');
    try {
      const sanitizedData = this.sanitizeRentalData(rentalData);
      
      if (!sanitizedData.customer_id || !this.validateCustomerId(sanitizedData.customer_id)) {
        throw new Error('CRITICAL ERROR: Valid customer ID is required for rental creation');
      }

      const { data: existingCustomer, error: customerError } = await supabase
        .from(this.customersTableName)
        .select('id')
        .eq('id', sanitizedData.customer_id)
        .single();

      if (customerError || !existingCustomer) {
        throw new Error(`Customer ${sanitizedData.customer_id} does not exist. Cannot create rental.`);
      }

      const availability = await this.checkVehicleAvailability(
        sanitizedData.vehicle_id,
        sanitizedData.start_date,
        sanitizedData.end_date
      );

      if (!availability.available) {
        throw new Error('Vehicle is not available for the selected dates');
      }

      const rentalPayload = {
        ...sanitizedData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const finalSanitizedData = this._sanitizeDataForDB(rentalPayload);

      const { data: newRental, error: insertError } = await supabase
        .from(this.tableName)
        .insert([finalSanitizedData])
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create rental: ${insertError.message}`);
      }

      if (!newRental.customer_id) {
        throw new Error('CRITICAL ERROR: Customer ID was not saved to rental record!');
      }

      console.log('✅ RENTAL CREATED SUCCESSFULLY:', newRental.id);
      return { success: true, data: newRental, message: 'Rental created successfully' };

    } catch (error) {
      console.error('❌ RENTAL CREATION FAILED:', error);
      return { success: false, error: error.message, message: 'Failed to create rental' };
    }
  }

  /**
   * CRITICAL FIX: Enhanced rental update with customer ID and payment status preservation
   */
  async updateRental(rentalId, updateData) {
    console.log('🔄 UPDATING RENTAL with customer ID and payment status preservation...');
    console.log('📊 Parameters:', { rentalId, updateData });

    try {
      if (!this.validateRentalId(rentalId)) {
        throw new Error(`Invalid rental ID format: ${rentalId}`);
      }

      const { data: existingRental, error: fetchError } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', rentalId)
        .single();

      if (fetchError || !existingRental) {
        throw new Error(`Rental not found: ${rentalId}`);
      }

      let finalUpdateData = { ...updateData };
      
      if (!finalUpdateData.customer_id && existingRental.customer_id) {
        finalUpdateData.customer_id = existingRental.customer_id;
      }

      if (finalUpdateData.payment_status) {
        finalUpdateData.payment_status = this.validatePaymentStatus(finalUpdateData.payment_status);
      } else if (existingRental.payment_status) {
        finalUpdateData.payment_status = existingRental.payment_status;
      }

      if (finalUpdateData.customer_id && !this.validateCustomerId(finalUpdateData.customer_id)) {
        throw new Error(`Invalid customer ID format in update: ${finalUpdateData.customer_id}`);
      }

      if (finalUpdateData.vehicle_id || finalUpdateData.start_date || finalUpdateData.end_date) {
        const vehicleId = finalUpdateData.vehicle_id || existingRental.vehicle_id;
        const startDate = finalUpdateData.start_date || existingRental.start_date;
        const endDate = finalUpdateData.end_date || existingRental.end_date;

        const availability = await this.checkVehicleAvailability(
          vehicleId,
          startDate,
          endDate,
          rentalId
        );

        if (!availability.available) {
          throw new Error('Vehicle is not available for the updated dates');
        }
      }

      const updatePayload = {
        ...finalUpdateData,
        updated_at: new Date().toISOString()
      };

      if (!updatePayload.customer_id) {
        throw new Error('CRITICAL ERROR: Customer ID must be preserved in rental update');
      }

      const finalSanitizedData = this._sanitizeDataForDB(updatePayload);

      const { data: updatedRental, error: updateError } = await supabase
        .from(this.tableName)
        .update(finalSanitizedData)
        .eq('id', rentalId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ RENTAL UPDATE ERROR:', updateError);
        throw new Error(`Failed to update rental: ${updateError.message}`);
      }

      if (!updatedRental.customer_id) {
        throw new Error('CRITICAL ERROR: Customer ID was lost during rental update!');
      }

      console.log('✅ RENTAL UPDATED SUCCESSFULLY');
      return { success: true, data: updatedRental, message: 'Rental updated successfully' };

    } catch (error) {
      console.error('❌ RENTAL UPDATE FAILED:', error);
      return { success: false, error: error.message, message: 'Failed to update rental' };
    }
  }

  /**
   * Get rental by ID with enhanced validation
   */
  async getRentalById(rentalId) {
    console.log('🔍 FETCHING RENTAL BY ID:', rentalId);
    try {
      if (!this.validateRentalId(rentalId)) {
        throw new Error(`Invalid rental ID format: ${rentalId}`);
      }
      const { data: rental, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', rentalId)
        .single();
      if (error) {
        throw new Error(`Failed to fetch rental: ${error.message}`);
      }
      return { success: true, data: rental };
    } catch (error) {
      console.error('❌ FETCH RENTAL FAILED:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete rental with validation
   */
  async deleteRental(rentalId) {
    console.log('🗑️ DELETING RENTAL:', rentalId);
    try {
      if (!this.validateRentalId(rentalId)) {
        throw new Error(`Invalid rental ID format: ${rentalId}`);
      }
      const { error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', rentalId);
      if (error) {
        throw new Error(`Failed to delete rental: ${error.message}`);
      }
      return { success: true, message: 'Rental deleted successfully' };
    } catch (error) {
      console.error('❌ DELETE RENTAL FAILED:', error);
      return { success: false, error: error.message };
    }
  }
}

export default new EnhancedTransactionalRentalService();