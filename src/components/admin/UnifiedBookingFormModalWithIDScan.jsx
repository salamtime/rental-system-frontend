import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabaseClient';
import { format, parseISO, differenceInHours, isAfter } from 'date-fns';
import { Scan, User } from 'lucide-react';
import EnhancedUnifiedIDScanModal from '../customers/EnhancedUnifiedIDScanModal';

const UnifiedBookingFormModalWithIDScan = ({ booking = null, onClose, onSave, isOpen }) => {
  const { t } = useTranslation();
  const isEdit = !!booking;

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_id: null,
    linked_display_id: '',
    vehicle_id: '',
    rental_start_date: '',
    rental_end_date: '',
    pickup_location: '',
    return_location: '',
    total_amount: 0,
    deposit_amount: 0,
    payment_status: 'unpaid',
    booking_status: 'pending',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  const [showIDScanModal, setShowIDScanModal] = useState(false);
  const [dateError, setDateError] = useState(null);

  useEffect(() => {
    if (booking) {
      setFormData({
        customer_name: booking.customer_name || '',
        customer_email: booking.customer_email || '',
        customer_phone: booking.customer_phone || '',
        customer_id: booking.customer_id || null,
        linked_display_id: booking.linked_display_id || '',
        vehicle_id: booking.vehicle_id || '',
        rental_start_date: booking.rental_start_date ? format(parseISO(booking.rental_start_date), 'yyyy-MM-dd\'T\'HH:mm') : '',
        rental_end_date: booking.rental_end_date ? format(parseISO(booking.rental_end_date), 'yyyy-MM-dd\'T\'HH:mm') : '',
        pickup_location: booking.pickup_location || '',
        return_location: booking.return_location || '',
        total_amount: booking.total_amount || 0,
        deposit_amount: booking.deposit_amount || 0,
        payment_status: booking.payment_status || 'unpaid',
        booking_status: booking.booking_status || 'pending',
        notes: booking.notes || ''
      });
    }
  }, [booking]);

  useEffect(() => {
    const fetchVehicles = async () => {
      if (!formData.rental_start_date || !formData.rental_end_date || dateError) {
        setVehicles([]);
        setLoadingVehicles(false);
        return;
      }

      setLoadingVehicles(true);
      try {
        const { data: bookedVehicles, error: bookedVehiclesError } = await supabase
          .from('saharax_0u4w4d_bookings')
          .select('vehicle_id')
          .or(`(rental_start_date,rental_end_date).overlaps.(${formData.rental_start_date},${formData.rental_end_date})`);

        if (bookedVehiclesError) throw bookedVehiclesError;

        const bookedVehicleIds = bookedVehicles.map(b => b.vehicle_id);

        let query = supabase
          .from('saharax_0u4w4d_vehicles')
          .select('id, name, model, brand, plate_number, status');

        if (bookedVehicleIds.length > 0) {
          query = query.not('id', 'in', `(${bookedVehicleIds.join(',')})`);
        }
        
        const { data, error } = await query.order('name');

        if (error) throw error;
        setVehicles(data || []);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError('Failed to load vehicles');
      } finally {
        setLoadingVehicles(false);
      }
    };

    if (isOpen) {
      fetchVehicles();
    }
  }, [isOpen, formData.rental_start_date, formData.rental_end_date, dateError]);

  useEffect(() => {
    if (formData.rental_start_date && formData.rental_end_date) {
        const startDate = new Date(formData.rental_start_date);
        const endDate = new Date(formData.rental_end_date);

        if (isAfter(startDate, endDate)) {
            setDateError('End date must be after start date.');
        } else {
            setDateError(null);
        }

        const hours = differenceInHours(endDate, startDate);
        if (hours > 0) {
            const hourlyRate = 50; // MAD per hour
            const totalAmount = hours * hourlyRate;
            setFormData(prev => ({ ...prev, total_amount: totalAmount }));
        }
    }
  }, [formData.rental_start_date, formData.rental_end_date]);

  useEffect(() => {
    const total = parseFloat(formData.total_amount) || 0;
    const deposit = parseFloat(formData.deposit_amount) || 0;

    let newPaymentStatus = 'unpaid';
    if (deposit > 0 && deposit < total) {
      newPaymentStatus = 'partial';
    } else if (deposit > 0 && deposit >= total) {
      newPaymentStatus = 'paid';
    }

    setFormData(prev => ({ ...prev, payment_status: newPaymentStatus }));
  }, [formData.deposit_amount, formData.total_amount]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCustomerSaved = useCallback((savedCustomer) => {
    setFormData(prev => ({
      ...prev,
      customer_name: savedCustomer.full_name || prev.customer_name,
      customer_email: savedCustomer.email || prev.customer_email,
      customer_phone: savedCustomer.phone || prev.customer_phone,
      customer_id: savedCustomer.id,
      linked_display_id: savedCustomer.licence_number || savedCustomer.id_number || prev.linked_display_id,
    }));
    setShowIDScanModal(false);
    alert('✅ Customer data saved and linked successfully!');
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (dateError) {
        setError(dateError);
        return;
    }
    setLoading(true);
    setError(null);
    try {
      if (!formData.customer_name || !formData.customer_email || !formData.vehicle_id) {
        throw new Error('Please fill in all required fields');
      }
      const startDate = new Date(formData.rental_start_date);
      const endDate = new Date(formData.rental_end_date);
      if (startDate >= endDate) throw new Error('End date must be after start date');
      if (startDate < new Date() && !isEdit) throw new Error('Start date cannot be in the past');

      const bookingData = {
        ...formData,
        rental_start_date: startDate.toISOString(),
        rental_end_date: endDate.toISOString(),
        updated_at: new Date().toISOString()
      };
      
      if (!isEdit) {
          bookingData.created_at = new Date().toISOString();
      }

      let result;
      if (isEdit) {
        const { data, error } = await supabase
          .from('saharax_0u4w4d_bookings')
          .update(bookingData)
          .eq('id', booking.id)
          .select().single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('saharax_0u4w4d_bookings')
          .insert([bookingData])
          .select().single();
        if (error) throw error;
        result = data;
      }
      if (onSave) onSave(result);
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
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">
                {isEdit ? t('admin.bookings.editBooking') : t('admin.bookings.addBooking')}
              </h2>
              <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
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
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2" /> Customer Information
                    </h3>
                    <button type="button" onClick={() => setShowIDScanModal(true)} className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors">
                      <Scan className="h-4 w-4 mr-2" /> Upload ID Document
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.customerName')} *</label>
                  <input type="text" name="customer_name" value={formData.customer_name} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.customerEmail')} *</label>
                  <input type="email" name="customer_email" value={formData.customer_email} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.customerPhone')}</label>
                  <input type="tel" name="customer_phone" value={formData.customer_phone} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ID/License Number</label>
                  <input type="text" name="linked_display_id" value={formData.linked_display_id} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.startDate')} *</label>
                  <input type="datetime-local" name="rental_start_date" value={formData.rental_start_date} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" required />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.endDate')} *</label>
                  <input type="datetime-local" name="rental_end_date" value={formData.rental_end_date} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" required />
                   {dateError && <p className="text-red-500 text-xs mt-1">{dateError}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.vehicle')} *</label>
                  {loadingVehicles ? (
                    <div className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-50">Loading vehicles...</div>
                  ) : (
                    <select name="vehicle_id" value={formData.vehicle_id} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" required disabled={!formData.rental_start_date || !formData.rental_end_date || dateError}>
                      <option value="">{t('admin.bookings.selectVehicle')}</option>
                      {vehicles.map(vehicle => (
                        <option key={vehicle.id} value={vehicle.id}>{vehicle.name} - {vehicle.model} ({vehicle.plate_number})</option>
                      ))}
                    </select>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.pickupLocation')}</label>
                  <input type="text" name="pickup_location" value={formData.pickup_location} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.returnLocation')}</label>
                  <input type="text" name="return_location" value={formData.return_location} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.totalAmount')} (MAD)</label>
                  <input type="number" name="total_amount" value={formData.total_amount} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" step="0.01" min="0" />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.depositAmount')} (MAD)</label>
                  <input type="number" name="deposit_amount" value={formData.deposit_amount} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" step="0.01" min="0" />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
                  <select name="payment_status" value={formData.payment_status} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 bg-gray-100 focus:ring-blue-500 focus:border-blue-500" disabled>
                    <option value="unpaid">Unpaid</option>
                    <option value="partial">Partial</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Booking Status</label>
                  <select name="booking_status" value={formData.booking_status} onChange={handleInputChange} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="pending">{t('admin.bookings.pending')}</option>
                    <option value="confirmed">{t('admin.bookings.confirmed')}</option>
                    <option value="active">{t('admin.bookings.active')}</option>
                    <option value="completed">{t('admin.bookings.completed')}</option>
                    <option value="cancelled">{t('admin.bookings.cancelled')}</option>
                  </select>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('admin.bookings.notes')}</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows={3} className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-all">{t('common.cancel')}</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all" disabled={loading || !!dateError}>
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

      <EnhancedUnifiedIDScanModal
        isOpen={showIDScanModal}
        onClose={() => setShowIDScanModal(false)}
        setFormData={setFormData}
        formData={formData}
        onCustomerSaved={handleCustomerSaved}
        customerId={formData.customer_id}
        rentalId={booking?.id}
        title="Upload ID Document"
      />
    </>
  );
};

export default UnifiedBookingFormModalWithIDScan;