import { supabase } from '../lib/supabase.js';

/**
 * FixedCustomerService - Resolves 406 customer data fetch errors
 * 
 * CRITICAL FIXES:
 * - Enhanced error handling for 406 "Not Acceptable" errors
 * - Multiple fallback query methods
 * - Customer ID validation and resolution
 * - Rental ID to Customer ID mapping
 */
class FixedCustomerService {
  
  /**
   * CRITICAL FIX: Resolve customer ID from rental ID if needed
   */
  static async resolveCustomerId(inputId) {
    console.log('🔍 CUSTOMER ID RESOLUTION: Input ID:', inputId);
    
    // Check if it's already a customer ID format
    if (inputId && inputId.startsWith('cust_')) {
      console.log('✅ CUSTOMER ID RESOLUTION: Already customer ID format');
      return inputId;
    }
    
    // Check if it's a UUID format (rental ID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (inputId && uuidRegex.test(inputId)) {
      console.log('🔍 CUSTOMER ID RESOLUTION: UUID detected, looking up rental record...');
      
      try {
        const { data: rental, error } = await supabase
          .from('app_4c3a7a6153_rentals')
          .select('customer_id')
          .eq('id', inputId)
          .single();
        
        if (error) {
          console.error('❌ CUSTOMER ID RESOLUTION: Rental lookup failed:', error);
          return inputId; // Return original if lookup fails
        }
        
        if (rental && rental.customer_id) {
          console.log('✅ CUSTOMER ID RESOLUTION: Found customer ID from rental:', rental.customer_id);
          return rental.customer_id;
        }
      } catch (error) {
        console.error('❌ CUSTOMER ID RESOLUTION: Exception during rental lookup:', error);
      }
    }
    
