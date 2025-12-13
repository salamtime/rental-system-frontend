import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, Camera, Loader2, CheckCircle, AlertCircle, Eye, EyeOff, FileImage, Clock } from 'lucide-react';
import enhancedUnifiedCustomerService from '../../services/EnhancedUnifiedCustomerService';
import unifiedCustomerService from '../../services/UnifiedCustomerService';

const EnhancedUnifiedIDScanModal = ({ 
  isOpen, 
  onClose, 
  onCustomerSaved, 
  onScanComplete,
  customerId = null,
  title = "Upload ID Document",
  setFormData = null,
  formData = null,
  rentalId = null
}) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showRawData, setShowRawData] = useState(false);
  const [savedCustomer, setSavedCustomer] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [processingStatus, setProcessingStatus] = useState('');
  
  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const processingTimeoutRef = useRef(null);

  const createAbortController = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    return abortControllerRef.current;
  }, []);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    setIsProcessing(false);
    setProcessingStatus('');
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    handleCancel();
    setSelectedImage(null);
    setImagePreview(null);
    setExtractedData(null);
    setError(null);
    setSuccess(null);
    setSavedCustomer(null);
    setUploadHistory([]);
    setShowRawData(false);
    setProcessingStatus('');
    onClose();
  }, [onClose, handleCancel]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setExtractedData(null);
      setError(null);
      setSuccess(null);
      setSavedCustomer(null);
      setProcessingStatus('');
    }
  };

  const processImage = async () => {
    if (!selectedImage) {
      setError('Please select an image first');
      return;
    }

    console.log('ℹ️ [Modal] Starting image process for customerId:', customerId);

    const abortController = createAbortController();
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setExtractedData(null);
    setSavedCustomer(null);

    processingTimeoutRef.current = setTimeout(() => {
      handleCancel();
      setError('Processing timeout - operation took too long. Please try again with a clearer image.');
    }, 30000);

    try {
      let targetCustomerId = customerId;
      if (!targetCustomerId && formData?.customer_id) {
        targetCustomerId = formData.customer_id;
      }
      if (!targetCustomerId) {
        targetCustomerId = unifiedCustomerService.generateCustomerId();
      }
      
      if (abortController.signal.aborted) return;

      setProcessingStatus('Uploading image and processing OCR...');
      
      const result = await enhancedUnifiedCustomerService.processSequentialImageUpload(
        selectedImage, 
        targetCustomerId, 
        rentalId,
        'document'
      );
      
      if (abortController.signal.aborted) return;

      if (result.success) {
        setProcessingStatus('Processing completed successfully');
        const newUpload = {
          id: result.scanId || Date.now(),
          fileName: selectedImage.name,
          uploadTime: new Date().toLocaleTimeString(),
          status: 'completed',
          confidence: result.extractedData?.confidence || 0.8,
          publicUrl: result.publicUrl,
          isFirstScan: true
        };
        setUploadHistory(prev => [newUpload, ...prev]);

        if (result.extractedData) {
          setExtractedData(result.extractedData);
        }
        
        if (abortController.signal.aborted) return;
        
        const dataToUse = result.extractedData;
        
        if (dataToUse && setFormData) {
          setFormData(prev => {
            const updatedData = {
              ...prev,
              customer_id: targetCustomerId,
              customer_name: dataToUse.full_name || prev.customer_name,
              customer_phone: dataToUse.phone || prev.customer_phone,
              customer_email: dataToUse.email || prev.customer_email,
              linked_display_id: dataToUse.licence_number || dataToUse.id_number || prev.linked_display_id,
            };
            return updatedData;
          });
          
          const populatedFields = ['Name', 'Phone', 'Email', 'License Number'].filter(field => {
              if (field === 'Name') return dataToUse.full_name;
              if (field === 'Phone') return dataToUse.phone;
              if (field === 'Email') return dataToUse.email;
              if (field === 'License Number') return dataToUse.licence_number || dataToUse.id_number;
              return false;
          });
          
          setSuccess(`✅ ID scan processed successfully! Form auto-populated with: ${populatedFields.join(', ')}`);
        } else {
          setSuccess('✅ ID scan processed successfully, but no data was extracted for form population');
        }
        
        try {
          const customerResult = await unifiedCustomerService.getCustomer(targetCustomerId);
          if (customerResult.success) {
            setSavedCustomer(customerResult.data);
            if (onCustomerSaved) onCustomerSaved(customerResult.data, selectedImage);
            if (onScanComplete) onScanComplete(customerResult.data, selectedImage);
          } else {
            console.warn('⚠️ Could not fetch updated customer data:', customerResult.error);
          }
        } catch (fetchError) {
          console.warn('⚠️ Error fetching customer data:', fetchError);
        }
        
        setSelectedImage(null);
        setImagePreview(null);
        
      } else {
        const userFriendlyError = result.error || 'An unknown error occurred during image processing.';
        setError(userFriendlyError);
        setProcessingStatus('Processing failed');
        
        const failedUpload = {
          id: Date.now(),
          fileName: selectedImage.name,
          uploadTime: new Date().toLocaleTimeString(),
          status: 'failed',
          error: userFriendlyError,
          isFirstScan: false
        };
        setUploadHistory(prev => [failedUpload, ...prev]);
      }

    } catch (err) {
      console.error('❌ Uncaught exception in processImage', { 
        message: err.message, 
        stack: err.stack,
        component: 'EnhancedUnifiedIDScanModal'
      });
      
      const errorMessage = err.message || 'An unexpected error occurred.';
      if (abortController.signal.aborted) {
        setError('Operation cancelled by user');
        setProcessingStatus('Cancelled');
      } else {
        setError(`An unexpected error occurred: ${errorMessage}`);
        setProcessingStatus('Processing failed');
      }
      
      const failedUpload = {
        id: Date.now(),
        fileName: selectedImage.name,
        uploadTime: new Date().toLocaleTimeString(),
        status: 'failed',
        error: errorMessage,
        isFirstScan: false
      };
      setUploadHistory(prev => [failedUpload, ...prev]);
    } finally {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      
      if (!abortController.signal.aborted) {
        setIsProcessing(false);
      }
    }
  };

  const renderFieldValue = (value) => {
    if (value === null || value === undefined || value === '') {
      return <span className="text-gray-400 italic">null</span>;
    }
    return <span className="text-gray-900">{String(value)}</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">
              Upload ID document to automatically populate customer information fields.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Close modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    Upload ID Document
                  </p>
                  <p className="text-sm text-gray-600 mb-4">
                    Supports front/back of ID cards, driver's licenses, and passports
                  </p>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                    disabled={isProcessing}
                  />
                  
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </button>
                </div>

                {imagePreview && (
                  <div className="mt-4">
                    <img
                      src={imagePreview}
                      alt="ID Document Preview"
                      className="max-w-full h-48 object-contain mx-auto border border-gray-200 rounded"
                    />
                  </div>
                )}
              </div>

              {selectedImage && !isProcessing && (
                <div className="text-center">
                  <button
                    onClick={processImage}
                    className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    <Camera className="h-5 w-5 mr-2" />
                    Process Document & Auto-Fill Form
                  </button>
                </div>
              )}

              {isProcessing && (
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center px-6 py-3 text-blue-600">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    {processingStatus || 'Processing document...'}
                  </div>
                  
                  <div>
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      title="Cancel processing"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel Processing
                    </button>
                  </div>
                  
                  <p className="text-xs text-gray-500">
                    Processing will timeout after 30 seconds if no response
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Upload History ({uploadHistory.length})
              </h3>
              
              <div className="max-h-64 overflow-y-auto space-y-2">
                {uploadHistory.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <FileImage className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No uploads yet</p>
                  </div>
                ) : (
                  uploadHistory.map((upload, index) => (
                    <div
                      key={upload.id}
                      className={`p-3 rounded-lg border ${
                        upload.status === 'completed' 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              Upload #{uploadHistory.length - index}
                            </p>
                            {upload.isFirstScan && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600">
                            {upload.fileName} • {upload.uploadTime}
                          </p>
                          {upload.status === 'completed' && upload.confidence && (
                            <p className="text-xs text-green-600">
                              Confidence: {Math.round(upload.confidence * 100)}%
                            </p>
                          )}
                          {upload.status === 'failed' && upload.error && (
                            <p className="text-xs text-red-600">
                              Error: {upload.error}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center">
                          {upload.status === 'completed' ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-green-800">Success!</h3>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                  <p className="text-xs text-green-600 mt-1">
                    Form fields have been automatically populated. You can upload another document or close this modal.
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 mr-3" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                  {error.includes('timeout') && (
                    <p className="text-xs text-red-600 mt-1">
                      Try uploading a smaller, clearer image or check your internet connection.
                    </p>
                  )}
                   {error.includes('Bucket not found') && (
                    <p className="text-xs text-red-600 mt-1">
                      This is a configuration issue. Please contact the system administrator.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {extractedData && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-blue-900">
                  Extracted Information (Auto-Populated in Form)
                </h3>
                <button
                  onClick={() => setShowRawData(!showRawData)}
                  className="inline-flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  {showRawData ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
                  {showRawData ? 'Hide' : 'Show'} Raw Data
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1 text-sm">{renderFieldValue(extractedData.full_name)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone Number</label>
                  <div className="mt-1 text-sm">{renderFieldValue(extractedData.phone)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Document Number</label>
                  <div className="mt-1 text-sm">{renderFieldValue(extractedData.licence_number || extractedData.id_number)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="mt-1 text-sm">{renderFieldValue(extractedData.date_of_birth)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nationality</label>
                  <div className="mt-1 text-sm">{renderFieldValue(extractedData.nationality)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 text-sm">{renderFieldValue(extractedData.email)}</div>
                </div>
              </div>

              {showRawData && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Raw Extracted Data:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(extractedData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {savedCustomer && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <h3 className="text-lg font-medium text-green-900 mb-4">
                Saved Customer Data
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                  <div className="mt-1 text-sm font-mono">{savedCustomer.id}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <div className="mt-1 text-sm">{renderFieldValue(savedCustomer.full_name)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID Number</label>
                  <div className="mt-1 text-sm">{renderFieldValue(savedCustomer.id_number)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">License Number</label>
                  <div className="mt-1 text-sm">{renderFieldValue(savedCustomer.licence_number)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                  <div className="mt-1 text-sm">{renderFieldValue(savedCustomer.date_of_birth)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nationality</label>
                  <div className="mt-1 text-sm">{renderFieldValue(savedCustomer.nationality)}</div>
                </div>
              </div>

              {showRawData && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Complete Customer Record:</h4>
                  <pre className="bg-gray-100 p-3 rounded text-xs overflow-x-auto">
                    {JSON.stringify(savedCustomer, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              {uploadHistory.length > 0 && (
                <span>
                  {uploadHistory.filter(u => u.status === 'completed').length} of {uploadHistory.length} uploads successful
                  {uploadHistory.some(u => u.isFirstScan) && (
                    <span className="ml-2 text-blue-600">• Form auto-populated</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                title={isProcessing ? "Close modal (will cancel processing)" : "Close modal"}
              >
                {success ? 'Done' : isProcessing ? 'Force Close' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedUnifiedIDScanModal;