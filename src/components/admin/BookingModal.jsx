import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector, useDispatch } from 'react-redux';
import { format } from 'date-fns';
import { XCircle, ChevronRight, ChevronLeft, Package } from 'lucide-react';
import { fetchUsers, selectUsers } from '../../store/slices/usersSlice';
import { fetchTours, selectAllTours } from '../../store/slices/toursSlice';
import { fetchVehicles, getAvailableVehiclesForBooking } from '../../store/slices/vehiclesSlice';
import { checkBookingConflicts } from '../../store/slices/bookingsSlice';
import { usePricing } from '../../contexts/PricingContext';
import { calculateBookingPrice as calculatePriceWithSettings } from '../../utils/pricingUtils';
import { fetchTourPackages, getTourPackagePrice } from '../../services/tourPackageService';
import { useSettings } from '../../hooks/useSettings.js';
import toast from 'react-hot-toast';

// Three-step booking modal: Tour Selection, Quad Selection, and Rider Details
const BookingModal = ({ isOpen, onClose, booking = null, onSave }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const users = useSelector(selectUsers);
  const toursFromStore = useSelector(selectAllTours);
  const { availableForBooking, loading, vehicles } = useSelector(state => state.vehicles);
  const { conflicts } = useSelector(state => state.bookings || { conflicts: [] });
  
  // Wizard state
  const [wizardStep, setWizardStep] = useState(1); // 1 = Tour Selection, 2 = Quad Selection, 3 = Rider Details
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Tour packages state
  const [tourPackages, setTourPackages] = useState([]);
  const [selectedTourPackage, setSelectedTourPackage] = useState(null);
  
  // Settings hook for pricing
  const { settings, loading: settingsLoading } = useSettings();
  
  // Form data
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    selectedDate: format(new Date(), 'yyyy-MM-dd'),
    selectedTime: '08:00',
    quadCount: 1,
    selectedQuads: [],
    extraPassengerQuads: {}, // Track which quads have extra passengers
    totalParticipants: 0,
    riders: [],
    paymentType: 'fully_paid',
    notes: '',
  });

  // Select a quad
  const handleQuadSelection = (quadId) => {
    setFormData(prev => {
      // If already selected, remove it and clear its extra passenger status
      if (prev.selectedQuads.includes(quadId)) {
        const newExtraPassengerQuads = { ...prev.extraPassengerQuads };
        delete newExtraPassengerQuads[quadId];
        
        return {
          ...prev,
          selectedQuads: prev.selectedQuads.filter(id => id !== quadId),
          extraPassengerQuads: newExtraPassengerQuads
        };
      } 
      
      // If not selected and we haven't reached the quad count, add it
      if (prev.selectedQuads.length < prev.quadCount) {
        return {
          ...prev,
          selectedQuads: [...prev.selectedQuads, quadId]
        };
      }
      
      return prev;
    });
  };

  // Handle extra passenger toggle for a specific quad
  const handleExtraPassengerToggle = (e, quadId) => {
    // 🔥 FIX: Stop event propagation to prevent triggering the parent card's click handler
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    
    setFormData(prev => ({
      ...prev,
      extraPassengerQuads: {
        ...prev.extraPassengerQuads,
        [quadId]: !prev.extraPassengerQuads[quadId]
      }
      // DO NOT modify selectedQuads here - keep selection state separate
    }));
  };

  // Fetch available quads when date/time changes
  const fetchAvailableQuads = async (date, time) => {
    if (!date || !time || !selectedTourPackage) {
      console.log('⚠️ Missing required data for quad availability check:', { 
        date, 
        time, 
        selectedTourPackage: selectedTourPackage ? 'present' : 'missing' 
      });
      return;
    }
    
    try {
      console.log('🔍 Starting quad availability check with:', { date, time, tourPackage: selectedTourPackage });
      
      const startDateTime = `${date}T${time}:00`;
      const tourDuration = selectedTourPackage?.duration || 4; // Default to 4 hours if not specified
      const location = selectedTourPackage?.location || 'Main Base';
      
      // Calculate end time
      const startDate = new Date(startDateTime);
      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + tourDuration);
      const endDateTime = endDate.toISOString();
      
      console.log('📅 Availability check period:', { 
        startDateTime, 
        endDateTime, 
        duration: tourDuration,
        location
      });
      
      dispatch(getAvailableVehiclesForBooking({
        startDate: startDateTime,
        endDate: endDateTime,
        location: location,
        vehicleType: ['quad', 'performance', 'utility', 'youth', 'sideBySide']
      }));
      
      // Also check for any booking conflicts
      if (formData.selectedQuads.length > 0) {
        dispatch(checkBookingConflicts({
          vehicleIds: formData.selectedQuads,
          startDate: startDateTime,
          endDate: endDateTime
        }));
      }
    } catch (error) {
      console.error('❌ Failed to fetch available quads:', error);
      setErrors(prev => ({ ...prev, fetchQuads: 'Failed to fetch available quads' }));
    }
  };
  
  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'selectedDate' || name === 'selectedTime') {
      // Update the form data
      setFormData(prev => ({ ...prev, [name]: value }));
      
      // Fetch available quads when date or time changes
      if (name === 'selectedDate') {
        fetchAvailableQuads(value, formData.selectedTime);
      } else {
        fetchAvailableQuads(formData.selectedDate, value);
      }
    } else if (name === 'quadCount') {
      const quadCount = parseInt(value);
      setFormData(prev => ({ 
        ...prev, 
        quadCount,
        // Reset selected quads if the count decreases
        selectedQuads: prev.selectedQuads.slice(0, quadCount)
      }));

    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Handle rider info change
  const handleRiderChange = (index, field, value) => {
    setFormData(prev => {
      const updatedRiders = [...prev.riders];
      if (!updatedRiders[index]) {
        updatedRiders[index] = { name: '', email: '', phone: '' };
      }
      updatedRiders[index][field] = value;
      return { ...prev, riders: updatedRiders };
    });
  };

  // Initialize riders array based on quad count (1 rider per quad)
  const initializeRiders = (quadCount) => {
    const totalRiders = quadCount;
    const riders = Array(totalRiders).fill().map((_, index) => ({ 
      name: index === 0 ? formData.customerName : '', 
      email: index === 0 ? formData.customerEmail : '', 
      phone: index === 0 ? formData.customerPhone : '' 
    }));
    
    setFormData(prev => ({
      ...prev,
      riders,
      totalParticipants: totalRiders
    }));
  };

  // Handle next step button click
  const handleNextStep = () => {
    // Validation for Step 1
    const newErrors = {};
    if (!formData.customerName) newErrors.customerName = 'Customer name is required';
    if (!formData.customerEmail) newErrors.customerEmail = 'Customer email is required';
    if (!formData.selectedDate) newErrors.selectedDate = 'Date is required';
    if (!formData.selectedTime) newErrors.selectedTime = 'Time is required';
    
    if (formData.selectedQuads.length !== formData.quadCount) {
      newErrors.quads = `Please select exactly ${formData.quadCount} quads`;
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (wizardStep === 1 && formData.selectedQuads.length === formData.quadCount) {
      // Initialize riders array when moving to step 2
      initializeRiders(formData.quadCount);
      setWizardStep(2);
      setErrors({});
    }
  };

  // Handle previous step button click
  const handlePreviousStep = () => {
    if (wizardStep === 2) {
      setWizardStep(1);
      setErrors({});
    }
  };

  // Handle saving the booking
  const handleSaveBooking = async () => {
    // Validation for Step 2
    const newErrors = {};
    
    // Validate riders
    const incompleteRiders = formData.riders.filter(rider => 
      !rider.name || !rider.email
    );
    
    if (incompleteRiders.length > 0) {
      newErrors.riders = 'All rider information must be completed';
    }
    
    // Make sure we have a tourName - it's a required field in the database
    if (!selectedTourPackage?.name) {
      console.warn('Tour package missing name! This is required');
      newErrors.tour = 'Missing tour name - please select a valid tour';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log('Starting booking save process...');
      
      // Calculate pricing to include in booking data - ensure non-zero values
      const pricing = calculateBookingPrice();
      console.log('Calculated pricing:', pricing);
      
      // Verify we have a valid tour name (required by database schema)
      const tourName = selectedTourPackage?.name || 'Quad Tour';
      console.log('Using tour name:', tourName);
      
      // Create fresh quad selection data structure (avoid object extension issues)
      const quadSelection = {
        // Create a new array to avoid the frozen object issue
        selectedQuads: formData.selectedQuads.map(quadId => {
          const quad = vehicles.find(v => v.id === quadId) || {};
          const hasExtraPassenger = formData.extraPassengerQuads[quadId] || false;
          // Return a brand new object
          return {
            quadId: String(quadId), // Ensure string type
            quadName: quad.name || quad.model || `Quad ${quadId}`,
            participantCount: hasExtraPassenger ? 2 : 1,
            extraPassenger: hasExtraPassenger
          };
        }),
        totalQuads: parseInt(formData.quadCount) || 1,
        totalParticipants: formData.selectedQuads.reduce((total, quadId) => {
          const hasExtraPassenger = formData.extraPassengerQuads[quadId] || false;
          return total + (hasExtraPassenger ? 2 : 1);
        }, 0)
      };
      console.log('Created quad selection:', quadSelection);
      
      // Create participants data with a fresh object (avoid extension issues)
      const participantsData = {
        adults: formData.riders.length,
        children: 0,
        infants: 0,
        // Include riders in a fresh array
        riders: formData.riders.map(rider => ({...rider}))
      };
      console.log('Created participants data:', participantsData);
      
      // Ensure numeric values are actually numbers, not strings
      const quadCount = parseInt(formData.quadCount) || 1;
      const totalAmount = typeof pricing.total === 'number' ? pricing.total : 
                           parseFloat(pricing.total) || 149.99; // Fallback price
      const deposit = typeof pricing.deposit === 'number' ? pricing.deposit : 
                       parseFloat(pricing.deposit) || 0;
      
      // Create booking data object with ALL required fields
      const bookingData = {
        // IDs and names - ensure tour_name is NEVER null (required field)
        tourId: selectedTourPackage?.id || null,
        tourName: tourName, // CRITICAL: This field MUST have a value
        tourPackageId: selectedTourPackage?.id || null,
        tourPackageName: tourName,
        tourLocation: selectedTourPackage?.location || null, // Adding tour location
        
        // Customer info
        customerName: formData.customerName || 'Guest',
        customerEmail: formData.customerEmail || '',
        phone: formData.customerPhone || '', // Match field name in database
        customerPhone: formData.customerPhone || '', // Alternative field name
        
        // Date and time
        selectedDate: formData.selectedDate || format(new Date(), 'yyyy-MM-dd'),
        tourDate: formData.selectedDate || format(new Date(), 'yyyy-MM-dd'),
        selectedTime: formData.selectedTime || '10:00',
        tourTime: formData.selectedTime || '10:00',
        
        // Status
        status: 'confirmed',
        paymentStatus: formData.paymentType === 'fully_paid' ? 'paid' : 'unpaid',
        
        // Financial details - ensure these are never null/undefined
        totalAmount: totalAmount, // Required field
        deposit: deposit, // Required field
        
        // Equipment
        quadCount: quadCount,
        quadSelection: quadSelection, // Structured data for database
        participants: participantsData, // Structured data for database
        
        // Additional info
        notes: formData.notes || '',
        specialRequests: formData.notes || '', // Duplicate for backward compatibility
      };
      
      console.log('💾 Saving booking with complete data:', bookingData);
      
      // Call the onSave callback with the booking data
      await onSave(bookingData);
      console.log('✅ Booking saved successfully');
      
      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error('❌ Failed to save booking:', error);
      setErrors(prev => ({ 
        ...prev, 
        submit: `Failed to save booking: ${error.message || 'Unknown error'}`
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      customerName: '',
      customerEmail: '',
      customerPhone: '',
      selectedDate: format(new Date(), 'yyyy-MM-dd'),
      selectedTime: '08:00',
      quadCount: 1,
      selectedQuads: [],
      extraPassengerQuads: {},
      totalParticipants: 0,
      riders: [],
      paymentType: 'fully_paid',
      notes: '',
    });
    setWizardStep(1);
    setErrors({});
  };
  
  // Force load vehicles if none are available
  const forceLoadVehicles = async () => {
    console.log('🔄 Force loading vehicles from database...');
    try {
      await dispatch(fetchVehicles()).unwrap();
      console.log('✅ Vehicles loaded successfully');
      
      // If we have date/time and tour package, try to fetch available quads again
      if (formData.selectedDate && formData.selectedTime && selectedTourPackage) {
        console.log('🔍 Re-checking quad availability after vehicle reload');
        fetchAvailableQuads(formData.selectedDate, formData.selectedTime);
      }
    } catch (error) {
      console.error('❌ Failed to load vehicles:', error);
    }
  };

  // Fill form with booking data when editing
  useEffect(() => {
    if (booking) {
      setFormData({
        customerName: booking.customerName || '',
        customerEmail: booking.customerEmail || '',
        customerPhone: booking.customerPhone || '',
        selectedDate: booking.tourDate || format(new Date(), 'yyyy-MM-dd'),
        selectedTime: booking.selectedTime || '08:00',
        quadCount: booking.quadCount || 1,
        selectedQuads: booking.assignedQuads || [],
        extraPassengerQuads: booking.extraPassengerQuads || {},
        riders: booking.participants || [],
        totalParticipants: booking.quadCount || 1,
        paymentType: booking.paymentType || 'fully_paid',
        notes: booking.notes || '',
      });
    }
  }, [booking]);

  // Fetch users and vehicles on component mount
  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchVehicles());
    dispatch(fetchTours());
  }, [dispatch]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  // Fetch available quads when tour package is selected and date/time are set
  useEffect(() => {
    console.log('🔄 Booking parameters changed, checking for quad availability:', {
      selectedTourPackageExists: !!selectedTourPackage,
      selectedDate: formData.selectedDate,
      selectedTime: formData.selectedTime
    });
    
    if (selectedTourPackage && formData.selectedDate && formData.selectedTime) {
      console.log('✅ All required data present, fetching available quads');
      fetchAvailableQuads(formData.selectedDate, formData.selectedTime);
    } else {
      console.log('⚠️ Missing required data for fetching quads');
    }
  }, [selectedTourPackage, formData.selectedDate, formData.selectedTime]);

  // Filter available quads from vehicles
  const getAvailableQuads = () => {
    let availableQuadsArray = [];
    
    console.log('🚗 getAvailableQuads called, source data:', { 
      availableForBookingExists: !!availableForBooking,
      availableVehiclesCount: availableForBooking?.availableVehicles?.length || 0,
      allVehiclesCount: availableForBooking?.allVehicles?.length || 0,
      vehiclesInStateCount: (vehicles || []).length,
      conflictsCount: (conflicts || []).length
    });
    
    if (availableForBooking?.availableVehicles?.length > 0) {
      console.log('✅ Using availableVehicles from availability check:', availableForBooking.availableVehicles.length);
      availableQuadsArray = availableForBooking.availableVehicles;
    } else {
      console.log('⚠️ No availableVehicles found, falling back to direct filtering');
      // Fallback to direct vehicles with filtering
      availableQuadsArray = (vehicles || []).filter(vehicle => {
        // Filter by ATV types
        const atvTypes = ['performance', 'utility', 'youth', 'sideBySide', 'quad', 'atv', 'utv'];
        const isQuadType = atvTypes.includes(vehicle.type?.toLowerCase()) || 
                           atvTypes.includes(vehicle.vehicle_type?.toLowerCase());
        
        if (!isQuadType) {
          console.log(`❌ Vehicle ${vehicle.id} (${vehicle.name || 'Unnamed Vehicle'}) excluded: not a quad type. Type: ${vehicle.vehicle_type || vehicle.type || 'unknown'}`);
          return false;
        }
        
        // Must be available status
        if (vehicle.status !== 'available') {
          console.log(`❌ Vehicle ${vehicle.id} (${vehicle.name}) excluded: status is ${vehicle.status}`);
          return false;
        }
        
        // Filter out vehicles in maintenance
        if (vehicle.maintenanceStatus && vehicle.maintenanceStatus !== 'active') {
          console.log(`❌ Vehicle ${vehicle.id} (${vehicle.name}) excluded: maintenance status is ${vehicle.maintenanceStatus}`);
          return false;
        }
        
        // Location filter - only apply if both tour package and vehicle have locations
        if (selectedTourPackage?.location && vehicle.location) {
          // Compare locations case-insensitively
          if (vehicle.location.toLowerCase() !== selectedTourPackage.location.toLowerCase()) {
            console.log(`❌ Vehicle ${vehicle.id} (${vehicle.name || 'unnamed'}) excluded: location mismatch (${vehicle.location} vs ${selectedTourPackage.location})`);
            return false;
          }
        } else {
          console.log(`ℹ️ Location check skipped for vehicle ${vehicle.id} - Tour location: ${selectedTourPackage?.location || 'not set'}, Vehicle location: ${vehicle.location || 'not set'}`);
        }
        
        return true;
      });
      
      console.log(`✅ Direct filtering found ${availableQuadsArray.length} potential quads`);
    }
    
    // Filter out conflicting vehicles
    const filteredQuads = availableQuadsArray.filter(vehicle => {
      const hasConflict = conflicts.some(conflict => 
        conflict.conflictingVehicles && conflict.conflictingVehicles.includes(vehicle.id)
      );
      
      if (hasConflict) {
        console.log(`❌ Vehicle ${vehicle.id} (${vehicle.name || vehicle.model}) excluded: has booking conflict`);
      }
      
      return !hasConflict;
    });
    
    console.log(`📋 Final available quads count: ${filteredQuads.length} (after conflict filtering)`);
    
    if (filteredQuads.length === 0) {
      console.log('⚠️ No quads available after all filtering steps!', {
        availableForBooking,
        vehicles: vehicles?.slice(0, 5) // Show first 5 for debugging
      });
    }
    
    return filteredQuads;
  };

  // Calculate booking price using centralized pricing utility
  const pricingContext = usePricing();
  
  const calculateBookingPrice = () => {
    // Use the centralized pricing utility for consistent calculations
    const quadCount = parseInt(formData.quadCount) || 1;
    
    // Determine if this is a weekend booking
    const bookingDate = new Date(formData.selectedDate);
    const isWeekendBooking = bookingDate.getDay() === 0 || bookingDate.getDay() === 6;
    
    // For each quad, create pricing parameters and calculate price
    let totalAmount = 0;
    let totalDeposit = 0;
    
    // 🔥 FIX #1 & #3: Only process SELECTED quads for pricing calculation
    formData.selectedQuads.forEach((quadId, index) => {
      // Only count extra passengers from SELECTED quads
      const hasExtraPassenger = formData.extraPassengerQuads[quadId] || false;
      const passengersForThisQuad = hasExtraPassenger ? 2 : 1;
      
      // Create pricing parameters for this individual quad
      const pricingParams = {
        rentalType: 'tour',
        duration: selectedTourPackage?.duration || 1,
        passengers: passengersForThisQuad,
        isVip: selectedTourPackage?.isVip || false,
        isWeekend: isWeekendBooking,
        isHoliday: false, // Could be enhanced later
        equipmentItems: []
      };
      
      // Calculate price for this single quad
      const quadPriceBreakdown = calculatePriceWithSettings(pricingParams, settings);
      
      // Add to the running total
      totalAmount += quadPriceBreakdown.total;
      totalDeposit += quadPriceBreakdown.deposit;
    });
    
    // Calculate total participants from SELECTED quads only
    const totalParticipants = formData.selectedQuads.reduce((total, quadId) => {
      const hasExtraPassenger = formData.extraPassengerQuads[quadId] || false;
      return total + (hasExtraPassenger ? 2 : 1);
    }, 0);
    
    console.log('💰 FIXED PRICING CALCULATION:', {
      selectedQuads: formData.selectedQuads,
      quadCount,
      totalParticipants,
      totalAmount,
      totalDeposit,
      extraPassengerFlags: formData.extraPassengerQuads
    });
    
    // Calculate deposit based on payment type
    const depositAmount = formData.paymentType === 'deposit' ? totalDeposit : 0;
    const balance = formData.paymentType === 'deposit' ? totalAmount - depositAmount : 0;
    
    return { 
      total: totalAmount, 
      deposit: depositAmount, 
      balance 
    };
  };

  if (!isOpen) return null;

  const displayQuads = getAvailableQuads();
  const { total, deposit, balance } = calculateBookingPrice();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto bg-black bg-opacity-50">
      <div className="relative w-full max-w-6xl mx-auto my-6">
        <div className="relative flex flex-col w-full bg-white border-0 rounded-lg shadow-lg">
          {/* Modal Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 rounded-t">
            <h3 className="text-xl font-semibold">
              {booking ? 'Edit Booking' : 'New Booking'} - {selectedTourPackage?.name}
            </h3>
            <button 
              onClick={() => {
                resetForm();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-6 w-6" />
            </button>
          </div>

          {/* Wizard Steps */}
          <div className="px-5 pt-5">
            <div className="flex items-center justify-center mb-6">
              <div className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    wizardStep === 1 ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                  }`}
                >
                  1
                </div>
                <span className={`text-sm ${wizardStep === 1 ? 'text-blue-600 font-medium' : 'text-green-600'} ml-2`}>
                  Select Quads
                </span>
              </div>
              <div className="w-16 h-0.5 mx-2 bg-gray-300"></div>
              <div className="flex items-center">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    wizardStep === 2 ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  2
                </div>
                <span className={`text-sm ${wizardStep === 2 ? 'text-blue-600 font-medium' : 'text-gray-600'} ml-2`}>
                  Rider Details
                </span>
              </div>
            </div>
          </div>

          {/* Modal Body */}
          <div className="relative p-6 flex-auto overflow-y-auto max-h-[70vh]">
            {/* Step 1: Quad Selection */}
            {wizardStep === 1 && (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Customer Info */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">Customer Information</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Name *
                        </label>
                        <input
                          type="text"
                          name="customerName"
                          value={formData.customerName}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-lg ${errors.customerName ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.customerName && <p className="text-red-500 text-xs mt-1">{errors.customerName}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email *
                        </label>
                        <input
                          type="email"
                          name="customerEmail"
                          value={formData.customerEmail}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-lg ${errors.customerEmail ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.customerEmail && <p className="text-red-500 text-xs mt-1">{errors.customerEmail}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Phone
                        </label>
                        <input
                          type="tel"
                          name="customerPhone"
                          value={formData.customerPhone}
                          onChange={handleInputChange}
                          className="w-full p-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tour Details */}
                  <div>
                    <h4 className="text-lg font-medium mb-4">Tour Details</h4>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Date *
                        </label>
                        <input
                          type="date"
                          name="selectedDate"
                          value={formData.selectedDate}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-lg ${errors.selectedDate ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.selectedDate && <p className="text-red-500 text-xs mt-1">{errors.selectedDate}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Time *
                        </label>
                        <input
                          type="time"
                          name="selectedTime"
                          value={formData.selectedTime}
                          onChange={handleInputChange}
                          className={`w-full p-2 border rounded-lg ${errors.selectedTime ? 'border-red-500' : 'border-gray-300'}`}
                        />
                        {errors.selectedTime && <p className="text-red-500 text-xs mt-1">{errors.selectedTime}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Number of Quads
                          </label>
                          <input
                            type="number"
                            name="quadCount"
                            min="1"
                            max="10"
                            value={formData.quadCount}
                            onChange={handleInputChange}
                            className="w-full p-2 border border-gray-300 rounded-lg"
                          />
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

                {/* Available Quads */}
                {formData.selectedDate && formData.selectedTime && (
                  <div className="mt-6">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-lg font-medium">Select Quads</h4>
                      <div className="flex items-center">
                        <button 
                          onClick={() => fetchAvailableQuads(formData.selectedDate, formData.selectedTime)}
                          className="text-xs bg-gray-100 text-blue-600 px-2 py-1 rounded hover:bg-gray-200"
                        >
                          Refresh
                        </button>
                        <span className="ml-2 text-xs text-gray-500">
                          Date: {formData.selectedDate} | Time: {formData.selectedTime}
                        </span>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading available quads...</p>
                      </div>
                    ) : displayQuads.length > 0 ? (
                      <div>
                        <div className="bg-green-50 p-3 rounded-lg mb-4">
                          <p className="text-green-700">
                            ✅ Found {displayQuads.length} available quads - Select {formData.quadCount} for your tour
                          </p>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {displayQuads.map(quad => {
                            const isSelected = formData.selectedQuads.includes(quad.id);
                            const canSelect = formData.selectedQuads.length < formData.quadCount || isSelected;
                            
                            return (
                              <div 
                                key={quad.id}
                                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                                  isSelected 
                                    ? 'border-blue-500 bg-blue-50' 
                                    : canSelect 
                                      ? 'border-gray-300 hover:border-blue-300'
                                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                                }`}
                                onClick={() => canSelect && handleQuadSelection(quad.id)}
                              >
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-semibold text-gray-900">{quad.name} {quad.model}</h4>
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                    isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                                  }`}>
                                    {isSelected && (
                                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="text-sm text-gray-600">
                                  <p><span className="font-medium">Type:</span> {quad.type}</p>
                                  <p><span className="font-medium">Capacity:</span> {quad.capacity || 2} persons</p>
                                  <p><span className="font-medium">Location:</span> {quad.location}</p>
                                </div>
                                
                                {/* Extra Passenger option - Always show for consistency but disable when needed */}
                                <div 
                                  className="mt-3 pt-3 border-t border-gray-200"
                                  onClick={(e) => {
                                    // Stop event propagation at container level
                                    e.stopPropagation();
                                  }}
                                >
                                  <label 
                                    onClick={(e) => {
                                      // Stop event propagation on label click
                                      e.stopPropagation();
                                      e.preventDefault();
                                      
                                      // Only toggle if quad is selected and has capacity
                                      if (isSelected && (quad.capacity || 2) > 1) {
                                        handleExtraPassengerToggle(e, quad.id);
                                      }
                                    }}
                                    className={`flex items-center space-x-2 ${
                                      !isSelected || (quad.capacity || 2) <= 1 
                                        ? 'cursor-not-allowed opacity-60' 
                                        : 'cursor-pointer'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isSelected && (formData.extraPassengerQuads[quad.id] || false)}
                                      onChange={(e) => {
                                        if (isSelected && (quad.capacity || 2) > 1) {
                                          handleExtraPassengerToggle(e, quad.id);
                                        }
                                      }}
                                      disabled={!isSelected || (quad.capacity || 2) <= 1}
                                      className={`w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 ${
                                        !isSelected || (quad.capacity || 2) <= 1 ? 'cursor-not-allowed opacity-60' : ''
                                      }`}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span className="text-sm font-medium text-gray-700">
                                      {!isSelected
                                        ? 'Extra Passenger (Select quad first)'
                                        : (quad.capacity || 2) <= 1 
                                          ? 'Extra Passenger (Not Available)'
                                          : 'Extra Passenger'
                                      }
                                      {isSelected && settings?.extraPassengerFee && (quad.capacity || 2) > 1 && (
                                        <span className="text-blue-600 ml-1">
                                          (+${settings.extraPassengerFee})
                                        </span>
                                      )}
                                    </span>
                                  </label>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="mt-4 p-3 rounded-lg bg-blue-50 flex justify-between items-center">
                          <div>
                            <span className="text-blue-700 font-medium">Quad Selection Progress:</span>
                            <span className="ml-2 text-blue-900">{formData.selectedQuads.length} / {formData.quadCount}</span>
                          </div>
                          <div>
                            {formData.selectedQuads.length === formData.quadCount 
                              ? <span className="text-green-600">✓ All quads selected</span>
                              : <span className="text-amber-600">⏳ Please select {formData.quadCount - formData.selectedQuads.length} more quad(s)</span>}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 bg-yellow-50 rounded-lg">
                        <p className="text-yellow-700">No quads available for the selected date and time.</p>
                        <p className="text-sm text-yellow-600 mt-2">Please try a different date/time or contact support.</p>
                        <div className="mt-4 p-4 bg-white rounded border border-yellow-200 text-left">
                          <p className="text-sm text-gray-700 font-medium mb-1">Troubleshooting Tips:</p>
                          <ul className="text-xs text-gray-600 list-disc pl-4 space-y-1">
                            <li>Check if there are any quads in the system (Admin → Fleet)</li>
                            <li>Verify that quads have status set to "available"</li>
                            <li>Ensure quads have the correct location matching this tour</li>
                            <li>Try a different date or time (e.g., {new Date().toLocaleDateString()})</li>
                            <li>Check if all quads are assigned to other bookings for this time slot</li>
                          </ul>
                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              onClick={() => fetchAvailableQuads(formData.selectedDate, formData.selectedTime)}
                              className="py-1 px-2 bg-blue-50 text-blue-600 text-xs rounded border border-blue-200 hover:bg-blue-100"
                            >
                              Retry Check
                            </button>
                            <button
                              onClick={forceLoadVehicles}
                              className="py-1 px-2 bg-green-50 text-green-600 text-xs rounded border border-green-200 hover:bg-green-100"
                            >
                              Reload Vehicles
                            </button>
                          </div>
                          
                          <div className="mt-3 text-xs text-gray-500">
                            <p>Selected Tour: <span className="font-medium">{selectedTourPackage?.name || 'None'}</span></p>
                            <p>Location: <span className="font-medium">{selectedTourPackage?.location || 'Not specified'}</span></p>
                            <p>Date/Time: <span className="font-medium">{formData.selectedDate} at {formData.selectedTime}</span></p>
                          </div>
                        </div>
                      </div>
                    )}

                    {errors.quads && (
                      <p className="text-red-500 text-sm mt-2">{errors.quads}</p>
                    )}
                  </div>
                )}

                {/* Payment Information */}
                <div className="mt-6">
                  <h4 className="text-lg font-medium mb-4">Payment Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Payment Type
                      </label>
                      <select
                        name="paymentType"
                        value={formData.paymentType}
                        onChange={handleInputChange}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="fully_paid">Fully Paid</option>
                        <option value="deposit">Deposit Only</option>
                        <option value="pay_later">Pay on Arrival</option>
                      </select>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Base Price per Quad:</span>
                        <span>${settings?.defaultRate1h || selectedTourPackage?.price || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Number of Quads:</span>
                        <span>x {formData.quadCount}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-medium">Participants:</span>
                        <span>{formData.selectedQuads.reduce((total, quadId) => {
                          const hasExtraPassenger = formData.extraPassengerQuads[quadId] || false;
                          return total + (hasExtraPassenger ? 2 : 1);
                        }, 0)} people</span>
                      </div>
                      {/* 🔥 FIX #1 & #3: Show extra passenger fees only from SELECTED quads */}
                      {(() => {
                        const selectedQuadExtraPassengers = formData.selectedQuads.filter(quadId => 
                          formData.extraPassengerQuads[quadId]
                        ).length;
                        return selectedQuadExtraPassengers > 0 && (
                          <div className="flex justify-between text-sm mb-2">
                            <span className="font-medium">Extra Passenger Fees:</span>
                            <span>
                              {selectedQuadExtraPassengers} × ${settings?.extraPassengerFee || 0}
                            </span>
                          </div>
                        );
                      })()}
                      <div className="flex justify-between font-semibold border-t border-gray-300 pt-2 mt-2">
                        <span>Total:</span>
                        <span>${total.toFixed(2)}</span>
                      </div>
                      {formData.paymentType === 'deposit' && (
                        <>
                          <div className="flex justify-between text-sm mb-2 mt-2">
                            <span className="font-medium">Deposit ({settings?.depositPercentage || 30}%):</span>
                            <span>${deposit.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between text-sm text-gray-600">
                            <span>Balance Due:</span>
                            <span>${balance.toFixed(2)}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    name="notes"
                    rows="2"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded-lg"
                    placeholder="Any special requests or additional information..."
                  ></textarea>
                </div>
              </div>
            )}
            {/* Step 2: Rider Details */}
            {wizardStep === 2 && (
              <div>
                {/* Booking Summary */}
                <div className="bg-blue-50 p-4 rounded-lg mb-6">
                  <h3 className="font-semibold text-blue-900 mb-3">Booking Summary</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 font-medium">Date & Time:</span>
                      <p className="text-gray-900">{formData.selectedDate} at {formData.selectedTime}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Quads:</span>
                      <p className="text-gray-900">{formData.quadCount} quad{formData.quadCount > 1 ? 's' : ''}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Total Participants:</span>
                      <p className="text-gray-900">{formData.selectedQuads.reduce((total, quadId) => {
                        const hasExtraPassenger = formData.extraPassengerQuads[quadId] || false;
                        return total + (hasExtraPassenger ? 2 : 1);
                      }, 0)}</p>
                    </div>
                    <div>
                      <span className="text-blue-700 font-medium">Lead Customer:</span>
                      <p className="text-gray-900">{formData.customerName}</p>
                    </div>
                  </div>
                </div>

                {/* Rider Information */}
                <div className="mb-6">
                  <h3 className="font-semibold text-lg mb-4">Rider Information</h3>
                  <p className="text-sm text-gray-600 mb-6">Please provide details for all riders</p>
                  
                  <div className="space-y-6">
                    {formData.selectedQuads.map((quadId, quadIndex) => {
                      const quad = Array.isArray(availableForBooking) 
                        ? availableForBooking.find(q => q.id === quadId)
                        : null;
                      const hasExtraPassenger = formData.extraPassengerQuads[quadId] || false;
                      
                      // Calculate rider indices for this quad
                      let baseRiderIndex = 0;
                      for (let i = 0; i < quadIndex; i++) {
                        const prevQuadId = formData.selectedQuads[i];
                        const prevHasExtra = formData.extraPassengerQuads[prevQuadId] || false;
                        baseRiderIndex += prevHasExtra ? 2 : 1;
                      }
                      
                      return (
                        <div key={quadId} className="border border-gray-200 rounded-lg p-6 space-y-6 bg-gray-50">
                          <div className="border-b border-gray-200 pb-3">
                            <h4 className="font-semibold text-gray-900 text-lg">
                              {quad?.name || `Quad ${quadIndex + 1}`}
                            </h4>
                            {hasExtraPassenger && (
                              <p className="text-sm text-blue-600 mt-1">
                                ✓ Extra Passenger included
                              </p>
                            )}
                          </div>
                          
                          {/* Rider #1 (Lead Customer) - Always shown */}
                          <div className="bg-white rounded-lg p-4 border border-gray-200">
                            <h5 className="font-medium text-gray-900 mb-4 flex items-center">
                              <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                                Rider #1
                              </span>
                              {quadIndex === 0 ? 'Lead Customer' : 'Lead Rider'}
                            </h5>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Full Name *
                                </label>
                                <input
                                  type="text"
                                  required
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.riders && !formData.riders[baseRiderIndex]?.name ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  value={formData.riders[baseRiderIndex]?.name || ''}
                                  onChange={(e) => handleRiderChange(baseRiderIndex, 'name', e.target.value)}
                                  placeholder={quadIndex === 0 ? formData.customerName || "Enter lead customer name" : "Enter rider name"}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Email Address *
                                </label>
                                <input
                                  type="email"
                                  required
                                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                    errors.riders && !formData.riders[baseRiderIndex]?.email ? 'border-red-500' : 'border-gray-300'
                                  }`}
                                  value={formData.riders[baseRiderIndex]?.email || ''}
                                  onChange={(e) => handleRiderChange(baseRiderIndex, 'email', e.target.value)}
                                  placeholder={quadIndex === 0 ? formData.customerEmail || "Enter lead customer email" : "Enter rider email"}
                                />
                              </div>
                              
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Phone Number
                                </label>
                                <input
                                  type="tel"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  value={formData.riders[baseRiderIndex]?.phone || ''}
                                  onChange={(e) => handleRiderChange(baseRiderIndex, 'phone', e.target.value)}
                                  placeholder={quadIndex === 0 ? formData.customerPhone || "Optional phone number" : "Optional phone number"}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Rider #2 (Extra Passenger) - Only shown if extraPassenger is true */}
                          {hasExtraPassenger && (
                            <div className="bg-white rounded-lg p-4 border border-gray-200">
                              <h5 className="font-medium text-gray-900 mb-4 flex items-center">
                                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full mr-2">
                                  Rider #2
                                </span>
                                Extra Passenger
                              </h5>
                              
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Full Name *
                                  </label>
                                  <input
                                    type="text"
                                    required
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      errors.riders && !formData.riders[baseRiderIndex + 1]?.name ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    value={formData.riders[baseRiderIndex + 1]?.name || ''}
                                    onChange={(e) => handleRiderChange(baseRiderIndex + 1, 'name', e.target.value)}
                                    placeholder="Enter extra passenger name"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email Address *
                                  </label>
                                  <input
                                    type="email"
                                    required
                                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                      errors.riders && !formData.riders[baseRiderIndex + 1]?.email ? 'border-red-500' : 'border-gray-300'
                                    }`}
                                    value={formData.riders[baseRiderIndex + 1]?.email || ''}
                                    onChange={(e) => handleRiderChange(baseRiderIndex + 1, 'email', e.target.value)}
                                    placeholder="Enter extra passenger email"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone Number
                                  </label>
                                  <input
                                    type="tel"
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.riders[baseRiderIndex + 1]?.phone || ''}
                                    onChange={(e) => handleRiderChange(baseRiderIndex + 1, 'phone', e.target.value)}
                                    placeholder="Optional phone number"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  
                  {errors.riders && (
                    <p className="text-red-500 text-sm mt-2">{errors.riders}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200">
            {/* Back button (only shown in step 2) */}
            {wizardStep === 2 ? (
              <button
                onClick={handlePreviousStep}
                className="flex items-center px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isSubmitting}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back to Quad Selection
              </button>
            ) : (
              <button
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
            
            {/* Next/Submit buttons */}
            {wizardStep === 1 ? (
              <button
                onClick={handleNextStep}
                className={`flex items-center px-6 py-2 rounded-lg transition-colors ${
                  formData.selectedQuads.length === formData.quadCount
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-blue-300 text-white cursor-not-allowed'
                }`}
                disabled={formData.selectedQuads.length !== formData.quadCount}
              >
                Proceed to Rider Details
                <ChevronRight className="h-4 w-4 ml-2" />
              </button>
            ) : (
              <button
                onClick={handleSaveBooking}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </span>
                ) : 'Complete Booking'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingModal;
