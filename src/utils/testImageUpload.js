import { supabase } from './supabaseClient';
import { uploadImage, testStorageConnection } from './imageUpload';

/**
 * Debug utility to test image upload functionality
 */
export const debugImageUpload = async () => {
  console.log('🔧 DEBUG: Starting image upload debug test...');
  
  try {
    // Test 1: Check Supabase client
    console.log('🔧 DEBUG: Testing Supabase client...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ DEBUG: Auth error:', userError);
      return { success: false, step: 'auth', error: userError.message };
    }
    
    console.log('✅ DEBUG: Auth successful, user:', user?.email);
    
    // Test 2: Check storage connection
    console.log('🔧 DEBUG: Testing storage connection...');
    const storageTest = await testStorageConnection();
    
    if (!storageTest.success) {
      console.error('❌ DEBUG: Storage test failed:', storageTest.error);
      return { success: false, step: 'storage', error: storageTest.error };
    }
    
    console.log('✅ DEBUG: Storage connection successful');
    
    // Test 3: List existing buckets
    console.log('🔧 DEBUG: Listing storage buckets...');
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ DEBUG: Buckets list error:', bucketsError);
    } else {
      console.log('✅ DEBUG: Available buckets:', buckets.map(b => b.name));
      
      const vehicleImagesBucket = buckets.find(b => b.name === 'vehicle-images');
      if (vehicleImagesBucket) {
        console.log('✅ DEBUG: vehicle-images bucket found:', vehicleImagesBucket);
      } else {
        console.warn('⚠️ DEBUG: vehicle-images bucket NOT found');
      }
    }
    
    // Test 4: Try to create a test file
    console.log('🔧 DEBUG: Creating test file...');
    const testContent = new Blob(['test image content'], { type: 'text/plain' });
    const testFile = new File([testContent], 'test.txt', { type: 'text/plain' });
    
    try {
      const uploadResult = await uploadImage(testFile, 'debug_test');
      console.log('✅ DEBUG: Test upload successful:', uploadResult);
      
      // Clean up test file
      const { error: deleteError } = await supabase.storage
        .from('vehicle-images')
        .remove([uploadResult.storagePath]);
      
      if (deleteError) {
        console.warn('⚠️ DEBUG: Failed to clean up test file:', deleteError);
      } else {
        console.log('✅ DEBUG: Test file cleaned up');
      }
      
      return { success: true, uploadResult };
      
    } catch (uploadError) {
      console.error('❌ DEBUG: Test upload failed:', uploadError);
      return { success: false, step: 'upload', error: uploadError.message };
    }
    
  } catch (error) {
    console.error('❌ DEBUG: General error:', error);
    return { success: false, step: 'general', error: error.message };
  }
};

// Make it available globally for browser console testing
if (typeof window !== 'undefined') {
  window.debugImageUpload = debugImageUpload;
}
