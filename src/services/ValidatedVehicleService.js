import VehicleService from './VehicleService';
import dataValidator from '../utils/DataValidator';
import performanceMonitor from '../utils/PerformanceMonitor';

/**
 * Vehicle Service with comprehensive data validation and sanitization
 */
class ValidatedVehicleService {
  
  /**
   * Create vehicle with validation
   */
  static async createVehicle(vehicleData) {
    const startTime = performance.now();
    
    try {
      // Validate and sanitize input data
      const validation = dataValidator.validateEntity('vehicle', vehicleData);
      
      if (!validation.isValid) {
        const error = new Error('Vehicle validation failed');
        error.validationErrors = validation.errors;
        throw error;
      }

      // Security validation
      const securityCheck = dataValidator.validateSecurityContext('create', validation.sanitizedData);
      if (!securityCheck.isSecure) {
        const error = new Error('Security validation failed');
        error.securityErrors = securityCheck.securityErrors;
        throw error;
      }

      // Create vehicle with sanitized data
      const result = await VehicleService.createVehicle(validation.sanitizedData);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'createVehicle',
        duration,
        success: true,
        recordCount: 1
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'createVehicle',
        duration,
        success: false,
        error: error.message
      });

      performanceMonitor.recordError({
        type: 'validation',
        message: error.message,
        context: { vehicleData, validationErrors: error.validationErrors },
        severity: error.validationErrors ? 'warning' : 'error'
      });

      throw error;
    }
  }

  /**
   * Update vehicle with validation
   */
  static async updateVehicle(vehicleId, vehicleData) {
    const startTime = performance.now();
    
    try {
      // Validate vehicle ID
      const idValidation = dataValidator.validateField(vehicleId, { required: true, type: 'uuid' }, 'vehicleId');
      if (idValidation.length > 0) {
        const error = new Error('Invalid vehicle ID');
        error.validationErrors = { vehicleId: idValidation };
        throw error;
      }

      // Validate and sanitize update data
      const validation = dataValidator.validateEntity('vehicle', vehicleData);
      
      if (!validation.isValid) {
        const error = new Error('Vehicle validation failed');
        error.validationErrors = validation.errors;
        throw error;
      }

      // Security validation
      const securityCheck = dataValidator.validateSecurityContext('update', validation.sanitizedData);
      if (!securityCheck.isSecure) {
        const error = new Error('Security validation failed');
        error.securityErrors = securityCheck.securityErrors;
        throw error;
      }

      // Update vehicle with sanitized data
      const result = await VehicleService.updateVehicle(vehicleId, validation.sanitizedData);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'updateVehicle',
        duration,
        success: true,
        recordCount: 1
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'updateVehicle',
        duration,
        success: false,
        error: error.message
      });

      performanceMonitor.recordError({
        type: 'validation',
        message: error.message,
        context: { vehicleId, vehicleData, validationErrors: error.validationErrors },
        severity: error.validationErrors ? 'warning' : 'error'
      });

      throw error;
    }
  }

  /**
   * Delete vehicle with validation
   */
  static async deleteVehicle(vehicleId) {
    const startTime = performance.now();
    
    try {
      // Validate vehicle ID
      const idValidation = dataValidator.validateField(vehicleId, { required: true, type: 'uuid' }, 'vehicleId');
      if (idValidation.length > 0) {
        const error = new Error('Invalid vehicle ID');
        error.validationErrors = { vehicleId: idValidation };
        throw error;
      }

      // Security validation
      const securityCheck = dataValidator.validateSecurityContext('delete', { vehicleId });
      if (!securityCheck.isSecure) {
        const error = new Error('Security validation failed');
        error.securityErrors = securityCheck.securityErrors;
        throw error;
      }

      // Delete vehicle
      const result = await VehicleService.deleteVehicle(vehicleId);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'deleteVehicle',
        duration,
        success: true,
        recordCount: 1
      });

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'deleteVehicle',
        duration,
        success: false,
        error: error.message
      });

      performanceMonitor.recordError({
        type: 'validation',
        message: error.message,
        context: { vehicleId, validationErrors: error.validationErrors },
        severity: error.validationErrors ? 'warning' : 'error'
      });

      throw error;
    }
  }

  /**
   * Validate bulk vehicle data
   */
  static validateBulkVehicleData(vehicleDataArray) {
    const startTime = performance.now();
    
    try {
      const validation = dataValidator.validateBulkData('vehicle', vehicleDataArray);
      
      const duration = performance.now() - startTime;
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'validateBulkVehicleData',
        duration,
        success: true,
        recordCount: vehicleDataArray.length
      });

      return validation;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      performanceMonitor.recordQuery({
        service: 'vehicles',
        method: 'validateBulkVehicleData',
        duration,
        success: false,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * Get vehicle form validation schema
   */
  static getVehicleFormSchema() {
    return dataValidator.generateFormSchema('vehicle');
  }

  // Delegate read operations to original service (no validation needed for reads)
  static async getAllVehicles(filters = {}) {
    return VehicleService.getAllVehicles(filters);
  }

  static async getVehicleById(vehicleId) {
    return VehicleService.getVehicleById(vehicleId);
  }

  static async searchVehicles(searchTerm, filters = {}) {
    return VehicleService.searchVehicles(searchTerm, filters);
  }

  static async getAvailableVehicles(criteria = {}) {
    return VehicleService.getAvailableVehicles(criteria);
  }

  static async getVehicleStatistics() {
    return VehicleService.getVehicleStatistics();
  }
}

export default ValidatedVehicleService;