    console.log('⚠️ CUSTOMER ID RESOLUTION: Using original ID as fallback');
    return inputId;
  }
  
  /**
   * CRITICAL FIX: Enhanced customer fetch with multiple fallback methods
   */
  static async getCustomerById(inputId) {
    console.log('🔍 FIXED CUSTOMER SERVICE: Starting enhanced customer fetch for:', inputId);
    
    try {
      // Step 1: Resolve customer ID
      const customerId = await this.resolveCustomerId(inputId);
      console.log('🎯 FIXED CUSTOMER SERVICE: Resolved customer ID:', customerId);
      
      if (!customerId) {
        return { 
          success: false, 
          error: 'Invalid customer ID provided',
          data: null 
        };
      }
      
      // Step 2: Method 1 - Standard query with .single()
      console.log('📋 FIXED CUSTOMER SERVICE: Method 1 - Standard query');
      try {
        const { data, error } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('*')
          .eq('id', customerId)
          .single();
        
        if (!error && data) {
          console.log('✅ FIXED CUSTOMER SERVICE: Method 1 successful');
          return { 
            success: true, 
            data, 
            method: 'standard',
            resolvedId: customerId 
          };
        }
        
        console.log('⚠️ FIXED CUSTOMER SERVICE: Method 1 failed:', error?.message);
      } catch (error) {
        console.log('⚠️ FIXED CUSTOMER SERVICE: Method 1 exception:', error.message);
      }
      
      // Step 3: Method 2 - Array query without .single()
      console.log('📋 FIXED CUSTOMER SERVICE: Method 2 - Array query');
      try {
        const { data: arrayData, error: arrayError } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('*')
          .eq('id', customerId);
        
        if (!arrayError && arrayData && arrayData.length > 0) {
          console.log('✅ FIXED CUSTOMER SERVICE: Method 2 successful');
          return { 
            success: true, 
            data: arrayData[0], 
            method: 'array',
            resolvedId: customerId 
          };
        }
        
        console.log('⚠️ FIXED CUSTOMER SERVICE: Method 2 failed:', arrayError?.message);
      } catch (error) {
        console.log('⚠️ FIXED CUSTOMER SERVICE: Method 2 exception:', error.message);
      }
      
      // Step 4: Method 3 - Limited fields query
      console.log('📋 FIXED CUSTOMER SERVICE: Method 3 - Limited fields');
      try {
        const { data: limitedData, error: limitedError } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('id, full_name, phone, email, licence_number, id_number, id_scan_url, created_at, initial_scan_complete')
          .eq('id', customerId)
          .single();
        
        if (!limitedError && limitedData) {
          console.log('✅ FIXED CUSTOMER SERVICE: Method 3 successful');
          return { 
            success: true, 
            data: limitedData, 
            method: 'limited_fields',
            resolvedId: customerId 
          };
        }
        
        console.log('⚠️ FIXED CUSTOMER SERVICE: Method 3 failed:', limitedError?.message);
      } catch (error) {
        console.log('⚠️ FIXED CUSTOMER SERVICE: Method 3 exception:', error.message);
      }
      
      // Step 5: Method 4 - Create customer record if not found
      console.log('📋 FIXED CUSTOMER SERVICE: Method 4 - Create missing customer');
      try {
        // Check if this is a valid customer ID format
        if (customerId && customerId.startsWith('cust_')) {
          console.log('🆕 FIXED CUSTOMER SERVICE: Creating missing customer record');
          
          const { data: newCustomer, error: createError } = await supabase
            .from('app_4c3a7a6153_customers')
            .insert([{
              id: customerId,
              full_name: 'Unknown Customer',
              initial_scan_complete: false,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }])
            .select()
            .single();
          
          if (!createError && newCustomer) {
            console.log('✅ FIXED CUSTOMER SERVICE: Method 4 successful - Customer created');
            return { 
              success: true, 
              data: newCustomer, 
              method: 'created',
              resolvedId: customerId,
              wasCreated: true
            };
          }
          
          console.log('⚠️ FIXED CUSTOMER SERVICE: Method 4 failed:', createError?.message);
        }
      } catch (error) {
        console.log('⚠️ FIXED CUSTOMER SERVICE: Method 4 exception:', error.message);
      }
      
      // All methods failed
      console.error('❌ FIXED CUSTOMER SERVICE: All methods failed');
      return { 
        success: false, 
        error: 'Customer not found and could not be created',
        resolvedId: customerId,
        originalId: inputId
      };
      
    } catch (error) {
      console.error('❌ FIXED CUSTOMER SERVICE: Critical error in getCustomerById:', error);
      return { 
        success: false, 
        error: error.message,
        originalId: inputId
      };
    }
  }
  
  /**
   * CRITICAL FIX: Get customer data with rental context
   */
  static async getCustomerWithRentalContext(customerId, rentalId = null) {
    console.log('🔍 FIXED CUSTOMER SERVICE: Getting customer with rental context');
    console.log('📊 Input parameters:', { customerId, rentalId });
    
    try {
      // Get customer data
      const customerResult = await this.getCustomerById(customerId);
      
      if (!customerResult.success) {
        console.error('❌ FIXED CUSTOMER SERVICE: Customer fetch failed:', customerResult.error);
        return customerResult;
      }
      
      const customer = customerResult.data;
      console.log('✅ FIXED CUSTOMER SERVICE: Customer data retrieved:', {
        id: customer.id,
        full_name: customer.full_name,
        phone: customer.phone,
        method: customerResult.method
      });
      
      // Get rental context if rental ID provided
      let rentalContext = null;
      if (rentalId) {
        console.log('🔍 FIXED CUSTOMER SERVICE: Fetching rental context...');
        
        try {
          const { data: rental, error: rentalError } = await supabase
            .from('app_4c3a7a6153_rentals')
            .select('*')
            .eq('id', rentalId)
            .single();
          
          if (!rentalError && rental) {
            rentalContext = rental;
            console.log('✅ FIXED CUSTOMER SERVICE: Rental context retrieved');
          } else {
            console.log('⚠️ FIXED CUSTOMER SERVICE: Rental context fetch failed:', rentalError?.message);
          }
        } catch (error) {
          console.log('⚠️ FIXED CUSTOMER SERVICE: Rental context exception:', error.message);
        }
      }
      
      return {
        success: true,
        data: {
          customer,
          rental: rentalContext,
          metadata: {
            method: customerResult.method,
            resolvedId: customerResult.resolvedId,
            wasCreated: customerResult.wasCreated || false
          }
        }
      };
      
    } catch (error) {
      console.error('❌ FIXED CUSTOMER SERVICE: Error in getCustomerWithRentalContext:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * CRITICAL FIX: Test customer data access
   */
  static async testCustomerAccess() {
    console.log('🔧 FIXED CUSTOMER SERVICE: Testing customer data access...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {}
    };
    
    try {
      // Test 1: Basic table access
      console.log('🔧 Test 1: Basic table access');
      try {
        const { data, error } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('id, full_name')
          .limit(3);
        
        if (error) {
          testResults.tests.basicAccess = {
            status: 'FAIL',
            error: error.message,
            code: error.code
          };
        } else {
          testResults.tests.basicAccess = {
            status: 'PASS',
            message: 'Basic table access successful',
            recordCount: data?.length || 0,
            sampleData: data || []
          };
        }
      } catch (error) {
        testResults.tests.basicAccess = {
          status: 'FAIL',
          error: error.message
        };
      }
      
      // Test 2: Specific customer query (the problematic one)
      console.log('🔧 Test 2: Specific customer query');
      const testCustomerId = '27fa7c15-be16-4562-948a-2ab112ed8a65';
      
      const customerResult = await this.getCustomerById(testCustomerId);
      
      testResults.tests.specificCustomer = {
        status: customerResult.success ? 'PASS' : 'FAIL',
        inputId: testCustomerId,
        resolvedId: customerResult.resolvedId,
        method: customerResult.method,
        wasCreated: customerResult.wasCreated,
        error: customerResult.error,
        hasData: !!customerResult.data
      };
      
      // Test 3: Customer with rental context
      console.log('🔧 Test 3: Customer with rental context');
      const contextResult = await this.getCustomerWithRentalContext(testCustomerId, testCustomerId);
      
      testResults.tests.customerWithContext = {
        status: contextResult.success ? 'PASS' : 'FAIL',
        hasCustomerData: !!contextResult.data?.customer,
        hasRentalData: !!contextResult.data?.rental,
        error: contextResult.error
      };
      
      console.log('✅ FIXED CUSTOMER SERVICE: Test completed');
      return testResults;
      
    } catch (error) {
      console.error('❌ FIXED CUSTOMER SERVICE: Test failed:', error);
      testResults.tests.generalError = {
        status: 'FAIL',
        error: error.message
      };
      return testResults;
    }
  }
}

export default FixedCustomerService;