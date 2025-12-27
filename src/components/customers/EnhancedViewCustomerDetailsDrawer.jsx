import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, Calendar, CreditCard, Eye, FileImage, Trash2, Download, MapPin, Car, Clock } from 'lucide-react';
import unifiedCustomerService from '../../services/UnifiedCustomerService.js';
import enhancedUnifiedCustomerService from '../../services/EnhancedUnifiedCustomerService.js';

/**
 * Enhanced View Customer Details Drawer - Displays All ID Scans + Secondary Data
 * Shows comprehensive customer information with primary and secondary scan data
 */
const EnhancedViewCustomerDetailsDrawer = ({ 
  isOpen, 
  onClose, 
  rental = null,
  customerId = null
}) => {
  const [customer, setCustomer] = useState(null);
  const [customerScans, setCustomerScans] = useState([]);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [scanStats, setScanStats] = useState(null);

  // Load customer data and scans when modal opens
  useEffect(() => {
    if (isOpen && (rental || customerId)) {
      loadCustomerData();
    }
  }, [isOpen, rental, customerId]);

  const loadCustomerData = async () => {
    setLoading(true);
    setError(null);
    setCustomer(null);
    setRentalHistory([]);
    setCustomerScans([]);
    setScanStats(null);

    try {
      const targetCustomerId = customerId || rental?.customer_id;
      console.log('🔍 Loading data for customerId:', targetCustomerId, 'from rental:', rental?.id);

      let customerDetails = {};
      let isRealCustomer = false;

      // 1. Use rental data as a baseline fallback for contact info
      if (rental) {
        customerDetails = {
          full_name: rental.customer_name,
          email: rental.customer_email,
          phone: rental.customer_phone,
          licence_number: rental.customer_license, // Fallback for license
        };
      }

      // 2. If we have a customer ID, fetch the full profile
      if (targetCustomerId) {
        const result = await enhancedUnifiedCustomerService.getCustomerWithSecondaryData(targetCustomerId);
        
        if (result.success && result.data) {
          // 3. Merge fetched data over the rental fallback data.
          //    The spread order ensures fetched data overwrites rental data if properties conflict.
          customerDetails = { ...customerDetails, ...result.data };
          isRealCustomer = true;
        }
        
        // 4. Always try to load history and scans if an ID is present
        await loadRentalHistory(targetCustomerId);
        await loadCustomerScans(targetCustomerId);
      }
      
      // 5. Set the final customer state if we have any data
      if (Object.keys(customerDetails).length > 0) {
        setCustomer({ ...customerDetails, _isRealCustomer: isRealCustomer });
      } else {
        setError('Customer information not available');
      }

    } catch (err) {
      console.error('❌ Error loading customer data:', err);
      setError('Failed to load customer information: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadRentalHistory = async (customerId) => {
    try {
      const result = await enhancedUnifiedCustomerService.getCustomerRentalHistory(customerId);
      if (result.success) {
        setRentalHistory(result.data);
      } else {
        console.warn("Could not fetch rental history:", result.error);
        setRentalHistory([]);
      }
    } catch (err) {
      console.error("Error loading rental history:", err);
      setRentalHistory([]);
    }
  };

  const loadCustomerScans = async (customerId) => {
    try {
      console.log('🔍 Loading all scans for customer:', customerId);
      
      // Get all scans
      const scansResult = await enhancedUnifiedCustomerService.getCustomerScans(customerId);
      if (scansResult.success) {
        setCustomerScans(scansResult.scans);
        console.log('✅ Loaded customer scans:', scansResult.scans.length);
      }

      // Get scan statistics
      const statsResult = await enhancedUnifiedCustomerService.getScanStatistics(customerId);
      if (statsResult.success) {
        setScanStats(statsResult.statistics);
        console.log('✅ Loaded scan statistics:', statsResult.statistics);
      }

    } catch (err) {
      console.error('❌ Error loading customer scans:', err);
    }
  };

  const handleImageClick = (imageUrl, scanInfo) => {
    console.log('🖼️ Opening image modal for scan:', scanInfo.id || scanInfo.displayName);
    setSelectedImageUrl(imageUrl);
    setShowImageModal(true);
  };

  const handleDeleteScan = async (scanId) => {
    if (!confirm('Are you sure you want to delete this scan?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting scan:', scanId);
      const result = await enhancedUnifiedCustomerService.deleteScan(scanId);
      
      if (result.success) {
        // Reload scans
        await loadCustomerScans(customer.id);
        console.log('✅ Scan deleted and list refreshed');
      } else {
        alert('Failed to delete scan: ' + result.error);
      }
    } catch (err) {
      console.error('❌ Error deleting scan:', err);
      alert('Failed to delete scan: ' + err.message);
    }
  };

  const handleClose = () => {
    setCustomer(null);
    setCustomerScans([]);
    setRentalHistory([]);
    setScanStats(null);
    setError(null);
    setShowImageModal(false);
    setSelectedImageUrl(null);
    onClose();
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  // Image modal component
  const ImageModal = ({ imageUrl, onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="relative max-w-4xl max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <X className="h-8 w-8" />
        </button>
        <img
          src={imageUrl}
          alt="ID Document - Full Size"
          className="max-w-full max-h-full object-contain rounded-lg"
          onError={(e) => {
            console.error('❌ Failed to load image:', imageUrl);
            e.target.style.display = 'none';
          }}
        />
      </div>
    </div>
  );

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Enhanced Customer Details with Secondary Data
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                View comprehensive customer information including primary and secondary scan data
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading customer information...</span>
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Information */}
            {customer && !loading && (
              <div className="space-y-6">
                {/* Customer Status and Scan Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-md ${
                    customer._isRealCustomer 
                      ? 'bg-green-50 border border-green-200' 
                      : 'bg-yellow-50 border border-yellow-200'
                  }`}>
                    <div className="flex items-center">
                      <User className={`h-5 w-5 ${
                        customer._isRealCustomer ? 'text-green-600' : 'text-yellow-600'
                      }`} />
                      <span className={`ml-2 text-sm font-medium ${
                        customer._isRealCustomer ? 'text-green-800' : 'text-yellow-800'
                      }`}>
                        {customer._isRealCustomer 
                          ? '✅ Complete Customer Profile with Secondary Data'
                          : '⚠️ Limited Information Available'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Scan Statistics */}
                  {scanStats && (
                    <div className="p-4 rounded-md bg-blue-50 border border-blue-200">
                      <div className="flex items-center mb-2">
                        <FileImage className="h-5 w-5 text-blue-600" />
                        <span className="ml-2 text-sm font-medium text-blue-800">
                          ID Document Scans
                        </span>
                      </div>
                      <div className="text-sm text-blue-700">
                        <p>Total: {scanStats.total} | Completed: {scanStats.completed} | Failed: {scanStats.failed}</p>
                        {scanStats.averageConfidence > 0 && (
                          <p>Avg. Confidence: {Math.round(scanStats.averageConfidence * 100)}%</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Primary and Secondary Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Primary Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Primary Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Full Name</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.full_name || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.date_of_birth || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Nationality</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.nationality || 'N/A'}
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700">License</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.licence_number || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* SOLUTION: Secondary Information from Dedicated Columns */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <MapPin className="h-5 w-5 mr-2" />
                      Secondary Scan Data
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        Protected Storage
                      </span>
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Secondary Address</label>
                        <p className={`mt-1 text-sm p-2 rounded border ${
                          customer.secondary_address 
                            ? 'text-gray-900 bg-green-50 border-green-200' 
                            : 'text-gray-500 bg-gray-50'
                        }`}>
                          {customer.secondary_address || 'Not available from secondary scan'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">License Class</label>
                        <p className={`mt-1 text-sm p-2 rounded border ${
                          customer.license_class 
                            ? 'text-gray-900 bg-green-50 border-green-200' 
                            : 'text-gray-500 bg-gray-50'
                        }`}>
                          {customer.license_class || 'Not available from secondary scan'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Secondary ID Number</label>
                        <p className={`mt-1 text-sm p-2 rounded border ${
                          customer.secondary_id_number 
                            ? 'text-gray-900 bg-green-50 border-green-200' 
                            : 'text-gray-500 bg-gray-50'
                        }`}>
                          {customer.secondary_id_number || 'Not available from secondary scan'}
                        </p>
                      </div>

                      {/* SOLUTION: Secondary Image Display */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Secondary Document Image</label>
                        {customer.secondaryImageUrl ? (
                          <div className="mt-1">
                            <img
                              src={customer.secondaryImageUrl}
                              alt="Secondary ID Document"
                              className="w-full h-32 object-cover border-2 border-green-200 rounded cursor-pointer hover:shadow-md transition-shadow bg-green-50"
                              onClick={() => handleImageClick(customer.secondaryImageUrl, { displayName: 'Secondary Document' })}
                              onError={(e) => {
                                console.error('❌ Failed to load secondary image:', customer.secondaryImageUrl);
                                e.target.style.display = 'none';
                              }}
                            />
                            <button
                              onClick={() => handleImageClick(customer.secondaryImageUrl, { displayName: 'Secondary Document' })}
                              className="text-sm text-green-600 hover:text-green-800 flex items-center mt-1"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Secondary Document Full Size
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 p-4 bg-gray-50 border border-gray-200 rounded text-center text-gray-500 text-sm">
                            No secondary document image available
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contact and Document Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Contact Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Phone</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.phone || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Email</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.email || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2" />
                      Document Information
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Primary ID Number</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.id_number || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">License Number</label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.licence_number || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Rental History */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Clock className="h-5 w-5 mr-2" />
                    Rental History ({rentalHistory.length})
                  </h3>
                  <div className="border border-gray-200 rounded-lg p-4 max-h-64 overflow-y-auto">
                    {rentalHistory.length > 0 ? (
                      <div className="space-y-3">
                        {rentalHistory.map(r => (
                          <div key={r.id} className="block p-3 bg-white rounded-lg border hover:bg-gray-100">
                            <div className="flex justify-between items-center">
                              <p className="font-semibold text-sm">{r.vehicle?.name || 'Unknown Vehicle'}</p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                r.rental_status === 'completed' ? 'bg-blue-100 text-blue-800' :
                                r.rental_status === 'active' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>{r.rental_status}</span>
                            </div>
                            <p className="text-xs text-gray-500">{formatDate(r.rental_start_date)} - {formatDate(r.rental_end_date)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                       <div className="flex items-center justify-center h-32 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-center text-gray-500">
                          <Clock className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">No rental history found.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* All ID Document Scans */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FileImage className="h-5 w-5 mr-2" />
                    All ID Document Scans ({customerScans.length})
                  </h3>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    {customerScans.length === 0 ? (
                      <div className="flex items-center justify-center h-32 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-center text-gray-500">
                          <FileImage className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">
                            {customer._isRealCustomer 
                              ? 'No ID document scans available'
                              : 'ID scans not available for rental-based customer data'
                            }
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {customerScans.map((scan, index) => (
                          <div key={scan.id} className="border border-gray-200 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-900">
                                {scan.displayName}
                              </span>
                              <div className="flex items-center space-x-1">
                                {scan.publicUrl && (
                                  <button
                                    onClick={() => handleImageClick(scan.publicUrl, scan)}
                                    className="p-1 text-blue-600 hover:text-blue-800"
                                    title="View full size"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteScan(scan.id)}
                                  className="p-1 text-red-600 hover:text-red-800"
                                  title="Delete scan"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            <div className="text-xs text-gray-600 mb-2">
                              <p>Uploaded: {scan.uploadDate} at {scan.uploadTime}</p>
                              <p>Status: {scan.processing_status}</p>
                              {scan.ocr_confidence && (
                                <p>Confidence: {Math.round(scan.ocr_confidence * 100)}%</p>
                              )}
                            </div>

                            {scan.publicUrl ? (
                              <img
                                src={scan.publicUrl}
                                alt={`ID Document Scan ${index + 1}`}
                                className="w-full h-24 object-cover border border-gray-200 rounded cursor-pointer hover:shadow-md transition-shadow"
                                onClick={() => handleImageClick(scan.publicUrl, scan)}
                                onError={(e) => {
                                  console.error('❌ Failed to load scan image:', scan.publicUrl);
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'block';
                                }}
                              />
                            ) : (
                              <div className="w-full h-24 bg-gray-100 border border-gray-200 rounded flex items-center justify-center">
                                <span className="text-xs text-gray-500">Image not available</span>
                              </div>
                            )}
                            
                            <div className="hidden flex items-center justify-center h-24 bg-red-50 border border-red-200 rounded">
                              <div className="text-center text-red-500">
                                <FileImage className="h-8 w-8 mx-auto mb-1" />
                                <p className="text-xs">Failed to load</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Legacy Single Scan (for backward compatibility) */}
                {customer.id_scan_url && customerScans.length === 0 && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Eye className="h-5 w-5 mr-2" />
                      Legacy ID Scan
                    </h3>
                    
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="space-y-3">
                        <img
                          src={customer.id_scan_url}
                          alt="Legacy ID Document"
                          className="w-full max-w-md h-48 object-contain border border-gray-200 rounded-lg shadow-sm bg-gray-50 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => handleImageClick(customer.id_scan_url, { id: 'legacy', displayName: 'Legacy Scan' })}
                          onError={(e) => {
                            console.error('❌ Failed to load legacy image:', customer.id_scan_url);
                            e.target.style.display = 'none';
                          }}
                        />
                        <button
                          onClick={() => handleImageClick(customer.id_scan_url, { id: 'legacy', displayName: 'Legacy Scan' })}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Full Size
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {showImageModal && selectedImageUrl && (
        <ImageModal 
          imageUrl={selectedImageUrl} 
          onClose={() => setShowImageModal(false)} 
        />
      )}
    </>
  );
};

export default EnhancedViewCustomerDetailsDrawer;