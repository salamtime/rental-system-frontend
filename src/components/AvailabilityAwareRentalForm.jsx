import React, { useState, useEffect, useRef, useCallback } from 'react';
import TransactionalRentalService from '../services/TransactionalRentalService';
import SmartVehicleSelector from './SmartVehicleSelector';
import SmartDatePicker from './SmartDatePicker';
import VehicleModelService from '../services/VehicleModelService';
import AppSettingsService from '../services/AppSettingsService';
import EnhancedUnifiedIDScanModal from './customers/EnhancedUnifiedIDScanModal';
import enhancedUnifiedCustomerService from '../services/EnhancedUnifiedCustomerService';
import { supabase } from '../lib/supabase';
import { DollarSign, Calculator, Info, AlertCircle, CheckCircle, Loader, Clock, Scan, RefreshCw, Shield, CalendarX, UserPlus, UserSearch } from 'lucide-react';
import { getMoroccoTodayString, getMoroccoDateOffset, getMoroccoHourlyTimes, isAfter, parseDateAsLocal, formatDateToYYYYMMDD } from '../utils/moroccoTime';
import { debounce } from 'lodash';

const AvailabilityAwareRentalForm = ({ 
  onSuccess, 
  onCancel, 
  initialData = null,
  mode = 'create'
}) => {
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_id: null,
    vehicle_id: '',
    rental_start_date: '',
    rental_end_date: '',
    rental_start_time: '',
    rental_end_time: '',
    rental_type: 'hourly',
    rental_status: 'scheduled',
    payment_status: 'unpaid',
    total_amount: 0,
    pickup_location: 'Office',
    dropoff_location: 'Office',
    quantity_days: 0,
    unit_price: 0,
    transport_fee: 0,
    pickup_transport: false,
    dropoff_transport: false,
    deposit_amount: 0,
    damage_deposit: 0,
    remaining_amount: 0,
    customer_licence_number: '',
    customer_id_number: '',
    customer_dob: '',
    customer_place_of_birth: '',
    customer_nationality: '',
    customer_issue_date: '',
    contract_signed: false,
    insurance_included: true,
    helmet_included: true,
    gear_included: false,
    accessories: '',
    signature_url: null,
    second_driver_name: '',
    second_driver_license: '',
    second_driver_id_image: null,
    customer_id_image: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateError, setDateError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [transportFees, setTransportFees] = useState({
    pickup_fee: 0,
    dropoff_fee: 0
  });
  
  const [availabilityStatus, setAvailabilityStatus] = useState('unknown');
  const [availabilityDetails, setAvailabilityDetails] = useState(null);
  const [canSubmit, setCanSubmit] = useState(false);
  
  const [showIDScanModal, setShowIDScanModal] = useState(false);
  const isManualStatusChange = useRef(false);

  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [isPhoneDirty, setIsPhoneDirty] = useState(false);
  const [isEmailDirty, setIsEmailDirty] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const customerSearchRef = useRef(null);
  const isProgrammaticChange = useRef(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [customersResponse, rentalsResponse] = await Promise.all([
          supabase.from('app_4c3a7a6153_customers').select('*'),
          supabase.from('app_4c3a7a6153_rentals').select('*').order('created_at', { ascending: false }),
        ]);

        if (customersResponse.data) setCustomers(customersResponse.data);
        if (rentalsResponse.data) setRentals(rentalsResponse.data);
        console.log('[Auto-Populate] Fetched initial customer and rental data.');
      } catch (err) {
        console.error("Failed to fetch initial data for auto-population", err);
      }
    };

    fetchData();
    loadVehicleModels();
    loadTransportFees();
    if (mode === 'create') {
      const today = getMoroccoTodayString();
      setFormData(prev => ({
        ...prev,
        rental_start_date: prev.rental_start_date || today,
        rental_end_date: prev.rental_end_date || today,
      }));
    }
  }, [mode]);

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

  useEffect(() => {
    if (initialData && mode === 'edit') {
      console.log('📝 Initializing form for editing:', initialData);
      
      let startTime = '';
      let endTime = '';
      
      if (initialData.rental_start_at) {
        const startDate = new Date(initialData.rental_start_at);
        if (!isNaN(startDate.getTime())) {
            startTime = startDate.toTimeString().slice(0, 5);
        }
      }
      
      if (initialData.rental_end_at) {
        const endDate = new Date(initialData.rental_end_at);
        if (!isNaN(endDate.getTime())) {
            endTime = endDate.toTimeString().slice(0, 5);
        }
      }

      const cleanStartDate = initialData.rental_start_date ? initialData.rental_start_date.split('T')[0] : '';
      const cleanEndDate = initialData.rental_end_date ? initialData.rental_end_date.split('T')[0] : '';
      
      setFormData({
        ...formData,
        ...initialData,
        rental_start_date: cleanStartDate,
        rental_end_date: cleanEndDate,
        rental_start_time: startTime,
        rental_end_time: endTime,
        payment_status: initialData.payment_status || 'unpaid'
      });
    }
  }, [initialData, mode]);

  const composeDateTime = (date, time) => {
    if (!date) {
      return null;
    }
    const localDate = parseDateAsLocal(date);
    if (!localDate || isNaN(localDate.getTime())) {
        console.error('Composed invalid date from string:', date);
        return null;
    }

    const timeToUse = time || '00:00';
    const [hours, minutes] = timeToUse.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
        console.error('Invalid time format:', timeToUse);
        localDate.setHours(0, 0, 0, 0);
        return localDate;
    }

    localDate.setHours(hours, minutes, 0, 0);
    
    if (isNaN(localDate.getTime())) {
        console.error('Composed invalid date with time:', date, time);
        return null;
    }
    return localDate;
  };

  useEffect(() => {
    if (formData.rental_start_date && formData.rental_end_date && formData.rental_start_time && formData.rental_end_time) {
      const startDatetime = composeDateTime(formData.rental_start_date, formData.rental_start_time);
      const endDatetime = composeDateTime(formData.rental_end_date, formData.rental_end_time);

      if (startDatetime && endDatetime && startDatetime >= endDatetime) {
        console.warn('BIDIRECTIONAL_VALIDATION: Start date/time is on or after end date/time. Auto-correcting start time...');
        
        let newStartDatetime = new Date(endDatetime);
        
        if (formData.rental_type === 'hourly') {
          newStartDatetime.setHours(newStartDatetime.getHours() - 1);
        } else { // daily or weekly
          newStartDatetime.setDate(newStartDatetime.getDate() - 1);
        }

        const newStartDate = formatDateToYYYYMMDD(newStartDatetime);
        const newStartTime = newStartDatetime.toTimeString().slice(0, 5);

        if (formData.rental_start_date !== newStartDate || formData.rental_start_time !== newStartTime) {
            setFormData(prev => ({
              ...prev,
              rental_start_date: newStartDate,
              rental_start_time: newStartTime,
            }));
            setDateError("Start time was automatically adjusted to be before the end time.");
            return; 
        }
      } else {
        setDateError(null);
      }
    }
    calculateQuantityAndPricing();
  }, [
    formData.rental_start_date, 
    formData.rental_end_date,
    formData.rental_start_time,
    formData.rental_end_time,
    formData.rental_type,
    formData.vehicle_id
  ]);

  useEffect(() => {
    calculateTransportFee();
  }, [formData.pickup_transport, formData.dropoff_transport, transportFees]);

  useEffect(() => {
    calculateFinancials();
  }, [formData.quantity_days, formData.unit_price, formData.transport_fee, formData.deposit_amount]);

    useEffect(() => {
      if (isManualStatusChange.current) {
        return;
      }
      const deposit = parseFloat(formData.deposit_amount) || 0;
      const total = parseFloat(formData.total_amount) || 0;
      const currentStatus = formData.payment_status;

      if (currentStatus === 'overdue') {
        return;
      }
      
      let newPaymentStatus;
      if (total > 0) {
          if (deposit <= 0) {
              newPaymentStatus = 'unpaid';
          } else if (deposit >= total) {
              newPaymentStatus = 'paid';
          } else {
              newPaymentStatus = 'partial';
          }
      } else {
          newPaymentStatus = 'unpaid';
      }

      if (newPaymentStatus !== currentStatus) {
        console.log(`🔄 Auto-updating payment status from "${currentStatus}" to "${newPaymentStatus}" based on deposit: ${deposit} and total: ${total}.`);
        setFormData(prev => ({
          ...prev,
          payment_status: newPaymentStatus
        }));
      }
    }, [formData.deposit_amount, formData.total_amount, formData.payment_status]);

  useEffect(() => {
    if (formData.vehicle_id && formData.rental_type) {
      console.log('🔄 Auto-populating unit price for:', { 
        vehicle_id: formData.vehicle_id, 
        rental_type: formData.rental_type 
      });
      autoPopulateUnitPrice();
    } else if (!formData.vehicle_id) {
      console.log('🔄 No vehicle selected, clearing unit price');
      setFormData(prev => ({
        ...prev,
        unit_price: 0
      }));
    }
  }, [formData.vehicle_id, formData.rental_type]);

    useEffect(() => {
      if (isManualStatusChange.current) {
        handlePaymentStatusChange();
        isManualStatusChange.current = false;
      }
    }, [formData.payment_status]);

  useEffect(() => {
    checkSubmissionReadiness();
  }, [
    formData.vehicle_id,
    formData.rental_start_date,
    formData.rental_end_date,
    formData.customer_name,
    formData.customer_email,
    formData.customer_phone,
    availabilityStatus,
    dateError
  ]);
  
  useEffect(() => {
    if (formData.rental_type === 'hourly' && formData.rental_start_time) {
      console.log('⏰ Hourly rental start time changed, auto-updating end time...');
      handleQuickHourSelect(1);
    }
  }, [formData.rental_start_time, formData.rental_type]);

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
              console.log('🤖 Found automatic match for customer:', match);
              setFormData(prev => ({
                  ...prev,
                  customer_email: prev.customer_email || match.email || '',
                  customer_phone: prev.customer_phone || match.phone || '',
                  customer_id: prev.customer_id || match.id || null,
              }));
          }
          isProgrammaticChange.current = false;
      }
  }, [formData.customer_name, getAggregatedCustomerData]);

  const loadVehicleModels = async () => {
    try {
      const models = await VehicleModelService.getAllVehicleModels();
      setVehicleModels(models);
      console.log('🚗 Vehicle models loaded for pricing lookup:', models);
    } catch (err) {
      console.error('Error loading vehicle models:', err);
    }
  };

  const loadTransportFees = async () => {
    try {
      const fees = await AppSettingsService.getTransportFees();
      setTransportFees(fees);
      console.log('🚚 Transport fees loaded:', fees);
    } catch (err) {
      console.error('Error loading transport fees:', err);
    }
  };

  const checkSubmissionReadiness = () => {
    const hasRequiredFields = formData.customer_name && 
                             formData.customer_phone && 
                             formData.vehicle_id && 
                             formData.rental_start_date && 
                             formData.rental_end_date;
    
    const hasAvailability = availabilityStatus !== 'conflict';
    const isReady = hasRequiredFields && hasAvailability && !dateError;
    
    console.log('🔍 FIXED Submission readiness check (Email Optional):', {
      hasRequiredFields,
      hasAvailability,
      availabilityStatus,
      isReady,
      customer_email_provided: !!formData.customer_email,
      dateError
    });
    
    setCanSubmit(isReady);
  };

  const calculateQuantityAndPricing = () => {
    const { rental_type, rental_start_date, rental_end_date, rental_start_time, rental_end_time, vehicle_id } = formData;

    if (!rental_start_date || !rental_end_date) return;

    let startDatetime = composeDateTime(rental_start_date, rental_start_time);
    let endDatetime = composeDateTime(rental_end_date, rental_end_time);

    if (!startDatetime || !endDatetime || isAfter(startDatetime, endDatetime)) return;

    let updatedEndDate = rental_end_date;
    let isOvernight = false;

    if (rental_type === 'hourly' && endDatetime < startDatetime) {
      const correctedEndDate = new Date(endDatetime);
      correctedEndDate.setDate(correctedEndDate.getDate() + 1);
      endDatetime = correctedEndDate;
      updatedEndDate = formatDateToYYYYMMDD(correctedEndDate);
      isOvernight = true;
      console.log('🕒 Overnight hourly rental detected. Corrected end date:', updatedEndDate);
    }

    let quantity = 0;
    if (rental_type === 'hourly') {
      const diffHours = (endDatetime - startDatetime) / (1000 * 60 * 60);
      quantity = Math.ceil(Math.max(diffHours, 1));
    } else if (rental_type === 'weekly') {
      const diffDays = Math.max(Math.ceil((endDatetime - startDatetime) / (1000 * 60 * 60 * 24)), 1);
      quantity = Math.ceil(diffDays / 7);
    } else {
      const startDate = parseDateAsLocal(rental_start_date);
      const endDate = parseDateAsLocal(updatedEndDate);
      if (!startDate || !endDate) return;
      const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      quantity = Math.max(diffDays, 1);
    }

    console.log('📊 Calculated quantity:', quantity, 'for rental type:', rental_type);

    if (isOvernight || formData.quantity_days !== quantity) {
        setFormData(prev => ({
          ...prev,
          quantity_days: quantity,
          ...(isOvernight && { rental_end_date: updatedEndDate }),
        }));
    }
    
    if (vehicle_id) {
      autoPopulateUnitPrice();
    }
  };

  const handlePaymentStatusChange = () => {
    if (formData.payment_status === 'paid' && formData.total_amount > 0) {
      console.log('💰 Payment status is "Paid" - auto-setting deposit to total amount:', formData.total_amount);
      setFormData(prev => ({
        ...prev,
        deposit_amount: prev.total_amount
      }));
    }
  };

  const getDirectPricing = (vehicleId, rentalType) => {
    console.log('💰 Direct pricing lookup for:', { vehicleId, rentalType });
    
    if (!vehicleId || !rentalType) {
      console.log('⚠️ Invalid inputs for pricing lookup:', { vehicleId, rentalType });
      return 0;
    }
    
    const pricingMap = {
      '9': { hourly: 400, daily: 1500, weekly: 5000 },
      '10': { hourly: 600, daily: 1800, weekly: 10000 },
      '11': { hourly: 1000, daily: 3800, weekly: 15000 },
      '1': { hourly: 400, daily: 1500, weekly: 5000 },
      '2': { hourly: 400, daily: 1500, weekly: 5000 },
      '3': { hourly: 600, daily: 1800, weekly: 10000 },
      '4': { hourly: 600, daily: 1800, weekly: 10000 },
      '5': { hourly: 1000, daily: 3800, weekly: 15000 },
      '6': { hourly: 1000, daily: 3800, weekly: 15000 },
      '7': { hourly: 400, daily: 1500, weekly: 5000 },
      '8': { hourly: 600, daily: 1800, weekly: 10000 },
      '12': { hourly: 1000, daily: 3800, weekly: 15000 },
      '13': { hourly: 400, daily: 1500, weekly: 5000 },
      '14': { hourly: 600, daily: 1800, weekly: 10000 },
      '15': { hourly: 1000, daily: 3800, weekly: 15000 },
      '23': { hourly: 400, daily: 1500, weekly: 5000 }
    };

    const vehiclePricing = pricingMap[vehicleId.toString()];
    if (!vehiclePricing) {
      console.log('⚠️ No pricing found for vehicle ID:', vehicleId);
      return rentalType === 'hourly' ? 400 : rentalType === 'daily' ? 1500 : 5000;
    }

    const price = vehiclePricing[rentalType] || 0;
    console.log('✅ Found price:', price, 'MAD for vehicle', vehicleId, 'rental type', rentalType);
    return price;
  };

  const autoPopulateUnitPrice = () => {
    try {
      console.log('💰 Starting auto-populate unit price...');
      
      if (!formData.vehicle_id || !formData.rental_type) {
        console.log('⚠️ Missing vehicle or rental type, keeping unit price at 0');
        return;
      }

      const unitPrice = getDirectPricing(formData.vehicle_id, formData.rental_type);

      console.log('💰 Retrieved unit price:', unitPrice);

      setFormData(prev => ({
        ...prev,
        unit_price: unitPrice
      }));

      if (unitPrice > 0) {
        console.log('✅ Unit price auto-populated successfully:', unitPrice);
      } else {
        console.log('⚠️ No pricing found or price is 0');
      }
    } catch (err) {
      console.error('❌ Error auto-populating unit price:', err);
    }
  };

  const calculateTransportFee = () => {
    let totalTransportFee = 0;
    
    if (formData.pickup_transport) {
      totalTransportFee += transportFees.pickup_fee || 0;
    }
    
    if (formData.dropoff_transport) {
      totalTransportFee += transportFees.dropoff_fee || 0;
    }
    
    setFormData(prev => ({
      ...prev,
      transport_fee: totalTransportFee
    }));
  };

  const calculateFinancials = () => {
    const subtotal = (formData.quantity_days || 0) * (formData.unit_price || 0);
    const total = subtotal + (formData.transport_fee || 0);
    const remaining = total - (formData.deposit_amount || 0);

    console.log('💰 Financial calculation:', {
      subtotal: subtotal,
      transport_fee: formData.transport_fee,
      total: total,
      deposit_amount: formData.deposit_amount,
      damage_deposit: formData.damage_deposit,
      remaining: remaining
    });

    setFormData(prev => ({
      ...prev,
      total_amount: total,
      remaining_amount: Math.max(remaining, 0)
    }));
  };

  const handleSuggestionClick = (suggestion) => {
    console.log('--- DEBUG: SELECTED CUSTOMER OBJECT ---');
    console.log(JSON.stringify(suggestion, null, 2));
    console.log('------------------------------------');
    isProgrammaticChange.current = false;
    setFormData(prev => ({
        ...prev,
        customer_name: suggestion.name,
        customer_email: !isEmailDirty ? suggestion.email || '' : prev.customer_email,
        customer_phone: !isPhoneDirty ? suggestion.phone || '' : prev.customer_phone,
        customer_licence_number: suggestion.licence_number || '',
        customer_id: suggestion.id || null,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    console.log('📝 HandleChange called:', { name, value, type, checked });

    if (name === 'payment_status') {
      isManualStatusChange.current = true;
    }

    if (name === 'customer_phone') setIsPhoneDirty(true);
    if (name === 'customer_email') setIsEmailDirty(true);

    if (name === 'customer_name') {
        isProgrammaticChange.current = false;
        setFormData(prev => ({ ...prev, customer_name: value }));

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
        return;
    }

    if (error) {
      setError(null);
    }
    
    let newFormData = { ...formData, [name]: type === 'checkbox' ? checked : value };

    if (name === 'rental_type') {
      console.log('📅 RENTAL TYPE CHANGED TO:', value);
      const todayStr = getMoroccoTodayString();
      const currentTime = new Date().toTimeString().slice(0, 5);
      
      newFormData.rental_type = value;

      let startDateToUse = newFormData.rental_start_date || todayStr;
      if (startDateToUse && startDateToUse.includes('T')) {
        startDateToUse = startDateToUse.split('T')[0];
      }

      if (value === 'hourly') {
        newFormData.rental_start_date = startDateToUse;
        newFormData.rental_end_date = startDateToUse;
      } else if (value === 'daily') {
        const tomorrowStr = getMoroccoDateOffset(1, startDateToUse);
        newFormData.rental_start_date = startDateToUse;
        newFormData.rental_end_date = tomorrowStr;
        newFormData.rental_start_time = currentTime;
        newFormData.rental_end_time = currentTime;
      } else if (value === 'weekly') {
        const weekLaterStr = getMoroccoDateOffset(7, startDateToUse);
        newFormData.rental_start_date = startDateToUse;
        newFormData.rental_end_date = weekLaterStr;
        newFormData.rental_start_time = currentTime;
        newFormData.rental_end_time = currentTime;
      }
    }

    if (name === 'rental_start_date') {
        let dateValue = value;
        if (dateValue && dateValue.includes('T')) {
            dateValue = dateValue.split('T')[0];
        }
        if (newFormData.rental_type === 'daily') {
            const nextDay = getMoroccoDateOffset(1, dateValue);
            newFormData.rental_end_date = nextDay;
        } else if (newFormData.rental_type === 'weekly') {
            const weekLater = getMoroccoDateOffset(7, dateValue);
            newFormData.rental_end_date = weekLater;
        } else if (newFormData.rental_type === 'hourly') {
            newFormData.rental_end_date = dateValue;
        }
        newFormData.rental_start_date = dateValue;
    }

    setFormData(newFormData);
  };

  const handleFileChange = async (e) => {
    const { name, files } = e.target;
    if (files.length > 0) {
      const file = files[0];
      const filePath = `${initialData?.id || 'new_rental'}-${name}-${Date.now()}`;
      
      setLoading(true);
      setError(null);
      setSuccess(null);

      try {
        console.log(`Uploading to bucket 'customer-documents' with path: ${filePath}`);
        const { data, error: uploadError } = await supabase.storage
          .from('customer-documents')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: true, // FIXED: Changed from false to true for Vercel compatibility
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = supabase.storage.from('customer-documents').getPublicUrl(data.path);

        setFormData(prev => ({
          ...prev,
          [name]: publicUrl,
        }));
        setSuccess(`✅ ${name.replace(/_/g, ' ')} uploaded successfully!`);
      } catch (err) {
        console.error("Image upload failed:", err);
        let friendlyError = `Failed to upload image: ${err.message}.`;
        if (err.message.includes('Bucket not found')) {
            friendlyError += "\\n\\nSuggestion: Please ensure a Supabase Storage bucket named 'customer-documents' exists and has the correct public access policies."
        } else if (err.message.includes('400')) {
            friendlyError += "\\n\\nSuggestion: The file path or type might be invalid. Please try again."
        }
        setError(friendlyError);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRentalTypeChange = (value) => {
    console.log('📅 Rental type tab changed to:', value);
    
    const syntheticEvent = {
      target: {
        name: 'rental_type',
        value: value,
        type: 'select'
      }
    };
    
    handleChange(syntheticEvent);
    
    if (value === 'hourly') {
      console.log('⏰ HOURLY RENTAL: Auto-populating time fields with Morocco timezone');
      
      try {
        const { startTime, endTime } = getMoroccoHourlyTimes();
        
        console.log('⏰ HOURLY RENTAL: Calculated times:', { startTime, endTime });
        
        setFormData(prev => ({
          ...prev,
          rental_start_time: startTime,
          rental_end_time: endTime
        }));
        
        console.log('✅ HOURLY RENTAL: Time fields auto-populated successfully');
        
      } catch (error) {
        console.error('❌ Error auto-populating hourly times:', error);
      }
    }
  };

  const handleVehicleChange = (vehicleId) => {
    console.log('🚗 Vehicle selection changed to:', vehicleId);
    setFormData(prev => ({
      ...prev,
      vehicle_id: vehicleId,
      unit_price: vehicleId ? prev.unit_price : 0
    }));

    if (error) {
      setError(null);
    }

    setAvailabilityStatus('unknown');
    setAvailabilityDetails(null);
  };

  const handleDateChange = (field, value) => {
    console.log('📅 Date change from SmartDatePicker:', field, value, 'Rental type:', formData.rental_type);
    
    let cleanValue = value;
    if (value && value.includes('T')) {
        cleanValue = value.split('T')[0];
    }

    const newValues = {};
    newValues[field === 'startDate' ? 'rental_start_date' : 'rental_end_date'] = cleanValue;

    if (field === 'startDate') {
      if (formData.rental_type === 'hourly') {
        newValues.rental_end_date = cleanValue;
      } else if (formData.rental_type === 'daily') {
        newValues.rental_end_date = getMoroccoDateOffset(1, cleanValue);
      } else if (formData.rental_type === 'weekly') {
        newValues.rental_end_date = getMoroccoDateOffset(7, cleanValue);
      }
    }
    
    setFormData(prev => ({ ...prev, ...newValues }));

    if (error) {
      setError(null);
    }

    setAvailabilityStatus('unknown');
    setAvailabilityDetails(null);
  };

  const handleQuickHourSelect = (hours) => {
    if (formData.rental_start_date && formData.rental_start_time) {
      console.log(`🚀 Quick select: Adding ${hours} hours to start time.`);
      const startDatetime = composeDateTime(formData.rental_start_date, formData.rental_start_time);
      
      if (startDatetime) {
        const endDatetime = new Date(startDatetime.getTime() + hours * 60 * 60 * 1000);
        
        const newEndDate = formatDateToYYYYMMDD(endDatetime);
        const newEndTime = endDatetime.toTimeString().slice(0, 5);

        setFormData(prev => ({
          ...prev,
          rental_end_date: newEndDate,
          rental_end_time: newEndTime,
        }));
        
        console.log(`✅ End time updated to: ${newEndDate} ${newEndTime}`);
      }
    } else {
      console.warn('⚠️ Cannot quick-select hours without a start date and time.');
      setError('Please set a start date and time first.');
    }
  };

  const handleQuickDaySelect = (days) => {
    if (formData.rental_start_date) {
      console.log(`🚀 Quick select: Adding ${days} days to start date.`);
      const newEndDate = getMoroccoDateOffset(days, formData.rental_start_date);
      
      setFormData(prev => ({
        ...prev,
        rental_end_date: newEndDate,
      }));
      
      console.log(`✅ End date updated to: ${newEndDate}`);
    } else {
      console.warn('⚠️ Cannot quick-select days without a start date.');
      setError('Please set a start date first.');
    }
  };

  const handleCustomerSaved = async (savedCustomer, image = null) => {
    console.log('✅ Customer saved from ID scan:', savedCustomer);
    console.log('🖼️ Image received:', !!image);
    
    try {
      let customerData = savedCustomer;
      
      const customerId = savedCustomer.id || savedCustomer.customer_id;
      
      if (customerId) {
        console.log('🔍 Fetching complete customer data from database for ID:', customerId);
        const fetchResult = await enhancedUnifiedCustomerService.getCustomerById(customerId);
        
        if (fetchResult.success && fetchResult.data) {
          customerData = fetchResult.data;
          console.log('✅ Complete customer data fetched:', customerData);
        } else {
          console.warn('⚠️ Could not fetch complete customer data, using saved data');
        }
      }
      isProgrammaticChange.current = true;
      setFormData(prev => ({
        ...prev,
        customer_name: customerData.full_name || customerData.customer_name || customerData.raw_name || prev.customer_name,
        customer_email: customerData.email || customerData.customer_email || prev.customer_email,
        customer_phone: customerData.phone || customerData.customer_phone || prev.customer_phone,
        customer_id: customerData.id || customerData.customer_id,
        customer_licence_number: customerData.licence_number || customerData.document_number || prev.customer_licence_number,
        customer_id_number: customerData.id_number || customerData.document_number || prev.customer_id_number,
        customer_dob: customerData.date_of_birth || prev.customer_dob,
        customer_place_of_birth: customerData.place_of_birth || prev.customer_place_of_birth,
        customer_nationality: customerData.nationality || prev.customer_nationality,
        customer_issue_date: customerData.issue_date || prev.customer_issue_date
      }));
      
      setShowIDScanModal(false);
      
      const populatedFields = [];
      if (customerData.full_name || customerData.customer_name || customerData.raw_name) populatedFields.push('Name');
      if (customerData.email || customerData.customer_email) populatedFields.push('Email');
      if (customerData.phone || customerData.customer_phone) populatedFields.push('Phone');
      if (customerData.licence_number || customerData.document_number) populatedFields.push('License Number');
      if (customerData.id_number) populatedFields.push('ID Number');
      if (customerData.date_of_birth) populatedFields.push('Date of Birth');
      
      setSuccess(`✅ Customer information updated from ID scan! Populated: ${populatedFields.join(', ')}`);
      
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
      
    } catch (error) {
      console.error('❌ Error handling customer saved:', error);
      setError(`Failed to populate customer data: ${error.message}`);
    }
  };

  const runDiagnostics = async () => {
    try {
      console.log('🔧 Running emergency diagnostics...');
      const results = await TransactionalRentalService.runDiagnostics();
      setDebugInfo(results);
      console.log('🔧 Diagnostic results:', results);
    } catch (err) {
      console.error('❌ Diagnostics failed:', err);
      setDebugInfo({ error: err.message });
    }
  };

  const generateCustomerId = () => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 11);
    return `cust_${timestamp}_${randomString}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submissionReadyFormData = { ...formData };

    const currentTime = new Date().toTimeString().slice(0, 5);
    if (!submissionReadyFormData.rental_start_time) {
      console.log('⏰ AUTO-FILL: Start time is empty, setting to current time:', currentTime);
      submissionReadyFormData.rental_start_time = currentTime;
    }
    if (!submissionReadyFormData.rental_end_time) {
      console.log('⏰ AUTO-FILL: End time is empty, setting to current time:', currentTime);
      submissionReadyFormData.rental_end_time = currentTime;
    }
    
    console.log('📝 FRONTEND FIX: Form submission started...');
    console.log('📊 Current form data (with auto-filled time):', submissionReadyFormData);
    console.log('🔍 Submission state:', { canSubmit, loading, availabilityStatus });
    
    if (dateError) {
      setError(dateError);
      return;
    }

    if (!canSubmit && availabilityStatus === 'conflict') {
      console.log('❌ Form submission blocked - confirmed conflict detected');
      setError('Please resolve vehicle availability conflicts before submitting the rental.');
      return;
    }
    
    if (!submissionReadyFormData.customer_name || !submissionReadyFormData.customer_phone || 
        !submissionReadyFormData.vehicle_id || !submissionReadyFormData.rental_start_date || !submissionReadyFormData.rental_end_date) {
      console.log('❌ Missing required fields');
      setError('Please fill in all required fields: Customer name, phone, vehicle, start date, and end date.');
      return;
    }
    
    // FRONTEND FIX: Properly handle email trimming without converting to null
    const trimmedEmail = (submissionReadyFormData.customer_email || '').trim();
    const emailToSubmit = trimmedEmail.length > 0 ? trimmedEmail : null;

    if (trimmedEmail.length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        console.log('❌ Invalid email format');
        setError('Please enter a valid email address or leave the email field empty.');
        return;
      }
    }
    
    console.log('✅ FRONTEND FIX: Validation passed, proceeding with submission');
    console.log('📧 FRONTEND FIX: Email value to submit:', emailToSubmit);
    console.log('📞 FRONTEND FIX: Phone value to submit:', submissionReadyFormData.customer_phone);
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    setDebugInfo(null);

    try {
      let finalCustomerId = submissionReadyFormData.customer_id;
      
      if (!finalCustomerId) {
        console.log('🆕 Customer ID missing, creating new customer record...');
        const newCustomerId = generateCustomerId();
        
        const newCustomerData = {
          id: newCustomerId,
          full_name: submissionReadyFormData.customer_name,
          phone: submissionReadyFormData.customer_phone,
          email: emailToSubmit,
          licence_number: submissionReadyFormData.customer_licence_number || null,
          id_number: submissionReadyFormData.customer_id_number || null,
          date_of_birth: submissionReadyFormData.customer_dob || null,
          nationality: submissionReadyFormData.customer_nationality || null,
          address: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('💾 Saving new customer:', newCustomerData);
        const saveResult = await enhancedUnifiedCustomerService.saveCustomer(newCustomerData);
        
        if (saveResult.success) {
          finalCustomerId = newCustomerId;
          console.log('✅ Created new customer:', finalCustomerId);
        } else {
          throw new Error(`Failed to create new customer: ${saveResult.error}`);
        }
        
        setFormData(prev => ({
          ...prev,
          customer_id: finalCustomerId
        }));
      }

      // FRONTEND FIX: Explicitly preserve customer_phone and customer_email in submission data
      const submissionData = {
        ...submissionReadyFormData,
        customer_id: finalCustomerId,
        
        // FRONTEND FIX: Explicitly set customer contact info (CRITICAL FIX)
        customer_phone: submissionReadyFormData.customer_phone,
        customer_email: emailToSubmit,
        
        vehicle_id: submissionReadyFormData.vehicle_id ? Number(submissionReadyFormData.vehicle_id) : null,
        quantity_days: Number(submissionReadyFormData.quantity_days) || 0,
        unit_price: Number(submissionReadyFormData.unit_price) || 0,
        transport_fee: Number(submissionReadyFormData.transport_fee) || 0,
        total_amount: Number(submissionReadyFormData.total_amount) || 0,
        deposit_amount: Number(submissionReadyFormData.deposit_amount) || 0,
        damage_deposit: Number(submissionReadyFormData.damage_deposit) || 0,
        remaining_amount: Number(submissionReadyFormData.remaining_amount) || 0,

        rental_status: submissionReadyFormData.rental_status || 'scheduled',
        payment_status: submissionReadyFormData.payment_status || 'unpaid',

        rental_start_at: composeDateTime(submissionReadyFormData.rental_start_date, submissionReadyFormData.rental_start_time)?.toISOString(),
        rental_end_at: composeDateTime(submissionReadyFormData.rental_end_date, submissionReadyFormData.rental_end_time)?.toISOString(),

        accessories: submissionReadyFormData.accessories || null,
        customer_licence_number: submissionReadyFormData.customer_licence_number || null,
        customer_id_number: submissionReadyFormData.customer_id_number || null,
        customer_dob: submissionReadyFormData.customer_dob || null,
        customer_place_of_birth: submissionReadyFormData.customer_place_of_birth || null,
        customer_nationality: submissionReadyFormData.customer_nationality || null,
        customer_issue_date: submissionReadyFormData.customer_issue_date || null,
        linked_display_id: submissionReadyFormData.linked_display_id || null, 
        signature_url: submissionReadyFormData.signature_url || null,
      };

      delete submissionData.vehicle;
      delete submissionData.booking_range;

      console.log('📦 FRONTEND FIX: Final Submission Payload:', submissionData);
      console.log('📧 FRONTEND FIX: Confirmed customer_email in payload:', submissionData.customer_email);
      console.log('📞 FRONTEND FIX: Confirmed customer_phone in payload:', submissionData.customer_phone);
      
      let result;
      
      if (mode === 'create') {
        const response = await TransactionalRentalService.createRentalWithTransaction(submissionData);
        result = response;
      } else {
        const response = await TransactionalRentalService.updateRental(submissionData);
        result = response;
      }
      
      setLoading(false);
      
      if (result && result.success) {
        let successMessage = `✅ Rental successfully ${mode === 'create' ? 'created' : 'updated'}!`;
        setSuccess(successMessage);
        console.log(`✅ Rental operation successful:`, result.data);

        setTimeout(() => {
          if (onSuccess) onSuccess(result.data);
        }, 1500);
      } else {
        throw new Error(result?.error || 'Unknown rental service error.');
      }
      
    } catch (err) {
      console.error('❌ Final Submission Error:', err);
      setLoading(false);

      let errorMessage = 'An unexpected error occurred during rental creation.';
      let nextAvailableTime = null;
      let isConflict = false;

      if (err.message && err.message.includes('Database insertion failed:')) {
        const dbErrorMatch = err.message.match(/Database insertion failed: (\{.*?\})/s); 
        if (dbErrorMatch && dbErrorMatch[1]) {
          try {
            const jsonString = dbErrorMatch[1].trim().replace(/^[\\']|[\\']$/g, '');
            const dbErrorObj = JSON.parse(jsonString);
            
            if (dbErrorObj.code === '23514' && dbErrorObj.message.includes('Vehicle availability check failed')) {
                const match = dbErrorObj.message.match(/Next available:\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
                if (match) nextAvailableTime = match[1];
                errorMessage = `🚫 Vehicle Conflict: ${dbErrorObj.message}`;
                isConflict = true;
            } else {
              errorMessage = `Database error: ${dbErrorObj.message}`;
            }
          } catch (parseErr) {
            console.error('Failed to parse database error object:', parseErr);
          }
        }
      }
      
      if (!nextAvailableTime && err.message) {
         if (err.message.includes('Vehicle availability check failed') || 
             err.message.includes('Vehicle is not available') || 
             err.message.includes('Vehicle is already booked')) {
           
           isConflict = true;
           const match = err.message.match(/Next available:\s*(\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2})/);
           if (match) {
             nextAvailableTime = match[1];
           }
           errorMessage = `🚫 Vehicle Conflict: ${err.message}`;
         }
      }
      
      if (isConflict) {
        setAvailabilityStatus('conflict');
        
        let suggestionContent;
        
        if (nextAvailableTime) {
          const formattedTime = new Date(nextAvailableTime).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });
          
          suggestionContent = (
            <>
              <span className="font-semibold text-gray-700">Suggestion:</span>
              <br />
              Try booking after: <span className="font-bold text-blue-600">{formattedTime}</span>
            </>
          );
        } else {
          suggestionContent = (
            <>
              <span className="font-semibold text-gray-700">Suggestion:</span>
              <br />
              Please check the availability calendar below for open slots or select a different vehicle.
            </>
          );
        }
        
        setError(
          <div className="flex flex-col">
            <span className="font-bold text-red-700">⚠️ Vehicle Scheduling Conflict</span>
            <span>The selected vehicle is not available for the chosen time period.</span>
            <div className="mt-2 p-2 bg-white rounded border border-red-200 text-sm">
              {suggestionContent}
            </div>
          </div>
        );
        return;
      } else if (err.message && !errorMessage.includes('Vehicle Conflict')) {
        errorMessage = err.message;
      }
      
      if (typeof errorMessage === 'string') {
        if (errorMessage.includes('availability') && !errorMessage.includes('Next available')) {
          errorMessage += '\\n\\nTip: Try selecting different dates or an alternative vehicle.';
        } else if (errorMessage.includes('constraint')) {
          errorMessage += '\\n\\nTip: Please check that all dates are valid and end date is after start date.';
        } else if (errorMessage.includes('database') && !errorMessage.includes('insertion failed')) {
          errorMessage += '\\n\\nTip: There may be a temporary connection issue. Please try again.';
        } else if (errorMessage.includes('400')) {
          errorMessage += '\\n\\nTip: Bad Request - Please check that all numeric fields (price, deposit, etc.) contain valid numbers.';
        }
      }
      
      setError(errorMessage);
      
      console.log('🔧 Running diagnostics due to submission error...');
      await runDiagnostics();
    }
  };

  const handleReset = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_id: null,
      vehicle_id: '',
      rental_start_date: '',
      rental_end_date: '',
      rental_start_time: '',
      rental_end_time: '',
      rental_type: 'daily',
      rental_status: 'scheduled',
      payment_status: 'unpaid',
      total_amount: 0,
      pickup_location: 'Office',
      dropoff_location: 'Office',
      quantity_days: 0,
      unit_price: 0,
      transport_fee: 0,
      pickup_transport: false,
      dropoff_transport: false,
      deposit_amount: 0,
      damage_deposit: 0,
      remaining_amount: 0,
      customer_licence_number: '',
      customer_id_number: '',
      customer_dob: '',
      customer_place_of_birth: '',
      customer_nationality: '',
      customer_issue_date: '',
      contract_signed: false,
      insurance_included: true,
      helmet_included: true,
      gear_included: false,
      accessories: '',
      signature_url: null,
      second_driver_name: '',
      second_driver_license: '',
      second_driver_id_image: null,
      customer_id_image: null,
    });
    setError(null);
    setSuccess(null);
    setDebugInfo(null);
    setAvailabilityStatus('unknown');
    setAvailabilityDetails(null);
    setCanSubmit(false);
  };

  const getComposedStartDateTime = () => {
    const datetime = composeDateTime(formData.rental_start_date, formData.rental_start_time);
    return datetime ? datetime.toISOString() : null;
  };

  const getComposedEndDateTime = () => {
    const datetime = composeDateTime(formData.rental_end_date, formData.rental_end_time);
    return datetime ? datetime.toISOString() : null;
  };

  const timeSelectionSection = (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-blue-900 mb-4">
        🕐 Time Selection (Optional)
      </h3>
      {formData.rental_type === 'hourly' && (
        <>
          <div className="mb-4 flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[1, 2, 3].map((hour) => (
              <button
                key={hour}
                type="button"
                onClick={() => handleQuickHourSelect(hour)}
                className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-gray-700 hover:text-gray-900 hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
                disabled={!formData.rental_start_time || loading}
              >
                {hour} Hour{hour > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Time
          </label>
          <div className="relative">
            <input
              type="time"
              name="rental_start_time"
              value={formData.rental_start_time || ""}
              onChange={handleChange}
              disabled={!formData.rental_start_date || loading}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Time
          </label>
          <div className="relative">
            <input
              type="time"
              name="rental_end_time"
              value={formData.rental_end_time || ""}
              onChange={handleChange}
              disabled={!formData.rental_end_date || loading}
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            />
            <Clock className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          </div>
        </div>
      </div>
    </div>
  );

  const dateSelectionSection = (
    <div className="bg-green-50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-green-900 mb-4">
        📅 Smart Date Selection
      </h3>
      {formData.rental_type === 'daily' && (
        <div className="mb-4 flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[1, 2, 3].map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => handleQuickDaySelect(day)}
              className="flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-gray-700 hover:text-gray-900 hover:bg-gray-200 disabled:bg-gray-300 disabled:cursor-not-allowed"
              disabled={!formData.rental_start_date || loading}
            >
              {day} Day{day > 1 ? 's' : ''}
            </button>
          ))}
        </div>
      )}
      <SmartDatePicker
        selectedVehicleId={formData.vehicle_id}
        startDate={formData.rental_start_date}
        endDate={formData.rental_end_date}
        onDateChange={handleDateChange}
        rentalType={formData.rental_type}
        disabled={loading}
        excludeRentalId={mode === 'edit' ? initialData?.id : null}
      />
    </div>
  );

  return (
    <>
      <div className="max-w-5xl mx-auto p-6 bg-white rounded-lg shadow-lg">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {mode === 'edit' ? '✏️ Edit Rental' : '🆕 Create New Rental'}
          </h2>
          <p className="text-gray-600">
            {mode === 'edit' 
              ? 'Update rental details with real-time availability checking.'
              : ''
            }
          </p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3 w-full">
                <h3 className="text-sm font-medium text-red-800">Rental Creation Failed</h3>
                <div className="text-sm text-red-700 mt-1 whitespace-pre-line w-full">
                  {typeof error === 'string' ? error : error}
                </div>
                {typeof error === 'string' && (
                  <button
                    onClick={runDiagnostics}
                    className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                  >
                    🔧 Run Diagnostics
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {dateError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500">
                <p className="text-red-700">{dateError}</p>
            </div>
        )}

        {debugInfo && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex">
              <div className="flex-shrink-0">
                <Info className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">System Diagnostics</h3>
                <div className="text-sm text-yellow-700 mt-1">
                  <pre className="whitespace-pre-wrap text-xs">
                    {JSON.stringify(debugInfo, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-900">
                👤 Customer Information
              </h3>
              <button
                type="button"
                onClick={() => setShowIDScanModal(true)}
                className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-100 border border-blue-300 rounded-md hover:bg-blue-200 transition-colors"
                disabled={loading}
              >
                <Scan className="h-4 w-4 mr-2" />
                Upload ID Document
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative" ref={customerSearchRef}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  name="customer_name"
                  value={formData.customer_name || ""}
                  onChange={handleChange}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
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
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Email
                </label>
                <input
                  type="email"
                  name="customer_email"
                  value={formData.customer_email || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                  placeholder="Optional - leave empty if not available"
                />
                <p className="text-xs text-gray-500 mt-1">Optional field - can be left empty</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Customer Phone *
                </label>
                <input
                  type="tel"
                  name="customer_phone"
                  value={formData.customer_phone || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Licence Number
                </label>
                <input
                  type="text"
                  name="customer_licence_number"
                  value={formData.customer_licence_number || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-gray-50"
                  disabled={loading}
                  placeholder="Will be populated by ID scan"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer ID Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="customer_id_image" className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500">
                      <span>Upload a file</span>
                      <input id="customer_id_image" name="customer_id_image" type="file" className="sr-only" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                  {formData.customer_id_image && <p className="text-sm text-green-600">File selected: {typeof formData.customer_id_image === 'string' ? 'Image uploaded' : formData.customer_id_image.name}</p>}
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-4 pt-4 border-t mt-6 bg-indigo-50 p-4 rounded-lg border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-900 mb-4">
              👥 Second Driver (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Second Driver Full Name
                </label>
                <input
                  type="text"
                  name="second_driver_name"
                  value={formData.second_driver_name || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Second Driver Licence
                </label>
                <input
                  type="text"
                  name="second_driver_license"
                  value={formData.second_driver_license || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={loading}
                  placeholder="Enter license number"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Second Driver ID Image
              </label>
              <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                <div className="space-y-1 text-center">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div className="flex text-sm text-gray-600">
                    <label htmlFor="second_driver_id_image" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                      <span>Upload a file</span>
                      <input id="second_driver_id_image" name="second_driver_id_image" type="file" className="sr-only" onChange={handleFileChange} />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, GIF up to 10MB
                  </p>
                  {formData.second_driver_id_image && <p className="text-sm text-green-600">File selected: {typeof formData.second_driver_id_image === 'string' ? 'Image uploaded' : formData.second_driver_id_image.name}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              ⏱️ Rental Type
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rental Type *
              </label>
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg" role="tablist" aria-label="Rental Type">
                {[
                  { value: 'hourly', label: 'Hourly' },
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    aria-selected={formData.rental_type === option.value}
                    aria-controls={`rental-type-${option.value}`}
                    className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      formData.rental_type === option.value
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                    onClick={() => handleRentalTypeChange(option.value)}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                        e.preventDefault();
                        const options = ['hourly', 'daily', 'weekly'];
                        const currentIndex = options.indexOf(formData.rental_type);
                        let nextIndex;
                        if (e.key === 'ArrowLeft') {
                          nextIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
                        } else {
                          nextIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
                        }
                        handleRentalTypeChange(options[nextIndex]);
                      } else if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleRentalTypeChange(option.value);
                      }
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-blue-600 mt-1">🔄 Changes pricing automatically</p>
              {formData.rental_type === 'hourly' && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-green-600">📅 Same Day Rental - Both dates will be identical</p>
                  <p className="text-xs text-purple-600">⏰ Time fields auto-populated with Morocco local time + 30 minutes</p>
                </div>
              )}
            </div>
          </div>

          {formData.rental_type === 'hourly' ? (
            <>
              {timeSelectionSection}
              {dateSelectionSection}
            </>
          ) : (
            <>
              {dateSelectionSection}
              {timeSelectionSection}
            </>
          )}

          <div className="bg-green-50 p-4 rounded-lg">
            <SmartVehicleSelector
              startDate={getComposedStartDateTime()}
              endDate={getComposedEndDateTime()}
              selectedVehicleId={formData.vehicle_id}
              onVehicleChange={handleVehicleChange}
              excludeRentalId={mode === 'edit' ? initialData?.id : null}
              disabled={loading}
            />
          </div>

          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <DollarSign className="h-6 w-6 text-gray-600" />
              <h3 className="text-xl font-semibold text-gray-900">Financial Information</h3>
              <Calculator className="h-5 w-5 text-gray-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {formData.rental_type === 'hourly' ? 'Quantity (Hours) *' : 
                   formData.rental_type === 'weekly' ? 'Quantity (Weeks) *' : 'Quantity (Days) *'}
                </label>
                <input
                  type="number"
                  name="quantity_days"
                  value={formData.quantity_days || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-green-50 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="1"
                  disabled={loading}
                  readOnly
                />
                <p className="text-xs text-green-600 mt-1">🗓️ Auto-calculated from dates & times</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Unit Price (MAD) *
                </label>
                <input
                  type="number"
                  name="unit_price"
                  value={formData.unit_price || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                <p className="text-xs text-blue-600 mt-1">
                  💰 {formData.vehicle_id 
                    ? 'Auto-populated from Database Pricing Rules' 
                    : 'Select a vehicle to auto-populate pricing'
                  }
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Transport Options
                </label>
                <div className="flex flex-col gap-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="pickup_transport"
                      checked={formData.pickup_transport}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Pick-up Transport 
                      {transportFees.pickup_fee > 0 && (
                        <span className="text-blue-600 font-medium">
                          (+{transportFees.pickup_fee.toFixed(2)} MAD)
                        </span>
                      )}
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="dropoff_transport"
                      checked={formData.dropoff_transport}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Drop-off Transport
                      {transportFees.dropoff_fee > 0 && (
                        <span className="text-blue-600 font-medium">
                          (+{transportFees.dropoff_fee.toFixed(2)} MAD)
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Transport Fee (MAD)
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50 text-blue-700 font-medium">
                  {formData.transport_fee.toFixed(2)} MAD
                </div>
                <p className="text-xs text-blue-600 mt-1">🚚 Auto-calculated from selected transport options</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Amount (MAD)
                </label>
                <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-blue-50 text-blue-700 font-bold text-lg">
                  {formData.total_amount.toFixed(2)} MAD
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Status *
                </label>
                <select
                  name="payment_status"
                  value={formData.payment_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={loading}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="partial">Partial</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
                <p className="text-xs text-green-600 mt-1">💳 "Paid" auto-fills Deposit Amount</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Deposit Amount (MAD)
                </label>
                <input
                  type="number"
                  name="deposit_amount"
                  value={formData.deposit_amount || ""}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                    formData.payment_status === 'paid' 
                      ? 'bg-green-50 text-green-700 font-medium' 
                      : ''
                  }`}
                  min="0"
                  step="0.01"
                  disabled={loading || formData.payment_status === 'paid'}
                  readOnly={formData.payment_status === 'paid'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Damage Deposit (MAD)
                </label>
                <input
                  type="number"
                  name="damage_deposit"
                  value={formData.damage_deposit || ""}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                />
                <p className="text-xs text-blue-600 mt-1">⚠️ Refundable upon ATV return & inspection</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remaining (MAD)
                </label>
                <div className={`w-full px-3 py-2 border border-gray-300 rounded-md font-medium ${
                  formData.remaining_amount === 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {formData.remaining_amount.toFixed(2)} MAD
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="insurance_included"
                  checked={formData.insurance_included}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Insurance Included
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="helmet_included"
                  checked={formData.helmet_included}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Helmet Included
                </label>              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="gear_included"
                  checked={formData.gear_included}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Gear Included
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="contract_signed"
                  checked={formData.contract_signed || !!formData.signature_url}
                  onChange={handleChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  disabled={loading || !!formData.signature_url}
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Contract Signed {formData.signature_url && <span className="text-green-600">(Digitally)</span>}
                </label>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200">
            <button
              type="submit"
              disabled={loading || (availabilityStatus === 'conflict') || !!dateError}
              className={`flex-1 px-6 py-3 rounded-md text-white font-medium flex items-center justify-center ${
                loading || (availabilityStatus === 'conflict') || !!dateError
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
              }`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  {mode === 'edit' ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  {mode === 'edit' ? '✏️ Update Rental' : '🆕 Create Rental'}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              🔄 Reset
            </button>

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={loading}
                className="px-6 py-3 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                ❌ Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <EnhancedUnifiedIDScanModal
        isOpen={showIDScanModal}
        onClose={() => setShowIDScanModal(false)}
        setFormData={setFormData}
        formData={formData}
        onCustomerSaved={handleCustomerSaved}
        customerId={formData.customer_id}
        rentalId={initialData?.id}
        title="Upload ID Document"
      />
    </>
  );
};

export default AvailabilityAwareRentalForm;