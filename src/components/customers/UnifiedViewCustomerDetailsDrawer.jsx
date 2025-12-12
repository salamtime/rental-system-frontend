import React, { useState, useEffect } from 'react';
import { X, User, Phone, Mail, MapPin, Calendar, CreditCard, Globe, Eye } from 'lucide-react';
import unifiedCustomerService from '../../services/UnifiedCustomerService.js';

/**
 * UnifiedViewCustomerDetailsDrawer - Enhanced customer details modal
 * Displays comprehensive customer information with bilingual labels
 * Supports both real customer records and rental-based fallback data
 */
const UnifiedViewCustomerDetailsDrawer = ({ 
  isOpen, 
  onClose, 
  rental = null,
  customerId = null // Optional direct customer ID
}) => {
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);

  // Load customer data when modal opens
  useEffect(() => {
    if (isOpen && (rental || customerId)) {
      loadCustomerData();
    }
  }, [isOpen, rental, customerId]);

  const loadCustomerData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Loading customer data - customerId:', customerId, 'rental:', rental?.id);
      let customerData;
      
      if (customerId) {
        // Direct customer ID lookup
        console.log('📋 Fetching customer by ID:', customerId);
        const result = await unifiedCustomerService.getCustomer(customerId);
        if (result.success && result.data) {
          customerData = result.data;
          customerData._isRealCustomer = true;
        }
        console.log('📋 Customer data by ID:', customerData);
      } else if (rental) {
        // Get customer for rental (with fallback)
        console.log('📋 Fetching customer for rental:', rental.id);
        
        // Try to get customer by rental's customer_id first
        if (rental.customer_id) {
          const result = await unifiedCustomerService.getCustomer(rental.customer_id);
          if (result.success && result.data) {
            customerData = result.data;
            customerData._isRealCustomer = true;
          }
        }
        
        // If no customer found, use rental data as fallback
        if (!customerData) {
          customerData = {
            full_name: rental.customer_name,
            email: rental.customer_email,
            phone: rental.customer_phone,
            _isRealCustomer: false,
            _sourceRental: rental.id
          };
        }
        
        console.log('📋 Customer data for rental:', customerData);
      }
      
      if (customerData) {
        // Format customer for display (simplified version since we don't have the method)
        const formattedCustomer = {
          ...customerData,
          displayName: customerData.full_name || customerData.customer_name || 'Unknown Customer',
          displayId: customerData.id_number || customerData.document_number || customerData.id || 'No ID',
          displayPhone: customerData.phone || 'No phone',
          displayEmail: customerData.email || 'No email'
        };
        
        console.log('📋 Formatted customer data:', formattedCustomer);
        setCustomer(formattedCustomer);
      } else {
        console.warn('⚠️ No customer data found');
        setError('Customer information not available');
      }
      
    } catch (err) {
      console.error('❌ Error loading customer data:', err);
      setError('Failed to load customer information: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCustomer(null);
    setError(null);
    setShowImageModal(false);
    onClose();
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
          alt="Driver License - Full Size"
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
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Customer Details / Détails du client
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                View comprehensive customer information for this rental / 
                Afficher les informations complètes du client pour cette location
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
                {/* Customer Status Indicator */}
                <div className={`p-3 rounded-md ${
                  customer._isRealCustomer 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center">
                    <User className={`h-4 w-4 ${
                      customer._isRealCustomer ? 'text-green-600' : 'text-yellow-600'
                    }`} />
                    <span className={`ml-2 text-sm font-medium ${
                      customer._isRealCustomer ? 'text-green-800' : 'text-yellow-800'
                    }`}>
                      {customer._isRealCustomer 
                        ? '✅ Complete Customer Profile / Profil client complet'
                        : '⚠️ Limited Information Available / Informations limitées disponibles'
                      }
                    </span>
                  </div>
                  {!customer._isRealCustomer && customer._sourceRental && (
                    <p className="text-sm text-yellow-700 mt-1">
                      This customer information is based on rental data only. Complete customer profile is not available in the customer database.
                    </p>
                  )}
                </div>

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Personal Information / Informations personnelles
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Full Name / Nom complet
                        </label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.full_name || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Date of Birth / Date de naissance
                        </label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.date_of_birth || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Nationality / Nationalité
                        </label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.nationality || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Place of Birth / Lieu de naissance
                        </label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.place_of_birth || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 flex items-center">
                      <Phone className="h-5 w-5 mr-2" />
                      Contact Information / Informations de contact
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Phone / Téléphone
                        </label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.phone || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Email / E-mail
                        </label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.email || 'N/A'}
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Address / Adresse
                        </label>
                        <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                          {customer.address || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Document Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Document Information / Informations sur les documents
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        ID Number / Numéro C.N.I.E.
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                        {customer.id_number || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Licence Number / Numéro de permis
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                        {customer.licence_number || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Licence Issue Date / Date de délivrance
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                        {customer.licence_issue_date || 'N/A'}
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Licence Expiry Date / Date d'expiration
                      </label>
                      <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                        {customer.licence_expiry_date || 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Driver Licence Image */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <Eye className="h-5 w-5 mr-2" />
                    Driver Licence Image / Image du permis de conduire
                  </h3>
                  
                  <div className="border border-gray-200 rounded-lg p-4">
                    {customer.id_scan_url && customer._isRealCustomer ? (
                      <div className="space-y-3">
                        <div className="text-xs text-gray-500 mb-2">
                          Image URL: {customer.id_scan_url}
                        </div>
                        <img
                          src={customer.id_scan_url}
                          alt="Driver License"
                          className="w-full max-w-md h-48 object-contain border border-gray-200 rounded-lg shadow-sm bg-gray-50 cursor-pointer hover:shadow-md transition-shadow"
                          onClick={() => setShowImageModal(true)}
                          onError={(e) => {
                            console.error('❌ Failed to load image:', customer.id_scan_url);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'block';
                          }}
                        />
                        <div className="hidden flex items-center justify-center h-48 bg-red-50 border border-red-200 rounded-lg">
                          <div className="text-center text-red-500">
                            <CreditCard className="h-12 w-12 mx-auto mb-2" />
                            <p className="text-sm">
                              Failed to load image / Impossible de charger l'image
                            </p>
                            <p className="text-xs mt-1">URL: {customer.id_scan_url}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowImageModal(true)}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Full Size / Voir en taille réelle
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-48 bg-gray-50 border border-gray-200 rounded-lg">
                        <div className="text-center text-gray-500">
                          <CreditCard className="h-12 w-12 mx-auto mb-2" />
                          <p className="text-sm">
                            {customer._isRealCustomer 
                              ? 'Licence image not available / Image du permis non disponible'
                              : 'Licence image not available for rental-based customer data / Image du permis non disponible pour les données client basées sur la location'
                            }
                          </p>
                          {customer._isRealCustomer && (
                            <p className="text-xs mt-2 text-gray-400">
                              Customer ID: {customer.id} | Image URL: {customer.id_scan_url || 'None'}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Source Information for Rental-based Data */}
                {!customer._isRealCustomer && customer._sourceRental && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                      Data Source / Source des données
                    </h4>
                    <p className="text-sm text-gray-600">
                      Rental ID: {customer._sourceRental}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      This information is extracted from rental data only. 
                      Complete customer profile is not available in the customer database.
                    </p>
                  </div>
                )}

                {/* Debug Information */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <h4 className="text-sm font-medium text-blue-700 mb-2">
                    Debug Information
                  </h4>
                  <div className="text-xs text-blue-600 space-y-1">
                    <p>Customer ID: {customer.id || 'N/A'}</p>
                    <p>Is Real Customer: {customer._isRealCustomer ? 'Yes' : 'No'}</p>
                    <p>Source Rental: {customer._sourceRental || 'N/A'}</p>
                    <p>Image URL: {customer.id_scan_url || 'None'}</p>
                    <p>Table: app_4c3a7a6153_customers</p>
                    <p>Storage Bucket: id_scans</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Close / Fermer
            </button>
          </div>
        </div>
      </div>

      {/* Full Size Image Modal */}
      {showImageModal && customer?.id_scan_url && (
        <ImageModal 
          imageUrl={customer.id_scan_url} 
          onClose={() => setShowImageModal(false)} 
        />
      )}
    </>
  );
};

export default UnifiedViewCustomerDetailsDrawer;