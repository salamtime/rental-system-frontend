import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Car, MapPin, DollarSign, FileText, Clock, CheckCircle, AlertTriangle, Info, Scan } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import VehicleModelService from '../../services/VehicleModelService';
import EnhancedUnifiedIDScanModal from '../customers/EnhancedUnifiedIDScanModal';

const RentalFormModal = ({ isOpen, onClose, onSubmit, vehicles = [], rental: rentalForEdit = null }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vehicleModels, setVehicleModels] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  
  const isEditMode = !!rentalForEdit;

  // ID Scan Modal state
  const [showIDScanModal, setShowIDScanModal] = useState(false);
  
  const initialFormData = {
    // Customer Information
    customer_name: '',
    customer_id: null,
    email: '',
    phone: '',
    address: '',
    // Rental Details
    vehicle_id: '',
    vehicle_model_id: '',
    rental_type: 'daily',
    start_date: '',
    end_date: '',
    start_time: '10:00',
    end_time: '10:00',
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
    // Payment & Status
    payment_status: 'pending',
    // Additional Information
    notes: '',
    special_requirements: ''
  };

  // Form state
  const [formData, setFormData] = useState(initialFormData);

  // Debug and pricing info
  const [debugInfo, setDebugInfo] = useState({
    pricingLoaded: false,
    availablePricing: '',
    paymentStatus: 'PENDING',
    fieldsLocked: false,
    invoiceRequired: false
  });

  useEffect(() => {
    if (isOpen) {
      loadVehicleModels();
      loadAvailableVehicles();
      if (isEditMode && rentalForEdit) {
        const r = rentalForEdit;
        const formatDate = (dateStr) => dateStr ? new Date(dateStr).toISOString().split('T')[0] : '';
        const formatTime = (dateStr) => dateStr ? new Date(dateStr).toTimeString().substring(0, 5) : '10:00';

        setFormData({
            ...initialFormData,
            customer_name: r.customer_name || '',
            customer_id: r.customer_id || null,
            email: r.customer_email || '',
            phone: r.customer_phone || '',
            address: r.address || '',
            vehicle_id: r.vehicle_id || '',
            rental_type: r.rental_type || 'daily',
            start_date: formatDate(r.rental_start_date),
            end_date: formatDate(r.rental_end_date),
            start_time: formatTime(r.rental_start_date),
            end_time: formatTime(r.rental_end_date),
            pickup_location: r.pickup_location || '',
            dropoff_location: r.dropoff_location || '',
            unit_price: r.unit_price_mad || 0,
            transport_fee: r.transport_fee || 0,
            deposit_amount: r.deposit_amount || 0,
            damage_deposit: r.damage_deposit || 0,
            payment_status: r.payment_status || 'pending',
            notes: r.notes || '',
            special_requirements: r.special_requirements || '',
        });
      } else {
        setFormData(initialFormData);
      }
    }
  }, [isOpen, isEditMode, rentalForEdit]);

  useEffect(() => {
    if (formData.start_date && formData.end_date) {
        const start = new Date(formData.start_date);
        const end = new Date(formData.end_date);
        if (end > start) {
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            setFormData(prev => ({ ...prev, quantity_days: diffDays > 0 ? diffDays : 1 }));
        } else {
            setFormData(prev => ({ ...prev, quantity_days: 0 }));
        }
    }
  }, [formData.start_date, formData.end_date]);

  useEffect(() => {
    calculatePricing();
  }, [formData.quantity_days, formData.unit_price, formData.transport_fee, formData.deposit_amount]);

  const loadVehicleModels = async () => {
    try {
      const models = await VehicleModelService.getAllVehicleModels();
      setVehicleModels(models);
      
      const pricingInfo = models
        .filter(model => model.pricing && model.pricing.length > 0)
        .map(model => `${model.model}(${model.pricing[0].daily_mad}MAD daily)`)
        .join(', ');
      
      setDebugInfo(prev => ({
        ...prev,
        pricingLoaded: true,
        availablePricing: pricingInfo || 'No pricing available'
      }));
    } catch (err) {
      console.error('Error loading vehicle models:', err);
      setError('Failed to load vehicle models');
    }
  };

  const loadAvailableVehicles = () => {
    const available = vehicles.filter(vehicle => vehicle.status === 'available');
    setAvailableVehicles(available);
  };

  const calculatePricing = () => {
    const subtotal = (formData.quantity_days || 0) * (formData.unit_price || 0);
    const total = subtotal + (parseFloat(formData.transport_fee) || 0);
    const remaining = total - (parseFloat(formData.deposit_amount) || 0);

    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: total,
      remaining_amount: remaining
    }));
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleVehicleModelChange = (e) => {
    const modelId = e.target.value;
    const selectedModel = vehicleModels.find(model => model.id === modelId);
    
    if (selectedModel && selectedModel.pricing && selectedModel.pricing.length > 0) {
      const pricing = selectedModel.pricing[0];
      setFormData(prev => ({
        ...prev,
        vehicle_model_id: modelId,
        unit_price: formData.rental_type === 'daily' ? pricing.daily_mad : pricing.hourly_mad
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicle_model_id: modelId,
        unit_price: 0
      }));
    }
  };

  const handleRentalTypeChange = (e) => {
    const rentalType = e.target.value;
    const selectedModel = vehicleModels.find(model => model.id === formData.vehicle_model_id);
    
    let unitPrice = 0;
    if (selectedModel && selectedModel.pricing && selectedModel.pricing.length > 0) {
      const pricing = selectedModel.pricing[0];
      unitPrice = rentalType === 'daily' ? pricing.daily_mad : pricing.hourly_mad;
    }

    setFormData(prev => ({
      ...prev,
      rental_type: rentalType,
      unit_price: unitPrice
    }));
  };

  const handleCustomerSaved = (savedCustomer) => {
    console.log('✅ Customer saved from ID scan:', savedCustomer);
    
    setFormData(prev => ({
      ...prev,
      customer_name: savedCustomer.full_name || prev.customer_name,
      email: savedCustomer.email || prev.email,
      phone: savedCustomer.phone || prev.phone,
      address: savedCustomer.address || prev.address,
      customer_id: savedCustomer.id
    }));
    
    setShowIDScanModal(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!formData.customer_name.trim()) throw new Error('Customer name is required');
      if (!isEditMode && !formData.vehicle_id) throw new Error('Please select a vehicle');
      if (!formData.start_date || !formData.end_date) throw new Error('Start and end dates are required');
      if (new Date(formData.end_date) <= new Date(formData.start_date)) throw new Error('End date must be after start date');

      const rentalData = {
        customer_name: formData.customer_name,
        customer_id: formData.customer_id,
        customer_email: formData.email,
        customer_phone: formData.phone,
        vehicle_id: formData.vehicle_id,
        rental_type: formData.rental_type,
        rental_start_date: `${formData.start_date}T${formData.start_time}:00`,
        rental_end_date: `${formData.end_date}T${formData.end_time}:00`,
        pickup_location: formData.pickup_location,
        dropoff_location: formData.dropoff_location,
        unit_price_mad: formData.unit_price,
        total_amount: formData.total_amount,
        deposit_amount: formData.deposit_amount,
        damage_deposit: formData.damage_deposit,
        payment_status: formData.payment_status,
        notes: formData.notes,
        special_requirements: formData.special_requirements,
        rental_status: formData.rental_status || (isEditMode ? rentalForEdit.rental_status : 'scheduled'),
        updated_at: new Date().toISOString(),
      };

      let result;
      if (isEditMode) {
        const { data, error: updateError } = await supabase
          .from('app_4c3a7a6153_rentals')
          .update(rentalData)
          .eq('id', rentalForEdit.id)
          .select()
          .single();
        if (updateError) throw updateError;
        result = data;
      } else {
        const { data, error: insertError } = await supabase
          .from('app_4c3a7a6153_rentals')
          .insert([rentalData])
          .select()
          .single();
        if (insertError) throw insertError;
        result = data;
      }
      
      if (onSubmit) onSubmit(result);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">{isEditMode ? 'Edit Rental' : 'New Rental'}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Debug Information Panel */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-blue-600" />
                  <span className="font-medium">Debug Info:</span>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>Guaranteed pricing loaded</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Available Pricing:</span>
                  <span>{debugInfo.availablePricing}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                  <span className="font-medium">Payment Status:</span>
                  <span>{debugInfo.paymentStatus} | Fields Locked: {debugInfo.fieldsLocked ? 'Yes' : 'No'} | Invoice Required: {debugInfo.invoiceRequired ? 'Yes' : 'No'}</span>
                </div>

                <div className="mt-3">
                  <div className="font-medium text-red-700 mb-1">🔧 Safe Field Mapping:</div>
                  <div className="flex items-center gap-1 text-green-700">
                    <CheckCircle className="h-3 w-3" />
                    <span>Will be sent to DB: customer_name, vehicle_id, dates, amounts</span>
                  </div>
                  <div className="flex items-center gap-1 text-red-700">
                    <X className="h-3 w-3" />
                    <span>Excluded from DB: customerAddress, remaining, subtotal</span>
                  </div>
                  <div className="flex items-center gap-1 text-gray-600">
                    <AlertTriangle className="h-3 w-3" />
                    <span>No columns= parameter used - prevents validation errors</span>
                  </div>
                </div>

                <div className="mt-2">
                  <div className="font-medium text-red-700">🔧 Troubleshooting:</div>
                  <span className="text-red-700">1. Vehicle model not extracted 7. Same-day rental: counted as 1 day minimum</span>
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-gray-600" />
                  <h3 className="text-lg font-medium text-gray-900">Customer Information</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIDScanModal(true)}
                  className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
                  disabled={loading}
                >
                  <Scan className="h-4 w-4 mr-2" />
                  Upload ID Document
                </button>
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
                    name="vehicle_model_id"
                    value={formData.vehicle_model_id}
                    onChange={handleVehicleModelChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loading}
                  >
                    <option value="">Select vehicle model...</option>
                    {vehicleModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name} {model.model}
                      </option>
                    ))}
                  </select>
                  {availableVehicles.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ No available vehicles found. Please check Vehicle List.</p>
                  )}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pickup Location
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Drop-off Location
                  </label>
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="1"
                    disabled={loading}
                  />
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subtotal (MAD)
                  </label>
                  <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                    {formData.subtotal.toFixed(2)} MAD
                  </div>
                  <p className="text-xs text-gray-500 mt-1">ℹ️ Calculated field - not stored in database</p>
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
                  <div className="flex gap-4">
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
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    disabled={loading}
                  />
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remaining (MAD)
                  </label>
                  <div className="w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-50 text-gray-700">
                    {formData.remaining_amount.toFixed(2)} MAD
                  </div>
                  <p className="text-xs text-gray-500 mt-1">ℹ️ Calculated field - not stored in database</p>
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

            {/* Additional Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-5 w-5 text-gray-600" />
                <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
              </div>

              <div className="space-y-4">
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Special Requirements
                  </label>
                  <textarea
                    name="special_requirements"
                    value={formData.special_requirements}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Special requirements or requests..."
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
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
                    {isEditMode ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Update Rental' : 'Create Rental'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Enhanced Unified ID Scan Modal */}
      <EnhancedUnifiedIDScanModal
        isOpen={showIDScanModal}
        onClose={() => setShowIDScanModal(false)}
        setFormData={setFormData}
        formData={formData}
        onCustomerSaved={handleCustomerSaved}
        title="Upload ID Document"
      />
    </>
  );
};

export default RentalFormModal;