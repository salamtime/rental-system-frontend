import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectVehicles } from '../../store/slices/vehiclesSlice';
import { User, Calendar, Car, MapPin, CreditCard, FileText, UserSearch, Scan, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const RentalForm = ({ onSubmit, initialData = null, isLoading = false, scannedCustomerData = null }) => {
  // Form state
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    second_driver_name: '',
    second_driver_license: '',
    rental_type: 'daily',
    rental_start_date: '',
    rental_end_date: '',
    rental_status: 'scheduled',
    vehicle_id: '',
    quantity: 1,
    pickup_location: '',
    dropoff_location: '',
    transport_pickup: false,
    transport_dropoff: false,
    unit_price_mad: 0,
    subtotal: 0,
    damage_deposit: 0,
    total_amount: 0,
    deposit_amount: 0,
    remaining_amount: 0,
    payment_status: 'unpaid',
    promo_code: '',
    contract_signed: false,
    insurance_included: false,
    helmet_included: false,
    gear_included: false,
    auto_activate: true,
    notes: '',
    id_scan_url: '',
    customer_id_image: ''
  });

  const [errors, setErrors] = useState({});
  const vehicles = useSelector(selectVehicles) || [];
  const [manualFiles, setManualFiles] = useState([]);
  
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerSearchRef = useRef(null);
  const isProgrammaticChange = useRef(false);

  // Fetch initial data for suggestions
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersResponse, rentalsResponse] = await Promise.all([
          supabase.from('app_4c3a7a6153_customers').select('*'),
          supabase.from('app_4c3a7a6153_rentals').select('*').order('created_at', { ascending: false }),
        ]);

        if (customersResponse.data) setCustomers(customersResponse.data);
        if (rentalsResponse.data) setRentals(rentalsResponse.data);
        console.log('[RentalForm Autocomplete] Fetched initial customer and rental data.');
      } catch (err) {
        console.error("Failed to fetch initial data for auto-population in RentalForm", err);
      }
    };

    fetchData();
  }, []);

  // Handle clicks outside the suggestions dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Initialize form with existing data
  useEffect(() => {
    if (initialData) {
      isProgrammaticChange.current = true;
      setFormData({
        customer_name: initialData.customer_name || '',
        customer_email: initialData.customer_email || '',
        customer_phone: initialData.customer_phone || '',
        second_driver_name: initialData.second_driver_name || '',
        second_driver_license: initialData.second_driver_license || '',
        rental_type: initialData.rental_type || 'daily',
        rental_start_date: initialData.rental_start_date || '',
        rental_end_date: initialData.rental_end_date || '',
        rental_status: initialData.rental_status || 'scheduled',
        vehicle_id: initialData.vehicle_id || '',
        quantity: initialData.quantity || 1,
        pickup_location: initialData.pickup_location || '',
        dropoff_location: initialData.dropoff_location || '',
        transport_pickup: initialData.transport_pickup || false,
        transport_dropoff: initialData.transport_dropoff || false,
        unit_price_mad: initialData.unit_price_mad || 0,
        subtotal: initialData.subtotal || 0,
        damage_deposit: initialData.damage_deposit || 0,
        total_amount: initialData.total_amount || 0,
        deposit_amount: initialData.deposit_amount || 0,
        remaining_amount: initialData.remaining_amount || 0,
        payment_status: initialData.payment_status || 'unpaid',
        promo_code: initialData.promo_code || '',
        contract_signed: initialData.contract_signed || false,
        insurance_included: initialData.insurance_included || false,
        helmet_included: initialData.helmet_included || false,
        gear_included: initialData.gear_included || false,
        auto_activate: initialData.auto_activate !== undefined ? initialData.auto_activate : true,
        notes: initialData.notes || '',
        id_scan_url: initialData.id_scan_url || '',
        customer_id_image: initialData.customer_id_image || ''
      });
      
      // Initialize manualFiles if customer_id_image exists
      if (initialData.customer_id_image) {
        const urls = initialData.customer_id_image.split(',').filter(url => url.trim());
        setManualFiles(urls);
      }
    }
  }, [initialData]);

  const getAggregatedCustomerData = useCallback(() => {
    const customerMap = new Map();
    customers.forEach(c => {
        if (c.full_name) {
            const key = c.full_name.trim().toLowerCase();
            if (!customerMap.has(key)) {
                customerMap.set(key, {
                    id: c.id,
                    name: c.full_name,
                    email: c.email,
                    phone: c.phone,
                    licence_number: c.licence_number,
                    source: 'customer'
                });
            }
        }
    });
    rentals.forEach(r => {
        if (r.customer_name) {
            const key = r.customer_name.trim().toLowerCase();
            const existing = customerMap.get(key);
            if (existing) {
                if (!existing.email && r.customer_email) existing.email = r.customer_email;
                if (!existing.phone && r.customer_phone) existing.phone = r.customer_phone;
                if (!existing.licence_number && r.customer_licence_number) existing.licence_number = r.customer_licence_number;
            } else {
                customerMap.set(key, {
                    id: r.customer_id,
                    name: r.customer_name,
                    email: r.customer_email,
                    phone: r.customer_phone,
                    licence_number: r.customer_licence_number,
                    source: 'rental'
                });
            }
        }
    });
    return Array.from(customerMap.values());
  }, [customers, rentals]);

  useEffect(() => {
    if (isProgrammaticChange.current && formData.customer_name) {
        const customerData = getAggregatedCustomerData();
        const searchName = formData.customer_name.trim().toLowerCase();
        const match = customerData.find(c => c.name.trim().toLowerCase() === searchName);

        if (match) {
            console.log('🤖 [Admin] Found automatic match for customer:', match);
            setFormData(prev => ({
                ...prev,
                customer_email: prev.customer_email || match.email || '',
                customer_phone: prev.customer_phone || match.phone || '',
            }));
        }
        isProgrammaticChange.current = false;
    }
  }, [formData.customer_name, getAggregatedCustomerData]);

  // Calculate pricing when relevant fields change
  useEffect(() => {
    const unitPrice = parseFloat(formData.unit_price_mad) || 0;
    const quantity = parseInt(formData.quantity) || 1;
    const damageDeposit = parseFloat(formData.damage_deposit) || 0;
    const depositPaid = parseFloat(formData.deposit_amount) || 0;

    const subtotal = unitPrice * quantity;
    const totalAmount = subtotal + damageDeposit;
    const remainingAmount = Math.max(0, totalAmount - depositPaid);

    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: totalAmount,
      remaining_amount: remainingAmount
    }));
  }, [formData.unit_price_mad, formData.quantity, formData.damage_deposit, formData.deposit_amount]);

  // Handle vehicle selection and auto-pricing
  const handleVehicleChange = (vehicleId) => {
    const selectedVehicle = vehicles.find(v => v.id === parseInt(vehicleId));
    if (selectedVehicle) {
      // Auto-populate pricing based on vehicle model
      const basePrice = selectedVehicle.daily_rate || selectedVehicle.hourly_rate || 100;
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId,
        unit_price_mad: basePrice
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        vehicle_id: vehicleId
      }));
    }
  };

  // Multi-Upload Handler for Manual Import
  const handleManualUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Logic to prevent more than 3 images
    const totalAfterUpload = manualFiles.length + files.length;
    if (totalAfterUpload > 3) {
      alert("Maximum 3 images allowed for manual import");
      return;
    }

    const uploadedUrls = [];

    for (const file of files) {
      const fileName = `manual_${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage
        .from('customer-documents')
        .upload(fileName, file);

      if (error) {
        console.error('Upload error:', error);
        alert(`Failed to upload ${file.name}: ${error.message}`);
        continue;
      }

      if (data) {
        const { data: { publicUrl } } = supabase.storage
          .from('customer-documents')
          .getPublicUrl(fileName);
        uploadedUrls.push(publicUrl);
      }
    }

    const newFileList = [...manualFiles, ...uploadedUrls];
    setManualFiles(newFileList);

    // Update formData: Join the array into a comma-separated string for the DB column
    setFormData(prev => ({
      ...prev,
      customer_id_image: newFileList.join(',')
    }));
  };

  // Remove manual image
  const removeManualImage = (index) => {
    const filtered = manualFiles.filter((_, idx) => idx !== index);
    setManualFiles(filtered);
    setFormData(prev => ({ 
      ...prev, 
      customer_id_image: filtered.join(',') 
    }));
  };

  // Validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
    if (!formData.customer_email.trim()) newErrors.customer_email = 'Email is required';
    if (!formData.customer_phone.trim()) newErrors.customer_phone = 'Phone is required';
    if (!formData.rental_start_date) newErrors.rental_start_date = 'Start date is required';
    if (!formData.rental_end_date) newErrors.rental_end_date = 'End date is required';
    if (!formData.vehicle_id) newErrors.vehicle_id = 'Vehicle selection is required';
    if (!formData.pickup_location.trim()) newErrors.pickup_location = 'Pickup location is required';
    if (!formData.unit_price_mad || formData.unit_price_mad <= 0) newErrors.unit_price_mad = 'Unit price is required';

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.customer_email && !emailRegex.test(formData.customer_email)) {
      newErrors.customer_email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("🔄 [RentalForm] Submitting form with FORM STATE > OCR DATA priority...");
      console.log("📄 [RentalForm] Scanned Data:", scannedCustomerData);
      console.log("📝 [RentalForm] Current Form Data:", formData);

      // FORM STATE > OCR DATA: Merge strategy with existing form state taking absolute priority
      let finalPayload = { ...formData };

      if (scannedCustomerData) {
        // Extract document number with fallback logic
        const documentNumber = scannedCustomerData.document_number || 
                              scannedCustomerData.customer_licence_number || 
                              scannedCustomerData.customer_id_number;
        
        // CRITICAL FIX: Form State > OCR Data for all fields
        const finalMappedData = {
          ...formData, // 1. Keep what is already in the form (HIGHEST PRIORITY)
          
          // 2. Only populate from OCR if form field is empty
          customer_name: formData.customer_name || scannedCustomerData.full_name || scannedCustomerData.customer_name || '',
          customer_dob: formData.customer_dob || scannedCustomerData.date_of_birth || scannedCustomerData.customer_dob || '',
          customer_nationality: formData.customer_nationality || scannedCustomerData.nationality || scannedCustomerData.customer_nationality || '',
          
          // 3. THE FIX: Only update phone/email if they are currently empty AND OCR has a value
          customer_phone: formData.customer_phone || scannedCustomerData.phone || scannedCustomerData.customer_phone || '',
          customer_email: formData.customer_email || scannedCustomerData.email || scannedCustomerData.customer_email || '',
          
          // 4. Document ID fallback fix - map to BOTH fields
          customer_id_number: formData.customer_id_number || documentNumber || scannedCustomerData.id_number || '',
          customer_licence_number: formData.customer_licence_number || documentNumber || scannedCustomerData.licence_number || ''
        };
        
        console.log('🛡️ [RentalForm] Form State > OCR Data merge completed:', {
          preservedPhone: formData.customer_phone,
          ocrPhone: scannedCustomerData.phone || scannedCustomerData.customer_phone,
          finalPhone: finalMappedData.customer_phone,
          preservedEmail: formData.customer_email,
          ocrEmail: scannedCustomerData.email || scannedCustomerData.customer_email,
          finalEmail: finalMappedData.customer_email,
          mappedIdNumber: documentNumber,
          mappedLicenceNumber: documentNumber
        });
        
        finalPayload = finalMappedData;
      }
      
      // Clean the final payload to remove null/undefined values
      const cleanPayload = Object.fromEntries(
        Object.entries(finalPayload).filter(([_, v]) => v != null)
      );
      
      console.log("✅ [RentalForm] Final payload with Form State priority:", cleanPayload);
      onSubmit(cleanPayload);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    console.log('--- DEBUG: SELECTED CUSTOMER OBJECT (Admin) ---');
    console.log(JSON.stringify(suggestion, null, 2));
    console.log('---------------------------------------------');
    isProgrammaticChange.current = false;
    setFormData(prev => ({
        ...prev,
        customer_name: suggestion.name,
        customer_email: suggestion.email || '',
        customer_phone: suggestion.phone || '',
        second_driver_license: suggestion.licence_number || '',
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    if (field === 'customer_name') {
        isProgrammaticChange.current = false;
        if (value.length >= 2) {
            const customerData = getAggregatedCustomerData();
            const trimmedName = value.trim().toLowerCase();
            const filteredSuggestions = customerData.filter(suggestion => 
                suggestion.name.trim().toLowerCase().includes(trimmedName)
            );
            setSuggestions(filteredSuggestions);
            setShowSuggestions(filteredSuggestions.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Customer Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <User className="h-5 w-5" />
          Customer Information
        </div>

        {/* Two-Track Upload System */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* SCAN TRACK */}
          <div className={`p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2 ${formData.id_scan_url ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
            <div className="flex flex-col items-center">
              <Scan size={40} className={formData.id_scan_url ? 'text-green-500' : 'text-gray-400'} />
              <p className="font-black text-xs uppercase mt-2">Scan ID (to Scan URL)</p>
            </div>
            {formData.id_scan_url && <p className="text-[10px] text-green-600 font-bold truncate w-full text-center">Scan Received ✓</p>}
          </div>

          {/* MANUAL TRACK (Multi-Upload) */}
          <div className={`p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2 ${manualFiles.length > 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
            <label className="cursor-pointer flex flex-col items-center">
              <input 
                type="file" 
                multiple 
                className="hidden" 
                onChange={handleManualUpload} 
                accept="image/*" 
              />
              <Upload size={40} className={manualFiles.length > 0 ? 'text-blue-500' : 'text-gray-400'} />
              <p className="font-black text-xs uppercase mt-2">Import Images ({manualFiles.length}/3)</p>
            </label>
            
            {/* Thumbnails */}
            <div className="flex gap-2 mt-2 flex-wrap justify-center">
              {manualFiles.map((url, i) => (
                <div key={i} className="w-10 h-10 rounded-lg border-2 border-white shadow-sm overflow-hidden relative group">
                  <img src={url} className="w-full h-full object-cover" alt={`Manual upload ${i + 1}`} />
                  <button 
                    type="button"
                    onClick={() => removeManualImage(i)}
                    className="absolute inset-0 bg-red-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-xl"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative" ref={customerSearchRef}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Customer Name *
            </label>
            <input
              type="text"
              value={formData.customer_name}
              onChange={(e) => handleInputChange('customer_name', e.target.value)}
              placeholder="Enter customer name"
              autoComplete="off"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.customer_name ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                <ul>
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="px-4 py-2 cursor-pointer hover:bg-blue-50"
                    >
                      <div className="flex items-center">
                        <UserSearch className="h-4 w-4 mr-2 text-gray-500" />
                        <div>
                            <p className="font-medium text-gray-800">{suggestion.name}</p>
                            <p className="text-sm text-gray-500">{suggestion.phone} - {suggestion.email}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {errors.customer_name && !showSuggestions && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.customer_email}
              onChange={(e) => handleInputChange('customer_email', e.target.value)}
              placeholder="customer@email.com"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.customer_email ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customer_email && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone *
            </label>
            <input
              type="tel"
              value={formData.customer_phone}
              onChange={(e) => handleInputChange('customer_phone', e.target.value)}
              placeholder="+212-XXX-XXX-XXX"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.customer_phone ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.customer_phone && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_phone}</p>
            )}
          </div>
        </div>
      </div>

      {/* Second Driver Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <User className="h-5 w-5" />
          Second Driver Information (Optional)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Second Driver Name
            </label>
            <input
              type="text"
              value={formData.second_driver_name}
              onChange={(e) => handleInputChange('second_driver_name', e.target.value)}
              placeholder="Enter second driver's name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Second Driver License
            </label>
            <input
              type="text"
              value={formData.second_driver_license}
              onChange={(e) => handleInputChange('second_driver_license', e.target.value)}
              placeholder="Enter second driver's license"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Rental Details Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Calendar className="h-5 w-5" />
          Rental Details
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rental Type
            </label>
            <select
              value={formData.rental_type}
              onChange={(e) => handleInputChange('rental_type', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="hourly">Hourly</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.rental_start_date}
              onChange={(e) => handleInputChange('rental_start_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.rental_start_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.rental_start_date && (
              <p className="text-red-500 text-xs mt-1">{errors.rental_start_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date & Time *
            </label>
            <input
              type="datetime-local"
              value={formData.rental_end_date}
              onChange={(e) => handleInputChange('rental_end_date', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.rental_end_date ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.rental_end_date && (
              <p className="text-red-500 text-xs mt-1">{errors.rental_end_date}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={formData.rental_status}
              onChange={(e) => handleInputChange('rental_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="scheduled">Scheduled</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vehicle Selection Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Car className="h-5 w-5" />
          Vehicle Selection
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Vehicle *
            </label>
            <select
              value={formData.vehicle_id}
              onChange={(e) => handleVehicleChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.vehicle_id ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">
                {vehicles.length === 0 ? 'No vehicles available' : 'Select a vehicle'}
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} - {vehicle.model} ({vehicle.plate_number})
                </option>
              ))}
            </select>
            {errors.vehicle_id && (
              <p className="text-red-500 text-xs mt-1">{errors.vehicle_id}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity
            </label>
            <input
              type="number"
              min="1"
              value={formData.quantity}
              onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Location Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <MapPin className="h-5 w-5" />
          Location Information
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pickup Location *
              </label>
              <input
                type="text"
                value={formData.pickup_location}
                onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                placeholder="Enter pickup location"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.pickup_location ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.pickup_location && (
                <p className="text-red-500 text-xs mt-1">{errors.pickup_location}</p>
              )}
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="transport_pickup"
                checked={formData.transport_pickup}
                onChange={(e) => handleInputChange('transport_pickup', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="transport_pickup" className="ml-2 text-sm text-gray-700">
                Transport Pickup
              </label>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Drop-off Location
              </label>
              <input
                type="text"
                value={formData.dropoff_location}
                onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                placeholder="Enter drop-off location (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="transport_dropoff"
                checked={formData.transport_dropoff}
                onChange={(e) => handleInputChange('transport_dropoff', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="transport_dropoff" className="ml-2 text-sm text-gray-700">
                Transport Drop-off
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Information Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <CreditCard className="h-5 w-5" />
          Pricing Information
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Unit Price (MAD) *
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.unit_price_mad}
              onChange={(e) => handleInputChange('unit_price_mad', parseFloat(e.target.value) || 0)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.unit_price_mad ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.unit_price_mad && (
              <p className="text-red-500 text-xs mt-1">{errors.unit_price_mad}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subtotal (MAD)
            </label>
            <input
              type="number"
              value={formData.subtotal}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Damage Deposit (MAD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.damage_deposit}
              onChange={(e) => handleInputChange('damage_deposit', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Amount (MAD)
            </label>
            <input
              type="number"
              value={formData.total_amount}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deposit Paid (MAD)
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.deposit_amount}
              onChange={(e) => handleInputChange('deposit_amount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Remaining (MAD)
            </label>
            <input
              type="number"
              value={formData.remaining_amount}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Status
            </label>
            <select
              value={formData.payment_status}
              onChange={(e) => handleInputChange('payment_status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Promo Code
            </label>
            <input
              type="text"
              value={formData.promo_code}
              onChange={(e) => handleInputChange('promo_code', e.target.value)}
              placeholder="Enter promo code"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Additional Options Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <FileText className="h-5 w-5" />
          Additional Options
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="contract_signed"
              checked={formData.contract_signed}
              onChange={(e) => handleInputChange('contract_signed', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="contract_signed" className="ml-2 text-sm text-gray-700">
              Contract Signed
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="insurance_included"
              checked={formData.insurance_included}
              onChange={(e) => handleInputChange('insurance_included', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="insurance_included" className="ml-2 text-sm text-gray-700">
              Insurance Included
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="helmet_included"
              checked={formData.helmet_included}
              onChange={(e) => handleInputChange('helmet_included', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="helmet_included" className="ml-2 text-sm text-gray-700">
              Helmet Included
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="gear_included"
              checked={formData.gear_included}
              onChange={(e) => handleInputChange('gear_included', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="gear_included" className="ml-2 text-sm text-gray-700">
              Gear Included
            </label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="auto_activate"
              checked={formData.auto_activate}
              onChange={(e) => handleInputChange('auto_activate', e.target.checked)}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
            />
            <label htmlFor="auto_activate" className="ml-2 text-sm text-gray-700">
              Auto Activate
            </label>
          </div>
        </div>
      </div>

      {/* Notes Section */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            placeholder="Additional notes or comments..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-6 border-t">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="px-6 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Creating...' : initialData ? 'Update Rental' : 'Create Rental'}
        </button>
      </div>
    </form>
  );
};

export default RentalForm;