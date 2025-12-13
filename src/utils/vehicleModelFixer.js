import { supabase } from './supabaseClient';
import VehicleModelsService from '../services/VehicleModelsService';

/**
 * Utility to help fix vehicles without proper model assignments
 */
export class VehicleModelFixer {
  
  /**
   * Get all vehicles without proper model assignments
   */
  static async getVehiclesWithoutModels() {
    try {
      const { data: vehicles, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*')
        .or('vehicle_model_id.is.null,vehicle_model_id.eq.""');

      if (error) {
        throw error;
      }

      return vehicles || [];
    } catch (error) {
      console.error('Error fetching vehicles without models:', error);
      throw error;
    }
  }

  /**
   * Get all available vehicle models
   */
  static async getAvailableModels() {
    try {
      const result = await VehicleModelsService.getVehicleModels();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error fetching vehicle models:', error);
      throw error;
    }
  }

  /**
   * Auto-assign models to vehicles based on their model text field
   */
  static async autoAssignModels() {
    try {
      const vehiclesWithoutModels = await this.getVehiclesWithoutModels();
      const availableModels = await this.getAvailableModels();
      
      console.log('🔍 Found vehicles without models:', vehiclesWithoutModels.length);
      console.log('📋 Available models:', availableModels.length);

      const updates = [];
      
      for (const vehicle of vehiclesWithoutModels) {
        if (vehicle.model) {
          // Try to find a matching model by label
          const matchingModel = availableModels.find(model => 
            model.label.toLowerCase() === vehicle.model.toLowerCase() ||
            model.label.toLowerCase().includes(vehicle.model.toLowerCase()) ||
            vehicle.model.toLowerCase().includes(model.label.toLowerCase())
          );

          if (matchingModel) {
            updates.push({
              vehicleId: vehicle.id,
              vehicleName: vehicle.name,
              currentModel: vehicle.model,
              assignedModelId: matchingModel.id,
              assignedModelLabel: matchingModel.label
            });
          }
        }
      }

      return {
        vehiclesWithoutModels,
        availableModels,
        suggestedUpdates: updates
      };
    } catch (error) {
      console.error('Error in autoAssignModels:', error);
      throw error;
    }
  }

  /**
   * Apply model assignments to vehicles
   */
  static async applyModelAssignments(assignments) {
    try {
      const results = [];
      
      for (const assignment of assignments) {
        try {
          const { data, error } = await supabase
            .from('saharax_0u4w4d_vehicles')
            .update({ 
              vehicle_model_id: assignment.assignedModelId,
              model: assignment.assignedModelLabel 
            })
            .eq('id', assignment.vehicleId)
            .select();

          if (error) {
            throw error;
          }

          results.push({
            success: true,
            vehicleId: assignment.vehicleId,
            vehicleName: assignment.vehicleName,
            data: data[0]
          });
        } catch (error) {
          results.push({
            success: false,
            vehicleId: assignment.vehicleId,
            vehicleName: assignment.vehicleName,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error applying model assignments:', error);
      throw error;
    }
  }

  /**
   * Create a default model if none exist
   */
  static async createDefaultModel(modelLabel = 'Standard ATV') {
    try {
      // Generate a unique ID for the model
      const modelId = `model_${Date.now()}`;
      
      const result = await VehicleModelsService.createVehicleModel({
        id: modelId,
        label: modelLabel
      });

      if (result.success) {
        // Set default pricing for the new model
        await VehicleModelsService.updateVehicleModelPricing(modelId, {
          hourly_mad: 100, // Default 100 MAD per hour
          daily_mad: 500   // Default 500 MAD per day
        });
      }

      return result;
    } catch (error) {
      console.error('Error creating default model:', error);
      throw error;
    }
  }
}

export default VehicleModelFixer;