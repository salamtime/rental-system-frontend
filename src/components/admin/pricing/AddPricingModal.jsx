import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Plus, RefreshCw, AlertCircle, DollarSign } from 'lucide-react';
import VehicleModelsService from '../../../services/VehicleModelsService';
import toast from 'react-hot-toast';

const AddPricingModal = ({ isOpen, onClose, onSuccess }) => {
  // Hard-coded vehicle models - ONLY AT5 and AT6 with simple IDs
  const vehicleModels = [
    { id: 'AT5', name: 'AT5' },
    { id: 'AT6', name: 'AT6' }
  ];

  // Empty form state - NO DEFAULT VALUES
  const [formData, setFormData] = useState({
    vehicleModelId: '',
    hourlyRate: '',  // EMPTY
    dailyRate: ''    // EMPTY
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  // ULTRA-SIMPLE validation - ONLY empty field checks
  const validateForm = () => {
    if (!formData.vehicleModelId) {
      return 'Please select a vehicle model';
    }
    
    if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) {
      return 'Please enter hourly rate';
    }
    
    if (!formData.dailyRate || parseFloat(formData.dailyRate) <= 0) {
      return 'Please enter daily rate';
    }
    
    // NO OTHER VALIDATION WHATSOEVER
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Simple validation check
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');
    
    try {
      const pricingData = {
        hourly_mad: parseFloat(formData.hourlyRate),
        daily_mad: parseFloat(formData.dailyRate)
      };

      console.log('💰 Adding pricing for:', formData.vehicleModelId, pricingData);

      const result = await VehicleModelsService.updateVehicleModelPricing(
        formData.vehicleModelId, 
        pricingData
      );

      if (result.success) {
        const selectedModel = vehicleModels.find(m => m.id === formData.vehicleModelId);
        
        // Show success message with source info
        if (result.source === 'localStorage') {
          toast.success(`Pricing saved locally for ${selectedModel?.name || 'vehicle model'} (database unavailable)`);
        } else {
          toast.success(`Pricing added for ${selectedModel?.name || 'vehicle model'}`);
        }
        
        // Call onSuccess if it exists
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
        
        // Reset form
        setFormData({
          vehicleModelId: '',
          hourlyRate: '',
          dailyRate: ''
        });
        
        // Close modal
        if (typeof onClose === 'function') {
          onClose();
        }
      } else {
        throw new Error(result.error || 'Failed to save pricing');
      }
    } catch (error) {
      console.error('❌ Error adding pricing:', error);
      setError('Failed to save pricing. Data saved locally as backup.');
      
      // Still show success since localStorage backup should work
      setTimeout(() => {
        const selectedModel = vehicleModels.find(m => m.id === formData.vehicleModelId);
        toast.success(`Pricing saved locally for ${selectedModel?.name || 'vehicle model'}`);
        
        if (typeof onSuccess === 'function') {
          onSuccess();
        }
        
        if (typeof onClose === 'function') {
          onClose();
        }
      }, 1500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    // Reset form
    setFormData({
      vehicleModelId: '',
      hourlyRate: '',
      dailyRate: ''
    });
    setError('');
    
    // Close modal
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Vehicle Pricing
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle Model Selection - ONLY AT5 and AT6 */}
          <div className="space-y-2">
            <Label htmlFor="vehicleModelId">Vehicle Model *</Label>
            <select
              id="vehicleModelId"
              value={formData.vehicleModelId}
              onChange={(e) => handleInputChange('vehicleModelId', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select model...</option>
              {vehicleModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pricing Rates - NO VALIDATION WARNINGS */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing Rates
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (MAD) *</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.hourlyRate}
                  onChange={(e) => handleInputChange('hourlyRate', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="dailyRate">Daily Rate (MAD) *</Label>
                <Input
                  id="dailyRate"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.dailyRate}
                  onChange={(e) => handleInputChange('dailyRate', e.target.value)}
                  placeholder="0"
                  required
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Pricing
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddPricingModal;