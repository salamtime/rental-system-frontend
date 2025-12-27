import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Car, Plus, RefreshCw, AlertCircle, Shield, FileText, DollarSign } from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import VehicleModelsService from '../../services/VehicleModelsService';
import toast from 'react-hot-toast';

const AddVehicleModal = ({ isOpen, onClose, onSuccess }) => {
  // Console log for canonical path identification
  console.log('VEHICLE_FORM_CANONICAL_PATH: /workspace/react_template/src/components/fleet/AddVehicleModal.jsx');

  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    model: '',
    vehicle_model_id: '', // Added for pricing integration
    year: new Date().getFullYear(),
    plate_number: '',
    vin_number: '',
    registration_number: '',
    status: 'Available',
    hire_date: '',
    last_service_date: '',
    next_service_due: '',
    insurance_expiry_date: '',
    odometer_reading: 0,
    fuel_level: 100,
    notes: '',
    // Insurance fields
    insurance_policy_number: '',
    insurance_provider: '',
    // Registration fields (registration_number already exists above)
    registration_expiry_date: '',
    // Acquisition fields
    purchase_cost_mad: '',
    purchase_date: '',
    purchase_supplier: '',
    purchase_invoice_url: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [plateError, setPlateError] = useState('');
  const [vehicleModels, setVehicleModels] = useState([]);
  const [loadingModels, setLoadingModels] = useState(true);

  // Load vehicle models on component mount
  useEffect(() => {
    const loadVehicleModels = async () => {
      try {
        setLoadingModels(true);
        const result = await VehicleModelsService.getVehicleModels();
        if (result.success) {
          setVehicleModels(result.data);
        } else {
          console.error('Failed to load vehicle models:', result.error);
          toast.error('Failed to load vehicle models');
        }
      } catch (error) {
        console.error('Error loading vehicle models:', error);
        toast.error('Error loading vehicle models');
      } finally {
        setLoadingModels(false);
      }
    };

    if (isOpen) {
      loadVehicleModels();
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear plate error when user starts typing
    if (field === 'plate_number' && plateError) {
      setPlateError('');
    }

    // Update model field when vehicle_model_id changes
    if (field === 'vehicle_model_id') {
      const selectedModel = vehicleModels.find(model => model.id === value);
      setFormData(prev => ({
        ...prev,
        model: selectedModel ? selectedModel.label : ''
      }));
    }
  };

  // Validate plate number uniqueness
  const validatePlateNumber = async (plateNumber) => {
    if (!plateNumber.trim()) {
      setPlateError('Plate number is required.');
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('id')
        .eq('plate_number', plateNumber.trim())
        .limit(1);

      if (error) {
        console.error('Error checking plate number:', error);
        return true; // Allow submission if we can't check
      }

      if (data && data.length > 0) {
        setPlateError('This plate number is already assigned to another vehicle.');
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error validating plate number:', error);
      return true; // Allow submission if validation fails
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Enhanced validation
    if (!formData.name || !formData.brand || !formData.vehicle_model_id || !formData.plate_number) {
      toast.error('Please fill in all required fields: name, brand, model, and plate number');
      return;
    }

    // Validate plate number
    const isPlateValid = await validatePlateNumber(formData.plate_number);
    if (!isPlateValid) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const vehicleData = {
        ...formData,
        year: parseInt(formData.year),
        odometer_reading: parseFloat(formData.odometer_reading) || 0,
        fuel_level: parseInt(formData.fuel_level) || 100,
        hire_date: formData.hire_date || null,
        last_service_date: formData.last_service_date || null,
        next_service_due: formData.next_service_due || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        plate_number: formData.plate_number.trim(),
        // Process insurance fields
        insurance_policy_number: formData.insurance_policy_number.trim() || null,
        insurance_provider: formData.insurance_provider.trim() || null,
        // Process registration fields
        registration_number: formData.registration_number.trim() || null,
        registration_expiry_date: formData.registration_expiry_date || null,
        // Process acquisition fields
        purchase_cost_mad: formData.purchase_cost_mad ? parseFloat(formData.purchase_cost_mad) : null,
        purchase_date: formData.purchase_date || null,
        purchase_supplier: formData.purchase_supplier.trim() || null,
        purchase_invoice_url: formData.purchase_invoice_url.trim() || null
      };

      console.log('🚀 Creating vehicle with data:', vehicleData);

      const { error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .insert([vehicleData]);

      if (error) {
        // Handle specific constraint violations
        if (error.code === '23505' && error.message.includes('plate_number')) {
          setPlateError('This plate number is already assigned to another vehicle.');
          return;
        }
        throw error;
      }

      toast.success('Vehicle added successfully');
      onSuccess();
      
      // Reset form
      setFormData({
        name: '',
        brand: '',
        model: '',
        vehicle_model_id: '',
        year: new Date().getFullYear(),
        plate_number: '',
        vin_number: '',
        registration_number: '',
        status: 'Available',
        hire_date: '',
        last_service_date: '',
        next_service_due: '',
        insurance_expiry_date: '',
        odometer_reading: 0,
        fuel_level: 100,
        notes: '',
        insurance_policy_number: '',
        insurance_provider: '',
        registration_expiry_date: '',
        purchase_cost_mad: '',
        purchase_date: '',
        purchase_supplier: '',
        purchase_invoice_url: ''
      });
      setPlateError('');
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast.error(`Failed to add vehicle: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add New Vehicle
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Vehicle Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., AT5 Segway"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="brand">Brand *</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  placeholder="e.g., Segway"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vehicle_model_id">Model *</Label>
                {loadingModels ? (
                  <div className="flex items-center justify-center p-2 border rounded">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Loading models...
                  </div>
                ) : (
                  <select
                    id="vehicle_model_id"
                    value={formData.vehicle_model_id}
                    onChange={(e) => handleInputChange('vehicle_model_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select a model...</option>
                    {vehicleModels.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                )}
                {!loadingModels && vehicleModels.length === 0 && (
                  <div className="text-sm text-amber-600 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    No vehicle models found. Please add models in the pricing section first.
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  min="1900"
                  max="2050"
                  value={formData.year}
                  onChange={(e) => handleInputChange('year', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Legal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Legal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="plate_number">Plate Number *</Label>
                <Input
                  id="plate_number"
                  value={formData.plate_number}
                  onChange={(e) => handleInputChange('plate_number', e.target.value)}
                  placeholder="e.g., TNG-2025-001"
                  required
                  className={plateError ? 'border-red-500' : ''}
                />
                {plateError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    {plateError}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vin_number">VIN Number</Label>
                <Input
                  id="vin_number"
                  value={formData.vin_number}
                  onChange={(e) => handleInputChange('vin_number', e.target.value)}
                  placeholder="e.g., VIN-AT5-001-2025"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Available">Available</option>
                  <option value="Rented">Rented</option>
                  <option value="In Service">In Service</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Out of Order">Out of Order</option>
                </select>
              </div>
            </div>

            {/* Insurance fields inline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurance_policy_number">Insurance Policy Number</Label>
                <Input
                  id="insurance_policy_number"
                  value={formData.insurance_policy_number}
                  onChange={(e) => handleInputChange('insurance_policy_number', e.target.value)}
                  placeholder="e.g., POL-2025-001"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="insurance_provider">Insurance Provider</Label>
                <Input
                  id="insurance_provider"
                  value={formData.insurance_provider}
                  onChange={(e) => handleInputChange('insurance_provider', e.target.value)}
                  placeholder="e.g., Wafa Assurance"
                />
              </div>
            </div>

            {/* Registration fields inline */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="registration_number">Registration Number</Label>
                <Input
                  id="registration_number"
                  value={formData.registration_number}
                  onChange={(e) => handleInputChange('registration_number', e.target.value)}
                  placeholder="e.g., REG-001-2025"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="registration_expiry_date">Registration Expiry Date</Label>
                <Input
                  id="registration_expiry_date"
                  type="date"
                  value={formData.registration_expiry_date}
                  onChange={(e) => handleInputChange('registration_expiry_date', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Acquisition Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Acquisition
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="purchase_cost_mad">Purchase Cost (MAD)</Label>
                <Input
                  id="purchase_cost_mad"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.purchase_cost_mad}
                  onChange={(e) => handleInputChange('purchase_cost_mad', e.target.value)}
                  placeholder="e.g., 45000.00"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchase_date">Purchase Date</Label>
                <Input
                  id="purchase_date"
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchase_supplier">Supplier / Seller</Label>
                <Input
                  id="purchase_supplier"
                  value={formData.purchase_supplier}
                  onChange={(e) => handleInputChange('purchase_supplier', e.target.value)}
                  placeholder="e.g., Segway Morocco"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="purchase_invoice_url">Invoice/Receipt URL</Label>
                <Input
                  id="purchase_invoice_url"
                  type="url"
                  value={formData.purchase_invoice_url}
                  onChange={(e) => handleInputChange('purchase_invoice_url', e.target.value)}
                  placeholder="https://example.com/invoice.pdf"
                />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Important Dates</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hire_date">Hire Date</Label>
                <Input
                  id="hire_date"
                  type="date"
                  value={formData.hire_date}
                  onChange={(e) => handleInputChange('hire_date', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="insurance_expiry_date">Insurance Expiry Date</Label>
                <Input
                  id="insurance_expiry_date"
                  type="date"
                  value={formData.insurance_expiry_date}
                  onChange={(e) => handleInputChange('insurance_expiry_date', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="last_service_date">Last Service Date</Label>
                <Input
                  id="last_service_date"
                  type="date"
                  value={formData.last_service_date}
                  onChange={(e) => handleInputChange('last_service_date', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="next_service_due">Next Service Due</Label>
                <Input
                  id="next_service_due"
                  type="date"
                  value={formData.next_service_due}
                  onChange={(e) => handleInputChange('next_service_due', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Operational Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Operational Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="odometer_reading">Odometer Reading (km)</Label>
                <Input
                  id="odometer_reading"
                  type="number"
                  min="0"
                  value={formData.odometer_reading}
                  onChange={(e) => handleInputChange('odometer_reading', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="fuel_level">Fuel Level (%)</Label>
                <Input
                  id="fuel_level"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.fuel_level}
                  onChange={(e) => handleInputChange('fuel_level', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="Additional notes about the vehicle..."
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || plateError || (vehicleModels.length === 0 && !loadingModels)}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Vehicle
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddVehicleModal;