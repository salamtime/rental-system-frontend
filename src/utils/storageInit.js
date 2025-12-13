import { supabase } from './supabaseClient';
import { runFullStorageSetup } from './storageSetup';

/**
 * Initialize storage system
 * This function should be called once during app startup
 */
export const initializeStorage = async () => {
  console.group('🔌 Initializing Storage System');
  try {
    console.log('🔄 Starting storage initialization...');
    
    // 1. Check if Supabase client is initialized
    if (!supabase) {
      console.error('❌ Supabase client not initialized');
      return {
        success: false,
        message: 'Supabase client is not initialized'
      };
    }
    console.log('✅ Supabase client is available');
    
    // 2. Check if Storage API is available
    if (!supabase.storage) {
      console.error('❌ Supabase Storage API not available');
      return {
        success: false,
        message: 'Storage API not available'
      };
    }
    console.log('✅ Supabase Storage API is available');
    
    // 3. Run the full storage setup
    console.log('🔄 Running full storage setup...');
    const setupResult = await runFullStorageSetup();
    
    if (!setupResult.success) {
      console.error('❌ Storage setup failed:', setupResult.error);
      return {
        success: false,
        message: `Storage setup failed: ${setupResult.error}`,
        error: setupResult.error
      };
    }
    
    console.log('✅ Storage system initialized successfully');
    return {
      success: true,
      message: 'Storage system initialized successfully'
    };
  } catch (error) {
    console.error('❌ Storage initialization error:', error);
    return {
      success: false,
      message: `Storage initialization error: ${error.message}`,
      error: error
    };
  } finally {
    console.groupEnd();
  }
};

// Make function available globally for testing in browser console
if (typeof window !== 'undefined') {
  window.initializeStorage = initializeStorage;
}

export default initializeStorage;