import React, { useState, useRef, useEffect } from 'react';
import { X, Camera, Upload, User, Mail, Phone, Calendar, MapPin, CreditCard, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { performOCR } from '../../utils/ocr/ocrService';
import { extractFieldsFromOCR } from '../../utils/ocr/fieldMapping';
import unifiedCustomerService from '../../services/UnifiedCustomerService';

const BookingFormModalWithIDScan = ({ isOpen, onClose, onSubmit, editingRental = null }) => {
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    vehicle_id: '',
    rental_start_date: '',
    rental_end_date: '',
    total_cost: '',
    deposit_amount: '',
    notes: ''
  });

  // ID scanning state
  const [idScanImage, setIdScanImage] = useState(null);
  const [idScanPreview, setIdScanPreview] = useState(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [ocrResults, setOcrResults] = useState(null);
  const [ocrError, setOcrError] = useState(null);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Refs
  const fileInputRef = useRef(null);

  // Load vehicles on mount
  useEffect(() => {
    if (isOpen) {
      loadVehicles();
      
      // If editing, populate form
      if (editingRental) {
        setFormData({
          customer_name: editingRental.customer_name || '',
          customer_email: editingRental.customer_email || '',
          customer_phone: editingRental.customer_phone || '',
          vehicle_id: editingRental.vehicle_id || '',
          rental_start_date: editingRental.rental_start_date || '',
          rental_end_date: editingRental.rental_end_date || '',
          total_cost: editingRental.total_cost || '',
          deposit_amount: editingRental.deposit_amount || '',
          notes: editingRental.notes || ''
        });
      }
    }
  }, [isOpen, editingRental]);

  const loadVehicles = async () => {
    setLoadingVehicles(true);
    try {
      const { data: vehicleData, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*')
        .eq('is_available', true)
        .order('make', { ascending: true });

      if (error) {
        console.error({
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code
        });
        setError('Failed to load vehicles');
      } else {
        setVehicles(vehicleData || []);
        console.log(`✅ Loaded ${vehicleData?.length || 0} available vehicles`);
      }
    } catch (err) {
      console.error({
        message: err?.message,
        details: err?.details,
        hint: err?.hint,
        code: err?.code
      });
      setError('Failed to load vehicles');
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      console.log('📁 ID scan image selected:', file.name, file.size, 'bytes');
      
      setIdScanImage(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setIdScanPreview(previewUrl);
      
      // Process OCR
      processOCR(file);
    }
  };

  const processOCR = async (imageFile) => {
    setIsProcessingOCR(true);
    setOcrError(null);
    setOcrResults(null);

    try {
      console.log('🔍 Starting OCR processing...');
      
      // Perform OCR
      const ocrText = await performOCR(imageFile);
      console.log('📄 OCR raw text:', ocrText);

      if (!ocrText || ocrText.trim().length === 0) {
        throw new Error('No text detected in the image');
      }

      // Extract structured data
      const extractedData = extractFieldsFromOCR(ocrText);
      console.log('📋 Extracted data:', extractedData);

      setOcrResults(extractedData);

      // Auto-fill form with high-confidence data
      if (extractedData.full_name && extractedData.confidence >= 0.8) {
        setFormData(prev => ({
          ...prev,
          customer_name: extractedData.full_name
        }));
      }

      console.log('✅ OCR processing completed successfully');

    } catch (error) {
      console.error({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      setOcrError(error.message || 'Failed to process ID document');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      console.log('📝 Submitting rental form...');
      console.log('📋 Form data:', formData);
      console.log('🖼️ ID scan image:', !!idScanImage);

      // Validate required fields
      if (!formData.customer_name || !formData.customer_email || !formData.vehicle_id || !formData.rental_start_date) {
        throw new Error('Please fill in all required fields');
      }

      // Prepare rental data
      const rentalData = {
        ...formData,
        id: editingRental?.id || undefined // Include ID for updates
      };

      // Step 1: Create/Update customer profile with ID scan
      let customerProfile = null;
      try {
        console.log('👤 Creating/updating customer profile...');
        
        const customerData = {
          customer_name: formData.customer_name,
          customer_email: formData.customer_email,
          customer_phone: formData.customer_phone,
          // Add OCR data if available with high confidence
          ...(ocrResults && ocrResults.confidence >= 0.8 && {
            id_number: ocrResults.id_number,
            date_of_birth: ocrResults.date_of_birth,
            address: ocrResults.address,
            nationality: ocrResults.nationality || 'Moroccan'
          })
        };

        // Create customer profile with ID scan image
        customerProfile = await unifiedCustomerService.upsertCustomer(
          customerData,
          idScanImage, // Pass the actual image file
          0.80 // Minimum confidence for OCR updates
        );

        if (customerProfile && customerProfile.id) {
          console.log('✅ Customer profile created/updated with ID:', customerProfile.id);
          
          // Add customer_id to rental data
          rentalData.customer_id = customerProfile.id;
        } else {
          console.warn('⚠️ Customer profile creation returned no ID, proceeding without linking');
        }

      } catch (customerError) {
        console.warn('⚠️ Customer profile creation failed:', customerError);
        // Continue with rental creation even if customer profile fails
      }

      // Step 2: Submit rental data
      console.log('🚗 Submitting rental with customer_id:', rentalData.customer_id);
      
      await onSubmit(rentalData);

      console.log('✅ Rental submitted successfully');

      // Reset form
      resetForm();
      onClose();

    } catch (error) {
      console.error({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      });
      setError(error.message || 'Failed to submit rental');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      vehicle_id: '',
      rental_start_date: '',
      rental_end_date: '',
      total_cost: '',
      deposit_amount: '',
      notes: ''
    });
    setIdScanImage(null);
    setIdScanPreview(null);
    setOcrResults(null);
    setOcrError(null);
    setError(null);
    
    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingRental ? 'Edit Rental' : 'New Rental with ID Scan'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Customer Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Customer Information
                </h3>

                {/* ID Document Upload */}
                <div className="mb-6 p-4 border-2 border-dashed border-gray-300 rounded-lg">
                  <div className="text-center">
                    <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 mb-2">Upload ID Document for Auto-Fill</p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose ID Document
                    </button>
                  </div>

                  {/* Image Preview */}
                  {idScanPreview && (
                    <div className="mt-4">
                      <img
                        src={idScanPreview}
                        alt="ID Document Preview"
                        className="w-full h-32 object-contain border border-gray-200 rounded"
                      />
                    </div>
                  )}

                  {/* OCR Processing Status */}
                  {isProcessingOCR && (
                    <div className="mt-4 flex items-center justify-center text-blue-600">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      <span className="text-sm">Processing ID document...</span>
                    </div>
                  )}

                  {/* OCR Results */}
                  {ocrResults && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                      <div className="flex items-center mb-2">
                        <CheckCircle className="h-4 w-4 text-green-400 mr-2" />
                        <span className="text-sm font-medium text-green-800">
                          ID Document Processed (Confidence: {Math.round(ocrResults.confidence * 100)}%)
                        </span>
                      </div>
                      {ocrResults.confidence >= 0.8 && (
                        <p className="text-xs text-green-700">
                          High confidence data has been auto-filled in the form below.
                        </p>
                      )}
                    </div>
                  )}

                  {/* OCR Error */}
                  {ocrError && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                      <div className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-400 mr-2" />
                        <span className="text-sm text-red-800">{ocrError}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Customer Form Fields */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      name="customer_name"
                      value={formData.customer_name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="customer_email"
                      value={formData.customer_email}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="customer_phone"
                      value={formData.customer_phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column - Rental Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                  Rental Information
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle *
                    </label>
                    <select
                      name="vehicle_id"
                      value={formData.vehicle_id}
                      onChange={handleInputChange}
                      required
                      disabled={loadingVehicles}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">
                        {loadingVehicles ? 'Loading vehicles...' : 'Select a vehicle'}
                      </option>
                      {vehicles.map((vehicle) => (
                        <option key={vehicle.id} value={vehicle.id}>
                          {vehicle.make} {vehicle.model} ({vehicle.year}) - {vehicle.license_plate}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        name="rental_start_date"
                        value={formData.rental_start_date}
                        onChange={handleInputChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        End Date
                      </label>
                      <input
                        type="date"
                        name="rental_end_date"
                        value={formData.rental_end_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Cost
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="total_cost"
                        value={formData.total_cost}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deposit Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        name="deposit_amount"
                        value={formData.deposit_amount}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional notes..."
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="mt-6 flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isProcessingOCR}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {editingRental ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                editingRental ? 'Update Rental' : 'Create Rental'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingFormModalWithIDScan;