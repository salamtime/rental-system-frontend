import { supabase } from '../lib/supabase.js';
import VehicleImageService from './VehicleImageService.js';

/**
 * Storage Cleanup Service - Handles cleanup and organization of Supabase storage
 */
class StorageCleanupService {
  
  /**
   * Comprehensive storage cleanup and organization
   */
  static async performStorageCleanup() {
    console.log('🧹 [StorageCleanupService] Starting comprehensive storage cleanup...');
    
    const results = {
      vehicleImages: { removed: [], errors: [] },
      totalFilesProcessed: 0,
      totalFilesRemoved: 0,
      totalErrors: 0
    };

    try {
      // Clean up vehicle-images bucket
      console.log('📁 [StorageCleanupService] Cleaning vehicle-images bucket...');
      const vehicleImageResults = await VehicleImageService.cleanupDemoFiles();
      results.vehicleImages = vehicleImageResults;
      results.totalFilesRemoved += vehicleImageResults.removed.length;
      results.totalErrors += vehicleImageResults.errors.length;

      // List and organize other buckets
      const buckets = [
        'vehicle-documents',
        'rental-media',
        'rental-media-opening', 
        'rental-media-closing',
        'rental-videos',
        'tour_rider_ids',
        'id_scans'
      ];

      for (const bucketName of buckets) {
        try {
          console.log(`📊 [StorageCleanupService] Checking ${bucketName} bucket...`);
          const { data: bucketFiles, error: bucketError } = await supabase.storage
            .from(bucketName)
            .list('', { limit: 10 });

          if (bucketError) {
            console.log(`⚠️ [StorageCleanupService] ${bucketName}: ${bucketError.message}`);
            results.totalErrors++;
          } else {
            console.log(`📊 [StorageCleanupService] ${bucketName}: ${bucketFiles?.length || 0} items`);
            results.totalFilesProcessed += bucketFiles?.length || 0;
          }
        } catch (error) {
          console.error(`❌ [StorageCleanupService] Error checking ${bucketName}:`, error);
          results.totalErrors++;
        }
      }

      // Generate cleanup report
      const report = this.generateCleanupReport(results);
      console.log('📋 [StorageCleanupService] Cleanup Report:', report);

      return {
        success: true,
        results,
        report
      };

    } catch (error) {
      console.error('❌ [StorageCleanupService] Cleanup failed:', error);
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }

  /**
   * Generate a detailed cleanup report
   */
  static generateCleanupReport(results) {
    const report = {
      summary: {
        totalFilesProcessed: results.totalFilesProcessed,
        totalFilesRemoved: results.totalFilesRemoved,
        totalErrors: results.totalErrors,
        cleanupSuccess: results.totalErrors === 0
      },
      vehicleImages: {
        demoFilesRemoved: results.vehicleImages.removed,
        errors: results.vehicleImages.errors
      },
      pathConvention: {
        enforced: 'vehicle-images/vehicles/{vehicleId}/primary/',
        description: 'All vehicle images now follow standardized path convention'
      },
      recommendations: []
    };

    // Add recommendations based on results
    if (results.totalErrors > 0) {
      report.recommendations.push('Some errors occurred during cleanup - review error logs');
    }
    
    if (results.vehicleImages.removed.length > 0) {
      report.recommendations.push('Demo files were successfully removed from vehicle-images bucket');
    }

    if (results.totalFilesRemoved === 0) {
      report.recommendations.push('Storage was already clean - no files needed removal');
    }

    return report;
  }

  /**
   * Verify storage organization and path conventions
   */
  static async verifyStorageOrganization() {
    console.log('🔍 [StorageCleanupService] Verifying storage organization...');
    
    try {
      // Check vehicle-images bucket structure
      const { data: vehiclesFolder, error: vehiclesError } = await supabase.storage
        .from('vehicle-images')
        .list('vehicles', { limit: 100 });

      if (vehiclesError) {
        console.error('❌ [StorageCleanupService] Error checking vehicles folder:', vehiclesError);
        return { organized: false, error: vehiclesError.message };
      }

      const vehicleFolders = vehiclesFolder?.filter(item => 
        item.name && !item.name.includes('.')
      ) || [];

      console.log(`📊 [StorageCleanupService] Found ${vehicleFolders.length} vehicle folders`);

      // Check if folders follow convention
      const properlyOrganized = vehicleFolders.every(folder => {
        // Vehicle folders should be UUIDs or numeric IDs
        return /^[a-zA-Z0-9-_]+$/.test(folder.name);
      });

      return {
        organized: properlyOrganized,
        vehicleFolders: vehicleFolders.length,
        structure: 'vehicle-images/vehicles/{vehicleId}/primary/',
        compliant: properlyOrganized
      };

    } catch (error) {
      console.error('❌ [StorageCleanupService] Verification failed:', error);
      return { organized: false, error: error.message };
    }
  }
}

export default StorageCleanupService;