import React, { useState, useEffect } from 'react';
import { X, User, Car, MapPin, DollarSign, FileText, Clock, CheckCircle, AlertTriangle, Info, Settings } from 'lucide-react';
import VehicleModelService from '../../services/VehicleModelService';

const ComprehensiveRentalModal = ({ isOpen, onClose, onSubmit, vehicles = [] }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicleModels, setVehicleModels] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  
  // Initial form state - extracted for reuse
  const getInitialFormData = () => ({
    // Customer Information
    customer_name: '',
    email: '',
    phone: '',
    address: '',
    
    // Rental Details
    vehicle_id: '',
    vehicle_model_id: '',
    rental_type: 'daily',
    start_date: '',
    end_date: '',
    start_time: '--:--',
    end_time: '--:--',
    
    // Location Information
    pickup_location: '',
    dropoff_location: '',
    
    // Financial Information
    quantity_days: 0,
    unit_price: 0,
    subtotal: 0,
    transport_fee: 0,
    total_amount: 0,
    deposit_amount: 0,
    damage_deposit: 0,
    remaining_amount: 0,
    
    // Transport Options
    pickup_transport: false,
    dropoff_transport: false,
    
    // Rental Status (updated defaults)
    rental_status: 'scheduled',
    payment_status: 'partial',
    special_requests: '',
    
    // Additional Information
    notes: ''
  });

  // Form state with updated defaults
  const [formData, setFormData] = useState(getInitialFormData());

  // Debug and pricing info
  const [debugInfo, setDebugInfo] = useState({
    pricingLoaded: true,
    availablePricing: 'AT5(1800MAD daily), AT6(2200MAD daily)',
    paymentStatus: 'PARTIAL',
    fieldsLocked: false,
    invoiceRequired: false
  });

  // ENHANCED: Filter only available vehicles and format display name with model type
  const getVehicleDisplayName = (vehicle) => {
    if (!vehicle) return 'Unknown Vehicle';
    
    const name = vehicle.name || vehicle.model || 'Unknown';
    const plate = vehicle.plate_number || vehicle.plate || 'No Plate';
    
    // Find matching vehicle model to get the model type (AT5, AT6, etc.)
    const vehicleModelName = vehicle.name || vehicle.model || '';
    const matchingModel = vehicleModels.find(model => 
      model.model === vehicleModelName || 
      model.name === vehicleModelName ||
      vehicleModelName.includes(model.model) ||
      model.model.includes(vehicleModelName)
    );
    
    // If we found a matching model, include the model type
    if (matchingModel && matchingModel.model) {
      return `${name} ${matchingModel.model} - Plate: ${plate}`;
    }
    
    // Fallback to original format if no model type found
    return `${name} - Plate: ${plate}`;
  };

  // Calculate days between two dates
  const calculateDaysBetween = (startDate, endDate) => {
    if (!startDate || !endDate) return 0;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Calculate the difference in milliseconds
    const diffTime = Math.abs(end - start);
    // Convert to days
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Minimum 1 day for same-day rentals
    return Math.max(diffDays, 1);
  };

  // FIXED: Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      // Reset form to clean state when modal opens
      setFormData(getInitialFormData());
      setError('');
      loadVehicleModels();
      loadAvailableVehicles();
    }
  }, [isOpen]);

  // Auto-calculate days when dates change
  useEffect(() => {
    if (formData.start_date && formData.end_date) {
      const days = calculateDaysBetween(formData.start_date, formData.end_date);
      setFormData(prev => ({
        ...prev,
        quantity_days: days
      }));
    }
  }, [formData.start_date, formData.end_date]);

  // FIXED: Enhanced pricing calculation with payment status logic
  useEffect(() => {
    calculatePricing();
  }, [formData.quantity_days, formData.unit_price, formData.transport_fee, formData.deposit_amount, formData.damage_deposit, formData.payment_status]);

  // FIXED: Auto-set deposit when payment status changes to "paid"
  useEffect(() => {
    if (formData.payment_status === 'paid' && formData.unit_price > 0) {
      const totalAmount = (formData.quantity_days || 0) * (formData.unit_price || 0) + (formData.transport_fee || 0);
      setFormData(prev => ({
        ...prev,
        deposit_amount: totalAmount
      }));
    }
  }, [formData.payment_status, formData.unit_price, formData.quantity_days, formData.transport_fee]);

  const loadVehicleModels = async () => {
    try {
      const models = await VehicleModelService.getAllVehicleModels();
      setVehicleModels(models);
      
      // Update debug info with actual pricing
      const pricingInfo = models
        .filter(model => model.pricing && model.pricing.length > 0)
        .map(model => `${model.model}(${model.pricing[0].daily_mad}MAD daily)`)
        .join(', ');
      
      setDebugInfo(prev => ({
        ...prev,
        availablePricing: pricingInfo || 'AT5(1800MAD daily), AT6(2200MAD daily)'
      }));
    } catch (err) {
      console.error('Error loading vehicle models:', err);
      setError('Failed to load vehicle models');
    }
  };

  const loadAvailableVehicles = () => {
    const available = vehicles.filter(vehicle => 
      vehicle.status === 'available' || vehicle.rental_status === 'available'
    );
    setAvailableVehicles(available);
  };

  const calculatePricing = () => {
    const subtotal = (formData.quantity_days || 0) * (formData.unit_price || 0);
    const total = subtotal + (formData.transport_fee || 0);
    const remaining = total - (formData.deposit_amount || 0);

    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: total,
      remaining_amount: Math.max(remaining, 0) // Ensure remaining is never negative
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // FIXED: Enhanced vehicle selection with proper pricing lookup
  const handleVehicleChange = (e) => {
    const vehicleId = e.target.value;
    const selectedVehicle = availableVehicles.find(vehicle => vehicle.id.toString() === vehicleId);
    
    console.log('Selected Vehicle:', selectedVehicle);
    console.log('Available Vehicle Models:', vehicleModels);
    
    if (selectedVehicle) {
      // Try to find matching vehicle model by name/model
      const vehicleModelName = selectedVehicle.name || selectedVehicle.model || '';
      const matchingModel = vehicleModels.find(model => 
        model.model === vehicleModelName || 
        model.name === vehicleModelName ||
        vehicleModelName.includes(model.model) ||
        model.model.includes(vehicleModelName)
      );
      
      console.log('Matching Model:', matchingModel);
      
      let unitPrice = 0;
      if (matchingModel && matchingModel.pricing && matchingModel.pricing.length > 0) {
        const pricing = matchingModel.pricing[0];
        unitPrice = formData.rental_type === 'daily' ? pricing.daily_mad : pricing.hourly_mad;
        console.log('Found Pricing:', pricing, 'Unit Price:', unitPrice);
      } else {
        console.log('No pricing found for vehicle');
      }
      
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId,
        vehicle_model_id: matchingModel ? matchingModel.id : '',
        unit_price: unitPrice || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId,
        vehicle_model_id: '',
        unit_price: 0
      }));
    }
  };

  // FIXED: Enhanced rental type change with proper pricing update
  const handleRentalTypeChange = (e) => {
    const rentalType = e.target.value;
    
    // Re-calculate pricing based on current vehicle selection
    if (formData.vehicle_id) {
      const selectedVehicle = availableVehicles.find(vehicle => vehicle.id.toString() === formData.vehicle_id);
      
      if (selectedVehicle) {
        const vehicleModelName = selectedVehicle.name || selectedVehicle.model || '';
        const matchingModel = vehicleModels.find(model => 
          model.model === vehicleModelName || 
          model.name === vehicleModelName ||
          vehicleModelName.includes(model.model) ||
          model.model.includes(vehicleModelName)
        );
        
        let unitPrice = 0;
        if (matchingModel && matchingModel.pricing && matchingModel.pricing.length > 0) {
          const pricing = matchingModel.pricing[0];
          unitPrice = rentalType === 'daily' ? pricing.daily_mad : pricing.hourly_mad;
        }
        
        setFormData(prev => ({
          ...prev,
          rental_type: rentalType,
          unit_price: unitPrice || 0
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          rental_type: rentalType
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        rental_type: rentalType
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate required fields
      if (!formData.customer_name.trim()) {
        throw new Error('Customer name is required');
      }
      if (!formData.vehicle_id) {
        throw new Error('Please select a vehicle');
      }
      if (!formData.start_date || !formData.end_date) {
        throw new Error('Start and end dates are required');
      }

      await onSubmit(formData);
      
      // Reset form after successful submission
      setFormData(getInitialFormData());
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Reset form when modal closes
  const handleClose = () => {
    setFormData(getInitialFormData());
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">New Rental</h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Debug Information Panel */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="font-medium text-green-700">🔧 UX FIXES APPLIED:</span>
                <span className="text-green-700">Modal resets + Payment logic + Clean form</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Status:</span>
                <span>Available Vehicles: {availableVehicles.length} | Payment: {formData.payment_status} | Deposit: {formData.deposit_amount} MAD</span>
              </div>

              <div className="mt-3">
                <div className="font-medium text-green-700 mb-1">✅ Fixed Issues:</div>
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>Modal resets on close/open for clean forms</span>
                </div>
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>"Paid" status auto-sets deposit = total amount</span>
                </div>
                <div className="flex items-center gap-1 text-green-700">
                  <CheckCircle className="h-3 w-3" />
                  <span>Subtotal kept for calculation transparency</span>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Customer Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <User className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter customer name"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="customer@example.com"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+212 6XX XXX XXX"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Customer address"
                  disabled={loading}
                />
                <p className="text-xs text-gray-500 mt-1">ℹ️ For display only - not stored in database</p>
              </div>
            </div>
          </div>

          {/* Rental Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Rental Details</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Model *
                </label>
                <select
                  name="vehicle_id"
                  value={formData.vehicle_id}
                  onChange={handleVehicleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="">Select vehicle model...</option>
                  {availableVehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {getVehicleDisplayName(vehicle)}
                    </option>
                  ))}
                </select>
                {availableVehicles.length === 0 && (
                  <p className="text-xs text-yellow-600 mt-1">⚠️ No available vehicles found. Please check Vehicle List.</p>
                )}
                <p className="text-xs text-green-600 mt-1">✨ Now shows model type (AT5, AT6) from pricing rules</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Type *
                </label>
                <select
                  name="rental_type"
                  value={formData.rental_type}
                  onChange={handleRentalTypeChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="daily">Daily</option>
                  <option value="hourly">Hourly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <div className="relative">
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    disabled={loading}
                  />
                  <Clock className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Location Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Pickup Location</h4>
                <input
                  type="text"
                  name="pickup_location"
                  value={formData.pickup_location}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Pickup address"
                  disabled={loading}
                />
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Drop-off Location</h4>
                <input
                  type="text"
                  name="dropoff_location"
                  value={formData.dropoff_location}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Drop-off address"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Financial Information</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantity (Days) *
                </label>
                <input
                  type="number"
                  name="quantity_days"
                  value={formData.quantity_days}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-green-50 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="1"
                  disabled={loading}
                />
                <p className="text-xs text-green-600 mt-1">🗓️ Auto-calculated from dates</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Unit Price (MAD) *
                </label>
                <input
                  type="number"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 bg-blue-50 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                <p className="text-xs text-blue-600 mt-1">💰 Auto-populated from vehicle pricing rules</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subtotal (MAD)
                </label>
                <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                  {formData.subtotal.toFixed(2)} MAD
                </div>
                <p className="text-xs text-gray-500 mt-1">ℹ️ Quantity × Unit Price (kept for transparency)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transport Fee (MAD)
                </label>
                <input
                  type="number"
                  name="transport_fee"
                  value={formData.transport_fee}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Options
                </label>
                <div className="flex gap-6">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="pickup_transport"
                      checked={formData.pickup_transport}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-700">Pickup Transport</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="dropoff_transport"
                      checked={formData.dropoff_transport}
                      onChange={handleInputChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-700">Drop-off Transport</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Amount (MAD)
                </label>
                <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-blue-50 text-blue-700 font-medium">
                  {formData.total_amount.toFixed(2)} MAD
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Deposit Amount (MAD)
                </label>
                <input
                  type="number"
                  name="deposit_amount"
                  value={formData.deposit_amount}
                  onChange={handleInputChange}
                  className={`w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 ${
                    formData.payment_status === 'paid' ? 'bg-green-50' : ''
                  }`}
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                {formData.payment_status === 'paid' && (
                  <p className="text-xs text-green-600 mt-1">✅ Auto-set to total amount for "Paid" status</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Remaining (MAD)
                </label>
                <div className={`w-full border border-gray-300 rounded-md px-3 py-2 text-gray-700 ${
                  formData.remaining_amount === 0 ? 'bg-green-50 text-green-700 font-medium' : 'bg-gray-50'
                }`}>
                  {formData.remaining_amount.toFixed(2)} MAD
                </div>
                <p className="text-xs text-gray-500 mt-1">ℹ️ Total - Deposit (auto-calculated)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Damage Deposit (MAD)
                </label>
                <input
                  type="number"
                  name="damage_deposit"
                  value={formData.damage_deposit}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                <p className="text-xs text-blue-600 mt-1">ℹ️ Refundable upon ATV return & inspection</p>
              </div>
            </div>
          </div>

          {/* Rental Status Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Settings className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Rental Status</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rental Status *
                </label>
                <select
                  name="rental_status"
                  value={formData.rental_status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Status *
                </label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="pending">Pending</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                {formData.payment_status === 'paid' && (
                  <p className="text-xs text-green-600 mt-1">✅ Deposit auto-set to total amount</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  name="special_requests"
                  value={formData.special_requests}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Special requests or requirements..."
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Additional notes about the rental..."
                disabled={loading}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                'Create Rental'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComprehensiveRentalModal;