import React, { useState, useEffect } from 'react';
import { X, Loader2, Scan, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import EnhancedUnifiedIDScanModal from './customers/EnhancedUnifiedIDScanModal';
import unifiedCustomerService from '../services/UnifiedCustomerService';

const RentalEditModalWithIDScan = ({ rental, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [showIDScanModal, setShowIDScanModal] = useState(false);
  const [customerData, setCustomerData] = useState(null);
  const [idScanImage, setIdScanImage] = useState(null);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_id: null, // Store customer ID for linking
    vehicle_id: '',
    rental_start_date: '',
    rental_end_date: '',
    pickup_location: '',
    dropoff_location: '',
    total_amount: '',
    unit_price_mad: '',
    deposit_amount: '',
    rental_status: '',
    payment_status: '',
    notes: '',
    general_notes: ''
  });

  // Initialize form data when rental changes
  useEffect(() => {
    if (rental && isOpen) {
      console.log('🔍 DEBUG: Full rental object:', rental);
      
      // Format dates properly
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      const newFormData = {
        customer_name: rental.customer_name || '',
        customer_email: rental.customer_email || '',
        customer_phone: rental.customer_phone || '',
        customer_id: rental.customer_id || null,
        vehicle_id: rental.vehicle_id ? rental.vehicle_id.toString() : '',
        rental_start_date: formatDateForInput(rental.rental_start_date),
        rental_end_date: formatDateForInput(rental.rental_end_date),
        pickup_location: rental.pickup_location || '',
        dropoff_location: rental.dropoff_location || '',
        total_amount: rental.total_amount ? rental.total_amount.toString() : '',
        unit_price_mad: rental.unit_price_mad ? rental.unit_price_mad.toString() : '',
        deposit_amount: rental.deposit_amount ? rental.deposit_amount.toString() : '',
        rental_status: rental.rental_status || 'scheduled',
        payment_status: rental.payment_status || 'unpaid',
        notes: rental.notes || '',
        general_notes: rental.general_notes || ''
      };

      console.log('✅ Setting form data:', newFormData);
      setFormData(newFormData);
    }
  }, [rental, isOpen]);

  // Fetch vehicles for dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        console.log('🚗 Fetching vehicles for dropdown...');
        
        const { data, error } = await supabase
          .from('saharax_0u4w4d_vehicles')
          .select('id, name, model, plate_number, status')
          .order('name');

        if (error) {
          console.error('Error fetching vehicles:', error);
          return;
        }

        console.log('✅ Vehicles fetched:', data?.length || 0, data);
        setVehicles(data || []);
      } catch (err) {
        console.error('Unexpected error fetching vehicles:', err);
      }
    };

    if (isOpen) {
      fetchVehicles();
    }
  }, [isOpen]);

  const handleInputChange = (field, value) => {
    console.log(`📝 Updating ${field} to:`, value);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle customer saved from ID scan
  const handleCustomerSaved = (savedCustomer, image = null) => {
    console.log('✅ Customer saved from ID scan:', savedCustomer);
    console.log('🖼️ Image received:', !!image);
    
    // Store customer data and image for later use during rental update
    setCustomerData(savedCustomer);
    setIdScanImage(image);
    
    // Update form data with saved customer information
    setFormData(prev => ({
      ...prev,
      customer_name: savedCustomer.full_name || savedCustomer.customer_name || prev.customer_name,
      customer_email: savedCustomer.email || savedCustomer.customer_email || prev.customer_email,
      customer_phone: savedCustomer.phone || savedCustomer.customer_phone || prev.customer_phone,
      customer_id: savedCustomer.id // Store customer ID for linking
    }));
    
    setShowIDScanModal(false);
    toast.success('Customer information updated from ID scan');
  };

  const validateForm = () => {
    const required = ['customer_name', 'customer_email', 'vehicle_id', 'rental_start_date', 'rental_end_date', 'pickup_location'];
    
    for (const field of required) {
      if (!formData[field]) {
        toast.error(`${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`);
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

    // Validate dates
    const startDate = new Date(formData.rental_start_date);
    const endDate = new Date(formData.rental_end_date);
    
    if (endDate <= startDate) {
      toast.error('End date must be after start date');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Starting rental update with automatic customer profile creation/update...');
      
      let customerId = formData.customer_id; // Use existing customer ID if available
      
      // Step 1: Create or update customer profile automatically
      if (customerData || (formData.customer_name && formData.customer_email)) {
        console.log('👤 Creating/updating customer profile automatically...');
        
        const customerToSave = customerData || {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone
        };
        
        console.log('👤 Customer data to save:', customerToSave);
        
        // Create or update customer using UnifiedCustomerService
        const savedCustomer = await unifiedCustomerService.upsertCustomer(
          customerToSave,
          idScanImage, // Pass the ID scan image if available
          0.80 // Minimum confidence for OCR updates
        );
        
        if (savedCustomer && savedCustomer.id) {
          customerId = savedCustomer.id;
          console.log('✅ Customer profile created/updated with ID:', customerId);
        } else {
          throw new Error('Failed to create/update customer profile');
        }
      }
      
      // Step 2: Prepare update data with customer link
      const updateData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        customer_id: customerId, // Link to customer record
        vehicle_id: parseInt(formData.vehicle_id),
        rental_start_date: formData.rental_start_date,
        rental_end_date: formData.rental_end_date,
        pickup_location: formData.pickup_location,
        dropoff_location: formData.dropoff_location,
        rental_status: formData.rental_status,
        payment_status: formData.payment_status,
        notes: formData.notes,
        general_notes: formData.general_notes,
        updated_at: new Date().toISOString()
      };

      // Convert numeric fields
      if (formData.total_amount) {
        updateData.total_amount = parseFloat(formData.total_amount);
      }
      if (formData.unit_price_mad) {
        updateData.unit_price_mad = parseFloat(formData.unit_price_mad);
      }
      if (formData.deposit_amount) {
        updateData.deposit_amount = parseFloat(formData.deposit_amount);
      }

      console.log('💾 Updating rental with ID:', rental.id);
      console.log('💾 Update data:', updateData);

      // Update rental
      let { error: updateError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update(updateData)
        .eq('id', rental.id);

      // Try fallback table if primary fails
      if (updateError && updateError.code === '42P01') {
        console.log('🔄 Trying fallback table for update: saharax_0u4w4d_rentals');
        
        const fallbackResult = await supabase
          .from('saharax_0u4w4d_rentals')
          .update(updateData)
          .eq('id', rental.id);

        updateError = fallbackResult.error;
      }

      if (updateError) {
        console.error('❌ Error updating rental:', updateError);
        throw updateError;
      }

      console.log('✅ Rental updated successfully');

      // Fetch the updated rental with vehicle data
      let { data: updatedRental, error: fetchError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          *,
          vehicle:saharax_0u4w4d_vehicles!inner(
            id,
            name,
            model,
            plate_number,
            status
          )
        `)
        .eq('id', rental.id)
        .single();

      // Try fallback table for fetch if primary fails
      if (fetchError && fetchError.code === '42P01') {
        console.log('🔄 Trying fallback table for fetch: saharax_0u4w4d_rentals');
        
        const fallbackFetchResult = await supabase
          .from('saharax_0u4w4d_rentals')
          .select(`
            *,
            vehicle:saharax_0u4w4d_vehicles!inner(
              id,
              name,
              model,
              plate_number,
              status
            )
          `)
          .eq('id', rental.id)
          .single();

        updatedRental = fallbackFetchResult.data;
        fetchError = fallbackFetchResult.error;
      }

      if (fetchError) {
        console.error('⚠️ Error fetching updated rental:', fetchError);
        updatedRental = { ...rental, ...updateData };
      }

      console.log('✅ Updated rental data:', updatedRental);
      toast.success('Rental updated successfully with customer profile!');
      
      // Call success callback with updated data
      if (onSuccess) {
        onSuccess(updatedRental);
      }
      
      onClose();

    } catch (err) {
      console.error('❌ Error in handleSubmit:', err);
      toast.error(`Failed to update rental: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get the current vehicle display name
  const getCurrentVehicleDisplay = () => {
    if (!formData.vehicle_id) return '';
    
    const vehicle = vehicles.find(v => v.id.toString() === formData.vehicle_id.toString());
    if (vehicle) {
      return `${vehicle.name || ''} ${vehicle.model || ''} (${vehicle.plate_number || ''})`.trim();
    }
    
    // Fallback to rental vehicle data if vehicles not loaded yet
    if (rental?.vehicle) {
      const parts = [];
      if (rental.vehicle.name) parts.push(rental.vehicle.name);
      if (rental.vehicle.model) parts.push(rental.vehicle.model);
      if (rental.vehicle.plate_number) parts.push(`(${rental.vehicle.plate_number})`);
      return parts.join(' ');
    }
    
    return '';
  };

  if (!isOpen || !rental) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-2xl font-bold">Edit Rental</h2>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Customer Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Customer Information
                    <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Auto-creates/updates customer profile
                    </span>
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowIDScanModal(true)}
                    disabled={loading}
                  >
                    <Scan className="h-4 w-4 mr-2" />
                    Upload ID Document
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Customer Data Preview */}
                {customerData && (
                  <div className="md:col-span-2 mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                    <div className="flex items-center mb-2">
                      <svg className="h-4 w-4 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="text-sm font-medium text-green-800">ID Document Scanned</span>
                    </div>
                    <p className="text-xs text-green-700">
                      Customer profile will be {formData.customer_id ? 'updated' : 'created'} automatically with extracted data and ID scan image.
                    </p>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Customer Name *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => handleInputChange('customer_name', e.target.value)}
                    placeholder="Enter customer name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => handleInputChange('customer_email', e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Phone</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                    placeholder="Enter phone number"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Vehicle and Rental Details */}
            <Card>
              <CardHeader>
                <CardTitle>Rental Details</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vehicle_id">Vehicle *</Label>
                  <Select 
                    value={formData.vehicle_id} 
                    onValueChange={(value) => handleInputChange('vehicle_id', value)}
                  >
                    <SelectTrigger className="bg-white border border-gray-300">
                      <SelectValue placeholder="Select a vehicle">
                        {formData.vehicle_id && getCurrentVehicleDisplay() ? 
                          getCurrentVehicleDisplay() : 
                          'Select a vehicle'
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 shadow-lg">
                      {vehicles.map((vehicle) => (
                        <SelectItem 
                          key={vehicle.id} 
                          value={vehicle.id.toString()}
                          className="bg-white hover:bg-gray-100 text-gray-900"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {vehicle.name} {vehicle.model}
                            </span>
                            <span className="text-sm text-gray-500">
                              {vehicle.plate_number} • {vehicle.status}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rental_status">Status</Label>
                  <Select 
                    value={formData.rental_status} 
                    onValueChange={(value) => handleInputChange('rental_status', value)}
                  >
                    <SelectTrigger className="bg-white border border-gray-300">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 shadow-lg">
                      <SelectItem value="scheduled" className="bg-white hover:bg-gray-100">Scheduled</SelectItem>
                      <SelectItem value="active" className="bg-white hover:bg-gray-100">Active</SelectItem>
                      <SelectItem value="completed" className="bg-white hover:bg-gray-100">Completed</SelectItem>
                      <SelectItem value="cancelled" className="bg-white hover:bg-gray-100">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rental_start_date">Start Date *</Label>
                  <Input
                    id="rental_start_date"
                    type="date"
                    value={formData.rental_start_date}
                    onChange={(e) => handleInputChange('rental_start_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rental_end_date">End Date *</Label>
                  <Input
                    id="rental_end_date"
                    type="date"
                    value={formData.rental_end_date}
                    onChange={(e) => handleInputChange('rental_end_date', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickup_location">Pickup Location *</Label>
                  <Input
                    id="pickup_location"
                    value={formData.pickup_location}
                    onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                    placeholder="Enter pickup location"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dropoff_location">Dropoff Location</Label>
                  <Input
                    id="dropoff_location"
                    value={formData.dropoff_location}
                    onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                    placeholder="Enter dropoff location"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle>Financial Information</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_price_mad">Unit Price (MAD)</Label>
                  <Input
                    id="unit_price_mad"
                    type="number"
                    step="0.01"
                    value={formData.unit_price_mad}
                    onChange={(e) => handleInputChange('unit_price_mad', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Total Amount</Label>
                  <Input
                    id="total_amount"
                    type="number"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => handleInputChange('total_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Deposit Amount</Label>
                  <Input
                    id="deposit_amount"
                    type="number"
                    step="0.01"
                    value={formData.deposit_amount}
                    onChange={(e) => handleInputChange('deposit_amount', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment_status">Payment Status</Label>
                  <Select 
                    value={formData.payment_status} 
                    onValueChange={(value) => handleInputChange('payment_status', value)}
                  >
                    <SelectTrigger className="bg-white border border-gray-300">
                      <SelectValue placeholder="Select payment status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-300 shadow-lg">
                      <SelectItem value="unpaid" className="bg-white hover:bg-gray-100">Unpaid</SelectItem>
                      <SelectItem value="partial" className="bg-white hover:bg-gray-100">Partial</SelectItem>
                      <SelectItem value="paid_in_full" className="bg-white hover:bg-gray-100">Paid in Full</SelectItem>
                      <SelectItem value="refunded" className="bg-white hover:bg-gray-100">Refunded</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="Enter any additional notes"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="general_notes">General Notes</Label>
                  <Textarea
                    id="general_notes"
                    value={formData.general_notes}
                    onChange={(e) => handleInputChange('general_notes', e.target.value)}
                    placeholder="Enter any general notes"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Rental
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Enhanced Unified ID Scan Modal */}
      <EnhancedUnifiedIDScanModal
        isOpen={showIDScanModal}
        onClose={() => setShowIDScanModal(false)}
        onScanComplete={handleCustomerSaved}
        customerId={formData.customer_id} // Pass customer ID for linking
        title="Upload ID Document"
      />
    </>
  );
};

export default RentalEditModalWithIDScan;