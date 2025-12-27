import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, FileText, Trash2 } from 'lucide-react';
import FuelTransactionService from '../../services/FuelTransactionService';

const AddFuelTransactionModal = ({ isOpen, onClose, onSave, vehicles = [], editTransaction = null }) => {
  const [formData, setFormData] = useState({
    transaction_date: new Date().toISOString().split('T')[0],
    transaction_type: 'tank_refill',
    vehicle_id: '',
    amount: '',
    cost: '',
    fuel_type: 'gasoline',
    fuel_station: '',
    location: '',
    odometer_reading: '',
    filled_by: '',
    notes: '',
    invoice_image: null
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageInfo, setExistingImageInfo] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isOpen) {
      if (editTransaction) {
        console.log('📝 EDIT MODE: Populating form with transaction:', editTransaction);
        
        // Extract the real ID from prefixed ID (e.g., "refill-123" -> "123")
        const realId = editTransaction.id?.replace(/^(refill|withdrawal)-/, '') || editTransaction.id;
        
        setFormData({
          id: realId, // Store the real database ID
          transaction_date: editTransaction.transaction_date?.split('T')[0] || new Date().toISOString().split('T')[0],
          transaction_type: editTransaction.transaction_type || 'tank_refill',
          vehicle_id: editTransaction.vehicle_id || '',
          amount: editTransaction.amount?.toString() || '',
          cost: editTransaction.cost?.toString() || '',
          fuel_type: editTransaction.fuel_type || 'gasoline',
          fuel_station: editTransaction.fuel_station || '',
          location: editTransaction.location || '',
          odometer_reading: editTransaction.odometer_reading?.toString() || '',
          filled_by: editTransaction.filled_by || editTransaction.created_by || '',
          notes: editTransaction.notes || '',
          invoice_image: editTransaction.invoice_image || null // Preserve original image data
        });
        
        // Handle existing invoice image preview
        if (editTransaction.invoice_image) {
          console.log('🖼️ Processing existing invoice image:', editTransaction.invoice_image);
          
          // Check if it's a base64 image (has 'data' property with base64 string)
          if (editTransaction.invoice_image.data) {
            console.log('✅ Base64 image detected, setting preview');
            setImagePreview(editTransaction.invoice_image.data);
            setExistingImageInfo({
              name: editTransaction.invoice_image.name || 'Existing invoice',
              size: editTransaction.invoice_image.size || null,
              type: editTransaction.invoice_image.type || 'image'
            });
          } 
          // Check if it's a storage URL (has 'url' property)
          else if (editTransaction.invoice_image.url) {
            console.log('✅ Storage URL detected, setting preview');
            setImagePreview(editTransaction.invoice_image.url);
            setExistingImageInfo({
              name: editTransaction.invoice_image.name || 'Existing invoice',
              size: editTransaction.invoice_image.size || null,
              type: editTransaction.invoice_image.type || 'storage'
            });
          }
          // Check if it's a PDF
          else if (editTransaction.invoice_image.type === 'application/pdf') {
            console.log('✅ PDF detected');
            setImagePreview('pdf');
            setExistingImageInfo({
              name: editTransaction.invoice_image.name || 'Existing invoice.pdf',
              size: editTransaction.invoice_image.size || null,
              type: 'application/pdf'
            });
          }
          else {
            console.log('⚠️ Unknown invoice image format');
            setImagePreview(null);
            setExistingImageInfo(null);
          }
        } else {
          setImagePreview(null);
          setExistingImageInfo(null);
        }
      } else {
        console.log('➕ ADD MODE: Resetting form');
        // Reset form for new transaction
        setFormData({
          transaction_date: new Date().toISOString().split('T')[0],
          transaction_type: 'tank_refill',
          vehicle_id: '',
          amount: '',
          cost: '',
          fuel_type: 'gasoline',
          fuel_station: '',
          location: '',
          odometer_reading: '',
          filled_by: '',
          notes: '',
          invoice_image: null
        });
        setImagePreview(null);
        setExistingImageInfo(null);
      }
      setErrors({});
    }
  }, [isOpen, editTransaction]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Calculate total cost when amount or unit price changes
    if (name === 'amount' || name === 'unit_price') {
      const amount = name === 'amount' ? parseFloat(value) || 0 : parseFloat(formData.amount) || 0;
      const unitPrice = name === 'unit_price' ? parseFloat(value) || 0 : parseFloat(formData.unit_price) || 0;
      
      if (amount > 0 && unitPrice > 0) {
        setFormData(prev => ({
          ...prev,
          cost: (amount * unitPrice).toFixed(2)
        }));
      }
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImageUpload = (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({
        ...prev,
        invoice_image: 'Please upload a JPG, PNG, or PDF file'
      }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({
        ...prev,
        invoice_image: 'File size must be less than 5MB'
      }));
      return;
    }

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImagePreview('pdf');
    }

    setFormData(prev => ({
      ...prev,
      invoice_image: file
    }));

    // Clear existing image info when uploading new file
    setExistingImageInfo(null);

    // Clear error
    setErrors(prev => ({
      ...prev,
      invoice_image: ''
    }));
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleImageUpload(file);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    handleImageUpload(file);
  };

  const removeImage = () => {
    setFormData(prev => ({
      ...prev,
      invoice_image: null
    }));
    setImagePreview(null);
    setExistingImageInfo(null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.transaction_date) {
      newErrors.transaction_date = 'Transaction date is required';
    }

    if (!formData.transaction_type) {
      newErrors.transaction_type = 'Transaction type is required';
    }

    if (formData.transaction_type === 'vehicle_refill' && !formData.vehicle_id) {
      newErrors.vehicle_id = 'Vehicle is required for vehicle refills';
    }

    if (formData.transaction_type === 'withdrawal' && !formData.vehicle_id) {
      newErrors.vehicle_id = 'Vehicle is required for withdrawals';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }

    if (formData.transaction_type !== 'withdrawal' && formData.cost && parseFloat(formData.cost) <= 0) {
      newErrors.cost = 'Cost must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Handle invoice image data
      let imageData = null;
      
      if (formData.invoice_image) {
        // Check if it's a File object (new upload) or existing data
        if (formData.invoice_image instanceof File) {
          console.log('📤 New image file uploaded, converting to base64...');
          // New file uploaded - convert to base64
          const reader = new FileReader();
          imageData = await new Promise((resolve) => {
            reader.onload = (e) => resolve({
              data: e.target.result,
              name: formData.invoice_image.name,
              type: formData.invoice_image.type,
              size: formData.invoice_image.size
            });
            reader.readAsDataURL(formData.invoice_image);
          });
          console.log('✅ Image converted to base64');
        } else {
          // Existing image data - preserve it
          console.log('💾 Preserving existing image data');
          imageData = formData.invoice_image;
        }
      } else {
        console.log('🗑️ No image data (will be set to null)');
      }

      const transactionData = {
        ...formData,
        invoice_image: imageData
      };

      let result;
      const isEditMode = !!editTransaction;

      if (isEditMode) {
        // Update existing transaction
        console.log('🔄 Updating transaction:', formData.id, 'with image:', imageData ? 'YES' : 'NO');
        result = await FuelTransactionService.updateTransaction(formData.id, transactionData);
      } else {
        // Create new transaction
        console.log('➕ Creating new transaction with image:', imageData ? 'YES' : 'NO');
        result = await FuelTransactionService.createTransaction(transactionData);
      }
      
      if (result.success) {
        console.log('✅ Transaction saved successfully:', result.transaction);
        // Call onSave callback if provided
        if (onSave && typeof onSave === 'function') {
          onSave(result.transaction);
        }
        onClose();
      } else {
        setErrors({ submit: result.error || `Failed to ${isEditMode ? 'update' : 'create'} transaction` });
      }
    } catch (error) {
      console.error('Error saving transaction:', error);
      setErrors({ submit: 'An unexpected error occurred' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const unitPrice = formData.amount && formData.cost ? 
    (parseFloat(formData.cost) / parseFloat(formData.amount)).toFixed(2) : '0.00';

  const isEditMode = !!editTransaction;
  const modalTitle = isEditMode ? 'Edit' : 'Add';

  // Safe vehicles array
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];

  // Determine if we should show the image preview section
  const hasImageToShow = formData.invoice_image || imagePreview;

  // Log for debugging
  console.log('🔍 MODAL: Render', {
    isEditMode,
    editTransaction: editTransaction?.id,
    formData: formData,
    imagePreview: imagePreview ? (imagePreview === 'pdf' ? 'PDF' : 'Image') : null,
    existingImageInfo,
    hasInvoiceImage: !!formData.invoice_image,
    invoiceImageType: formData.invoice_image instanceof File ? 'File' : (formData.invoice_image ? 'Data' : 'null'),
    vehiclesCount: safeVehicles.length
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {modalTitle} {formData.transaction_type === 'tank_refill' ? 'Tank Refill' : 
                 formData.transaction_type === 'vehicle_refill' ? 'Vehicle Refill' : 'Withdrawal'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">
              {errors.submit}
            </div>
          )}

          {/* Transaction Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.transaction_type === 'withdrawal' ? 'Withdrawal' : 'Refill'} Date *
            </label>
            <input
              type="date"
              name="transaction_date"
              value={formData.transaction_date}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.transaction_date ? 'border-red-300' : 'border-gray-300'
              }`}
              required
            />
            {errors.transaction_date && (
              <p className="text-red-500 text-sm mt-1">{errors.transaction_date}</p>
            )}
          </div>

          {/* Transaction Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Transaction Type *
            </label>
            <select
              name="transaction_type"
              value={formData.transaction_type}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.transaction_type ? 'border-red-300' : 'border-gray-300'
              }`}
              required
              disabled={isEditMode} // Disable changing type when editing
            >
              <option value="tank_refill">Tank Refill</option>
              <option value="vehicle_refill">Vehicle Refill</option>
              <option value="withdrawal">Withdrawal</option>
            </select>
            {errors.transaction_type && (
              <p className="text-red-500 text-sm mt-1">{errors.transaction_type}</p>
            )}
          </div>

          {/* Vehicle Selection (for vehicle refills and withdrawals) */}
          {(formData.transaction_type === 'vehicle_refill' || formData.transaction_type === 'withdrawal') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle *
              </label>
              <select
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.vehicle_id ? 'border-red-300' : 'border-gray-300'
                }`}
                required
              >
                <option value="">Select a vehicle</option>
                {safeVehicles.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.plate_number})
                  </option>
                ))}
              </select>
              {errors.vehicle_id && (
                <p className="text-red-500 text-sm mt-1">{errors.vehicle_id}</p>
              )}
              {safeVehicles.length === 0 && (
                <p className="text-yellow-600 text-sm mt-1">⚠️ No vehicles available. Please add vehicles first.</p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.transaction_type === 'withdrawal' ? 'Liters Taken' : 'Liters'} *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              step="0.01"
              min="0.01"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.amount ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
              required
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
            )}
          </div>

          {/* Cost fields (not for withdrawals) */}
          {formData.transaction_type !== 'withdrawal' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price per Liter (MAD) *
                </label>
                <input
                  type="number"
                  name="unit_price"
                  value={unitPrice}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Cost (MAD)
                </label>
                <input
                  type="number"
                  name="cost"
                  value={formData.cost}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.cost ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00 MAD"
                />
                {errors.cost && (
                  <p className="text-red-500 text-sm mt-1">{errors.cost}</p>
                )}
              </div>
            </>
          )}

          {/* Fuel Station */}
          {formData.transaction_type !== 'withdrawal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fuel Station
              </label>
              <input
                type="text"
                name="fuel_station"
                value={formData.fuel_station}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Station name"
              />
            </div>
          )}

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Location"
            />
          </div>

          {/* Odometer Reading */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Odometer (km)
            </label>
            <input
              type="number"
              name="odometer_reading"
              value={formData.odometer_reading}
              onChange={handleInputChange}
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional"
            />
          </div>

          {/* Invoice Image Upload (for refills only) */}
          {formData.transaction_type !== 'withdrawal' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Image
              </label>
              
              {!hasImageToShow ? (
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label htmlFor="invoice-upload" className="cursor-pointer">
                      <span className="text-blue-600 hover:text-blue-500 font-medium">
                        Upload invoice image
                      </span>
                      <input
                        id="invoice-upload"
                        type="file"
                        className="sr-only"
                        accept="image/*,.pdf"
                        onChange={handleFileInputChange}
                      />
                    </label>
                    <p className="text-gray-500 text-sm mt-1">
                      or drag and drop
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    JPG, PNG, PDF up to 5MB
                  </p>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {imagePreview === 'pdf' ? (
                        <FileText className="h-8 w-8 text-red-500" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-blue-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formData.invoice_image?.name || existingImageInfo?.name || 'Existing invoice'}
                        </p>
                        {(formData.invoice_image?.size || existingImageInfo?.size) && (
                          <p className="text-xs text-gray-500">
                            {((formData.invoice_image?.size || existingImageInfo?.size) / 1024 / 1024).toFixed(2)} MB
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeImage}
                      className="text-red-500 hover:text-red-700 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {imagePreview && imagePreview !== 'pdf' && (
                    <div className="mt-3">
                      <img
                        src={imagePreview}
                        alt="Invoice preview"
                        className="max-w-full h-32 object-contain rounded border"
                      />
                    </div>
                  )}
                </div>
              )}
              
              {errors.invoice_image && (
                <p className="text-red-500 text-sm mt-1">{errors.invoice_image}</p>
              )}
            </div>
          )}

          {/* Filled By */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.transaction_type === 'withdrawal' ? 'Filled By' : 'Filled By'}
            </label>
            <input
              type="text"
              name="filled_by"
              value={formData.filled_by}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Person name"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Optional notes about this transaction..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : `${isEditMode ? 'Update' : 'Save'} ${formData.transaction_type === 'withdrawal' ? 'Withdrawal' : 'Refill'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddFuelTransactionModal;