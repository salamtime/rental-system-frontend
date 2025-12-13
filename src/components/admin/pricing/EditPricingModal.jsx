import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Edit, RefreshCw, AlertCircle, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';

const EditPricingModal = ({ isOpen, onClose, onSuccess, pricingData }) => {
  const [formData, setFormData] = useState({
    vehicleModelId: '',
    hourlyRate: '',
    dailyRate: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Update form when pricingData changes
  useEffect(() => {
    if (pricingData) {
      setFormData({
        vehicleModelId: pricingData.vehicle_model_id || '',
        hourlyRate: pricingData.hourly_mad?.toString() || '',
        dailyRate: pricingData.daily_mad?.toString() || ''
      });
    }
  }, [pricingData]);

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

  // Simple validation - only empty field checks
  const validateForm = () => {
    if (!formData.hourlyRate || parseFloat(formData.hourlyRate) <= 0) {
      return 'Please enter hourly rate';
    }
    
    if (!formData.dailyRate || parseFloat(formData.dailyRate) <= 0) {
      return 'Please enter daily rate';
    }
    
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
      const updatedPricing = {
        hourly_mad: parseFloat(formData.hourlyRate),
        daily_mad: parseFloat(formData.dailyRate)
      };

      console.log('💰 Updating pricing for:', formData.vehicleModelId, updatedPricing);

      // Save to localStorage (since we're using hardcoded data)
      localStorage.setItem(`pricing_${formData.vehicleModelId}`, JSON.stringify(updatedPricing));
      
      toast.success(`Pricing updated for ${formData.vehicleModelId}`);
      
      // Call onSuccess if it exists
      if (typeof onSuccess === 'function') {
        onSuccess();
      }
      
      // Close modal
      if (typeof onClose === 'function') {
        onClose();
      }
    } catch (error) {
      console.error('❌ Error updating pricing:', error);
      setError('Failed to update pricing. Please try again.');
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

  if (!pricingData) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit {pricingData.model_name} Pricing
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Vehicle Model Display */}
          <div className="space-y-2">
            <Label>Vehicle Model</Label>
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
              {pricingData.model_name}
            </div>
          </div>

          {/* Pricing Rates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Update Pricing Rates
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
                  Updating...
                </>
              ) : (
                <>
                  <Edit className="h-4 w-4 mr-2" />
                  Update Pricing
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditPricingModal;