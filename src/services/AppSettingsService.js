import TransportFeesService from './TransportFeesService';

/**
 * AppSettingsService - Manage application-wide settings
 * 
 * FIXED: Now uses localStorage-ONLY approach to completely avoid 403 errors
 * No Supabase calls are made for transport fees
 */
class AppSettingsService {
  static APP_ID = '8be2ccb1f0';
  static SETTINGS_TABLE = `app_${this.APP_ID}_settings`;
  
  // localStorage keys
  static TRANSPORT_FEES_KEY = 'mgx_transport_fees_settings';
  static SETTINGS_PREFIX = 'mgx_app_setting_';

  /**
   * Get transport fees using localStorage ONLY (no database calls)
   */
  static async getTransportFees() {
    try {
      console.log('🔧 Loading transport fees from localStorage ONLY...');
      
      // Use localStorage-only service (no database calls)
      const fees = await TransportFeesService.getTransportFees();
      console.log('✅ Transport fees loaded:', fees);
      return fees;
      
    } catch (err) {
      console.error('Error loading transport fees:', err);
      // Final fallback to legacy localStorage
      console.log('🔄 Using legacy localStorage fallback...');
      return this.getTransportFeesFromLocalStorage();
    }
  }

  /**
   * Save transport fees using localStorage ONLY (no database calls)
   */
  static async saveTransportFees(fees) {
    try {
      console.log('💾 Saving transport fees to localStorage ONLY:', fees);

      // Validate input
      if (!fees || typeof fees !== 'object') {
        throw new Error('Invalid fees object');
      }

      // Use localStorage-only service (no database calls)
      const savedFees = await TransportFeesService.saveTransportFees(fees);
      
      // Also sync to legacy localStorage key for backward compatibility
      this.syncToLocalStorage(savedFees);
      
      console.log('✅ Transport fees saved successfully:', savedFees);
      return savedFees;
    } catch (err) {
      console.error('Error saving transport fees:', err);
      
      // Final fallback to legacy localStorage
      console.log('🔄 Using legacy localStorage fallback...');
      return this.saveTransportFeesToLocalStorage(fees);
    }
  }

  /**
   * Check system status (localStorage only)
   */
  static async checkSystemStatus() {
    try {
      const results = await TransportFeesService.initialize();
      console.log('🔧 System status check completed (localStorage-only):', results);
      return results;
    } catch (err) {
      console.error('Error checking system status:', err);
      return {
        database: { status: 'DISABLED', message: 'Database disabled to prevent 403 errors' },
        localStorage: { status: 'UNKNOWN', message: 'Could not test' },
        recommendation: 'System check failed'
      };
    }
  }

  /**
   * Sync transport fees to legacy localStorage key (backward compatibility)
   */
  static syncToLocalStorage(fees) {
    try {
      if (!fees || typeof fees !== 'object') {
        console.warn('Invalid fees object for localStorage sync:', fees);
        return false;
      }

      const settingData = {
        pickup_fee: parseFloat(fees.pickup_fee) || 0,
        dropoff_fee: parseFloat(fees.dropoff_fee) || 0,
        updated_at: new Date().toISOString()
      };

      localStorage.setItem(this.TRANSPORT_FEES_KEY, JSON.stringify(settingData));
      console.log('🔄 Transport fees synced to legacy localStorage key:', settingData);
      return true;
    } catch (err) {
      console.error('Could not sync to legacy localStorage:', err);
      return false;
    }
  }

  /**
   * Get transport fees from legacy localStorage key (backward compatibility)
   */
  static getTransportFeesFromLocalStorage() {
    try {
      const stored = localStorage.getItem(this.TRANSPORT_FEES_KEY);
      
      if (stored) {
        const fees = JSON.parse(stored);
        console.log('📱 Transport fees loaded from legacy localStorage:', fees);
        return {
          pickup_fee: parseFloat(fees.pickup_fee) || 0,
          dropoff_fee: parseFloat(fees.dropoff_fee) || 0
        };
      }
      
      // Return default values if no settings found
      const defaultFees = {
        pickup_fee: 0,
        dropoff_fee: 0
      };
      
      console.log('🔧 No transport fees found, returning defaults:', defaultFees);
      return defaultFees;
    } catch (err) {
      console.error('Error loading transport fees from legacy localStorage:', err);
      // Return defaults on error
      return {
        pickup_fee: 0,
        dropoff_fee: 0
      };
    }
  }

