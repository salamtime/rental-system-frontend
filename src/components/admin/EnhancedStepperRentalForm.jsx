import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  User, Car, CreditCard, Check, ChevronRight, ChevronLeft,
  Scan, UserSearch, AlertCircle, Loader, Clock, DollarSign,
  Calculator, Info, Phone, Mail, Calendar, MapPin, FileText,
  Upload, Shield, CheckCircle, XCircle, CalendarDays, Car as CarIcon,
  Users, BadgeCheck, FileImage, DownloadCloud, Plus, Minus,
  ChevronDown, ChevronUp, Eye, Edit2, Trash2, Save
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import EnhancedUnifiedIDScanModal from '../customers/EnhancedUnifiedIDScanModal';
import TransactionalRentalService from '../../services/TransactionalRentalService';
import VehicleModelService from '../../services/VehicleModelService';
import AppSettingsService from '../../services/AppSettingsService';
import enhancedUnifiedCustomerService from '../../services/EnhancedUnifiedCustomerService';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getMoroccoTodayString, 
  getMoroccoDateOffset, 
  getMoroccoHourlyTimes,
  isAfter, 
  parseDateAsLocal, 
  formatDateToYYYYMMDD 
} from '../../utils/moroccoTime';
import { toast } from 'sonner';

// ==================== CUSTOM HOOK - ALL BUSINESS LOGIC ====================
const useRentalWizard = (initialData = null, mode = 'create') => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  
  // Core form state
  const [formData, setFormData] = useState({
    // Customer Info
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    customer_id: null,
    customer_licence_number: '',
    customer_id_number: '',
    customer_dob: '',
    customer_place_of_birth: '',
    customer_nationality: '',
    customer_issue_date: '',
    customer_id_image: null,
    
    // Vehicle & Dates
    vehicle_id: '',
    rental_type: '',
    rental_start_date: '',
    rental_end_date: '',
    rental_start_time: '',
    rental_end_time: '',
    pickup_location: 'Office',
    dropoff_location: 'Office',
    pickup_transport: false,
    dropoff_transport: false,
    
    // Second Driver
    second_driver_name: '',
    second_driver_license: '',
    second_driver_id_image: null,
    
    // Financial
    quantity_days: 0,
    unit_price: 0,
    transport_fee: 0,
    total_amount: 0,
    deposit_amount: 0,
    damage_deposit: 0,
    damage_deposit_source: '', // NEW: track preset source
    remaining_amount: 0,
    payment_status: 'unpaid',
    
    // Options
    rental_status: 'scheduled',
    insurance_included: true,
    helmet_included: true,
    gear_included: false,
    contract_signed: false,
    accessories: '',
    signature_url: null,
    
    // Approval
    approval_status: 'auto',
    pending_total_request: null
  });

  // UI & Loading States
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successfullySubmitted, setSuccessfullySubmitted] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(null);
  const [dateError, setDateError] = useState(null);
  const [selectedQuickDuration, setSelectedQuickDuration] = useState(null);
  
  // Data States
  const [vehicleModels, setVehicleModels] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [transportFees, setTransportFees] = useState({ pickup_fee: 0, dropoff_fee: 0 });
  const [availabilityStatus, setAvailabilityStatus] = useState('unknown');
  const [autoCalculatedPrice, setAutoCalculatedPrice] = useState(0);
  
  // NEW: Damage Deposit States
  const [damageDepositConfig, setDamageDepositConfig] = useState({
    vehicleModelPresets: {},
    allowCustomDeposit: true
  });
  const [selectedDepositTab, setSelectedDepositTab] = useState(null);
  const [customDepositAmount, setCustomDepositAmount] = useState('');
  
  // Customer Data
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isPhoneDirty, setIsPhoneDirty] = useState(false);
  const [isEmailDirty, setIsEmailDirty] = useState(false);
  
  // Refs
  const isManualStatusChange = useRef(false);
  const isProgrammaticChange = useRef(false);
  const customerSearchRef = useRef(null);

  // ==================== NEW: LOAD DAMAGE DEPOSIT CONFIG ====================
  const loadDamageDepositConfig = async () => {
    try {
      console.log('📡 Loading damage deposit configuration...');
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('damage_deposit_presets, allow_custom_deposit')
        .eq('id', 1)
        .single();

      if (error) throw error;

      if (data) {
        const config = {
          vehicleModelPresets: data.damage_deposit_presets || {},
          allowCustomDeposit: data.allow_custom_deposit ?? true
        };
        
        setDamageDepositConfig(config);
        console.log('✅ Loaded damage deposit config:', config);
      }
    } catch (error) {
      console.error('❌ Error loading damage deposit config:', error);
      setDamageDepositConfig({
        vehicleModelPresets: {},
        allowCustomDeposit: true
      });
    }
  };

  // ==================== NEW: GET ENABLED PRESETS FOR VEHICLE ====================
  const getEnabledPresetsForVehicle = (vehicleId) => {
    if (!vehicleId) return [];
    
    const vehicle = availableVehicles.find(v => v.id == vehicleId);
    if (!vehicle || !vehicle.vehicle_model_id) return [];
    
    const presets = damageDepositConfig.vehicleModelPresets[vehicle.vehicle_model_id] || [];
    return presets.filter(p => p.enabled);
  };

  // ==================== INITIALIZATION ====================
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadCustomers(),
        loadRentals(),
        loadVehicleModels(),
        loadTransportFees(),
        loadDamageDepositConfig() // NEW
      ]);
      
      const today = getMoroccoTodayString();
      setFormData(prev => ({
        ...prev,
        rental_start_date: prev.rental_start_date || today,
        rental_end_date: prev.rental_end_date || today,
      }));
      
      if (initialData && mode === 'edit') {
        initializeEditData(initialData);
      }
    };
    
    init();
  }, []);

  // ==================== NEW: AUTO-SELECT FIRST PRESET ====================
  useEffect(() => {
    if (formData.vehicle_id) {
      const enabledPresets = getEnabledPresetsForVehicle(formData.vehicle_id);
      
      if (enabledPresets.length > 0) {
        const firstPreset = enabledPresets[0];
        setSelectedDepositTab(firstPreset.label);
        setFormData(prev => ({
          ...prev,
          damage_deposit: firstPreset.amount,
          damage_deposit_source: firstPreset.label
        }));
        console.log(`✅ Auto-selected deposit: ${firstPreset.label} (${firstPreset.amount} MAD)`);
      } else if (damageDepositConfig.allowCustomDeposit) {
        setSelectedDepositTab('custom');
        setFormData(prev => ({
          ...prev,
          damage_deposit_source: 'custom'
        }));
      }
    }
  }, [formData.vehicle_id, damageDepositConfig]);

  // ==================== DATA LOADING ====================
  const loadCustomers = async () => {
    try {
      const { data } = await supabase.from('app_4c3a7a6153_customers').select('*');
      if (data) setCustomers(data);
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  const loadRentals = async () => {
    try {
      const { data } = await supabase.from('app_4c3a7a6153_rentals').select('*').order('created_at', { ascending: false });
      if (data) setRentals(data);
    } catch (err) {
      console.error('Failed to load rentals:', err);
    }
  };

  const loadVehicleModels = async () => {
    try {
      console.log('🚀 Loading vehicle models and available vehicles only...');
      
      const models = await VehicleModelService.getAllVehicleModels();
      setVehicleModels(models || []);
      console.log('📋 Loaded vehicle models:', models?.length || 0);
      
      const { data: vehicles, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*')
        .eq('status', 'available')
        .order('id');
      
      if (error) {
        console.error('❌ Error loading vehicles:', error);
      } else {
        console.log('✅ Loaded available vehicles:', vehicles?.length || 0);
        setAvailableVehicles(vehicles || []);
      }
    } catch (error) {
      console.error('❌ Error loading vehicle data:', error);
    }
  };

  const loadTransportFees = async () => {
    try {
      const fees = await AppSettingsService.getTransportFees();
      setTransportFees(fees);
    } catch (err) {
      console.error('Error loading transport fees:', err);
    }
  };

  // ==================== EDIT MODE INITIALIZATION ====================
  const initializeEditData = (data) => {
    let startTime = '';
    let endTime = '';
    
    if (data.rental_start_at) {
      const startDate = new Date(data.rental_start_at);
      if (!isNaN(startDate.getTime())) {
        startTime = startDate.toTimeString().slice(0, 5);
      }
    }
    
    if (data.rental_end_at) {
      const endDate = new Date(data.rental_end_at);
      if (!isNaN(endDate.getTime())) {
        endTime = endDate.toTimeString().slice(0, 5);
      }
    }

    const cleanStartDate = data.rental_start_date ? data.rental_start_date.split('T')[0] : '';
    const cleanEndDate = data.rental_end_date ? data.rental_end_date.split('T')[0] : '';
    
    setFormData({
      ...formData,
      ...data,
      rental_start_date: cleanStartDate,
      rental_end_date: cleanEndDate,
      rental_start_time: startTime,
      rental_end_time: endTime,
    });
    
    if (data.damage_deposit_source) {
      setSelectedDepositTab(data.damage_deposit_source);
    }
    
    isProgrammaticChange.current = true;
  };

  // ==================== CORE FUNCTIONS ====================
  const composeDateTime = (date, time) => {
    if (!date) return null;
    const localDate = parseDateAsLocal(date);
    if (!localDate || isNaN(localDate.getTime())) return null;

    const timeToUse = time || '00:00';
    const [hours, minutes] = timeToUse.split(':').map(Number);
    
    if (isNaN(hours) || isNaN(minutes)) {
      localDate.setHours(0, 0, 0, 0);
      return localDate;
    }

    localDate.setHours(hours, minutes, 0, 0);
    return isNaN(localDate.getTime()) ? null : localDate;
  };

  const getDirectPricing = (vehicleId, rentalType) => {
    const pricingMap = {
      '1': { hourly: 400, daily: 1500 },
      '2': { hourly: 400, daily: 1500 },
      '3': { hourly: 600, daily: 1800 },
      '4': { hourly: 600, daily: 1800 },
      '5': { hourly: 1000, daily: 3800 },
      '6': { hourly: 1000, daily: 3800 },
      '7': { hourly: 400, daily: 1500 },
      '8': { hourly: 600, daily: 1800 },
      '9': { hourly: 400, daily: 1500 },
      '10': { hourly: 600, daily: 1800 },
      '11': { hourly: 1000, daily: 3800 },
      '12': { hourly: 1000, daily: 3800 },
      '13': { hourly: 400, daily: 1500 },
      '14': { hourly: 600, daily: 1800 },
      '15': { hourly: 1000, daily: 3800 },
      '23': { hourly: 400, daily: 1500 }
    };

    const vehiclePricing = pricingMap[vehicleId.toString()];
    if (!vehiclePricing) {
      return rentalType === 'hourly' ? 400 : 1500;
    }

    return vehiclePricing[rentalType] || 0;
  };

  const autoPopulateUnitPrice = () => {
    if (!formData.vehicle_id || !formData.rental_type) return;
    
    const unitPrice = getDirectPricing(formData.vehicle_id, formData.rental_type);
    setAutoCalculatedPrice(unitPrice);
    setFormData(prev => ({ ...prev, unit_price: unitPrice }));
  };

  const calculateTransportFee = () => {
    let totalTransportFee = 0;
    if (formData.pickup_transport) totalTransportFee += transportFees.pickup_fee || 0;
    if (formData.dropoff_transport) totalTransportFee += transportFees.dropoff_fee || 0;
    
    setFormData(prev => ({ ...prev, transport_fee: totalTransportFee }));
  };

  const calculateFinancials = () => {
    const subtotal = (formData.quantity_days || 0) * (formData.unit_price || 0);
    const total = subtotal + (formData.transport_fee || 0);
    const remaining = total - (formData.deposit_amount || 0);

    setFormData(prev => ({
      ...prev,
      total_amount: total,
      remaining_amount: Math.max(remaining, 0)
    }));
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
    }

    let quantity = 0;
    if (rental_type === 'hourly') {
      const diffHours = (endDatetime - startDatetime) / (1000 * 60 * 60);
      quantity = Math.ceil(Math.max(diffHours, 1));
    } else {
      const startDate = parseDateAsLocal(rental_start_date);
      const endDate = parseDateAsLocal(updatedEndDate);
      if (!startDate || !endDate) return;
      const diffDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      quantity = Math.max(diffDays, 1);
    }

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

  const sendWhatsAppNotifications = async (pendingTotalRequest, rentalId) => {
    try {
      console.log('📱 WHATSAPP: Fetching admins with WhatsApp enabled...');
      
      const { data: admins, error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_users')
        .select('id, full_name, phone_number, whatsapp_notifications, role')
        .in('role', ['owner', 'admin'])
        .eq('whatsapp_notifications', true)
        .not('phone_number', 'is', null);

      if (error) {
        console.error('📱 WHATSAPP: Error fetching admins:', error);
        return 0;
      }

      if (!admins || admins.length === 0) {
        console.log('📱 WHATSAPP: No admins with WhatsApp enabled found');
        return 0;
      }

      console.log(`📱 WHATSAPP: Found ${admins.length} admin(s) with WhatsApp enabled:`, admins);

      let notificationCount = 0;
      
      for (const admin of admins) {
        try {
          let cleanPhone = admin.phone_number.replace(/[^\d+]/g, '');
          
          if (!cleanPhone.startsWith('+')) {
            cleanPhone = '+212' + cleanPhone.replace(/^0+/, '');
          }

          const messageText = 
            `🚨 *SAHARAX - Rental Approval Required*\n\n` +
            `💰 *Price Override Request:* ${pendingTotalRequest} MAD\n` +
            `📋 *Rental ID:* ${rentalId.substring(0, 8)}...\n` +
            `👤 *Requested by:* Employee\n` +
            `⏰ *Time:* ${new Date().toLocaleTimeString('en-MA', { hour: '2-digit', minute: '2-digit' })}\n\n` +
            `🔗 *Direct Approval Link:*\n` +
            `${window.location.origin}/admin/rentals/${rentalId}\n\n` +
            `_Click the link above to review and take action._\n` +
            `⚠️ *Action Required Within 24 Hours*`;
          
          const message = encodeURIComponent(messageText);

          const whatsappUrl = `https://wa.me/${cleanPhone}?text=${message}`;

          console.log(`📱 WHATSAPP: Opening WhatsApp for ${admin.full_name} (${admin.phone_number})`);
          console.log(`📱 WHATSAPP: URL: ${whatsappUrl}`);

          window.open(whatsappUrl, '_blank');
          
          notificationCount++;

          if (notificationCount < admins.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (err) {
          console.error(`📱 WHATSAPP: Error sending notification to ${admin.full_name}:`, err);
        }
      }

      console.log(`📱 WHATSAPP: Successfully triggered ${notificationCount} notification(s)`);
      return notificationCount;

    } catch (err) {
      console.error('📱 WHATSAPP: Error in sendWhatsAppNotifications:', err);
      return 0;
    }
  };

  const generateCustomerId = () => {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 11);
    return `cust_${timestamp}_${randomString}`;
  };

  // ==================== QUICK HOUR SELECT HANDLER ====================
  const handleQuickHourSelect = (hours) => {
    if (!formData.rental_start_date || !formData.rental_start_time) {
      toast.error('Please set start date and time first');
      return;
    }
    
    const startDateTime = composeDateTime(formData.rental_start_date, formData.rental_start_time);
    if (!startDateTime) {
      toast.error('Invalid start date/time');
      return;
    }
    
    const endDateTime = new Date(startDateTime.getTime() + (hours * 60 * 60 * 1000));
    
    setSelectedQuickDuration(hours);
    
    setFormData(prev => ({
      ...prev,
      rental_end_date: formatDateToYYYYMMDD(endDateTime),
      rental_end_time: endDateTime.toTimeString().slice(0, 5)
    }));
    
    toast.success(`✅ Set ${hours}-hour rental period`);
  };

  // ==================== PAYMENT STATUS TAB HANDLER ====================
  const handlePaymentStatusTabClick = (status) => {
    isManualStatusChange.current = true;
    
    const total = parseFloat(formData.total_amount) || 0;
    let newDepositAmount = formData.deposit_amount;
    
    if (status === 'paid') {
      newDepositAmount = total;
    } else if (status === 'unpaid') {
      newDepositAmount = 0;
    }
    
    setFormData(prev => ({
      ...prev,
      payment_status: status,
      deposit_amount: newDepositAmount
    }));
  };

  // ==================== NEW: DAMAGE DEPOSIT TAB HANDLER ====================
  const handleDepositTabClick = (tabId, amount) => {
    setSelectedDepositTab(tabId);
    
    if (tabId === 'custom') {
      setFormData(prev => ({
        ...prev,
        damage_deposit: parseFloat(customDepositAmount) || 0,
        damage_deposit_source: 'custom'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        damage_deposit: amount,
        damage_deposit_source: tabId
      }));
    }
  };

  // ==================== EVENT HANDLERS ====================
  const handleInputChange = (field, value) => {
    if (field === 'payment_status') {
      isManualStatusChange.current = true;
    }

    if (field === 'customer_phone') setIsPhoneDirty(true);
    if (field === 'customer_email') setIsEmailDirty(true);

    if (field === 'rental_start_time' || field === 'rental_end_time' || 
        field === 'rental_start_date' || field === 'rental_end_date') {
      setSelectedQuickDuration(null);
    }

    const newFormData = { ...formData, [field]: value };

    if (field === 'vehicle_id') {
      console.log('🚗 Vehicle selection changed:', value, 'Type:', typeof value);
      
      let numericValue = value;
      if (typeof value === 'string' && value !== '') {
        numericValue = Number(value);
        if (isNaN(numericValue)) {
          console.error('❌ Invalid vehicle ID format:', value);
          return;
        }
      }
      
      console.log('✅ Setting vehicle_id to:', numericValue, 'Type:', typeof numericValue);
      newFormData.vehicle_id = numericValue;
    }

    if (field === 'rental_type') {
      setSelectedQuickDuration(null);
      
      const today = getMoroccoTodayString();
      const currentTime = new Date().toTimeString().slice(0, 5);
      
      let startDateToUse = newFormData.rental_start_date || today;
      if (startDateToUse && startDateToUse.includes('T')) {
        startDateToUse = startDateToUse.split('T')[0];
      }

      if (value === 'hourly') {
        newFormData.rental_start_date = startDateToUse;
        newFormData.rental_end_date = startDateToUse;
        newFormData.rental_start_time = currentTime;
        const endTime = new Date();
        endTime.setHours(endTime.getHours() + 1);
        newFormData.rental_end_time = endTime.toTimeString().slice(0, 5);
      } else if (value === 'daily') {
        const tomorrowStr = getMoroccoDateOffset(1, startDateToUse);
        newFormData.rental_start_date = startDateToUse;
        newFormData.rental_end_date = tomorrowStr;
        newFormData.rental_start_time = '09:00';
        newFormData.rental_end_time = '09:00';
      }
    }

    if (field === 'rental_start_date') {
      let dateValue = value;
      if (dateValue && dateValue.includes('T')) {
        dateValue = dateValue.split('T')[0];
      }
      if (newFormData.rental_type === 'daily') {
        const nextDay = getMoroccoDateOffset(1, dateValue);
        newFormData.rental_end_date = nextDay;
      } else if (newFormData.rental_type === 'hourly') {
        newFormData.rental_end_date = dateValue;
      }
      newFormData.rental_start_date = dateValue;
    }

    if (field === 'customer_name') {
      isProgrammaticChange.current = false;
      setFormData(newFormData);

      if (value.length >= 2) {
        const customerData = getAggregatedCustomerData();
        const trimmedName = value.trim().toLowerCase();
        const filteredSuggestions = customerData.filter(suggestion => 
          suggestion.name.trim().toLowerCase().includes(trimmedName)
        );
        setSuggestions(filteredSuggestions);
      } else {
        setSuggestions([]);
      }
      return;
    }

    setFormData(newFormData);
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSuggestionClick = (suggestion) => {
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
  };

  const handleFileUpload = async (field, file) => {
    if (!file) return;
    
    setLoading(true);
    try {
      const filePath = `${mode === 'edit' ? initialData?.id : 'new'}-${field}-${Date.now()}`;
      
      const { data, error: uploadError } = await supabase.storage
        .from('customer-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('customer-documents').getPublicUrl(data.path);

      setFormData(prev => ({ ...prev, [field]: publicUrl }));
      toast.success('File uploaded successfully!');
    } catch (err) {
      console.error('File upload failed:', err);
      toast.error('Failed to upload file');
    } finally {
      setLoading(false);
    }
  };

  // ==================== ID SCAN HANDLERS ====================
  const handleCustomerSaved = async (savedCustomer, image = null) => {
    console.log('✅ [RentalWizard] Customer saved from ID scan:', savedCustomer);
    
    try {
      let customerData = savedCustomer;
      const customerId = savedCustomer.id || savedCustomer.customer_id;
      
      if (customerId) {
        console.log('🔍 [RentalWizard] Fetching complete customer data for ID:', customerId);
        const fetchResult = await enhancedUnifiedCustomerService.getCustomerById(customerId);
        
        if (fetchResult.success && fetchResult.data) {
          customerData = fetchResult.data;
          console.log('✅ [RentalWizard] Complete customer data fetched:', customerData);
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
        customer_issue_date: customerData.issue_date || customerData.licence_issue_date || prev.customer_issue_date,
        customer_id_image: customerData.customer_id_image || customerData.id_scan_url || image || prev.customer_id_image
      }));
      
      setIsEmailDirty(false);
      setIsPhoneDirty(false);
      
      const populatedFields = [];
      if (customerData.full_name) populatedFields.push('Name');
      if (customerData.date_of_birth) populatedFields.push('Date of Birth');
      if (customerData.nationality) populatedFields.push('Nationality');
      if (customerData.place_of_birth) populatedFields.push('Place of Birth');
      
      toast.success(`✅ ID scan completed! Populated: ${populatedFields.join(', ')}`);
      setSuccess('✅ Customer information updated from ID scan!');
      
      console.log('✅ [RentalWizard] Form successfully populated from ID scan');
      
    } catch (error) {
      console.error('❌ [RentalWizard] Error in handleCustomerSaved:', error);
      toast.error('Failed to populate customer data from scan');
    }
  };

  const handleIDScanComplete = async (scannedData, imageFile) => {
    console.log("🔄 [FORM] ID Scan Complete - onScanComplete callback - Received Data:", scannedData);
    
    try {
      setIsEmailDirty(false);
      setIsPhoneDirty(false);
      isProgrammaticChange.current = true;
      
      console.log("📦 [FORM] Direct scanned data received (already in correct format)");
      
      const populatedFields = Object.entries(scannedData).filter(([key, value]) => {
        return value && value !== '' && key.startsWith('customer_');
      }).length;
      
      console.log("🎯 [FORM] Updating form with scanned data:", scannedData);
      console.log(`📊 [FORM] Populated ${populatedFields} customer fields`);
      
      setFormData(prev => {
        const newState = {
          ...prev,
          ...scannedData
        };
        console.log("✅ [FORM] New form state:", newState);
        return newState;
      });
      
      const customerName = scannedData.customer_name || 'Customer';
      toast.success(`✅ ${customerName} data populated (${populatedFields} fields)`);
      
      console.log("✅ [FORM] Form update completed successfully");
      
    } catch (error) {
      console.error('❌ [FORM] Error handling ID scan:', error);
      toast.error(`Failed to process ID scan: ${error.message}`);
    }
  };

  const validateStep = async (step) => {
    const newErrors = {};
    
    if (step === 1) {
      if (!formData.customer_name.trim()) newErrors.customer_name = 'Customer name is required';
      if (!formData.customer_phone.trim()) newErrors.customer_phone = 'Phone is required';
      
      if (formData.customer_email && formData.customer_email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.customer_email.trim())) {
          newErrors.customer_email = 'Please enter a valid email address';
        }
      }
    } else if (step === 2) {
      console.log('🔍 Validating vehicle_id:', formData.vehicle_id, 'Type:', typeof formData.vehicle_id);
      
      if (!formData.vehicle_id) {
        newErrors.vehicle_id = 'Vehicle selection is required';
        console.error('❌ vehicle_id is empty or null');
      } else {
        const numericId = Number(formData.vehicle_id);
        if (isNaN(numericId) || numericId <= 0) {
          newErrors.vehicle_id = 'Please select a valid vehicle';
          console.error('❌ vehicle_id is not a valid number:', formData.vehicle_id);
        } else {
          console.log('✅ vehicle_id validation passed:', numericId);
        }
      }
      
      if (!formData.rental_start_date) newErrors.rental_start_date = 'Start date is required';
      if (!formData.rental_end_date) newErrors.rental_end_date = 'End date is required';
      
      if (formData.rental_start_date && formData.rental_end_date) {
        const start = composeDateTime(formData.rental_start_date, formData.rental_start_time);
        const end = composeDateTime(formData.rental_end_date, formData.rental_end_time);
        if (start && end && start >= end) {
          newErrors.rental_end_date = 'End date must be after start date';
        }
      }
    } else if (step === 3) {
      if (!formData.unit_price || formData.unit_price <= 0) newErrors.unit_price = 'Unit price is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('🔍 handleSubmit (hook) called - successfullySubmitted:', successfullySubmitted);
    
    console.log('🔍 DEBUG: Checking user profile and role for approval logic:');
    console.log('- userProfile:', userProfile);
    console.log('- userProfile?.role:', userProfile?.role);
    console.log('- Manual price:', parseFloat(formData.unit_price) || 0);
    console.log('- Auto price:', autoCalculatedPrice);
    
    if (successfullySubmitted) {
      console.log('⚠️ Already successfully submitted, ignoring duplicate request');
      return;
    }
    
    if (isSubmitting) {
      console.log('⚠️ Submission already in progress, ignoring duplicate request');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitting(true);
    setErrors({});
    
    try {
      console.log('🔍 DEBUG - Before submission:');
      console.log('vehicle_id:', formData.vehicle_id, 'Type:', typeof formData.vehicle_id);
      console.log('Should be: Number (e.g., 1, 2, 3, 15, 16)');
      
      const currentTime = new Date().toTimeString().slice(0, 5);
      const submissionReadyFormData = { ...formData };
      
      if (!submissionReadyFormData.rental_start_time) {
        submissionReadyFormData.rental_start_time = currentTime;
      }
      if (!submissionReadyFormData.rental_end_time) {
        submissionReadyFormData.rental_end_time = currentTime;
      }

      if (!submissionReadyFormData.customer_name || !submissionReadyFormData.customer_phone || 
          !submissionReadyFormData.vehicle_id || !submissionReadyFormData.rental_start_date || 
          !submissionReadyFormData.rental_end_date) {
        throw new Error('Please fill in all required fields');
      }

      if (typeof submissionReadyFormData.vehicle_id !== 'number') {
        const numericId = Number(submissionReadyFormData.vehicle_id);
        if (isNaN(numericId) || numericId <= 0) {
          console.error('❌ INVALID vehicle_id:', submissionReadyFormData.vehicle_id);
          throw new Error('Please select a valid vehicle');
        }
        submissionReadyFormData.vehicle_id = numericId;
        console.log('✅ Converted vehicle_id to number:', numericId);
      }

      const trimmedEmail = (submissionReadyFormData.customer_email || '').trim();
      const emailToSubmit = trimmedEmail.length > 0 ? trimmedEmail : null;

      if (trimmedEmail.length > 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          throw new Error('Please enter a valid email address or leave the email field empty.');
        }
      }

      let finalCustomerId = submissionReadyFormData.customer_id;
      
      if (!finalCustomerId) {
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
        
        const saveResult = await enhancedUnifiedCustomerService.saveCustomer(newCustomerData);
        if (saveResult.success) {
          finalCustomerId = newCustomerId;
        } else {
          throw new Error(`Failed to create new customer: ${saveResult.error}`);
        }
      }

      const submissionData = {
        ...submissionReadyFormData,
        customer_id: finalCustomerId,
        customer_phone: submissionReadyFormData.customer_phone,
        customer_email: emailToSubmit,
        vehicle_id: submissionReadyFormData.vehicle_id ? Number(submissionReadyFormData.vehicle_id) : null,
        quantity_days: Number(submissionReadyFormData.quantity_days) || 0,
        unit_price: Number(submissionReadyFormData.unit_price) || 0,
        transport_fee: Number(submissionReadyFormData.transport_fee) || 0,
        total_amount: Number(submissionReadyFormData.total_amount) || 0,
        deposit_amount: Number(submissionReadyFormData.deposit_amount) || 0,
        damage_deposit: Number(submissionReadyFormData.damage_deposit) || 0,
        damage_deposit_source: submissionReadyFormData.damage_deposit_source || null,
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
        signature_url: submissionReadyFormData.signature_url || null,
      };

      console.log('✅ Final submission data - vehicle_id:', submissionData.vehicle_id, 'Type:', typeof submissionData.vehicle_id);

      console.log('🛡️ GATEKEEPER: Checking for price override...');
      
      const userRole = userProfile?.role || 'unknown';
      console.log('🛡️ GATEKEEPER: Current user role from AuthContext:', userRole, 'Full profile:', userProfile);

      const manualPrice = parseFloat(submissionData.unit_price) || 0;
      const autoPrice = parseFloat(autoCalculatedPrice) || 0;
      const isPriceOverride = manualPrice !== autoPrice;
      const isStaff = userRole === 'employee' || userRole === 'guide';
      const isAdminOrOwner = userRole === 'admin' || userRole === 'owner';

      console.log('🛡️ GATEKEEPER: Price comparison:', {
        manualPrice,
        autoPrice,
        isPriceOverride,
        userRole,
        isStaff,
        isAdminOrOwner
      });

      if (isPriceOverride) {
        if (isStaff) {
          console.log('🛡️ GATEKEEPER: Staff price override detected! Setting pending approval status...');
          
          const originalSubtotal = (submissionData.quantity_days || 0) * autoPrice;
          const originalTotal = originalSubtotal + (submissionData.transport_fee || 0);
          
          submissionData.approval_status = 'pending';
          submissionData.pending_total_request = submissionData.total_amount;
          submissionData.total_amount = originalTotal;
          submissionData.remaining_amount = originalTotal - (submissionData.deposit_amount || 0);
          
          console.log('🛡️ GATEKEEPER: Approval data set for staff:', {
            approval_status: 'pending',
            pending_total_request: submissionData.pending_total_request,
            original_total_amount: originalTotal,
            manual_unit_price: manualPrice,
            auto_unit_price: autoPrice
          });

        } else if (isAdminOrOwner) {
          console.log('🛡️ GATEKEEPER: Admin/Owner price override - auto-approved');
          submissionData.approval_status = 'approved';
          submissionData.pending_total_request = null;
        } else {
          console.log('🛡️ GATEKEEPER: Unknown user role with price override - requiring approval');
          submissionData.approval_status = 'pending';
          submissionData.pending_total_request = submissionData.total_amount;
        }
      } else {
        console.log('🛡️ GATEKEEPER: No price override detected - auto approving');
        submissionData.approval_status = 'auto';
        submissionData.pending_total_request = null;
      }

      let result;
      if (mode === 'edit' && initialData?.id) {
        result = await TransactionalRentalService.updateRental({
          ...submissionData,
          id: initialData.id
        });
      } else {
        result = await TransactionalRentalService.createRentalWithTransaction(submissionData);
      }
      
      if (result && result.success) {
        setSuccessfullySubmitted(true);
        setErrors({});
        
        let successMsg = `✅ Rental successfully ${mode === 'edit' ? 'updated' : 'created'}!`;
        
        if (submissionData.approval_status === 'pending') {
          successMsg += ' ⏳ Price override submitted for admin approval.';
          
          console.log('📱 WHATSAPP: Triggering WhatsApp notifications with rental ID:', result.data.id);
          try {
            const notificationCount = await sendWhatsAppNotifications(
              submissionData.pending_total_request, 
              result.data.id
            );
            
            if (notificationCount > 0) {
              console.log(`📱 WHATSAPP: Successfully notified ${notificationCount} admin(s)`);
              toast.success(`📱 WhatsApp notifications sent to ${notificationCount} admin(s)`);
            } else {
              console.log('📱 WHATSAPP: No admins were notified (none have WhatsApp enabled)');
              toast.info('⚠️ No admins with WhatsApp enabled found. Approval request saved.');
            }
          } catch (whatsappError) {
            console.error('📱 WHATSAPP: Error sending notifications:', whatsappError);
            toast.warning('⚠️ Approval request saved, but WhatsApp notifications failed');
          }
        }
        
        toast.success(successMsg);
        
        return result.data;
      } else {
        throw new Error(result?.error || 'Unknown rental service error.');
      }
      
    } catch (err) {
      console.error('Submission Error:', err);
      let errorMessage = err.message || 'An unexpected error occurred';
      
      if (err.message.includes('Vehicle availability check failed')) {
        setAvailabilityStatus('conflict');
        errorMessage = `🚫 Vehicle Scheduling Conflict: ${err.message}`;
      }
      
      setErrors({ general: errorMessage });
      toast.error(errorMessage);
      throw err;
    } finally {
      setSubmitting(false);
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      customer_name: '',
      customer_email: '',
      customer_phone: '',
      customer_id: null,
      vehicle_id: '',
      rental_start_date: getMoroccoTodayString(),
      rental_end_date: getMoroccoTodayString(),
      rental_start_time: '',
      rental_end_time: '',
      rental_type: '',
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
      damage_deposit_source: '',
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
      approval_status: 'auto',
      pending_total_request: null
    });
    setErrors({});
    setSuccess(null);
    setDateError(null);
    setAvailabilityStatus('unknown');
    setSelectedQuickDuration(null);
    setSuccessfullySubmitted(false);
    setSelectedDepositTab(null);
    setCustomDepositAmount('');
  };

  // ==================== AUTOMATION HOOKS ====================
  useEffect(() => {
    if (formData.rental_start_date && formData.rental_end_date && formData.rental_start_time && formData.rental_end_time) {
      const startDatetime = composeDateTime(formData.rental_start_date, formData.rental_start_time);
      const endDatetime = composeDateTime(formData.rental_end_date, formData.rental_end_time);

      if (startDatetime && endDatetime && startDatetime >= endDatetime) {
        let newStartDatetime = new Date(endDatetime);
        
        if (formData.rental_type === 'hourly') {
          newStartDatetime.setHours(newStartDatetime.getHours() - 1);
        } else {
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
      isManualStatusChange.current = false;
      return;
    }
    
    const deposit = parseFloat(formData.deposit_amount) || 0;
    const total = parseFloat(formData.total_amount) || 0;
    const currentStatus = formData.payment_status;

    if (currentStatus === 'overdue') return;
    
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
      setFormData(prev => ({ ...prev, payment_status: newPaymentStatus }));
    }
  }, [formData.deposit_amount, formData.total_amount]);

  useEffect(() => {
    if (formData.vehicle_id && formData.rental_type) {
      autoPopulateUnitPrice();
    } else if (!formData.vehicle_id) {
      setFormData(prev => ({ ...prev, unit_price: 0 }));
      setAutoCalculatedPrice(0);
    }
  }, [formData.vehicle_id, formData.rental_type]);

  useEffect(() => {
    if (isProgrammaticChange.current && formData.customer_name) {
      const customerData = getAggregatedCustomerData();
      const searchName = formData.customer_name.trim().toLowerCase();
      const match = customerData.find(c => c.name.trim().toLowerCase() === searchName);

      if (match) {
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

  // ==================== RETURN VALUES ====================
  return {
    formData,
    setFormData,
    loading,
    submitting,
    isSubmitting,
    successfullySubmitted,
    errors,
    success,
    setSuccess,
    dateError,
    vehicleModels,
    availableVehicles,
    transportFees,
    availabilityStatus,
    autoCalculatedPrice,
    customers,
    rentals,
    suggestions,
    mode,
    selectedQuickDuration,
    damageDepositConfig,
    selectedDepositTab,
    customDepositAmount,
    setCustomDepositAmount,
    
    handleInputChange,
    handleSuggestionClick,
    handleFileUpload,
    handleCustomerSaved,
    handleIDScanComplete,
    handleQuickHourSelect,
    handlePaymentStatusTabClick,
    handleDepositTabClick,
    validateStep,
    handleSubmit,
    handleReset,
    getEnabledPresetsForVehicle,
    
    composeDateTime,
    calculateQuantityAndPricing,
    calculateFinancials,
    
    customerSearchRef,
    
    getAggregatedCustomerData
  };
};

// ==================== SIMPLIFIED UI COMPONENTS ====================

const ProgressStepper = ({ currentStep, steps }) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-2">
      {steps.map((step, index) => (
        <React.Fragment key={step.number}>
          <div className="flex flex-col items-center flex-1 relative">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold z-10 ${
              currentStep > step.number
                ? 'bg-green-500 text-white'
                : currentStep === step.number
                ? 'bg-blue-600 text-white ring-2 ring-blue-300'
                : 'bg-gray-200 text-gray-500'
            }`}>
              {currentStep > step.number ? (
                <Check className="w-4 h-4" />
              ) : (
                step.number
              )}
            </div>
            <span className={`text-xs mt-1 text-center font-medium ${
              currentStep >= step.number ? 'text-gray-900' : 'text-gray-400'
            }`}>
              {step.title}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-1 transition-all ${
              currentStep > step.number ? 'bg-green-500' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  </div>
);

const CollapsibleSection = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
      >
        <span className="font-medium text-gray-900">{title}</span>
        {isOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

const TabbedInterface = ({ tabs, activeTab, onTabChange }) => (
  <div className="mb-6">
    <div className="flex border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === tab.id
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
    <div className="mt-4">
      {tabs.find(tab => tab.id === activeTab)?.content}
    </div>
  </div>
);

const VehicleCardGrid = ({ vehicles, selectedId, onSelect, disabled }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto pr-2">
    {vehicles.map((vehicle) => {
      const isSelected = selectedId === vehicle.id || selectedId == vehicle.id;
      return (
        <button
          key={vehicle.id}
          type="button"
          onClick={() => {
            console.log('🚗 Vehicle card clicked:', vehicle.id, vehicle.name);
            onSelect(vehicle.id);
          }}
          disabled={disabled}
          className={`relative p-4 rounded-lg border-2 transition-all ${
            isSelected
              ? 'border-green-500 bg-green-50 ring-4 ring-green-100'
              : 'border-gray-200 hover:border-gray-300 bg-white'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gray-100 rounded">
              <CarIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div className="text-left flex-1">
              <div className="mb-2">
                <span className="text-xs text-gray-500">Plate</span>
                <div className="text-xl font-bold text-gray-900">
                  {vehicle.plate_number || 'N/A'}
                </div>
              </div>
              
              <h4 className="font-semibold text-gray-900">{vehicle.name}</h4>
              <p className="text-sm text-gray-600">{vehicle.model}</p>
            </div>
          </div>
          
          {isSelected && (
            <div className="absolute top-2 right-2">
              <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
        </button>
      );
    })}
  </div>
);

const FileUpload = ({ label, value, onChange, accept = "image/*" }) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileSelect = (file) => {
    if (file) {
      onChange(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
          dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files[0])}
        />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm text-gray-600">
          Drag & drop or click to upload
        </p>
        <p className="text-xs text-gray-500 mt-1">
          PNG, JPG, GIF up to 10MB
        </p>
        {value && (
          <p className="text-sm text-green-600 mt-2">
            ✓ File selected: {value.name || 'Uploaded'}
          </p>
        )}
      </div>
    </div>
  );
};

const PriceCalculator = ({ formData, onPriceChange }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const calculateBreakdown = () => {
    const rentalCost = (formData.quantity_days || 0) * (formData.unit_price || 0);
    const transportCost = formData.transport_fee || 0;
    const total = rentalCost + transportCost;
    const deposit = formData.deposit_amount || 0;
    const remaining = total - deposit;

    return {
      rentalCost,
      transportCost,
      total,
      deposit,
      remaining
    };
  };

  const breakdown = calculateBreakdown();

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Price Summary</h3>
        <button
          type="button"
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {showBreakdown ? 'Hide Details' : 'Show Details'}
        </button>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-gray-600">Rental Cost:</span>
          <span className="font-medium">{breakdown.rentalCost.toFixed(2)} MAD</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Transport:</span>
          <span className="font-medium">{breakdown.transportCost.toFixed(2)} MAD</span>
        </div>
        
        <div className="border-t pt-3">
          <div className="flex justify-between text-lg font-bold">
            <span>Total:</span>
            <span className="text-blue-600">{breakdown.total.toFixed(2)} MAD</span>
          </div>
        </div>
        
        {showBreakdown && (
          <div className="mt-4 pt-4 border-t space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Deposit Paid:</span>
              <span className="font-medium">{breakdown.deposit.toFixed(2)} MAD</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Remaining:</span>
              <span className={`font-medium ${
                breakdown.remaining === 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {breakdown.remaining.toFixed(2)} MAD
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== NEW: DAMAGE DEPOSIT TABS COMPONENT ====================
const DamageDepositTabs = ({ 
  formData, 
  enabledPresets, 
  allowCustomDeposit, 
  selectedTab, 
  customAmount,
  onTabClick,
  onCustomAmountChange,
  disabled 
}) => {
  const tabs = [
    ...enabledPresets.map(preset => ({
      id: preset.label,
      label: preset.label,
      amount: preset.amount
    })),
    ...(allowCustomDeposit ? [{
      id: 'custom',
      label: 'Custom',
      amount: null
    }] : [])
  ];

  if (tabs.length === 0) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Damage Deposit (MAD)
        </label>
        <input
          type="number"
          value={formData.damage_deposit || ''}
          onChange={(e) => onCustomAmountChange(e.target.value)}
          disabled={disabled}
          className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          min="0"
          step="1"
          placeholder="Optional"
        />
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Damage Deposit Selection
      </label>
      
      <div className="flex gap-2 flex-wrap mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabClick(tab.id, tab.amount)}
            disabled={disabled}
            className={`px-4 py-2 rounded-lg border-2 font-medium transition-all text-sm ${
              selectedTab === tab.id
                ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <div className="flex flex-col items-center">
              <span className="font-semibold">{tab.label}</span>
              {tab.amount !== null && (
                <span className="text-xs mt-0.5">{tab.amount.toLocaleString()} MAD</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {selectedTab === 'custom' && (
        <div className="mt-3">
          <input
            type="number"
            value={customAmount}
            onChange={(e) => {
              onCustomAmountChange(e.target.value);
              onTabClick('custom', parseFloat(e.target.value) || 0);
            }}
            disabled={disabled}
            className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            min="0"
            step="1"
            placeholder="Enter custom amount"
          />
        </div>
      )}

      {selectedTab && selectedTab !== 'custom' && (
        <div className="mt-2 text-sm text-gray-600">
          Selected: <span className="font-medium text-gray-900">{formData.damage_deposit} MAD</span>
        </div>
      )}
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const SimplifiedRentalWizard = ({ 
  initialData = null, 
  mode = 'create',
  onSuccess,
  onCancel,
  isLoading = false 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [showIDScanModal, setShowIDScanModal] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const explicitSubmitRef = useRef(false);
  
  const {
    formData,
    setFormData,
    loading,
    submitting,
    isSubmitting,
    successfullySubmitted,
    errors,
    success,
    setSuccess,
    dateError,
    vehicleModels,
    availableVehicles,
    transportFees,
    availabilityStatus,
    autoCalculatedPrice,
    suggestions,
    selectedQuickDuration,
    damageDepositConfig,
    selectedDepositTab,
    customDepositAmount,
    setCustomDepositAmount,
    
    handleInputChange,
    handleSuggestionClick,
    handleFileUpload,
    handleCustomerSaved,
    handleIDScanComplete,
    handleQuickHourSelect,
    handlePaymentStatusTabClick,
    handleDepositTabClick,
    validateStep,
    handleSubmit,
    handleReset,
    getEnabledPresetsForVehicle,
    
    customerSearchRef
  } = useRentalWizard(initialData, mode);

  const steps = [
    { number: 1, title: 'Customer', icon: User },
    { number: 2, title: 'Vehicle & Dates', icon: Car },
    { number: 3, title: 'Payment', icon: CreditCard }
  ];

  const getSelectedVehicle = () => {
    return availableVehicles.find(v => v.id == formData.vehicle_id) || 
           vehicleModels.find(v => v.id == formData.vehicle_id);
  };

  const formatPeriodDisplay = () => {
    if (formData.rental_type === 'hourly') {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="font-medium text-sm sm:text-base">
            {formData.rental_start_date} {formData.rental_start_time || '00:00'}
          </span>
          <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">to</span>
          <span className="text-gray-400 text-xs sm:hidden">↓</span>
          <span className="font-medium text-sm sm:text-base">
            {formData.rental_end_date} {formData.rental_end_time || '00:00'}
          </span>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1">
          <span className="font-medium text-sm sm:text-base">{formData.rental_start_date}</span>
          <span className="text-gray-400 text-xs sm:text-sm hidden sm:inline">to</span>
          <span className="text-gray-400 text-xs sm:hidden">↓</span>
          <span className="font-medium text-sm sm:text-base">{formData.rental_end_date}</span>
        </div>
      );
    }
  };

  const customerTabs = [
    {
      id: 'basic',
      label: 'Basic Info',
      content: (
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
              disabled={successfullySubmitted}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.customer_name ? 'border-red-500' : 'border-gray-300'
              } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            {errors.customer_name && (
              <p className="text-red-500 text-xs mt-1">{errors.customer_name}</p>
            )}
            {suggestions.length > 0 && !successfullySubmitted && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full px-4 py-2 text-left hover:bg-blue-50 flex items-center gap-3"
                  >
                    <UserSearch className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-800">{suggestion.name}</p>
                      <p className="text-sm text-gray-500">{suggestion.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  value={formData.customer_phone}
                  onChange={(e) => handleInputChange('customer_phone', e.target.value)}
                  placeholder="+212 XXX XXX XXX"
                  disabled={successfullySubmitted}
                  className={`w-full px-3 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customer_phone ? 'border-red-500' : 'border-gray-300'
                  } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              {errors.customer_phone && (
                <p className="text-red-500 text-xs mt-1">{errors.customer_phone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => handleInputChange('customer_email', e.target.value)}
                  placeholder="customer@example.com"
                  disabled={successfullySubmitted}
                  className={`w-full px-3 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.customer_email ? 'border-red-500' : 'border-gray-300'
                  } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
              </div>
              {errors.customer_email && (
                <p className="text-red-500 text-xs mt-1">{errors.customer_email}</p>
              )}
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'license',
      label: 'License & ID',
      content: (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              License Number
            </label>
            <input
              type="text"
              value={formData.customer_licence_number}
              onChange={(e) => handleInputChange('customer_licence_number', e.target.value)}
              placeholder="Enter license number"
              disabled={successfullySubmitted}
              className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
          </div>

          <FileUpload
            label="Customer ID Image"
            value={formData.customer_id_image}
            onChange={(file) => handleFileUpload('customer_id_image', file)}
          />
        </div>
      )
    },
    {
      id: 'additional',
      label: 'Additional Info',
      content: (
        <div className="space-y-4">
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
                disabled={successfullySubmitted}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                disabled={successfullySubmitted}
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
              />
            </div>
          </div>

          <FileUpload
            label="Second Driver ID Image"
            value={formData.second_driver_id_image}
            onChange={(file) => handleFileUpload('second_driver_id_image', file)}
          />
        </div>
      )
    }
  ];

  const handleNext = async () => {
    console.log('🔵 handleNext called - Current step:', currentStep);
    const isValid = await validateStep(currentStep);
    if (isValid) {
      console.log('✅ Validation passed, moving to next step');
      setCurrentStep(prev => Math.min(prev + 1, 3));
    } else {
      console.log('❌ Validation failed, staying on current step');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    console.log('🔴 handleFormSubmit called - Current step:', currentStep);
    console.log('🔴 explicitSubmitRef.current:', explicitSubmitRef.current);
    
    if (!explicitSubmitRef.current) {
      console.log('⚠️ Form submission blocked - not from explicit button click');
      return;
    }
    
    explicitSubmitRef.current = false;
    
    if (currentStep !== 3) {
      console.log('⚠️ Not on step 3, blocking form submission');
      return;
    }
    
    console.log('✅ On step 3, proceeding with submission');
    
    try {
      const result = await handleSubmit();
      if (onSuccess && result) {
        setTimeout(() => onSuccess(result), 1000);
      }
    } catch (error) {
      console.error('❌ Submission error:', error);
    }
  };

  if (successfullySubmitted) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-20">
          <Loader className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ✅ Rental Successfully Created!
          </h2>
          <p className="text-gray-600">Redirecting to rentals list...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4">
      <ProgressStepper currentStep={currentStep} steps={steps} />

      {errors.general && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1">{errors.general}</p>
            </div>
          </div>
        </div>
      )}

      {dateError && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <p className="text-yellow-800">{dateError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200">
        {currentStep === 1 && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Customer Information</h2>
                <p className="text-gray-600 text-sm mt-1">Enter customer details or scan ID to auto-fill</p>
              </div>
              <button
                type="button"
                onClick={() => setShowIDScanModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                disabled={loading || submitting || successfullySubmitted}
              >
                <Scan className="w-4 h-4" />
                Scan ID
              </button>
            </div>

            <TabbedInterface
              tabs={customerTabs}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            <CollapsibleSection title="Additional Customer Details" defaultOpen={false}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID Number
                  </label>
                  <input
                    type="text"
                    value={formData.customer_id_number}
                    onChange={(e) => handleInputChange('customer_id_number', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={formData.customer_dob}
                    onChange={(e) => handleInputChange('customer_dob', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Place of Birth
                  </label>
                  <input
                    type="text"
                    value={formData.customer_place_of_birth}
                    onChange={(e) => handleInputChange('customer_place_of_birth', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nationality
                  </label>
                  <input
                    type="text"
                    value={formData.customer_nationality}
                    onChange={(e) => handleInputChange('customer_nationality', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
            </CollapsibleSection>
          </div>
        )}

        {currentStep === 2 && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Vehicle & Rental Period</h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Rental Type
                </label>
                <div className="flex gap-2">
                  {['hourly', 'daily'].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleInputChange('rental_type', type)}
                      disabled={successfullySubmitted}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                        formData.rental_type === type
                          ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                      } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-lg font-semibold">
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          {type === 'hourly' ? 'Flexible timing' : '24-hour periods'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select Vehicle * ({availableVehicles.length > 0 ? availableVehicles.length : vehicleModels.length} available)
                </label>
                <VehicleCardGrid
                  vehicles={availableVehicles.length > 0 ? availableVehicles : vehicleModels}
                  selectedId={formData.vehicle_id}
                  onSelect={(vehicleId) => {
                    console.log('🚗 Vehicle selected:', vehicleId, 'Type:', typeof vehicleId);
                    const numericId = Number(vehicleId);
                    if (!isNaN(numericId)) {
                      handleInputChange('vehicle_id', numericId);
                    } else {
                      console.error('Invalid vehicle ID:', vehicleId);
                    }
                  }}
                  disabled={loading || successfullySubmitted}
                />
                {errors.vehicle_id && (
                  <p className="text-red-500 text-xs mt-1">{errors.vehicle_id}</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={formData.rental_start_date}
                    onChange={(e) => handleInputChange('rental_start_date', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.rental_start_date ? 'border-red-500' : 'border-gray-300'
                    } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {errors.rental_start_date && (
                    <p className="text-red-500 text-xs mt-1">{errors.rental_start_date}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={formData.rental_end_date}
                    onChange={(e) => handleInputChange('rental_end_date', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.rental_end_date ? 'border-red-500' : 'border-gray-300'
                    } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                  {errors.rental_end_date && (
                    <p className="text-red-500 text-xs mt-1">{errors.rental_end_date}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={formData.rental_start_time}
                    onChange={(e) => handleInputChange('rental_start_time', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={formData.rental_end_time}
                    onChange={(e) => handleInputChange('rental_end_time', e.target.value)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>

              {formData.rental_type === 'hourly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Select Duration
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((hours) => (
                      <button
                        key={hours}
                        type="button"
                        onClick={() => handleQuickHourSelect(hours)}
                        disabled={successfullySubmitted}
                        className={`flex-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                          selectedQuickDuration === hours
                            ? 'bg-blue-500 text-white border-2 border-blue-600'
                            : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-2 border-transparent'
                        } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {hours} {hours === 1 ? 'Hour' : 'Hours'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <CollapsibleSection title="Transport Options" defaultOpen={false}>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.pickup_transport}
                      onChange={(e) => handleInputChange('pickup_transport', e.target.checked)}
                      disabled={successfullySubmitted}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      Pick-up Transport (+{transportFees.pickup_fee.toFixed(2)} MAD)
                    </span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.dropoff_transport}
                      onChange={(e) => handleInputChange('dropoff_transport', e.target.checked)}
                      disabled={successfullySubmitted}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">
                      Drop-off Transport (+{transportFees.dropoff_fee.toFixed(2)} MAD)
                    </span>
                  </label>
                </div>
              </CollapsibleSection>

              <CollapsibleSection title="Pickup & Drop-off Locations" defaultOpen={false}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Location
                    </label>
                    <select
                      value={formData.pickup_location}
                      onChange={(e) => handleInputChange('pickup_location', e.target.value)}
                      disabled={successfullySubmitted}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="Office">Office</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Airport">Airport</option>
                      <option value="Custom">Custom Location</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Drop-off Location
                    </label>
                    <select
                      value={formData.dropoff_location}
                      onChange={(e) => handleInputChange('dropoff_location', e.target.value)}
                      disabled={successfullySubmitted}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <option value="Office">Office</option>
                      <option value="Hotel">Hotel</option>
                      <option value="Airport">Airport</option>
                      <option value="Custom">Custom Location</option>
                    </select>
                  </div>
                </div>
              </CollapsibleSection>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Review & Payment</h2>
            
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Rental Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Customer:</span>
                    <span className="font-medium">{formData.customer_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="font-medium">
                      {(() => {
                        const vehicle = getSelectedVehicle();
                        if (!vehicle) return 'Not selected';
                        return `${vehicle.plate_number || 'N/A'} - ${vehicle.model || vehicle.name}`;
                      })()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Period:</span>
                    <span className="font-medium">
                      {formatPeriodDisplay()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{formData.rental_type}</span>
                  </div>
                </div>
              </div>

              <PriceCalculator formData={formData} onPriceChange={handleInputChange} />

              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Payment Details</h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Status
                  </label>
                  <div className="flex gap-2">
                    {['paid', 'unpaid', 'partial'].map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => handlePaymentStatusTabClick(status)}
                        disabled={successfullySubmitted}
                        className={`flex-1 px-4 py-2 rounded-lg border-2 font-medium transition-all capitalize ${
                          formData.payment_status === status
                            ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                        } ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Deposit Amount (MAD)
                  </label>
                  <input
                    type="number"
                    value={formData.deposit_amount}
                    onChange={(e) => handleInputChange('deposit_amount', parseFloat(e.target.value) || 0)}
                    disabled={successfullySubmitted}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                    min="0"
                    step="0.01"
                  />
                </div>

                <DamageDepositTabs
                  formData={formData}
                  enabledPresets={getEnabledPresetsForVehicle(formData.vehicle_id)}
                  allowCustomDeposit={damageDepositConfig.allowCustomDeposit}
                  selectedTab={selectedDepositTab}
                  customAmount={customDepositAmount}
                  onTabClick={handleDepositTabClick}
                  onCustomAmountChange={setCustomDepositAmount}
                  disabled={successfullySubmitted}
                />
              </div>

              <CollapsibleSection title="Additional Options" defaultOpen={false}>
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.insurance_included}
                      onChange={(e) => handleInputChange('insurance_included', e.target.checked)}
                      disabled={successfullySubmitted}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Insurance Included</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.helmet_included}
                      onChange={(e) => handleInputChange('helmet_included', e.target.checked)}
                      disabled={successfullySubmitted}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Helmet Included</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.gear_included}
                      onChange={(e) => handleInputChange('gear_included', e.target.checked)}
                      disabled={successfullySubmitted}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Gear Included</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={formData.contract_signed}
                      onChange={(e) => handleInputChange('contract_signed', e.target.checked)}
                      disabled={successfullySubmitted}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Contract Signed</span>
                  </label>
                </div>
              </CollapsibleSection>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Accessories / Notes
                </label>
                <textarea
                  value={formData.accessories}
                  onChange={(e) => handleInputChange('accessories', e.target.value)}
                  disabled={successfullySubmitted}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${successfullySubmitted ? 'opacity-50 cursor-not-allowed' : ''}`}
                  rows="3"
                  placeholder="Any additional accessories or notes..."
                />
              </div>
            </div>
          </div>
        )}

        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 flex gap-3">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex-1 sm:flex-none"
                  disabled={submitting || isSubmitting || successfullySubmitted}
                >
                  <ChevronLeft className="w-4 h-4 inline mr-1" />
                  Back
                </button>
              )}
              
              <button
                type="button"
                onClick={handleReset}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex-1 sm:flex-none"
                disabled={submitting || isSubmitting || successfullySubmitted}
              >
                Reset Form
              </button>
              
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors flex-1 sm:flex-none"
                  disabled={submitting || isSubmitting || successfullySubmitted}
                >
                  Cancel
                </button>
              )}
            </div>
            
            <div className="flex-1 flex gap-3 justify-end">
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center flex-1 sm:flex-none"
                  disabled={submitting || isSubmitting || successfullySubmitted}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </button>
              ) : (
                <button
                  type="submit"
                  onClick={() => {
                    console.log('🟢 Create Rental button clicked explicitly');
                    explicitSubmitRef.current = true;
                  }}
                  disabled={submitting || isSubmitting || isLoading || successfullySubmitted}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium flex items-center justify-center flex-1 sm:flex-none disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting || isSubmitting || isLoading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      {mode === 'edit' ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    mode === 'edit' ? 'Update Rental' : 'Create Rental'
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </form>

      {showIDScanModal && (
        <EnhancedUnifiedIDScanModal
          isOpen={showIDScanModal}
          onClose={() => {
            setShowIDScanModal(false);
          }}
          setFormData={setFormData}
          formData={formData}
          onCustomerSaved={handleCustomerSaved}
          onScanComplete={handleIDScanComplete}
          customerId={formData.customer_id}
          rentalId={mode === 'edit' ? initialData?.id : null}
          title="Scan ID Document"
        />
      )}
    </div>
  );
};

export default SimplifiedRentalWizard;