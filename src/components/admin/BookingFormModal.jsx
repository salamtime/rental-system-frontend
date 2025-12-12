import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabaseClient';
import { format, parseISO, addHours, differenceInHours } from 'date-fns';

const BookingFormModal = ({ booking = null, onClose, onSave, isOpen }) => {
  const { t } = useTranslation();
  const isEdit = !!booking;
  
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_id: '',
    rental_start_date: '',
    rental_end_date: '',
    pickup_location: '',
    return_location: '',
    total_amount: 0,
    deposit_amount: 0,
    status: 'pending',
    notes: ''
  });
  
  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  
  // Populate form with booking data if editing
  useEffect(() => {
    if (booking) {
      setFormData({
        customer_name: booking.customer_name || '',
        customer_email: booking.customer_email || '',
        customer_phone: booking.customer_phone || '',
        vehicle_id: booking.vehicle_id || '',
        rental_start_date: booking.rental_start_date ? format(parseISO(booking.rental_start_date), 'yyyy-MM-dd\'T\'HH:mm') : '',
        rental_end_date: booking.rental_end_date ? format(parseISO(booking.rental_end_date), 'yyyy-MM-dd\'T\'HH:mm') : '',
        pickup_location: booking.pickup_location || '',
        return_location: booking.return_location || '',
        total_amount: booking.total_amount || 0,
        deposit_amount: booking.deposit_amount || 0,
        status: booking.status || 'pending',
        notes: booking.notes || ''
      });
    }
  }, [booking]);
  
  // Load available vehicles
  useEffect(() => {
    const fetchVehicles = async () => {
      setLoadingVehicles(true);
      try {
        // FIXED: Use correct table name and column names
        const { data, error } = await supabase
          .from('saharax_0u4w4d_vehicles')
          .select('id, name, model, brand, plate_number, status')
          .eq('status', 'Available')
          .order('name');

        if (error) {
          console.error('Error fetching vehicles:', error);
          setError('Failed to load vehicles');
        } else {
          setVehicles(data || []);
        }
      } catch (err) {
        console.error('Exception fetching vehicles:', err);
        setError('Failed to load vehicles');
      } finally {
        setLoadingVehicles(false);
      }
    };
    
    if (isOpen) {
      fetchVehicles();
    }
  }, [isOpen]);
  
  // Calculate total amount when dates or vehicle changes
  useEffect(() => {
    if (formData.rental_start_date && formData.rental_end_date && formData.vehicle_id) {
      const startDate = new Date(formData.rental_start_date);
      const endDate = new Date(formData.rental_end_date);
      const hours = differenceInHours(endDate, startDate);
      
      if (hours > 0) {
        // Simple hourly rate calculation (you can make this more sophisticated)
        const hourlyRate = 50; // MAD per hour
        const totalAmount = hours * hourlyRate;
        const depositAmount = totalAmount * 0.3; // 30% deposit
        
        setFormData(prev => ({
          ...prev,
          total_amount: totalAmount,
          deposit_amount: depositAmount
        }));
      }
    }
  }, [formData.rental_start_date, formData.rental_end_date, formData.vehicle_id]);
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Validate required fields
      if (!formData.customer_name || !formData.customer_email || !formData.vehicle_id) {
        throw new Error('Please fill in all required fields');
      }
      
      // Validate dates
      const startDate = new Date(formData.rental_start_date);
      const endDate = new Date(formData.rental_end_date);
      
      if (startDate >= endDate) {
        throw new Error('End date must be after start date');
      }
      
      if (startDate < new Date()) {
        throw new Error('Start date cannot be in the past');
      }
      
      // Prepare booking data
      const bookingData = {
        ...formData,
        rental_start_date: startDate.toISOString(),
        rental_end_date: endDate.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      let result;
      
      if (isEdit) {
        // Update existing booking
        const { data, error } = await supabase
          .from('saharax_0u4w4d_bookings')
          .update(bookingData)
          .eq('id', booking.id)
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      } else {
        // Create new booking
        const { data, error } = await supabase
          .from('saharax_0u4w4d_bookings')
          .insert([bookingData])
          .select()
          .single();
          
        if (error) throw error;
        result = data;
      }
      
      // Call the onSave callback
      if (onSave) {
        onSave(result);
      }
      
      // Close the modal
      onClose();
      
    } catch (err) {
      console.error('Error saving booking:', err);
      setError(err.message || 'Failed to save booking');
    } finally {
      setLoading(false);
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit ? t('admin.bookings.editBooking') : t('admin.bookings.addBooking')}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <p className="text-red-700">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Customer Information */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.customerName')} *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.customerEmail')} *
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.customerPhone')}
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Vehicle Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.vehicle')} *
                </label>
                {loadingVehicles ? (
                  <div className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50">
                    Loading vehicles...
                  </div>
                ) : (
                  <select
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">{t('admin.bookings.selectVehicle')}</option>
                    {vehicles.map(vehicle => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {/* FIXED: Use plate_number instead of license_plate */}
                        {vehicle.name} - {vehicle.model} ({vehicle.plate_number})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              
              {/* Rental Dates */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.startDate')} *
                </label>
                <input
                  type="datetime-local"
                  name="rental_start_date"
                  value={formData.rental_start_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.endDate')} *
                </label>
                <input
                  type="datetime-local"
                  name="rental_end_date"
                  value={formData.rental_end_date}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              {/* Locations */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.pickupLocation')}
                </label>
                <input
                  type="text"
                  name="pickup_location"
                  value={formData.pickup_location}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.returnLocation')}
                </label>
                <input
                  type="text"
                  name="return_location"
                  value={formData.return_location}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Pricing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.totalAmount')} (MAD)
                </label>
                <input
                  type="number"
                  name="total_amount"
                  value={formData.total_amount}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.depositAmount')} (MAD)
                </label>
                <input
                  type="number"
                  name="deposit_amount"
                  value={formData.deposit_amount}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                  step="0.01"
                  min="0"
                />
              </div>
              
              {/* Status */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.bookings.status')}
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pending">{t('admin.bookings.pending')}</option>
                  <option value="confirmed">{t('admin.bookings.confirmed')}</option>
                  <option value="active">{t('admin.bookings.active')}</option>
                  <option value="completed">{t('admin.bookings.completed')}</option>
                  <option value="cancelled">{t('admin.bookings.cancelled')}</option>
                </select>
              </div>
            </div>
            
            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('admin.bookings.notes')}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Form Actions */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('common.saving')}
                  </span>
                ) : isEdit ? t('common.update') : t('common.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BookingFormModal;