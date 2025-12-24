import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Calendar, Car, MapPin, CreditCard, FileText, UserSearch, Check, ChevronRight, Scan, Upload, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import EnhancedUnifiedIDScanModal from '../customers/EnhancedUnifiedIDScanModal';

const EnhancedStepperRentalForm = ({ onSubmit, initialData = null, isLoading = false }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showIDScanModal, setShowIDScanModal] = useState(false);
  const [scannedCustomerData, setScannedCustomerData] = useState(null);
  const [manualFiles, setManualFiles] = useState([]);

  // Form state - EXACT COPY from RentalForm.jsx
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_licence_number: '',
    customer_id_number: '',
    customer_dob: '',
    customer_nationality: '',
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
  const [vehicles, setVehicles] = useState([]);
  
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerSearchRef = useRef(null);
  const isProgrammaticChange = useRef(false);

  // Fetch vehicles - SAME AS RentalForm.jsx
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data, error } = await supabase
          .from('saharax_0u4w4d_vehicles')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setVehicles(data || []);
      } catch (err) {
        console.error('Failed to fetch vehicles:', err);
      }
    };

    fetchVehicles();
  }, []);

  // Fetch initial data for suggestions - EXACT COPY
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersResponse, rentalsResponse] = await Promise.all([
          supabase.from('app_4c3a7a6153_customers').select('*'),
          supabase.from('app_4c3a7a6153_rentals').select('*').order('created_at', { ascending: false }),
        ]);

        if (customersResponse.data) setCustomers(customersResponse.data);
        if (rentalsResponse.data) setRentals(rentalsResponse.data);
        console.log('[StepperRentalForm Autocomplete] Fetched initial customer and rental data.');
      } catch (err) {
        console.error("Failed to fetch initial data for auto-population", err);
      }
    };

    fetchData();
  }, []);

  // Handle clicks outside the suggestions dropdown - EXACT COPY
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

  // Initialize form with existing data - EXACT COPY
  useEffect(() => {
    if (initialData) {
      isProgrammaticChange.current = true;
      setFormData({
        customer_name: initialData.customer_name || '',
        customer_email: initialData.customer_email || '',
        customer_phone: initialData.customer_phone || '',
        customer_licence_number: initialData.customer_licence_number || '',
        customer_id_number: initialData.customer_id_number || '',
        customer_dob: initialData.customer_dob || '',
        customer_nationality: initialData.customer_nationality || '',
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
            console.log('🤖 [Stepper] Found automatic match for customer:', match);
            setFormData(prev => ({
                ...prev,
                customer_email: prev.customer_email || match.email || '',
                customer_phone: prev.customer_phone || match.phone || '',
            }));
        }
        isProgrammaticChange.current = false;
    }
  }, [formData.customer_name, getAggregatedCustomerData]);

  // Calculate pricing when relevant fields change - EXACT COPY
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

  // Handle vehicle selection and auto-pricing - EXACT COPY
  const handleVehicleChange = (vehicleId) => {
    const selectedVehicle = vehicles.find(v => v.id === parseInt(vehicleId));
    if (selectedVehicle) {
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

  // Handle ID Scan completion - STRICT FORM STATE > OCR DATA
  const handleIDScanComplete = (ocrData) => {
    console.log("🔄 [StepperForm] ID Scan completed with OCR data:", ocrData);
    setScannedCustomerData(ocrData);
    
    // Extract document number with fallback logic
    const documentNumber = ocrData.document_number || 
                          ocrData.customer_licence_number || 
                          ocrData.customer_id_number;
    
    // CRITICAL: FORM STATE > OCR DATA - Only populate empty fields
    setFormData(prev => ({
      ...prev,
      customer_name: prev.customer_name || ocrData.full_name || ocrData.customer_name || '',
      customer_email: prev.customer_email || ocrData.email || ocrData.customer_email || '',
      customer_phone: prev.customer_phone || ocrData.phone || ocrData.customer_phone || '',
      customer_dob: prev.customer_dob || ocrData.date_of_birth || ocrData.customer_dob || '',
      customer_nationality: prev.customer_nationality || ocrData.nationality || ocrData.customer_nationality || '',
      customer_id_number: prev.customer_id_number || documentNumber || ocrData.id_number || '',
      customer_licence_number: prev.customer_licence_number || documentNumber || ocrData.licence_number || ''
    }));
    
    console.log('🛡️ [StepperForm] Form State > OCR Data merge completed');
    setShowIDScanModal(false);
  };

  // Validation - EXACT COPY
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

  // Step validation
  const validateStep = (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
      if (!formData.customer_email.trim()) newErrors.customer_email = 'Email is required';
      if (!formData.customer_phone.trim()) newErrors.customer_phone = 'Phone is required';
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (formData.customer_email && !emailRegex.test(formData.customer_email)) {
        newErrors.customer_email = 'Please enter a valid email address';
      }
    } else if (step === 2) {
      if (!formData.vehicle_id) newErrors.vehicle_id = 'Vehicle selection is required';
      if (!formData.rental_start_date) newErrors.rental_start_date = 'Start date is required';
      if (!formData.rental_end_date) newErrors.rental_end_date = 'End date is required';
    } else if (step === 3) {
      if (!formData.pickup_location.trim()) newErrors.pickup_location = 'Pickup location is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission - EXACT COPY with scannedCustomerData handling
  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      console.log("🔄 [StepperForm] Submitting form with FORM STATE > OCR DATA priority...");
      console.log("📄 [StepperForm] Scanned Data:", scannedCustomerData);
      console.log("📝 [StepperForm] Current Form Data:", formData);

      // FORM STATE > OCR DATA: Merge strategy with existing form state taking absolute priority
      let finalPayload = { ...formData };

      if (scannedCustomerData) {
        const documentNumber = scannedCustomerData.document_number || 
                              scannedCustomerData.customer_licence_number || 
                              scannedCustomerData.customer_id_number;
        
        const finalMappedData = {
          ...formData,
          customer_name: formData.customer_name || scannedCustomerData.full_name || scannedCustomerData.customer_name || '',
          customer_dob: formData.customer_dob || scannedCustomerData.date_of_birth || scannedCustomerData.customer_dob || '',
          customer_nationality: formData.customer_nationality || scannedCustomerData.nationality || scannedCustomerData.customer_nationality || '',
          customer_phone: formData.customer_phone || scannedCustomerData.phone || scannedCustomerData.customer_phone || '',
          customer_email: formData.customer_email || scannedCustomerData.email || scannedCustomerData.customer_email || '',
          customer_id_number: formData.customer_id_number || documentNumber || scannedCustomerData.id_number || '',
          customer_licence_number: formData.customer_licence_number || documentNumber || scannedCustomerData.licence_number || ''
        };
        
        console.log('🛡️ [StepperForm] Form State > OCR Data merge completed:', {
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
      
      const cleanPayload = Object.fromEntries(
        Object.entries(finalPayload).filter(([_, v]) => v != null)
      );
      
      console.log("✅ [StepperForm] Final payload with Form State priority:", cleanPayload);
      onSubmit(cleanPayload);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    console.log('--- DEBUG: SELECTED CUSTOMER OBJECT (Stepper) ---');
    console.log(JSON.stringify(suggestion, null, 2));
    console.log('---------------------------------------------');
    isProgrammaticChange.current = false;
    setFormData(prev => ({
        ...prev,
        customer_name: suggestion.name,
        customer_email: suggestion.email || '',
        customer_phone: suggestion.phone || '',
        customer_licence_number: suggestion.licence_number || '',
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

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
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const steps = [
    { number: 1, title: 'Customer & ID', icon: User },
    { number: 2, title: 'Vehicle & Time', icon: Car },
    { number: 3, title: 'Logistics', icon: MapPin },
    { number: 4, title: 'Review & Payment', icon: CreditCard }
  ];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      {/* Progress Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <div className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center font-semibold transition-all ${
                  currentStep > step.number
                    ? 'bg-green-500 text-white'
                    : currentStep === step.number
                    ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {currentStep > step.number ? (
                    <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                  ) : (
                    <step.icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  )}
                </div>
                <span className={`text-xs sm:text-sm mt-2 text-center font-medium ${
                  currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 transition-all ${
                  currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-4 sm:p-6">
        {/* Step 1: Customer & ID Scan */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Customer Information</h2>

            {/* Two-Track Upload System */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SCAN TRACK */}
              <div className={`p-6 rounded-[2rem] border-2 border-dashed flex flex-col items-center gap-2 ${formData.id_scan_url ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}>
                <button 
                  type="button" 
                  onClick={() => setShowIDScanModal(true)} 
                  className="flex flex-col items-center"
                >
                  <Scan size={40} className={formData.id_scan_url ? 'text-green-500' : 'text-gray-400'} />
                  <p className="font-black text-xs uppercase mt-2">Scan ID (to Scan URL)</p>
                </button>
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

            <div className="space-y-4">
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  License Number
                </label>
                <input
                  type="text"
                  value={formData.customer_licence_number}
                  onChange={(e) => handleInputChange('customer_licence_number', e.target.value)}
                  placeholder="Enter license number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Second Driver Name
                  </label>
                  <input
                    type="text"
                    value={formData.second_driver_name}
                    onChange={(e) => handleInputChange('second_driver_name', e.target.value)}
                    placeholder="Optional"
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
                    placeholder="Optional"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Vehicle & Time */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Vehicle & Rental Period</h2>
            
            <div className="space-y-4">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        )}

        {/* Step 3: Logistics */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Pickup & Drop-off</h2>
            
            <div className="space-y-6">
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
        )}

        {/* Step 4: Review & Payment */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Review & Payment</h2>
            
            {/* Summary Section */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h3 className="font-semibold text-gray-900 mb-3">Rental Summary</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">Customer:</span>
                  <p className="font-medium">{formData.customer_name}</p>
                </div>
                <div>
                  <span className="text-gray-600">Email:</span>
                  <p className="font-medium">{formData.customer_email}</p>
                </div>
                <div>
                  <span className="text-gray-600">Phone:</span>
                  <p className="font-medium">{formData.customer_phone}</p>
                </div>
                <div>
                  <span className="text-gray-600">Vehicle:</span>
                  <p className="font-medium">
                    {vehicles.find(v => v.id === parseInt(formData.vehicle_id))?.name || 'Not selected'}
                  </p>
                </div>
                <div>
                  <span className="text-gray-600">Start Date:</span>
                  <p className="font-medium">{formData.rental_start_date ? new Date(formData.rental_start_date).toLocaleString() : 'Not set'}</p>
                </div>
                <div>
                  <span className="text-gray-600">End Date:</span>
                  <p className="font-medium">{formData.rental_end_date ? new Date(formData.rental_end_date).toLocaleString() : 'Not set'}</p>
                </div>
                <div>
                  <span className="text-gray-600">Pickup:</span>
                  <p className="font-medium">{formData.pickup_location}</p>
                </div>
                <div>
                  <span className="text-gray-600">Drop-off:</span>
                  <p className="font-medium">{formData.dropoff_location || 'Same as pickup'}</p>
                </div>
              </div>
            </div>

            {/* Pricing Section */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Pricing Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
                  />
                </div>
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            {/* Additional Options */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Additional Options</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                    Insurance
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
                    Helmet
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
                    Gear
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

            {/* Notes */}
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
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-3 pt-6 border-t mt-8">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="px-4 py-2 sm:px-6 sm:py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
          >
            Back
          </button>
          
          {currentStep < 4 ? (
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-2 px-4 py-2 sm:px-6 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
            >
              Next
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 sm:px-6 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base font-semibold"
            >
              {isLoading ? 'Creating...' : 'Confirm & Create Rental'}
            </button>
          )}
        </div>
      </form>

      {/* ID Scan Modal */}
      {showIDScanModal && (
        <EnhancedUnifiedIDScanModal
          isOpen={showIDScanModal}
          onClose={() => setShowIDScanModal(false)}
          onScanComplete={handleIDScanComplete}
        />
      )}
    </div>
  );
};

export default EnhancedStepperRentalForm;