import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, User, Phone, Mail, Calendar, MapPin, CreditCard, FileText, Camera, AlertCircle, CheckCircle, Plus, Upload, Car, Clock } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import CustomerService from '../../services/EnhancedUnifiedCustomerService';

// Hardcoded Supabase credentials
const SUPABASE_URL = 'https://nnaymteoxvdnsnhlyvkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYXltdGVveHZkbnNuaGx5dmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MjcwMzYsImV4cCI6MjA2NTQwMzAzNn0.L7CLWRSqOq91Lz0zRq6ddRLyEN6lBgewtcfGaqLiceM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ViewCustomerDetailsDrawer = ({ 
  isOpen, 
  onClose, 
  rental = null, // The rental prop is optional and might not be present
  customerId = null 
}) => {
  const [customerData, setCustomerData] = useState(null);
  const [rentalHistory, setRentalHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen && (rental || customerId)) {
      loadCustomerData();
    }
  }, [isOpen, rental, customerId]);

  useEffect(() => {
    if (customerData && customerData.id) {
      loadRentalHistory(customerData.id);
    }
  }, [customerData]);

  const loadCustomerData = async () => {
    setLoading(true);
    setError(null);
    setAlertMessage(null);
    setCustomerData(null);
    setRentalHistory([]);

    try {
      const targetCustomerId = customerId || rental?.customer_id;

      if (!targetCustomerId) {
        // Fallback for cases where there's no customer ID but there is a rental object
        if (rental) {
          setCustomerData({
            isRentalBased: true,
            full_name: rental.customer_name,
            email: rental.customer_email || rental.email,
            phone: rental.customer_phone || rental.phone,
            licence_number: rental.customer_licence_number || rental.licence_number,
            nationality: rental.nationality,
            created_at: rental.created_at,
            customer_id_image: rental.customer_id_image,
          });
        } else {
          setError('No customer data available to display.');
        }
        setLoading(false);
        return;
      }

      // Fetch customer profile and their latest rental in parallel for robust data fallback
      const [customerResult, latestRentalResult] = await Promise.all([
        supabase.from('app_4c3a7a6153_customers').select('*').eq('id', targetCustomerId).single(),
        supabase.from('app_4c3a7a6153_rentals').select('*').eq('customer_id', targetCustomerId).order('created_at', { ascending: false }).limit(1).single()
      ]);

      const { data: customerProfile, error: customerError } = customerResult;
      const { data: latestRental, error: latestRentalError } = latestRentalResult;

      if (customerError && customerError.code !== 'PGRST116') { // PGRST116 means no rows found, which is not a fatal error
        throw new Error(`Failed to fetch customer profile: ${customerError.message}`);
      }
      
      if (latestRentalError && latestRentalError.code !== 'PGRST116') {
         console.warn(`Could not fetch latest rental: ${latestRentalError.message}`);
      }

      let dataToShow = {};
      const fallbackRental = latestRental || rental; // Use fetched latest rental or the prop rental

      if (customerProfile) {
        // A complete customer profile exists. Use it as the source of truth.
        dataToShow = { ...customerProfile, isRentalBased: false };
        
        // **CRITICAL FIX**: If profile fields are empty, fall back to the most recent rental data.
        if (fallbackRental) {
          dataToShow.email = customerProfile.email || fallbackRental.customer_email || fallbackRental.email;
          dataToShow.phone = customerProfile.phone || fallbackRental.customer_phone || fallbackRental.phone;
          dataToShow.licence_number = customerProfile.licence_number || fallbackRental.customer_licence_number || fallbackRental.licence_number;
          dataToShow.nationality = customerProfile.nationality || fallbackRental.nationality;
        }
      } else if (fallbackRental) {
        // No customer profile exists. Construct a temporary profile from the latest rental data.
        dataToShow = {
          id: targetCustomerId,
          isRentalBased: true,
          full_name: fallbackRental.customer_name,
          email: fallbackRental.customer_email || fallbackRental.email,
          phone: fallbackRental.customer_phone || fallbackRental.phone,
          licence_number: fallbackRental.customer_licence_number || fallbackRental.licence_number,
          nationality: fallbackRental.nationality,
          created_at: fallbackRental.created_at,
          customer_id_image: fallbackRental.customer_id_image,
          id_scan_url: fallbackRental.customer?.id_scan_url,
        };
      } else {
        setError(`Customer with ID ${targetCustomerId} not found, and no rental history is available.`);
        setLoading(false);
        return;
      }
      
      setCustomerData(dataToShow);

    } catch (err) {
      console.error('❌ Error loading customer data:', err);
      setError(`Failed to load customer data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadRentalHistory = async (customerIdToFetch) => {
    if (CustomerService && typeof CustomerService.getCustomerRentalHistory === 'function') {
      try {
        const rentalHistoryResult = await CustomerService.getCustomerRentalHistory(customerIdToFetch);
        if (rentalHistoryResult.success) {
          setRentalHistory(rentalHistoryResult.data);
        } else {
          console.warn('Could not fetch rental history:', rentalHistoryResult.error);
          setRentalHistory([]);
        }
      } catch (err) {
        console.error('❌ Unexpected error in loadRentalHistory:', err);
        setRentalHistory([]);
      }
    } else {
      console.error("CustomerService.getCustomerRentalHistory is not available.");
      setRentalHistory([]);
    }
  };
  
  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || !customerData || !customerData.id) return;

    setUploading(true);
    setUploadError(null);

    try {
      const fileName = `${customerData.id}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('customer-documents')
        .getPublicUrl(fileName);
      
      if (!publicUrlData) throw new Error('Could not get public URL for the uploaded file.');
      
      const newImageUrl = publicUrlData.publicUrl;
      const currentImages = customerData.extra_images || [];
      const updatedImages = [...currentImages, newImageUrl];

      const { error: dbError } = await supabase
        .from('app_4c3a7a6153_customers')
        .update({ extra_images: updatedImages })
        .eq('id', customerData.id);

      if (dbError) throw dbError;
      
      await loadCustomerData();

    } catch (err) {
      console.error('❌ Error uploading image:', err);
      setUploadError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      if(fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCreateCustomerProfile = async () => {
    const sourceRental = rental || (rentalHistory.length > 0 ? rentalHistory[0] : null);
    if (!sourceRental) {
        setError("No rental data available to create a profile.");
        return;
    }

    setCreatingProfile(true);
    setError(null);
    setAlertMessage(null);

    try {
      const customerToSave = {
        full_name: sourceRental.customer_name,
        email: sourceRental.customer_email || sourceRental.email,
        phone: sourceRental.customer_phone || sourceRental.phone,
        licence_number: sourceRental.licence_number || sourceRental.customer_licence_number,
        nationality: sourceRental.nationality,
        id_number: sourceRental.id_number || sourceRental.customer_id_number,
      };

      const result = await CustomerService.saveCustomer(customerToSave);
      
      if (result.success) {
        setAlertMessage(result.message || (result.isExisting ? 'Found existing customer profile.' : 'Successfully created a new customer profile.'));
        await loadCustomerData();
      } else {
        setError(result.error || 'Failed to create or update customer profile.');
      }
    } catch (err) {
      console.error('❌ Error creating customer profile:', err);
      setError(`An unexpected error occurred: ${err.message}`);
    } finally {
      setCreatingProfile(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return 'Invalid Date';
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Invalid Date';
    }
  };

  if (!isOpen) return null;

  const idScanUrl = customerData?.id_scan_url;
  const customerIdImage = customerData?.customer_id_image;
  const extraImages = customerData?.extra_images || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Customer Details</h2>
            <p className="text-sm text-gray-600 mt-1">
              {customerData?.isRentalBased ? 'Limited Information Available' : 'Complete Customer Profile'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading customer data...</span>
            </div>
          )}

          {alertMessage && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center"><CheckCircle className="h-5 w-5 text-blue-400" /><span className="ml-2 text-blue-800 font-medium">Notification</span></div>
              <p className="text-blue-700 mt-1">{alertMessage}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center"><AlertCircle className="h-5 w-5 text-red-400" /><span className="ml-2 text-red-800 font-medium">Error</span></div>
              <p className="text-red-700 mt-1">{error}</p>
            </div>
          )}

          {customerData && !loading && (
            <>
              {customerData.isRentalBased ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center"><AlertCircle className="h-5 w-5 text-yellow-400" /><span className="ml-2 text-yellow-800 font-medium">Limited Information</span></div>
                    <button onClick={handleCreateCustomerProfile} disabled={creatingProfile} className="inline-flex items-center px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50">
                      {creatingProfile ? (<><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-1"></div>Creating...</>) : (<><Plus className="h-3 w-3 mr-1" />Create Profile</>)}
                    </button>
                  </div>
                  <p className="text-yellow-700 mt-2 text-sm">This customer doesn't have a complete profile yet. Data shown is from rental records only.</p>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center"><CheckCircle className="h-5 w-5 text-green-400" /><span className="ml-2 text-green-800 font-medium">Complete Profile</span></div>
                  <p className="text-green-700 mt-1 text-sm">This customer has a complete profile.</p>
                </div>
              )}

              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center"><User className="h-4 w-4 mr-2 text-blue-600" />Contact Information</h3>
                <div className="space-y-3">
                  <div className="flex items-start">
                      <div className="w-28 flex-shrink-0 flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Name:</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 break-words">{customerData?.full_name ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-start">
                      <div className="w-28 flex-shrink-0 flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Email:</span>
                      </div>
                      <span className="text-sm text-gray-900 break-words">{customerData?.email ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-start">
                      <div className="w-28 flex-shrink-0 flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Phone:</span>
                      </div>
                      <span className="text-sm text-gray-900 break-words">{customerData?.phone ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-start">
                      <div className="w-28 flex-shrink-0 flex items-center">
                          <CreditCard className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">License:</span>
                      </div>
                      <span className="text-sm text-gray-900 break-words">{customerData?.licence_number ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-start">
                      <div className="w-28 flex-shrink-0 flex items-center">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-500">Nationality:</span>
                      </div>
                      <span className="text-sm text-gray-900 break-words">{customerData?.nationality ?? 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Rental History */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center"><Clock className="h-4 w-4 mr-2 text-blue-600" />Rental History ({rentalHistory.length})</h3>
                {rentalHistory.length > 0 ? (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {rentalHistory.map(r => (
                      <Link to={`/admin/rentals/${r.id}`} key={r.id} className="block p-3 bg-white rounded-lg border hover:bg-gray-100">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold text-sm">{r.vehicle?.name || 'Unknown Vehicle'}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${r.rental_status === 'completed' ? 'bg-blue-100 text-blue-800' : r.rental_status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{r.rental_status}</span>
                        </div>
                        <p className="text-xs text-gray-500">{formatDate(r.rental_start_date)} - {formatDate(r.rental_end_date)}</p>
                      </Link>
                    ))}
                  </div>
                ) : (<p className="text-sm text-gray-500">No rental history found.</p>)}
              </div>

              {/* ID Document Scans */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center"><Camera className="h-4 w-4 mr-2 text-blue-600" />ID Scans</h3>
                {idScanUrl && <img src={idScanUrl} alt="ID Scan" className="w-full h-48 object-contain border rounded-lg cursor-pointer mb-2" onClick={() => window.open(idScanUrl, '_blank')} />}
                {customerIdImage && <img src={customerIdImage} alt="ID Document" className="w-full h-48 object-contain border rounded-lg cursor-pointer" onClick={() => window.open(customerIdImage, '_blank')} />}
                {!idScanUrl && !customerIdImage && <p className="text-sm text-gray-500">No ID documents available.</p>}
              </div>
              
              {/* Additional Documents */}
              {!customerData.isRentalBased && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center"><FileText className="h-4 w-4 mr-2 text-blue-600" />Additional Documents</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {extraImages.map((imgUrl, index) => (<div key={index} className="relative group"><img src={imgUrl} alt={`Extra doc ${index + 1}`} className="w-full h-24 object-cover border rounded-lg cursor-pointer" onClick={() => window.open(imgUrl, '_blank')} /></div>))}
                  </div>
                  <div>
                    <label htmlFor="image-upload" className="w-full">
                      <div className="mt-2 flex justify-center px-6 py-4 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:border-blue-500 bg-white">
                        <div className="text-center"><Upload className="mx-auto h-8 w-8 text-gray-400" /><p className="mt-1 text-sm text-gray-600">{uploading ? 'Uploading...' : 'Click to upload a document'}</p></div>
                      </div>
                      <input id="image-upload" name="image-upload" type="file" className="sr-only" onChange={handleImageUpload} disabled={uploading} ref={fileInputRef} accept="image/*,.pdf" />
                    </label>
                    {uploading && <div className="mt-2 h-1 w-full bg-blue-200 rounded"><div className="h-1 bg-blue-600 rounded animate-pulse"></div></div>}
                    {uploadError && <p className="mt-2 text-sm text-red-600">{uploadError}</p>}
                  </div>
                </div>
              )}

              {/* Account Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center"><CreditCard className="h-4 w-4 mr-2 text-blue-600" />Account Information</h3>
                <div className="space-y-3">
                  <div className="flex items-center"><span className="text-sm text-gray-500 w-20">Customer ID:</span><span className="text-sm font-mono text-gray-900">{customerData.id ?? 'N/A'}</span></div>
                  <div className="flex items-center"><span className="text-sm text-gray-500 w-20">Created:</span><span className="text-sm text-gray-900">{formatDateTime(customerData.created_at)}</span></div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ViewCustomerDetailsDrawer;