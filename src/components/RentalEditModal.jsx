import React, { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import ImageUpload from './ImageUpload';

const RentalEditModal = ({ rental, isOpen, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
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
    general_notes: '',
    second_driver_name: '',
    second_driver_license: '',
    customer_id_image: null,
    second_driver_id_image: null,
  });

  // Initialize form data when rental changes
  useEffect(() => {
    if (rental && isOpen) {
      console.log('Data received in RentalEditModal:', rental);
      const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };

      const newFormData = {
        customer_name: rental.customer_name || '',
        customer_email: rental.customer_email || '',
        customer_phone: rental.customer_phone || '',
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
        general_notes: rental.general_notes || '',
        second_driver_name: rental.second_driver_name || '',
        second_driver_license: rental.second_driver_license || '',
        customer_id_image: rental.customer_id_image,
        second_driver_id_image: rental.second_driver_id_image,
      };

      setFormData(newFormData);
    }
  }, [rental, isOpen]);

  // Fetch vehicles for dropdown
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from('saharax_0u4w4d_vehicles')
          .select('id, name, model, plate_number, status')
          .order('name');

        if (error) {
          console.error('Error fetching vehicles:', error);
          return;
        }

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
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (field, file) => {
    setFormData(prev => ({
      ...prev,
      [field]: file
    }));
  };

  const validateForm = () => {
    const required = ['customer_name', 'customer_email', 'vehicle_id', 'rental_start_date', 'rental_end_date', 'pickup_location'];
    
    for (const field of required) {
      if (!formData[field]) {
        toast.error(`${field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} is required`);
        return false;
      }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.customer_email)) {
      toast.error('Please enter a valid email address');
      return false;
    }

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
      const updateData = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        vehicle_id: parseInt(formData.vehicle_id),
        rental_start_date: formData.rental_start_date,
        rental_end_date: formData.rental_end_date,
        pickup_location: formData.pickup_location,
        dropoff_location: formData.dropoff_location,
        rental_status: formData.rental_status,
        payment_status: formData.payment_status,
        notes: formData.notes,
        general_notes: formData.general_notes,
        second_driver_name: formData.second_driver_name,
        second_driver_license: formData.second_driver_license,
        updated_at: new Date().toISOString()
      };

      if (formData.total_amount) {
        updateData.total_amount = parseFloat(formData.total_amount);
      }
      if (formData.unit_price_mad) {
        updateData.unit_price_mad = parseFloat(formData.unit_price_mad);
      }
      if (formData.deposit_amount) {
        updateData.deposit_amount = parseFloat(formData.deposit_amount);
      }
      
      const uploadImage = async (file, path) => {
        if (!file || typeof file === 'string') return file;
        const { data, error } = await supabase.storage
          .from('customer-documents')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: true,
          });
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('customer-documents').getPublicUrl(data.path);
        return publicUrl;
      };

      if (formData.customer_id_image) {
        updateData.customer_id_image = await uploadImage(formData.customer_id_image, `public/${rental.id}-customer-id.png`);
      }
      if (formData.second_driver_id_image) {
        updateData.second_driver_id_image = await uploadImage(formData.second_driver_id_image, `public/${rental.id}-second-driver-id.png`);
      }

      let { error: updateError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update(updateData)
        .eq('id', rental.id);

      if (updateError) {
        throw updateError;
      }
      
      let { data: updatedRental, error: fetchError } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`*, vehicle:saharax_0u4w4d_vehicles!inner(*)`)
        .eq('id', rental.id)
        .single();
      
      if (fetchError) {
        updatedRental = { ...rental, ...updateData };
      }

      toast.success('Rental updated successfully!');
      
      if (onSuccess) {
        onSuccess(updatedRental);
      }
      
      onClose();

    } catch (err) {
      console.error('Error in handleSubmit:', err);
      toast.error(`Failed to update rental: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentVehicleDisplay = () => {
    if (!formData.vehicle_id) return '';
    
    const vehicle = vehicles.find(v => v.id.toString() === formData.vehicle_id.toString());
    if (vehicle) {
      return `${vehicle.name || ''} ${vehicle.model || ''} (${vehicle.plate_number || ''})`.trim();
    }
    
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">Edit Rental</h2>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={loading}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <Card>
            <CardHeader><CardTitle>Driver(s) Information</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              {/* Primary Driver */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Primary Driver</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Customer Name *</Label>
                    <Input id="customer_name" value={formData.customer_name} onChange={(e) => handleInputChange('customer_name', e.target.value)} placeholder="Enter customer name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_email">Email *</Label>
                    <Input id="customer_email" type="email" value={formData.customer_email} onChange={(e) => handleInputChange('customer_email', e.target.value)} placeholder="Enter email address" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input id="customer_phone" value={formData.customer_phone} onChange={(e) => handleInputChange('customer_phone', e.target.value)} placeholder="Enter phone number" />
                  </div>
                  <div className="space-y-2">
                    <Label>Customer ID Image</Label>
                    {formData.customer_id_image && <img src={formData.customer_id_image} alt="Customer ID" className="w-full h-auto rounded-md mb-2" />}
                    <ImageUpload onUpload={(file) => handleImageUpload('customer_id_image', file)} />
                  </div>
                </div>
              </div>

              <div className="border-t"></div>

              {/* Second Driver */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-gray-600">Second Driver</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="second_driver_name">Second Driver Name</Label>
                    <Input id="second_driver_name" value={formData.second_driver_name} onChange={(e) => handleInputChange('second_driver_name', e.target.value)} placeholder="Enter name" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="second_driver_license">Second Driver License</Label>
                    <Input id="second_driver_license" value={formData.second_driver_license} onChange={(e) => handleInputChange('second_driver_license', e.target.value)} placeholder="Enter license number" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Second Driver ID Image</Label>
                    {formData.second_driver_id_image && <img src={formData.second_driver_id_image} alt="Second Driver ID" className="w-full h-auto rounded-md mb-2" />}
                    <ImageUpload onUpload={(file) => handleImageUpload('second_driver_id_image', file)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Rental Details</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vehicle_id">Vehicle *</Label>
                <Select value={formData.vehicle_id} onValueChange={(value) => handleInputChange('vehicle_id', value)}>
                  <SelectTrigger className="bg-white border border-gray-300">
                    <SelectValue placeholder="Select a vehicle">{formData.vehicle_id && getCurrentVehicleDisplay() ? getCurrentVehicleDisplay() : 'Select a vehicle'}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-300 shadow-lg">
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id.toString()} className="bg-white hover:bg-gray-100 text-gray-900">
                        <div className="flex flex-col">
                          <span className="font-medium">{vehicle.name} {vehicle.model}</span>
                          <span className="text-sm text-gray-500">{vehicle.plate_number} • {vehicle.status}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental_status">Status</Label>
                <Select value={formData.rental_status} onValueChange={(value) => handleInputChange('rental_status', value)}>
                  <SelectTrigger className="bg-white border border-gray-300"><SelectValue placeholder="Select status" /></SelectTrigger>
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
                <Input id="rental_start_date" type="date" value={formData.rental_start_date} onChange={(e) => handleInputChange('rental_start_date', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rental_end_date">End Date *</Label>
                <Input id="rental_end_date" type="date" value={formData.rental_end_date} onChange={(e) => handleInputChange('rental_end_date', e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pickup_location">Pickup Location *</Label>
                <Input id="pickup_location" value={formData.pickup_location} onChange={(e) => handleInputChange('pickup_location', e.target.value)} placeholder="Enter pickup location" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dropoff_location">Dropoff Location</Label>
                <Input id="dropoff_location" value={formData.dropoff_location} onChange={(e) => handleInputChange('dropoff_location', e.target.value)} placeholder="Enter dropoff location" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Financial Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="unit_price_mad">Unit Price (MAD)</Label>
                <Input id="unit_price_mad" type="number" step="0.01" value={formData.unit_price_mad} onChange={(e) => handleInputChange('unit_price_mad', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="total_amount">Total Amount</Label>
                <Input id="total_amount" type="number" step="0.01" value={formData.total_amount} onChange={(e) => handleInputChange('total_amount', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deposit_amount">Deposit Amount</Label>
                <Input id="deposit_amount" type="number" step="0.01" value={formData.deposit_amount} onChange={(e) => handleInputChange('deposit_amount', e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment_status">Payment Status</Label>
                <Select value={formData.payment_status} onValueChange={(value) => handleInputChange('payment_status', value)}>
                  <SelectTrigger className="bg-white border border-gray-300"><SelectValue placeholder="Select payment status" /></SelectTrigger>
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

          <Card>
            <CardHeader><CardTitle>Additional Information</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={formData.notes} onChange={(e) => handleInputChange('notes', e.target.value)} placeholder="Enter any additional notes" rows={3} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="general_notes">General Notes</Label>
                <Textarea id="general_notes" value={formData.general_notes} onChange={(e) => handleInputChange('general_notes', e.target.value)} placeholder="Enter any general notes" rows={3} />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Update Rental
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RentalEditModal;