/**
 * Unified Customer Service for MGX Schema
 * Handles customer management with enhanced OCR integration
 */

import { supabase } from '../lib/supabase';

class UnifiedCustomerService {
  constructor() {
    this.tableName = 'app_4c3a7a6153_customers';
  }

  /**
   * Create a new customer with proper error handling and data validation
   */
  async createCustomer(customerData) {
    try {
      console.log('🔄 Creating new customer:', customerData);

      // Ensure required fields and proper data types
      const sanitizedData = this.sanitizeCustomerData(customerData);
      
      // Validate required fields before creation
      if (!sanitizedData.full_name || sanitizedData.full_name.trim() === '') {
        console.warn('⚠️ No full_name provided, using fallback');
        sanitizedData.full_name = this.constructFullName(sanitizedData) || 'Unknown Customer';
      }

      console.log('🧹 Final sanitized data for creation:', sanitizedData);
      
      const { data, error } = await supabase
        .from(this.tableName)
        .insert([sanitizedData])
        .select()
        .single();

      if (error) {
        console.error('❌ Customer creation error:', error);
        throw new Error(`Failed to create customer: ${error.message}`);
      }

      console.log('✅ Customer created successfully:', data.id);
      return { success: true, data, error: null };
      
    } catch (error) {
      console.error('❌ Customer creation failed:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Update existing customer with proper error handling and data validation
   */
  async updateCustomer(customerId, customerData) {
    try {
      console.log('🔄 Updating customer:', customerId, customerData);

      // Ensure required fields and proper data types
      const sanitizedData = this.sanitizeCustomerData(customerData);
      
      // Remove id from update data to prevent conflicts
      delete sanitizedData.id;
      
      // Ensure full_name is never null
      if (!sanitizedData.full_name || sanitizedData.full_name.trim() === '') {
        console.warn('⚠️ No full_name provided for update, using fallback');
        sanitizedData.full_name = this.constructFullName(sanitizedData) || 'Unknown Customer';
      }

      console.log('🧹 Final sanitized data for update:', sanitizedData);
      
      // First try to update existing customer
      const { data: updateData, error: updateError } = await supabase
        .from(this.tableName)
        .update(sanitizedData)
        .eq('id', customerId)
        .select();

      if (updateError) {
        console.error('❌ Customer update error:', updateError);
        
        // If customer doesn't exist (PGRST116 or no rows), try to create it
        if (updateError.code === 'PGRST116' || updateData?.length === 0) {
          console.log('🔄 Customer not found, creating new customer...');
          sanitizedData.id = customerId;
          return await this.createCustomer(sanitizedData);
        }
        
        throw new Error(`Failed to update customer: ${updateError.message}`);
      }

      // Check if update actually affected any rows
      if (!updateData || updateData.length === 0) {
        console.log('🔄 No existing customer found, creating new customer...');
        sanitizedData.id = customerId;
        return await this.createCustomer(sanitizedData);
      }

      console.log('✅ Customer updated successfully:', updateData[0].id);
      return { success: true, data: updateData[0], error: null };
      
    } catch (error) {
      console.error('❌ Customer update failed:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Get customer by ID with error handling
   */
  async getCustomer(customerId) {
    try {
      console.log('🔍 Fetching customer:', customerId);

      const { data, error } = await supabase
        .from(this.tableName)
        .select('*')
        .eq('id', customerId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          console.log('ℹ️ Customer not found:', customerId);
          return { success: false, data: null, error: 'Customer not found' };
        }
        
        console.error('❌ Customer fetch error:', error);
        throw new Error(`Failed to fetch customer: ${error.message}`);
      }

      console.log('✅ Customer fetched successfully:', data.id);
      return { success: true, data, error: null };
      
    } catch (error) {
      console.error('❌ Customer fetch failed:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * List all customers with pagination
   */
  async listCustomers(limit = 50, offset = 0) {
    try {
      console.log('🔍 Listing customers with limit:', limit, 'offset:', offset);

      const { data, error, count } = await supabase
        .from(this.tableName)
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('❌ Customer list error:', error);
        throw new Error(`Failed to list customers: ${error.message}`);
      }

      console.log('✅ Customers listed successfully, count:', count);
      return { success: true, data, count, error: null };
      
    } catch (error) {
      console.error('❌ Customer list failed:', error);
      return { success: false, data: null, count: 0, error: error.message };
    }
  }

  /**
   * Delete customer by ID
   */
  async deleteCustomer(customerId) {
    try {
      console.log('🗑️ Deleting customer:', customerId);

      const { data, error } = await supabase
        .from(this.tableName)
        .delete()
        .eq('id', customerId)
        .select()
        .single();

      if (error) {
        console.error('❌ Customer deletion error:', error);
        throw new Error(`Failed to delete customer: ${error.message}`);
      }

      console.log('✅ Customer deleted successfully:', customerId);
      return { success: true, data, error: null };
      
    } catch (error) {
      console.error('❌ Customer deletion failed:', error);
      return { success: false, data: null, error: error.message };
    }
  }

  /**
   * Construct full name from component parts
   */
  constructFullName(data) {
    const nameParts = [];
    
    // Try different name field combinations
    if (data.first_name) nameParts.push(data.first_name.trim());
    if (data.middle_name) nameParts.push(data.middle_name.trim());
    if (data.last_name) nameParts.push(data.last_name.trim());
    
    // If no component names, try other fields
    if (nameParts.length === 0) {
      if (data.given_name) nameParts.push(data.given_name.trim());
      if (data.family_name) nameParts.push(data.family_name.trim());
    }
    
    // If still no name parts, try raw_name
    if (nameParts.length === 0 && data.raw_name) {
      return data.raw_name.trim();
    }
    
    return nameParts.length > 0 ? nameParts.join(' ') : null;
  }

  /**
   * Sanitize and validate customer data before database operations
   * Only include fields that exist in the actual database schema
   */
  sanitizeCustomerData(rawData) {
    const sanitized = {};

    // Handle ID field
    if (rawData.id) {
      sanitized.id = String(rawData.id);
    }

    // Handle text fields - ONLY include fields that exist in the database schema
    const textFields = [
      // Core fields that exist in the database
      'full_name', 'email', 'phone', 'address', 'nationality',
      'id_number', 'licence_number', 'place_of_birth',
      'raw_name', 'given_name', 'family_name', 'document_number',
      'gender', 'issuing_authority', 'mrz', 'document_type', 'country',
      // Recently added fields
      'first_name', 'last_name', 'middle_name', 'city', 'postal_code'
    ];

    textFields.forEach(field => {
      if (rawData[field] !== undefined && rawData[field] !== null && rawData[field] !== '') {
        sanitized[field] = String(rawData[field]).trim();
      }
    });

    // Special handling for full_name - ensure it's never empty
    if (!sanitized.full_name || sanitized.full_name.trim() === '') {
      const constructedName = this.constructFullName(sanitized);
      if (constructedName) {
        sanitized.full_name = constructedName;
      }
    }

    // Handle date fields with validation
    const dateFields = [
      'date_of_birth', 'licence_issue_date', 'licence_expiry_date',
      'issue_date', 'expiry_date'
    ];

    dateFields.forEach(field => {
      if (rawData[field] !== undefined && rawData[field] !== null && rawData[field] !== '') {
        const dateStr = String(rawData[field]).trim();
        if (this.isValidDate(dateStr)) {
          sanitized[field] = dateStr;
        } else {
          console.warn(`⚠️ Invalid date format for ${field}:`, dateStr);
        }
      }
    });

    // Handle numeric fields
    if (rawData.confidence_estimate !== undefined && rawData.confidence_estimate !== null) {
      const confidence = parseFloat(rawData.confidence_estimate);
      if (!isNaN(confidence) && confidence >= 0 && confidence <= 1) {
        sanitized.confidence_estimate = confidence;
      }
    }

    // Handle URL field
    if (rawData.id_scan_url) {
      sanitized.id_scan_url = String(rawData.id_scan_url);
    }

    // Handle timestamps
    if (rawData.created_at) {
      sanitized.created_at = rawData.created_at;
    } else if (!rawData.id) {
      // Only set created_at for new records
      sanitized.created_at = new Date().toISOString();
    }

    if (rawData.updated_at || Object.keys(sanitized).length > 1) {
      sanitized.updated_at = new Date().toISOString();
    }

    console.log('🧹 Sanitized customer data:', sanitized);
    return sanitized;
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  isValidDate(dateString) {
    if (!dateString) return false;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) return false;
    
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date.toISOString().slice(0, 10) === dateString;
  }

  /**
   * Generate unique customer ID
   */
  generateCustomerId() {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 11);
    return `cust_${timestamp}_${randomStr}`;
  }

  /**
   * Process OCR extracted data and save to customer record
   */
  async processOCRData(extractedData, customerId = null) {
    try {
      console.log('🔄 Processing OCR data:', extractedData);

      // Generate customer ID if not provided
      const targetCustomerId = customerId || this.generateCustomerId();

      // Map OCR extracted data to customer schema with enhanced fallbacks
      const customerData = {
        id: targetCustomerId,
        full_name: extractedData.full_name || extractedData.raw_name || null,
        raw_name: extractedData.raw_name || null,
        given_name: extractedData.given_name || null,
        family_name: extractedData.family_name || null,
        first_name: extractedData.first_name || extractedData.given_name || null,
        last_name: extractedData.last_name || extractedData.family_name || null,
        middle_name: extractedData.middle_name || null,
        date_of_birth: extractedData.date_of_birth || null,
        place_of_birth: extractedData.place_of_birth || null,
        id_number: extractedData.document_number || extractedData.id_number || null,
        document_number: extractedData.document_number || null,
        licence_number: extractedData.document_type === 'driver_license' ? extractedData.document_number : null,
        licence_issue_date: extractedData.issue_date || null,
        licence_expiry_date: extractedData.expiry_date || null,
        issue_date: extractedData.issue_date || null,
        expiry_date: extractedData.expiry_date || null,
        nationality: extractedData.nationality || extractedData.country || 'Moroccan',
        country: extractedData.country || null,
        gender: extractedData.gender || null,
        issuing_authority: extractedData.issuing_authority || null,
        mrz: extractedData.mrz || null,
        document_type: extractedData.document_type || null,
        confidence_estimate: extractedData.confidence_estimate || null,
        address: extractedData.address || null,
        city: extractedData.city || null,
        postal_code: extractedData.postal_code || null
      };

      // Ensure full_name is never null by constructing it if needed
      if (!customerData.full_name || customerData.full_name.trim() === '') {
        const constructedName = this.constructFullName(customerData);
        if (constructedName) {
          customerData.full_name = constructedName;
        } else {
          // Final fallback
          customerData.full_name = `Customer ${targetCustomerId.split('_')[1]}`;
        }
      }

      console.log('📋 Mapped customer data:', customerData);

      // Try to update existing customer, create if not found
      const result = await this.updateCustomer(targetCustomerId, customerData);
      
      if (result.success) {
        console.log('✅ OCR data processed and saved successfully');
        return { success: true, customerId: targetCustomerId, data: result.data };
      } else {
        throw new Error(result.error);
      }
      
    } catch (error) {
      console.error('❌ OCR data processing failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate extracted MGX data
   */
  validateExtractedData(data) {
    const errors = [];
    
    if (!data.full_name && !data.raw_name && !data.first_name && !data.given_name) {
      errors.push('At least one name field is required (full_name, raw_name, first_name, or given_name)');
    }
    
    if (!data.document_number && !data.id_number) {
      errors.push('Document number or ID number is required');
    }
    
    // Date validation
    if (data.date_of_birth && !this.isValidDate(data.date_of_birth)) {
      errors.push('Invalid date of birth format. Expected YYYY-MM-DD');
    }
    
    if (data.issue_date && !this.isValidDate(data.issue_date)) {
      errors.push('Invalid issue date format. Expected YYYY-MM-DD');
    }
    
    if (data.expiry_date && !this.isValidDate(data.expiry_date)) {
      errors.push('Invalid expiry date format. Expected YYYY-MM-DD');
    }
    
    // Confidence validation
    if (data.confidence_estimate && (data.confidence_estimate < 0 || data.confidence_estimate > 1)) {
      errors.push('Confidence estimate must be between 0.0 and 1.0');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Save ID scan image to Supabase Storage and return URL
   */
  async saveIdScanImage(imageFile, customerId) {
    try {
      console.log('🖼️ Saving ID scan image for customer:', customerId);

      if (!imageFile) {
        console.warn('⚠️ No image file provided');
        return { success: false, error: 'No image file provided' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileExtension = imageFile.name.split('.').pop() || 'jpg';
      const fileName = `idscan_${timestamp}.${fileExtension}`;
      const filePath = `${customerId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('id_scans')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('❌ Image upload error:', error);
        throw new Error(`Failed to upload image: ${error.message}`);
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('id_scans')
        .getPublicUrl(filePath);

      console.log('✅ ID scan image saved successfully:', publicUrl);
      return { success: true, url: publicUrl, path: filePath };

    } catch (error) {
      console.error('❌ ID scan image save failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Upsert customer with OCR data and image
   */
  async upsertCustomer(customerData, imageFile = null, minConfidence = 0.7) {
    try {
      console.log('🔄 Upserting customer with OCR data and image...');

      // Generate customer ID if not provided
      const customerId = customerData.id || this.generateCustomerId();

      // Save image if provided
      let imageUrl = null;
      if (imageFile) {
        const imageResult = await this.saveIdScanImage(imageFile, customerId);
        if (imageResult.success) {
          imageUrl = imageResult.url;
          customerData.id_scan_url = imageUrl;
        } else {
          console.warn('⚠️ Failed to save image, continuing without it:', imageResult.error);
        }
      }

      // Process customer data
      const processedData = {
        ...customerData,
        id: customerId,
        id_scan_url: imageUrl || customerData.id_scan_url
      };

      // Ensure full_name is never null
      if (!processedData.full_name || processedData.full_name.trim() === '') {
        const constructedName = this.constructFullName(processedData);
        if (constructedName) {
          processedData.full_name = constructedName;
        } else {
          processedData.full_name = `Customer ${customerId.split('_')[1]}`;
        }
      }

      // Save to database
      const result = await this.updateCustomer(customerId, processedData);

      if (result.success) {
        console.log('✅ Customer upserted successfully with image');
        return { success: true, data: result.data, imageUrl };
      } else {
        throw new Error(result.error);
      }

    } catch (error) {
      console.error('❌ Customer upsert failed:', error);
      return { success: false, error: error.message };
    }
  }
}

// Export singleton instance
export const unifiedCustomerService = new UnifiedCustomerService();
export default unifiedCustomerService;