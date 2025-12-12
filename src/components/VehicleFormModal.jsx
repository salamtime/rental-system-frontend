import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  Car, 
  Plus, 
  Edit, 
  Upload, 
  FileText, 
  Calendar,
  Gauge,
  Wrench,
  AlertCircle,
  DollarSign,
  Receipt,
  Image as ImageIcon
} from 'lucide-react';
import { supabase } from '../../utils/supabaseClient';
import VehicleImageUpload from "./VehicleImageUpload";
import toast from 'react-hot-toast';

const VehicleFormModal = ({ 
  vehicle = null, 
  isOpen, 
  onClose, 
  onSuccess 
}) => {
  const isEditing = !!vehicle;
  
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    vehicle_type: 'Quad',
    engine_power_cc: 0,
    seating_capacity: 1,
    color: '',
    plate_number: '',
    status: 'Available',
    current_odometer_km: 0,
    engine_hours: 0,
    last_oil_change_date: '',
    last_oil_change_odometer_km: 0,
    general_notes: '',
    system_notes: '',
    // Purchase cost fields
    purchase_cost_mad: '',
    purchase_date: '',
    supplier: '',
    invoice_url: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [vehicleImage, setVehicleImage] = useState('');
  const [plateError, setPlateError] = useState('');

  // Load vehicle data when editing
  useEffect(() => {
    if (isEditing && vehicle) {
      setFormData({
        name: vehicle.name || '',
        model: vehicle.model || '',
        vehicle_type: vehicle.vehicle_type || 'Quad',
        engine_power_cc: vehicle.engine_power_cc || 0,
        seating_capacity: vehicle.seating_capacity || 1,
        color: vehicle.color || '',
        plate_number: vehicle.plate_number || '',
        status: vehicle.status || 'Available',
        current_odometer_km: vehicle.current_odometer_km || 0,
        engine_hours: vehicle.engine_hours || 0,
        last_oil_change_date: vehicle.last_oil_change_date || '',
        last_oil_change_odometer_km: vehicle.last_oil_change_odometer_km || 0,
        general_notes: vehicle.general_notes || '',
        system_notes: vehicle.system_notes || '',
        // Load purchase cost fields
        purchase_cost_mad: vehicle.purchase_cost_mad || '',
        purchase_date: vehicle.purchase_date || '',
        supplier: vehicle.supplier || '',
        invoice_url: vehicle.invoice_url || ''
      });
      
      // Handle multiple possible image URL field names
      const imageUrl = vehicle.image_url || vehicle.imageUrl || vehicle.photo_url || vehicle.photoUrl || "";
      if (imageUrl) {
        setVehicleImage(imageUrl);
      }
      
      if (vehicle.documents) {
        setUploadedFiles(vehicle.documents);
      }
    }
  }, [isEditing, vehicle]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear plate error when user starts typing
    if (field === 'plate_number' && plateError) {
      setPlateError('');
    }
  };

  // Validate plate number uniqueness
  const validatePlateNumber = async (plateNumber) => {
    if (!plateNumber.trim()) {
      setPlateError('Plate number is required.');
      return false;
    }

    try {
      let query = supabase
        .from('saharax_0u4w4d_vehicles')
        .select('id')
        .eq('plate_number', plateNumber.trim())
        .limit(1);

      // Exclude current vehicle when editing
      if (isEditing && vehicle?.id) {
        query = query.neq('id', vehicle.id);
      }

      const { data, error } = await query;

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

  const handleImageChange = (imageUrl) => {
    setVehicleImage(imageUrl);
    if (imageUrl) {
      toast.success('Vehicle image uploaded successfully');
    }
  };

  const handleDocumentUpload = async (files) => {
    try {
      // This would be implemented similar to the image upload
      // For now, just add to local state
      const newFiles = Array.from(files).map(file => ({
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: file.name,
        type: file.type,
        size: file.size,
        url: URL.createObjectURL(file), // Temporary URL for preview
        uploadedAt: new Date().toISOString()
      }));
      
      setUploadedFiles(prev => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} document(s) uploaded successfully`);
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Failed to upload documents');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name || !formData.model || !formData.plate_number) {
      toast.error('Please fill in all required fields: Vehicle Name, Model, and Plate Number');
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
        name: formData.name,
        model: formData.model,
        vehicle_type: formData.vehicle_type,
        engine_power_cc: parseInt(formData.engine_power_cc) || 0,
        seating_capacity: parseInt(formData.seating_capacity) || 1,
        color: formData.color,
        plate_number: formData.plate_number.trim(),
        status: formData.status,
        current_odometer_km: parseFloat(formData.current_odometer_km) || 0,
        engine_hours: parseFloat(formData.engine_hours) || 0,
        last_oil_change_date: formData.last_oil_change_date || null,
        last_oil_change_odometer_km: parseFloat(formData.last_oil_change_odometer_km) || 0,
        general_notes: formData.general_notes,
        system_notes: formData.system_notes,
        image_url: vehicleImage,
        documents: uploadedFiles,
        // Add purchase cost fields
        purchase_cost_mad: formData.purchase_cost_mad ? parseFloat(formData.purchase_cost_mad) : null,
        purchase_date: formData.purchase_date || null,
        supplier: formData.supplier.trim() || null,
        invoice_url: formData.invoice_url.trim() || null
      };

      console.log('🚀 Submitting vehicle data:', vehicleData);

      let result;
      if (isEditing) {
        result = await supabase
          .from('saharax_0u4w4d_vehicles')
          .update(vehicleData)
          .eq('id', vehicle.id)
          .select();
      } else {
        result = await supabase
          .from('saharax_0u4w4d_vehicles')
          .insert([vehicleData])
          .select();
      }

      const { data, error } = result;

      if (error) {
        // Handle specific constraint violations
        if (error.code === '23505' && error.message.includes('plate_number')) {
          setPlateError('This plate number is already assigned to another vehicle.');
          return;
        }
        throw error;
      }

      console.log('✅ Vehicle saved successfully:', data);
      toast.success(`Vehicle ${isEditing ? 'updated' : 'created'} successfully`);
      onSuccess();
      
      // Reset form if creating new vehicle
      if (!isEditing) {
        setFormData({
          name: '',
          model: '',
          vehicle_type: 'Quad',
          engine_power_cc: 0,
          seating_capacity: 1,
          color: '',
          plate_number: '',
          status: 'Available',
          current_odometer_km: 0,
          engine_hours: 0,
          last_oil_change_date: '',
          last_oil_change_odometer_km: 0,
          general_notes: '',
          system_notes: '',
          purchase_cost_mad: '',
          purchase_date: '',
          supplier: '',
          invoice_url: ''
        });
        setVehicleImage('');
        setUploadedFiles([]);
      }
      setPlateError('');
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(`Failed to ${isEditing ? 'update' : 'create'} vehicle: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEditing ? <Edit className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {isEditing ? `Edit Vehicle: ${vehicle?.name}` : 'Add New Vehicle'}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Create a new vehicle with comprehensive fleet management
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Vehicle Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., ATV-001, Raptor-Blue"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    placeholder="e.g., Yamaha Raptor 700, Honda TRX450R"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                  <select
                    id="vehicle_type"
                    value={formData.vehicle_type}
                    onChange={(e) => handleInputChange('vehicle_type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="Quad">Quad</option>
                    <option value="ATV">ATV</option>
                    <option value="UTV">UTV</option>
                    <option value="Motorcycle">Motorcycle</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="engine_power_cc">Engine Power (CC)</Label>
                  <Input
                    id="engine_power_cc"
                    type="number"
                    min="0"
                    value={formData.engine_power_cc}
                    onChange={(e) => handleInputChange('engine_power_cc', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="seating_capacity">Seating Capacity</Label>
                  <Input
                    id="seating_capacity"
                    type="number"
                    min="1"
                    value={formData.seating_capacity}
                    onChange={(e) => handleInputChange('seating_capacity', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    value={formData.color}
                    onChange={(e) => handleInputChange('color', e.target.value)}
                    placeholder="e.g., Red, Blue, Black, Camo"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="plate_number">Plate Number *</Label>
                  <Input
                    id="plate_number"
                    value={formData.plate_number}
                    onChange={(e) => handleInputChange('plate_number', e.target.value)}
                    placeholder="e.g., ABC-123, XYZ-456"
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
            </CardContent>
          </Card>

          {/* ACQUISITION & PURCHASE INFORMATION */}
          <Card style={{ border: '3px solid blue', backgroundColor: '#f0f8ff' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'blue', fontSize: '20px' }}>
                <DollarSign className="h-6 w-6" />
                💰 Acquisition & Purchase Information 💰
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_cost_mad" style={{ fontWeight: 'bold', color: 'blue' }}>Purchase Cost (MAD)</Label>
                  <Input
                    id="purchase_cost_mad"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.purchase_cost_mad}
                    onChange={(e) => handleInputChange('purchase_cost_mad', e.target.value)}
                    placeholder="e.g., 45000.00"
                    style={{ border: '2px solid blue' }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="purchase_date" style={{ fontWeight: 'bold', color: 'blue' }}>Purchase Date</Label>
                  <Input
                    id="purchase_date"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                    style={{ border: '2px solid blue' }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="supplier" style={{ fontWeight: 'bold', color: 'blue' }}>Supplier / Seller</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => handleInputChange('supplier', e.target.value)}
                    placeholder="e.g., Yamaha Morocco, Local Dealer"
                    style={{ border: '2px solid blue' }}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="invoice_url" style={{ fontWeight: 'bold', color: 'blue' }}>Invoice/Receipt URL</Label>
                  <Input
                    id="invoice_url"
                    type="url"
                    value={formData.invoice_url}
                    onChange={(e) => handleInputChange('invoice_url', e.target.value)}
                    placeholder="https://example.com/invoice.pdf"
                    style={{ border: '2px solid blue' }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance & Odometer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Maintenance & Odometer
              </CardTitle>
              <p className="text-sm text-gray-600">For New Vehicle</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="current_odometer_km">Current Odometer (km)</Label>
                  <Input
                    id="current_odometer_km"
                    type="number"
                    min="0"
                    value={formData.current_odometer_km}
                    onChange={(e) => handleInputChange('current_odometer_km', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="engine_hours">Engine Hours</Label>
                  <Input
                    id="engine_hours"
                    type="number"
                    min="0"
                    value={formData.engine_hours}
                    onChange={(e) => handleInputChange('engine_hours', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_oil_change_date">Last Oil Change Date</Label>
                  <Input
                    id="last_oil_change_date"
                    type="date"
                    value={formData.last_oil_change_date}
                    onChange={(e) => handleInputChange('last_oil_change_date', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="last_oil_change_odometer_km">Last Oil Change Odometer (km)</Label>
                  <Input
                    id="last_oil_change_odometer_km"
                    type="number"
                    min="0"
                    value={formData.last_oil_change_odometer_km}
                    onChange={(e) => handleInputChange('last_oil_change_odometer_km', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-900">Maintenance Setup</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      Set initial maintenance information for this vehicle. You can add detailed maintenance records after the vehicle is created.
                    </p>
                    <p className="text-xs text-blue-600 mt-2">
                      💡 Tip: After creating the vehicle, you can access the full maintenance panel by editing the vehicle to add detailed maintenance records, schedule services, and track maintenance history with odometer-based oil change tracking.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle Image - NOW USING NEW COMPONENT */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Vehicle Image
              </CardTitle>
            </CardHeader>
            <CardContent>
              <VehicleImageUpload
                vehicleId={vehicle?.id?.toString() || 'new'}
                currentImageUrl={vehicleImage}
                onImageChange={handleImageChange}
                disabled={false}
                className="w-full"
              />
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documents (Legal & Administrative)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length > 0 ? (
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <span className="text-sm">{file.name}</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUploadedFiles(prev => prev.filter((_, i) => i !== index));
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                  <p>No documents uploaded yet for this {isEditing ? 'vehicle' : 'new vehicle'}.</p>
                </div>
              )}
              
              <div className="mt-4 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (files.length > 0) handleDocumentUpload(files);
                  }}
                  className="hidden"
                  id="document-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('document-upload').click()}
                >
                  Click to upload documents
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  or drag and drop files here
                </p>
                <p className="text-xs text-gray-500">
                  PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB each
                </p>
              </div>
              
              <div className="mt-4 bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Document Upload Tips</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Upload registration, insurance, and maintenance documents</li>
                  <li>• Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG</li>
                  <li>• Maximum file size: 10MB per file</li>
                  <li>• Multiple files can be uploaded at once</li>
                  <li>• Files are stored in vehicle-specific folders for organization</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="general_notes">General Notes</Label>
                <Textarea
                  id="general_notes"
                  value={formData.general_notes}
                  onChange={(e) => handleInputChange('general_notes', e.target.value)}
                  placeholder="Any additional notes about this vehicle, special instructions, known issues, modifications, etc..."
                  rows={3}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="system_notes">System Notes</Label>
                <Textarea
                  id="system_notes"
                  value={formData.system_notes}
                  onChange={(e) => handleInputChange('system_notes', e.target.value)}
                  placeholder="Internal notes for staff, booking system notes, etc..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || plateError}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {isEditing ? <Edit className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  {isEditing ? 'Update Vehicle' : 'Create Vehicle'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleFormModal;
