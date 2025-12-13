import { supabase } from '../lib/supabase.js';

/**
 * CustomerDiagnosticService - Diagnose and fix customer data fetch issues
 */
class CustomerDiagnosticService {
  
  /**
   * Run comprehensive diagnostics for customer data access
   */
  static async runCustomerDiagnostics() {
    console.log('🔧 CUSTOMER DIAGNOSTIC: Starting comprehensive customer data diagnostics...');
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      tests: {},
      recommendations: []
    };
    
    try {
      // Test 1: Basic Supabase Connection
      console.log('🔧 Testing basic Supabase connection...');
      try {
        const { data: connectionTest, error: connectionError } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('count', { count: 'exact', head: true });
        
        if (connectionError) {
          diagnostics.tests.supabaseConnection = {
            status: 'FAIL',
            error: connectionError.message,
            code: connectionError.code
          };
          diagnostics.recommendations.push('Check Supabase credentials and project configuration');
        } else {
          diagnostics.tests.supabaseConnection = {
            status: 'PASS',
            message: 'Supabase connection successful'
          };
        }
      } catch (error) {
        diagnostics.tests.supabaseConnection = {
          status: 'FAIL',
          error: error.message
        };
      }
      
      // Test 2: Table Access Permissions
      console.log('🔧 Testing customer table access permissions...');
      try {
        const { data: tableTest, error: tableError } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('id')
          .limit(1);
        
        if (tableError) {
          diagnostics.tests.tableAccess = {
            status: 'FAIL',
            error: tableError.message,
            code: tableError.code,
            details: tableError.details
          };
          
          if (tableError.code === '42P01') {
            diagnostics.recommendations.push('Table "app_4c3a7a6153_customers" does not exist - check table name');
          } else if (tableError.code === '42501') {
            diagnostics.recommendations.push('Permission denied - check RLS policies and authentication');
          }
        } else {
          diagnostics.tests.tableAccess = {
            status: 'PASS',
            message: 'Table access successful',
            recordCount: tableTest?.length || 0
          };
        }
      } catch (error) {
        diagnostics.tests.tableAccess = {
          status: 'FAIL',
          error: error.message
        };
      }
      
      // Test 3: Specific Customer Query (the failing one)
      console.log('🔧 Testing specific customer query that was failing...');
      const testCustomerId = '27fa7c15-be16-4562-948a-2ab112ed8a65';
      try {
        const { data: customerTest, error: customerError } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('*')
          .eq('id', testCustomerId)
          .single();
        
        if (customerError) {
          diagnostics.tests.specificCustomerQuery = {
            status: 'FAIL',
            error: customerError.message,
            code: customerError.code,
            details: customerError.details,
            testCustomerId: testCustomerId
          };
          
          if (customerError.code === 'PGRST116') {
            diagnostics.recommendations.push('Customer not found - check if customer ID exists in database');
          } else if (customerError.code === 'PGRST301') {
            diagnostics.recommendations.push('Multiple rows returned - remove .single() or add more specific filters');
          }
        } else {
          diagnostics.tests.specificCustomerQuery = {
            status: 'PASS',
            message: 'Specific customer query successful',
            customerFound: !!customerTest,
            customerData: customerTest ? {
              id: customerTest.id,
              full_name: customerTest.full_name,
              phone: customerTest.phone
            } : null
          };
        }
      } catch (error) {
        diagnostics.tests.specificCustomerQuery = {
          status: 'FAIL',
          error: error.message
        };
      }
      
      // Test 4: Alternative Query Formats
      console.log('🔧 Testing alternative query formats...');
      try {
        // Test without .single()
        const { data: altTest1, error: altError1 } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('*')
          .eq('id', testCustomerId);
        
        if (altError1) {
          diagnostics.tests.alternativeQuery1 = {
            status: 'FAIL',
            error: altError1.message,
            code: altError1.code
          };
        } else {
          diagnostics.tests.alternativeQuery1 = {
            status: 'PASS',
            message: 'Alternative query (without .single()) successful',
            resultCount: altTest1?.length || 0
          };
        }
        
        // Test with limited fields
        const { data: altTest2, error: altError2 } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('id, full_name, phone, email')
          .eq('id', testCustomerId)
          .single();
        
        if (altError2) {
          diagnostics.tests.alternativeQuery2 = {
            status: 'FAIL',
            error: altError2.message,
            code: altError2.code
          };
        } else {
          diagnostics.tests.alternativeQuery2 = {
            status: 'PASS',
            message: 'Alternative query (limited fields) successful',
            customerFound: !!altTest2
          };
        }
      } catch (error) {
        diagnostics.tests.alternativeQueries = {
          status: 'FAIL',
          error: error.message
        };
      }
      
      // Test 5: Check for any customers in the table
      console.log('🔧 Checking for any customers in the table...');
      try {
        const { data: anyCustomers, error: anyError } = await supabase
          .from('app_4c3a7a6153_customers')
          .select('id, full_name')
          .limit(5);
        
        if (anyError) {
          diagnostics.tests.anyCustomersCheck = {
            status: 'FAIL',
            error: anyError.message,
            code: anyError.code
          };
        } else {
          diagnostics.tests.anyCustomersCheck = {
            status: 'PASS',
            message: 'Successfully queried customers table',
            totalCustomers: anyCustomers?.length || 0,
            sampleCustomers: anyCustomers || []
          };
        }
      } catch (error) {
        diagnostics.tests.anyCustomersCheck = {
          status: 'FAIL',
          error: error.message
        };
      }
      
      // Test 6: Check Supabase Client Configuration
      console.log('🔧 Checking Supabase client configuration...');
      try {
        const supabaseUrl = supabase.supabaseUrl;
        const supabaseKey = supabase.supabaseKey;
        
        diagnostics.tests.supabaseConfig = {
          status: 'INFO',
          supabaseUrl: supabaseUrl || 'Not configured',
          hasApiKey: !!supabaseKey,
          keyLength: supabaseKey ? supabaseKey.length : 0
        };
      } catch (error) {
        diagnostics.tests.supabaseConfig = {
          status: 'FAIL',
          error: error.message
        };
      }
      
      console.log('✅ CUSTOMER DIAGNOSTIC: Diagnostics completed:', diagnostics);
      return diagnostics;
      
    } catch (error) {
      console.error('❌ CUSTOMER DIAGNOSTIC: Diagnostics failed:', error);
      diagnostics.tests.generalError = {
        status: 'FAIL',
        error: error.message
      };
      return diagnostics;
    }
  }
  
  /**
   * Test customer fetch with enhanced error handling
   */
  static async testCustomerFetch(customerId) {
    console.log('🔧 CUSTOMER DIAGNOSTIC: Testing customer fetch for ID:', customerId);
    
    try {
      // Method 1: Standard query
      console.log('📋 Method 1: Standard query with .single()');
      const { data: method1Data, error: method1Error } = await supabase
        .from('app_4c3a7a6153_customers')
        .select('*')
        .eq('id', customerId)
        .single();
      
      if (method1Error) {
        console.error('❌ Method 1 failed:', method1Error);
      } else {
        console.log('✅ Method 1 success:', method1Data);
        return { success: true, data: method1Data, method: 'standard' };
      }
      
      // Method 2: Query without .single()
      console.log('📋 Method 2: Query without .single()');
      const { data: method2Data, error: method2Error } = await supabase
        .from('app_4c3a7a6153_customers')
        .select('*')
        .eq('id', customerId);
      
      if (method2Error) {
        console.error('❌ Method 2 failed:', method2Error);
      } else {
        console.log('✅ Method 2 success:', method2Data);
        if (method2Data && method2Data.length > 0) {
          return { success: true, data: method2Data[0], method: 'array_first' };
        }
      }
      
      // Method 3: Query with limited fields
      console.log('📋 Method 3: Query with limited fields');
      const { data: method3Data, error: method3Error } = await supabase
        .from('app_4c3a7a6153_customers')
        .select('id, full_name, phone, email, licence_number, id_number, id_scan_url')
        .eq('id', customerId)
        .single();
      
      if (method3Error) {
        console.error('❌ Method 3 failed:', method3Error);
      } else {
        console.log('✅ Method 3 success:', method3Data);
        return { success: true, data: method3Data, method: 'limited_fields' };
      }
      
      return { 
        success: false, 
        error: 'All methods failed',
        errors: {
          method1: method1Error,
          method2: method2Error,
          method3: method3Error
        }
      };
      
    } catch (error) {
      console.error('❌ CUSTOMER DIAGNOSTIC: Test customer fetch failed:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Fix customer service with enhanced error handling
   */
  static async createFixedCustomerService() {
    console.log('🔧 CUSTOMER DIAGNOSTIC: Creating fixed customer service...');
    
    const fixedService = {
      // Enhanced customer fetch with multiple fallback methods
      async getCustomerById(customerId) {
        console.log('🔍 FIXED CUSTOMER SERVICE: Fetching customer by ID:', customerId);
        
        try {
          // Method 1: Try standard query first
          const { data, error } = await supabase
            .from('app_4c3a7a6153_customers')
            .select('*')
            .eq('id', customerId)
            .single();
          
          if (!error && data) {
            console.log('✅ FIXED CUSTOMER SERVICE: Standard query successful');
            return { success: true, data, method: 'standard' };
          }
          
          // Method 2: Fallback to array query
          console.log('⚠️ FIXED CUSTOMER SERVICE: Standard query failed, trying array method');
          const { data: arrayData, error: arrayError } = await supabase
            .from('app_4c3a7a6153_customers')
            .select('*')
            .eq('id', customerId);
          
          if (!arrayError && arrayData && arrayData.length > 0) {
            console.log('✅ FIXED CUSTOMER SERVICE: Array query successful');
            return { success: true, data: arrayData[0], method: 'array' };
          }
          
          // Method 3: Try with limited fields
          console.log('⚠️ FIXED CUSTOMER SERVICE: Array query failed, trying limited fields');
          const { data: limitedData, error: limitedError } = await supabase
            .from('app_4c3a7a6153_customers')
            .select('id, full_name, phone, email, licence_number, id_number, id_scan_url, created_at')
            .eq('id', customerId)
            .single();
          
          if (!limitedError && limitedData) {
            console.log('✅ FIXED CUSTOMER SERVICE: Limited fields query successful');
            return { success: true, data: limitedData, method: 'limited' };
          }
          
          // All methods failed
          console.error('❌ FIXED CUSTOMER SERVICE: All query methods failed');
          return { 
            success: false, 
            error: 'Customer not found or access denied',
            details: { error, arrayError, limitedError }
          };
          
        } catch (error) {
          console.error('❌ FIXED CUSTOMER SERVICE: Exception in getCustomerById:', error);
          return { success: false, error: error.message };
        }
      },
      
      // Enhanced customer list fetch
      async getAllCustomers() {
        console.log('🔍 FIXED CUSTOMER SERVICE: Fetching all customers');
        
        try {
          const { data, error } = await supabase
            .from('app_4c3a7a6153_customers')
            .select('*')
            .order('created_at', { ascending: false });
          
          if (error) {
            console.error('❌ FIXED CUSTOMER SERVICE: Failed to fetch customers:', error);
            return { success: false, error: error.message };
          }
          
          console.log('✅ FIXED CUSTOMER SERVICE: Successfully fetched customers:', data?.length || 0);
          return { success: true, data: data || [] };
          
        } catch (error) {
          console.error('❌ FIXED CUSTOMER SERVICE: Exception in getAllCustomers:', error);
          return { success: false, error: error.message };
        }
      }
    };
    
    return fixedService;
  }
}

export default CustomerDiagnosticService;