  /**
   * Save transport fees to legacy localStorage key (fallback method)
   */
  static saveTransportFeesToLocalStorage(fees) {
    try {
      if (!fees || typeof fees !== 'object') {
        throw new Error('Invalid fees object provided');
      }

      const settingData = {
        pickup_fee: parseFloat(fees.pickup_fee) || 0,
        dropoff_fee: parseFloat(fees.dropoff_fee) || 0,
        updated_at: new Date().toISOString()
      };

      // Validate that we have valid numbers
      if (isNaN(settingData.pickup_fee) || isNaN(settingData.dropoff_fee)) {
        throw new Error('Invalid fee values - must be numbers');
      }

      localStorage.setItem(this.TRANSPORT_FEES_KEY, JSON.stringify(settingData));
      console.log('✅ Transport fees saved to legacy localStorage:', settingData);
      
      // Verify the save by reading it back
      const verification = localStorage.getItem(this.TRANSPORT_FEES_KEY);
      if (!verification) {
        throw new Error('Failed to verify localStorage save');
      }
      
      const verifiedData = JSON.parse(verification);
      console.log('✅ Verified saved data:', verifiedData);
      
      return {
        pickup_fee: settingData.pickup_fee,
        dropoff_fee: settingData.dropoff_fee
      };
    } catch (err) {
      console.error('Error saving transport fees to legacy localStorage:', err);
      throw new Error(`Failed to save transport fees: ${err.message}`);
    }
  }

  /**
   * Clear transport fees from all storage locations
   */
  static async clearTransportFees() {
    try {
      // Clear from enhanced service
      TransportFeesService.clearTransportFeesFromLocalStorage();
      
      // Clear from legacy localStorage key
      localStorage.removeItem(this.TRANSPORT_FEES_KEY);
      
      console.log('🗑️ Transport fees cleared from all storage locations');
      return true;
    } catch (err) {
      console.error('Error clearing transport fees:', err);
      return false;
    }
  }

  /**
   * Test transport fees system functionality (localStorage only)
   */
  static async testTransportFeesSystem() {
    try {
      console.log('🧪 Testing transport fees system (localStorage-only)...');
      
      // Test system initialization
      const systemStatus = await this.checkSystemStatus();
      
      // Test save and load
      const testFees = {
        pickup_fee: Math.floor(Math.random() * 100) + 10,
        dropoff_fee: Math.floor(Math.random() * 100) + 10
      };
      
      console.log('🧪 Testing with fees:', testFees);
      
      // Test save
      const savedFees = await this.saveTransportFees(testFees);
      
      // Test load
      const loadedFees = await this.getTransportFees();
      
      // Verify
      const saveLoadMatch = (
        savedFees.pickup_fee === loadedFees.pickup_fee &&
        savedFees.dropoff_fee === loadedFees.dropoff_fee
      );
      
      const results = {
        systemStatus,
        testFees,
        savedFees,
        loadedFees,
        saveLoadMatch,
        overallStatus: saveLoadMatch ? 'PASS' : 'FAIL'
      };
      
      console.log('🧪 Transport fees system test results (localStorage-only):', results);
      return results;
    } catch (err) {
      console.error('🧪 Transport fees system test failed:', err);
      return {
        overallStatus: 'FAIL',
        error: err.message
      };
    }
  }

  // Generic settings methods (unchanged)
  static async getSetting(key, defaultValue = null) {
    try {
      const storageKey = this.SETTINGS_PREFIX + key;
      const stored = localStorage.getItem(storageKey);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.value !== undefined ? parsed.value : defaultValue;
      }
      
      return defaultValue;
    } catch (err) {
      console.error(`Error getting setting ${key}:`, err);
      return defaultValue;
    }
  }

  static async saveSetting(key, value) {
    try {
      const storageKey = this.SETTINGS_PREFIX + key;
      const settingData = {
        value: value,
        updated_at: new Date().toISOString()
      };
      localStorage.setItem(storageKey, JSON.stringify(settingData));
      return value;
    } catch (err) {
      console.error(`Error saving setting ${key}:`, err);
      throw new Error(`Failed to save setting: ${err.message}`);
    }
  }

  static async getAllSettings() {
    try {
      const settings = {};
      
      // Get transport fees using the enhanced method (localStorage-only)
      settings.transport_fees = await this.getTransportFees();
      
      // Scan localStorage for other settings
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.SETTINGS_PREFIX)) {
          const settingKey = key.replace(this.SETTINGS_PREFIX, '');
          if (!settings[settingKey]) {
            const stored = localStorage.getItem(key);
            if (stored) {
              try {
                const parsed = JSON.parse(stored);
                settings[settingKey] = parsed.value;
              } catch (parseErr) {
                console.warn(`Failed to parse setting ${settingKey}:`, parseErr);
              }
            }
          }
        }
      }

      return settings;
    } catch (err) {
      console.error('Error loading all settings:', err);
      return {
        transport_fees: { pickup_fee: 0, dropoff_fee: 0 }
      };
    }
  }

  static async clearAllSettings() {
    try {
      // Clear transport fees
      await this.clearTransportFees();
      
      // Clear other localStorage settings
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.SETTINGS_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('✅ All settings cleared (localStorage-only)');
      return true;
    } catch (err) {
      console.error('Error clearing settings:', err);
      return false;
    }
  }

  // Legacy methods (kept for backward compatibility)
  static async getTransportFeesFromSupabase() {
    console.log('⚠️ Legacy method called, redirected to localStorage-only service');
    return this.getTransportFees();
  }

  static async saveTransportFeesToSupabase(fees) {
    console.log('⚠️ Legacy method called, redirected to localStorage-only service');
    return this.saveTransportFees(fees);
  }
}

export default AppSettingsService;