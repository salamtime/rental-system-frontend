import React, { useState, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectVehicles } from '../../store/slices/vehiclesSlice';
import { User, Calendar, Car, MapPin, CreditCard, FileText } from 'lucide-react';

const RentalForm = ({ onSubmit, initialData = null, isLoading = false }) => {
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    rental_type: 'daily',
    rental_start_date: '',
    rental_end_date: '',
    rental_status: 'scheduled',
    vehicle_id: '',
    quantity: 1,
    pickup_location: '',
    dropoff_location: '',
    transport_pickup: false,
    transport_dropoff: false,
    unit_price_mad: 0,
    subtotal: 0,
    damage_deposit: 0,
    total_amount: 0,
    deposit_amount: 0,
    remaining_amount: 0,
    payment_status: 'unpaid',
    promo_code: '',
    contract_signed: false,
    insurance_included: false,
    helmet_included: false,
    gear_included: false,
    auto_activate: true,
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const vehicles = useSelector(selectVehicles) || [];

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      setFormData({
        customer_name: initialData.customer_name || '',
        customer_email: initialData.customer_email || '',
        customer_phone: initialData.customer_phone || '',
        rental_type: initialData.rental_type || 'daily',
        rental_start_date: initialData.rental_start_date || '',
        rental_end_date: initialData.rental_end_date || '',
        rental_status: initialData.rental_status || 'scheduled',
        vehicle_id: initialData.vehicle_id || '',
        quantity: initialData.quantity || 1,
        pickup_location: initialData.pickup_location || '',
        dropoff_location: initialData.dropoff_location || '',
        transport_pickup: initialData.transport_pickup || false,
        transport_dropoff: initialData.transport_dropoff || false,
        unit_price_mad: initialData.unit_price_mad || 0,
        subtotal: initialData.subtotal || 0,
        damage_deposit: initialData.damage_deposit || 0,
        total_amount: initialData.total_amount || 0,
        deposit_amount: initialData.deposit_amount || 0,
        remaining_amount: initialData.remaining_amount || 0,
        payment_status: initialData.payment_status || 'unpaid',
        promo_code: initialData.promo_code || '',
        contract_signed: initialData.contract_signed || false,
        insurance_included: initialData.insurance_included || false,
        helmet_included: initialData.helmet_included || false,
        gear_included: initialData.gear_included || false,
        auto_activate: initialData.auto_activate !== undefined ? initialData.auto_activate : true,
        notes: initialData.notes || ''
      });
    }
  }, [initialData]);

  // Calculate pricing when relevant fields change
  useEffect(() => {
    const unitPrice = parseFloat(formData.unit_price_mad) || 0;
    const quantity = parseInt(formData.quantity) || 1;
    const damageDeposit = parseFloat(formData.damage_deposit) || 0;
    const depositPaid = parseFloat(formData.deposit_amount) || 0;

    const subtotal = unitPrice * quantity;
    const totalAmount = subtotal + damageDeposit;
    const remainingAmount = Math.max(0, totalAmount - depositPaid);

    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: totalAmount,
      remaining_amount: remainingAmount
    }));
  }, [formData.unit_price_mad, formData.quantity, formData.damage_deposit, formData.deposit_amount]);

  // Handle vehicle selection and auto-pricing
  const handleVehicleChange = (vehicleId) => {
    const selectedVehicle = vehicles.find(v => v.id === parseInt(vehicleId));
    if (selectedVehicle) {
      // Auto-populate pricing based on vehicle model
      const basePrice = selectedVehicle.daily_rate || selectedVehicle.hourly_rate || 100;
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId,
        unit_price_mad: basePrice
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId
      }));
    }
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
    if (!formData.customer_email.trim()) newErrors.customer_email = 'Email is required';
    if (!formData.customer_phone.trim()) newErrors.customer_phone = 'Phone is required';
    if (!formData.rental_start_date) newErrors.rental_start_date = 'Start date is required';
    if (!formData.rental_end_date) newErrors.rental_end_date = 'End date is required';
    if (!formData.vehicle_id) newErrors.vehicle_id = 'Vehicle selection is required';
    if (!formData.pickup_location.trim()) newErrors.pickup_location = 'Pickup location is required';
    if (!formData.unit_price_mad || formData.unit_price_mad <= 0) newErrors.unit_price_mad = 'Unit price is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.customer_email && !emailRegex.test(formData.customer_email)) {
      newErrors.customer_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Customer Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <User className="h-5 w-5" />
          Customer Information
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              placeholder="Enter customer name"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.customer_name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customer_name && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => handleInputChange('customer_email', e.target.value)}
              placeholder="customer@email.com"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.customer_email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customer_email && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => handleInputChange('customer_phone', e.target.value)}
              placeholder="+212-XXX-XXX-XXX"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.customer_phone ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customer_phone && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Rental Details Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5" />
          Rental Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rental Type
            </label>
            <select
              value={formData.rental_type}
              onChange={(e) => handleInputChange('rental_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.rental_start_date}
              onChange={(e) => handleInputChange('rental_start_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.rental_start_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.rental_start_date && (
              <p className="text-red-500 text-xs mt-1">{errors.rental_start_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.rental_end_date}
              onChange={(e) => handleInputChange('rental_end_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.rental_end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.rental_end_date && (
              <p className="text-red-500 text-xs mt-1">{errors.rental_end_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.rental_status}
              onChange={(e) => handleInputChange('rental_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicle Selection Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Car className="h-5 w-5" />
          Vehicle Selection
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Vehicle *
            </label>
            <select
              value={formData.vehicle_id}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.vehicle_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                {vehicles.length === 0 ? 'No vehicles available' : 'Select a vehicle'}
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} - {vehicle.model} ({vehicle.plate_number})
                </option>
              ))}
            </select>
            {errors.vehicle_id && (
              <p className="text-red-500 text-xs mt-1">{errors.vehicle_id}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Location Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MapPin className="h-5 w-5" />
          Location Information
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location *
              </label>
              <input
                type="text"
                value={formData.pickup_location}
                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                placeholder="Enter pickup location"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pickup_location ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.pickup_location && (
                <p className="text-red-500 text-xs mt-1">{errors.pickup_location}</p>
              )}
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="transport_pickup"
                checked={formData.transport_pickup}
                onChange={(e) => handleInputChange('transport_pickup', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="transport_pickup" className="ml-2 text-sm text-gray-700">
                Transport Pickup
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drop-off Location
              </label>
              <input
                type="text"
                value={formData.dropoff_location}
                onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                placeholder="Enter drop-off location (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="transport_dropoff"
                checked={formData.transport_dropoff}
                onChange={(e) => handleInputChange('transport_dropoff', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="transport_dropoff" className="ml-2 text-sm text-gray-700">
                Transport Drop-off
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <CreditCard className="h-5 w-5" />
          Pricing Information
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Price (MAD) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_price_mad}
              onChange={(e) => handleInputChange('unit_price_mad', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.unit_price_mad ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.unit_price_mad && (
              <p className="text-red-500 text-xs mt-1">{errors.unit_price_mad}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtotal (MAD)
            </label>
            <input
              type="number"
              value={formData.subtotal}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Damage Deposit (MAD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.damage_deposit}
              onChange={(e) => handleInputChange('damage_deposit', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount (MAD)
            </label>
            <input
              type="number"
              value={formData.total_amount}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deposit Paid (MAD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.deposit_amount}
              onChange={(e) => handleInputChange('deposit_amount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remaining (MAD)
            </label>
            <input
              type="number"
              value={formData.remaining_amount}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={formData.payment_status}
              onChange={(e) => handleInputChange('payment_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promo Code
            </label>
            <input
              type="text"
              value={formData.promo_code}
              onChange={(e) => handleInputChange('promo_code', e.target.value)}
              placeholder="Enter promo code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Additional Options Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileText className="h-5 w-5" />
          Additional Options
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contract_signed"
              checked={formData.contract_signed}
              onChange={(e) => handleInputChange('contract_signed', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="contract_signed" className="ml-2 text-sm text-gray-700">
              Contract Signed
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="insurance_included"
              checked={formData.insurance_included}
              onChange={(e) => handleInputChange('insurance_included', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="insurance_included" className="ml-2 text-sm text-gray-700">
              Insurance Included
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="helmet_included"
              checked={formData.helmet_included}
              onChange={(e) => handleInputChange('helmet_included', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="helmet_included" className="ml-2 text-sm text-gray-700">
              Helmet Included
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="gear_included"
              checked={formData.gear_included}
              onChange={(e) => handleInputChange('gear_included', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="gear_included" className="ml-2 text-sm text-gray-700">
              Gear Included
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_activate"
              checked={formData.auto_activate}
              onChange={(e) => handleInputChange('auto_activate', e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="auto_activate" className="ml-2 text-sm text-gray-700">
              Auto Activate
            </label>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes or comments..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : initialData ? 'Update Rental' : 'Create Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;