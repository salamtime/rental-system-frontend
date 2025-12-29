import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import AvailabilityAwareRentalForm from '../../components/AvailabilityAwareRentalForm';
import EnhancedStepperRentalForm from '../../components/admin/EnhancedStepperRentalForm';
import VideoContractModal from '../../components/VideoContractModal';
import VehicleAvailabilityService from '../../services/VehicleAvailabilityService';
import ViewCustomerDetailsDrawer from '../../components/admin/ViewCustomerDetailsDrawer';
import { getPaymentStatusStyle } from '../../config/statusColors';
import { Plus, Clock, List, Grid, LayoutGrid } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Rentals = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [rentals, setRentals] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showStepperForm, setShowStepperForm] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [availabilityData, setAvailabilityData] = useState([]);
  const [viewMode, setViewMode] = useState('grid'); // 'list', 'table', or 'grid'
  
  const [videoContractModal, setVideoContractModal] = useState({
    isOpen: false,
    rental: null,
    type: null // 'start' or 'close'
  });

  const [customerDetailsDrawer, setCustomerDetailsDrawer] = useState({
    isOpen: false,
    customerId: null,
    rental: null
  });

  const fetchRentals = async (currentStatusFilter, currentPaymentStatusFilter) => {
    try {
      console.log('Fetching rentals with filters:', { status: currentStatusFilter, payment: currentPaymentStatusFilter });
      
      let query = supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          *,
          payment_status,
          approval_status,
          pending_total_request,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(
            id,
            name,
            model,
            plate_number,
            status,
            vehicle_type
          )
        `);

      if (currentStatusFilter && currentStatusFilter !== 'all') {
        query = query.eq('rental_status', currentStatusFilter);
      }
      if (currentPaymentStatusFilter && currentPaymentStatusFilter !== 'all') {
        query = query.eq('payment_status', currentPaymentStatusFilter);
      }
      
      query = query.order('created_at', { ascending: false });

      let { data, error } = await query;

      if (error) {
        console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        throw error;
      }

      console.log('Rentals fetched successfully:', data?.length || 0);

      // Client-side payment status correction for data consistency
      const correctedData = data ? data.map(rental => {
        const deposit = parseFloat(rental.deposit_amount) || 0;
        const total = parseFloat(rental.total_amount) || 0;
        
        if (rental.payment_status === 'overdue') {
          return rental;
        }

        let newPaymentStatus = rental.payment_status;
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
        
        if (newPaymentStatus !== rental.payment_status) {
          return { ...rental, payment_status: newPaymentStatus };
        }
        
        return rental;
      }) : [];

      setRentals(correctedData || []);
    } catch (err) {
      console.error('❌ Supabase Error', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      setError(err.message);
    }
  };

  const fetchVehicles = async () => {
    try {
      console.log('Fetching vehicles...');
      
      const { data, error } = await supabase
        .from('saharax_0u4w4d_vehicles')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        throw error;
      }

      console.log('Vehicles fetched successfully:', data?.length || 0);
      setVehicles(data || []);
    } catch (err) {
      console.error('❌ Supabase Error', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      setError(err.message);
    }
  };

  const fetchAvailabilityData = async () => {
    try {
      console.log('Fetching vehicle availability...');
      
      const availability = await VehicleAvailabilityService.getAllVehicleAvailability();
      console.log('Availability data fetched:', availability?.length || 0);
      setAvailabilityData(availability || []);
    } catch (err) {
      console.error('❌ Supabase Error', { message: err.message, details: err.details, hint: err.hint, code: err.code });
    }
  };

  const checkClosingVideo = async (rentalId) => {
    try {
      const { data: mediaRecords, error } = await supabase
        .from('app_2f7bf469b0_rental_media')
        .select('*')
        .eq('rental_id', rentalId)
        .eq('phase', 'in') // 'in' = closing
        .ilike('file_type', 'video%');

      if (error) {
        console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        return false;
      }

      return mediaRecords && mediaRecords.length > 0;
    } catch (err) {
      console.error('❌ Supabase Error', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      return false;
    }
  };

  const isPaymentSufficientForStart = (rental) => {
    return rental.payment_status === 'paid';
  };

  // Check if current user can delete rentals
  const canDelete = () => {
    if (!user?.id) return false;
    
    console.log('🔐 Delete permission check:', {
      userId: user.id,
      userRole: user.role,
      canDelete: user.role === 'owner'
    });
    
    return user.role === 'owner';
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusFromUrl = params.get('status') || 'all';
    const paymentStatusFromUrl = params.get('paymentStatus') || 'all';
    setStatusFilter(statusFromUrl);
    setPaymentStatusFilter(paymentStatusFromUrl);
  }, [location.search]);

  useEffect(() => {
    const loadRentals = async () => {
      setLoading(true);
      await fetchRentals(statusFilter, paymentStatusFilter);
      setLoading(false);
    };
    loadRentals();
  }, [statusFilter, paymentStatusFilter]);

  useEffect(() => {
    fetchVehicles();
    fetchAvailabilityData();

    console.log('Setting up real-time subscriptions...');

    const rentalSubscription = supabase
      .channel('rental_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'app_4c3a7a6153_rentals' 
        }, 
        (payload) => {
          console.log('Rental change detected:', payload);
          fetchRentals(statusFilter, paymentStatusFilter);
          fetchAvailabilityData();
        }
      )
      .subscribe();

    const vehicleSubscription = supabase
      .channel('vehicle_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'saharax_0u4w4d_vehicles' 
        }, 
        (payload) => {
          console.log('Vehicle change detected:', payload);
          fetchVehicles();
          fetchAvailabilityData();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up subscriptions...');
      supabase.removeChannel(rentalSubscription);
      supabase.removeChannel(vehicleSubscription);
    };
  }, [statusFilter, paymentStatusFilter]);

  const handleRentalSuccess = (rentalData) => {
    console.log('Rental operation successful:', rentalData);
    setShowForm(false);
    setShowStepperForm(false);
    setEditingRental(null);
    fetchRentals(statusFilter, paymentStatusFilter);
    fetchAvailabilityData();
  };

  const handleDeleteRental = async (rentalId) => {
    // Check owner permission first
    if (user?.role !== 'owner') {
      console.log('🚫 Delete blocked: User is not an owner', {
        userId: user?.id,
        userRole: user?.role
      });
      alert('⚠️ Only owners can delete rentals.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this rental?')) {
      return;
    }

    try {
      console.log('Deleting rental:', rentalId);
      
      let { error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .delete()
        .eq('id', rentalId);

      if (error) {
        console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        throw error;
      }

      console.log('Rental deleted successfully');
      fetchRentals(statusFilter, paymentStatusFilter);
      fetchAvailabilityData();
    } catch (err) {
      console.error('❌ Supabase Error', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      setError(err.message);
    }
  };

  const handleViewRental = (rental) => {
    console.log('Navigating to rental details page:', rental.id);
    navigate(`/admin/rentals/${rental.id}`);
  };

  const handleViewCustomerDetails = (rental) => {
    console.log('Opening customer details drawer for rental:', rental.id);
    console.log('Rental data being passed:', rental);
    
    const customerId = rental.customer_id || rental.id;
    
    setCustomerDetailsDrawer({
      isOpen: true,
      customerId: customerId,
      rental: rental
    });
  };

  const handleStartContract = (rental) => {
    if (!isPaymentSufficientForStart(rental)) {
      alert('⚠️ Payment must be "Paid" before starting the vehicle condition check.');
      return;
    }

    console.log('Starting contract for rental:', rental.id);
    setVideoContractModal({
      isOpen: true,
      rental: rental,
      type: 'start'
    });
  };

  const handleCloseContract = async (rental) => {
    console.log('Closing contract for rental:', rental.id);
    
    const hasClosingVideo = await checkClosingVideo(rental.id);
    
    if (!hasClosingVideo) {
      console.log('No closing video found, opening video contract modal');
      setVideoContractModal({
        isOpen: true,
        rental: rental,
        type: 'close'
      });
      return;
    }

    if (!window.confirm('Are you sure you want to complete this rental?')) {
      return;
    }

    try {
      let { data, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .update({ 
          rental_status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', rental.id)
        .select()
        .single();

      if (error) {
        console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        throw error;
      }

      console.log('Rental completed successfully:', data);
      
      alert('✅ Rental completed successfully!');
      
      fetchRentals(statusFilter, paymentStatusFilter);
      fetchAvailabilityData();
    } catch (err) {
      console.error('❌ Supabase Error', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      alert('❌ Failed to complete rental: ' + err.message);
    }
  };

  const handleVideoContractSuccess = (updatedRental) => {
    console.log('Video contract completed:', updatedRental);
    
    setVideoContractModal({
      isOpen: false,
      rental: null,
      type: null
    });
    
    const action = videoContractModal.type === 'start' ? 'started' : 'completed';
    alert(`✅ Contract ${action} successfully!`);
    
    fetchRentals(statusFilter, paymentStatusFilter);
    fetchAvailabilityData();
  };

  const getStatusBadge = (status) => {
    const configs = {
      'scheduled': { text: 'Scheduled', className: 'bg-blue-100 text-blue-800' },
      'active': { text: 'Active', className: 'bg-green-100 text-green-800' },
      'completed': { text: 'Completed', className: 'bg-gray-100 text-gray-800' },
      'cancelled': { text: 'Cancelled', className: 'bg-red-100 text-red-800' },
      'void': { text: 'Void', className: 'bg-red-100 text-red-800' }
    };
    
    const config = configs[status] || configs['scheduled'];
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.text}
      </span>
    );
  };

  const getPaymentStatusBadge = (paymentStatus) => {
    const { label, background, text } = getPaymentStatusStyle(paymentStatus);
    const colorClass = `${background} ${text}`;

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {label}
      </span>
    );
  };

  const filteredRentals = rentals.filter(rental => {
    return !searchTerm || 
      rental.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customer_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.vehicle?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.vehicle?.plate_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.id?.toString().includes(searchTerm);
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const formatVehicleName = (vehicle) => {
    if (!vehicle) return 'Unknown Vehicle';
    
    const parts = [];
    if (vehicle.name) parts.push(vehicle.name);
    if (vehicle.model) parts.push(vehicle.model);
    
    return parts.length > 0 ? parts.join(' ') : 'Unknown Vehicle';
  };

  const formatPlateNumber = (plateNumber) => {
    if (!plateNumber) return 'N/A';
    return plateNumber.toUpperCase();
  };

  const formatRentalId = (rental) => {
    if (rental.rental_id) {
      return rental.rental_id;
    }
    
    const date = new Date(rental.created_at || Date.now());
    const year = date.getFullYear();
    const idPart = String(rental.id).slice(-3).padStart(3, '0');
    return `RNT-${year}-${idPart}`;
  };
  
  const handleFilterChange = (setter, filterName, value) => {
    setter(value);
    const newParams = new URLSearchParams(location.search);
    if (value === 'all') {
      newParams.delete(filterName);
    } else {
      newParams.set(filterName, value);
    }
    navigate(`${location.pathname}?${newParams.toString()}`, { replace: true });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading rentals...</p>
          <p className="text-sm text-gray-500 mt-1">Applying filters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-4xl mb-4">❌</div>
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <AvailabilityAwareRentalForm
          onSuccess={handleRentalSuccess}
          onCancel={() => {
            setShowForm(false);
            setEditingRental(null);
          }}
          initialData={editingRental}
          mode={editingRental ? 'edit' : 'create'}
        />
      </div>
    );
  }

  if (showStepperForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <EnhancedStepperRentalForm
          mode={editingRental ? "edit" : "create"}
          onSuccess={handleRentalSuccess}
          onCancel={() => {
            setShowStepperForm(false);
            setEditingRental(null);
          }}
          initialData={editingRental}
          isLoading={loading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rental Management</h1>
              <p className="text-gray-600 mt-2">
                
              </p>
            </div>
            
            {/* Desktop Button */}
            <button
              onClick={() => setShowStepperForm(true)}
              className="hidden sm:flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-md hover:shadow-lg font-medium"
            >
              <Plus className="w-5 h-5" />
              <span>Create New Rental</span>
            </button>
          </div>
        </div>

        {/* Mobile Floating Action Button */}
        <button
          onClick={() => setShowStepperForm(true)}
          className="sm:hidden fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-4 bg-blue-600 text-white rounded-full hover:bg-blue-700 active:bg-blue-800 transition-all shadow-lg hover:shadow-xl font-medium"
          aria-label="Create New Rental"
        >
          <Plus className="w-6 h-6" />
          <span className="text-sm font-semibold">Create New Rental</span>
        </button>

        {availabilityData.length > 0 && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-sm border">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Vehicle Availability Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {['available', 'rented', 'reserved', 'maintenance'].map(status => {
                const count = availabilityData.filter(v => v.current_status === status).length;
                const config = VehicleAvailabilityService.getStatusBadgeConfig(status);
                return (
                  <div key={status} className="text-center">
                    <div className={`text-2xl font-bold ${config.className.includes('green') ? 'text-green-600' : 
                      config.className.includes('red') ? 'text-red-600' : 
                      config.className.includes('yellow') ? 'text-yellow-600' : 'text-gray-600'}`}>
                      {count}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">{status}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search by rental ID, customer name, email, vehicle, or plate number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => handleFilterChange(setStatusFilter, 'status', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="scheduled">Scheduled</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div>
              <select
                value={paymentStatusFilter}
                onChange={(e) => handleFilterChange(setPaymentStatusFilter, 'paymentStatus', e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Payment Statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg border transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                title="List View"
              >
                <List className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-2 rounded-lg border transition-colors ${
                  viewMode === 'table' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                title="Box View"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg border transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
                title="Compact Grid View"
              >
                <LayoutGrid className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {viewMode === 'list' ? (
          // LIST VIEW (Original Table)
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600 mb-4">
                  {rentals.length === 0 ? 'No rentals found' : 'No rentals match your filters'}
                </p>
                <button
                  onClick={() => setShowStepperForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Rental
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rental ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Plate Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rental Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredRentals.map((rental) => {
                      const canStartContract = isPaymentSufficientForStart(rental);
                      const isImmutable = rental.rental_status === 'active' || rental.rental_status === 'completed';
                      
                      return (
                        <tr key={rental.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleViewRental(rental)}
                              className="text-blue-600 hover:text-blue-900 hover:underline font-mono font-medium"
                              title="Click to view rental details"
                            >
                              {formatRentalId(rental)}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {rental.customer_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {rental.customer_email}
                              </div>
                              <div className="mt-1">
                                <button
                                  onClick={() => handleViewCustomerDetails(rental)}
                                  className="text-xs text-blue-600 hover:text-blue-900 hover:underline font-medium"
                                  title="View customer details"
                                >
                                  View Customer Details
                                </button>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatVehicleName(rental.vehicle)}
                            </div>
                            <div className="text-sm text-gray-500">
                              ID: {rental.vehicle_id}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                              {formatPlateNumber(rental.vehicle?.plate_number)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(rental.rental_start_date)}
                            </div>
                            <div className="text-sm text-gray-500">
                              to {formatDate(rental.rental_end_date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(rental.rental_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getPaymentStatusBadge(rental.payment_status)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{rental.total_amount ? `${rental.total_amount} MAD` : 'N/A'}</span>
                              {rental.approval_status === 'pending' && rental.pending_total_request && (
                                <span 
                                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-300"
                                  title={`Pending approval for ${rental.pending_total_request} MAD`}
                                >
                                  <Clock className="w-3 h-3" />
                                  Pending
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleViewRental(rental)}
                                className="text-indigo-600 hover:text-indigo-900 font-medium"
                                title="View enhanced rental details"
                              >
                                Details
                              </button>
                              <button
                                onClick={() => {
                                  setEditingRental(rental);
                                  setShowStepperForm(true);
                                }}
                                className={`text-blue-600 hover:text-blue-900 ${isImmutable ? 'text-gray-400 cursor-not-allowed opacity-50' : ''}`}
                                title={isImmutable ? "Cannot edit active or completed rentals" : "Edit rental"}
                                disabled={isImmutable}
                              >
                                Edit
                              </button>
                              
                              {rental.rental_status === 'scheduled' && (
                                <button
                                  onClick={() => handleStartContract(rental)}
                                  disabled={!canStartContract}
                                  className={`${
                                    canStartContract
                                      ? 'text-green-600 hover:text-green-900 cursor-pointer'
                                      : 'text-gray-400 cursor-not-allowed opacity-50'
                                  }`}
                                  title={
                                    canStartContract
                                      ? 'Start contract with video check-in'
                                      : 'Payment must be "Paid" to start condition check'
                                  }
                                >
                                  Start
                                </button>
                              )}
                              
                              {rental.rental_status === 'active' && (
                                <button
                                  onClick={() => handleCloseContract(rental)}
                                  className="text-orange-600 hover:text-orange-900"
                                  title="Complete rental with closing video (same as Complete Now)"
                                >
                                  Close
                                </button>
                              )}
                              
                              {canDelete() && (
                                <button
                                  onClick={() => handleDeleteRental(rental.id)}
                                  className={`text-red-600 hover:text-red-900 ${isImmutable ? 'text-gray-400 cursor-not-allowed opacity-50' : ''}`}
                                  title={isImmutable ? "Cannot delete active or completed rentals" : "Delete rental"}
                                  disabled={isImmutable}
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          // TABLE/BOX VIEW
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600 mb-4">
                  {rentals.length === 0 ? 'No rentals found' : 'No rentals match your filters'}
                </p>
                <button
                  onClick={() => setShowStepperForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Rental
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                {filteredRentals.map((rental) => {
                  const canStartContract = isPaymentSufficientForStart(rental);
                  const isImmutable = rental.rental_status === 'active' || rental.rental_status === 'completed';
                  
                  return (
                    <div key={rental.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                      {/* Header with Rental ID and Status */}
                      <div className="flex justify-between items-start mb-3 pb-3 border-b border-gray-100">
                        <button
                          onClick={() => handleViewRental(rental)}
                          className="text-blue-600 hover:text-blue-900 hover:underline font-mono font-bold text-sm"
                          title="Click to view rental details"
                        >
                          {formatRentalId(rental)}
                        </button>
                        {getStatusBadge(rental.rental_status)}
                      </div>

                      {/* Customer Info */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Customer</div>
                        <div className="text-sm font-medium text-gray-900">{rental.customer_name}</div>
                        <button
                          onClick={() => handleViewCustomerDetails(rental)}
                          className="text-xs text-blue-600 hover:text-blue-900 hover:underline mt-1"
                        >
                          View Details
                        </button>
                      </div>

                      {/* Vehicle Info */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Vehicle</div>
                        <div className="text-sm font-medium text-gray-900">{formatVehicleName(rental.vehicle)}</div>
                      </div>

                      {/* Plate Number */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Plate Number</div>
                        <div className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded inline-block">
                          {formatPlateNumber(rental.vehicle?.plate_number)}
                        </div>
                      </div>

                      {/* Rental Period */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Rental Period</div>
                        <div className="text-sm text-gray-900">
                          {formatDate(rental.rental_start_date)} - {formatDate(rental.rental_end_date)}
                        </div>
                      </div>

                      {/* Payment Status */}
                      <div className="mb-3">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Payment Status</div>
                        {getPaymentStatusBadge(rental.payment_status)}
                      </div>

                      {/* Amount */}
                      <div className="mb-4">
                        <div className="text-xs text-gray-500 uppercase font-semibold mb-1">Amount</div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {rental.total_amount ? `${rental.total_amount} MAD` : 'N/A'}
                          </span>
                          {rental.approval_status === 'pending' && rental.pending_total_request && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-50 text-yellow-700 border border-yellow-300"
                              title={`Pending approval for ${rental.pending_total_request} MAD`}
                            >
                              <Clock className="w-3 h-3" />
                              Pending
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => handleViewRental(rental)}
                          className="px-3 py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded transition-colors"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => {
                            setEditingRental(rental);
                            setShowStepperForm(true);
                          }}
                          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                            isImmutable 
                              ? 'text-gray-400 cursor-not-allowed' 
                              : 'text-blue-600 hover:text-blue-900 hover:bg-blue-50'
                          }`}
                          disabled={isImmutable}
                          title={isImmutable ? "Cannot edit active or completed rentals" : "Edit rental"}
                        >
                          Edit
                        </button>
                        
                        {rental.rental_status === 'scheduled' && (
                          <button
                            onClick={() => handleStartContract(rental)}
                            disabled={!canStartContract}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                              canStartContract
                                ? 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                : 'text-gray-400 cursor-not-allowed'
                            }`}
                            title={
                              canStartContract
                                ? 'Start contract with video check-in'
                                : 'Payment must be "Paid" to start'
                            }
                          >
                            Start
                          </button>
                        )}
                        
                        {rental.rental_status === 'active' && (
                          <button
                            onClick={() => handleCloseContract(rental)}
                            className="px-3 py-1.5 text-xs font-medium text-orange-600 hover:text-orange-900 hover:bg-orange-50 rounded transition-colors"
                          >
                            Close
                          </button>
                        )}
                        
                        {canDelete() && (
                          <button
                            onClick={() => handleDeleteRental(rental.id)}
                            className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                              isImmutable 
                                ? 'text-gray-400 cursor-not-allowed' 
                                : 'text-red-600 hover:text-red-900 hover:bg-red-50'
                            }`}
                            disabled={isImmutable}
                            title={isImmutable ? "Cannot delete active or completed rentals" : "Delete rental"}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          // COMPACT GRID VIEW - New professional mobile-optimized view
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {filteredRentals.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📝</div>
                <p className="text-gray-600 mb-4">
                  {rentals.length === 0 ? 'No rentals found' : 'No rentals match your filters'}
                </p>
                <button
                  onClick={() => setShowStepperForm(true)}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create First Rental
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-3">
                {filteredRentals.map((rental) => {
                  const canStartContract = isPaymentSufficientForStart(rental);
                  const isImmutable = rental.rental_status === 'active' || rental.rental_status === 'completed';
                  
                  return (
                    <div 
                      key={rental.id} 
                      className="border border-gray-200 rounded-lg p-3 hover:shadow-lg transition-all bg-gradient-to-br from-white to-gray-50 hover:border-blue-300"
                    >
                      {/* Compact Header */}
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200">
                        <button
                          onClick={() => handleViewRental(rental)}
                          className="text-blue-600 hover:text-blue-800 font-mono font-bold text-xs truncate max-w-[60%]"
                          title={formatRentalId(rental)}
                        >
                          {formatRentalId(rental)}
                        </button>
                        <div className="flex items-center gap-1">
                          {getStatusBadge(rental.rental_status)}
                        </div>
                      </div>

                      {/* Compact Info Grid */}
                      <div className="space-y-2 text-xs">
                        {/* Customer */}
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 font-semibold min-w-[50px]">👤</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{rental.customer_name}</div>
                            <button
                              onClick={() => handleViewCustomerDetails(rental)}
                              className="text-blue-600 hover:text-blue-800 text-[10px] underline"
                            >
                              Details
                            </button>
                          </div>
                        </div>

                        {/* Vehicle & Plate */}
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 font-semibold min-w-[50px]">🚗</span>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 truncate">{formatVehicleName(rental.vehicle)}</div>
                            <div className="font-mono text-[10px] bg-gray-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              {formatPlateNumber(rental.vehicle?.plate_number)}
                            </div>
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-start gap-2">
                          <span className="text-gray-500 font-semibold min-w-[50px]">📅</span>
                          <div className="flex-1 min-w-0 text-[10px] text-gray-700">
                            <div>{formatDate(rental.rental_start_date)}</div>
                            <div className="text-gray-500">to {formatDate(rental.rental_end_date)}</div>
                          </div>
                        </div>

                        {/* Payment Info */}
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center gap-1">
                            {getPaymentStatusBadge(rental.payment_status)}
                          </div>
                          <div className="font-bold text-gray-900 text-xs whitespace-nowrap">
                            {rental.total_amount ? `${rental.total_amount} MAD` : 'N/A'}
                          </div>
                        </div>

                        {rental.approval_status === 'pending' && rental.pending_total_request && (
                          <div className="flex items-center gap-1 text-[10px] text-yellow-700 bg-yellow-50 px-2 py-1 rounded">
                            <Clock className="w-3 h-3" />
                            <span>Pending: {rental.pending_total_request} MAD</span>
                          </div>
                        )}
                      </div>

                      {/* Compact Actions */}
                      <div className="flex flex-wrap gap-1 mt-3 pt-2 border-t border-gray-100">
                        <button
                          onClick={() => handleViewRental(rental)}
                          className="flex-1 px-2 py-1 text-[10px] font-medium text-indigo-600 hover:text-white hover:bg-indigo-600 border border-indigo-600 rounded transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            setEditingRental(rental);
                            setShowStepperForm(true);
                          }}
                          className={`flex-1 px-2 py-1 text-[10px] font-medium border rounded transition-colors ${
                            isImmutable 
                              ? 'text-gray-400 border-gray-300 cursor-not-allowed' 
                              : 'text-blue-600 hover:text-white hover:bg-blue-600 border-blue-600'
                          }`}
                          disabled={isImmutable}
                        >
                          Edit
                        </button>
                        
                        {rental.rental_status === 'scheduled' && (
                          <button
                            onClick={() => handleStartContract(rental)}
                            disabled={!canStartContract}
                            className={`flex-1 px-2 py-1 text-[10px] font-medium border rounded transition-colors ${
                              canStartContract
                                ? 'text-green-600 hover:text-white hover:bg-green-600 border-green-600'
                                : 'text-gray-400 border-gray-300 cursor-not-allowed'
                            }`}
                          >
                            Start
                          </button>
                        )}
                        
                        {rental.rental_status === 'active' && (
                          <button
                            onClick={() => handleCloseContract(rental)}
                            className="flex-1 px-2 py-1 text-[10px] font-medium text-orange-600 hover:text-white hover:bg-orange-600 border border-orange-600 rounded transition-colors"
                          >
                            Close
                          </button>
                        )}
                        
                        {canDelete() && (
                          <button
                            onClick={() => handleDeleteRental(rental.id)}
                            className={`flex-1 px-2 py-1 text-[10px] font-medium border rounded transition-colors ${
                              isImmutable 
                                ? 'text-gray-400 border-gray-300 cursor-not-allowed' 
                                : 'text-red-600 hover:text-white hover:bg-red-600 border-red-600'
                            }`}
                            disabled={isImmutable}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <div className="text-3xl font-bold text-blue-600">{rentals.length}</div>
            <div className="text-gray-600">Total Rentals</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <div className="text-3xl font-bold text-green-600">
              {rentals.filter(r => r.rental_status === 'active').length}
            </div>
            <div className="text-gray-600">Active Rentals</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border text-center">
            <div className="text-3xl font-bold text-yellow-600">
              {rentals.filter(r => r.rental_status === 'scheduled').length}
            </div>
            <div className="text-gray-600">Scheduled Rentals</div>
          </div>
        </div>
      </div>

      {videoContractModal.isOpen && (
        <VideoContractModal
          rental={videoContractModal.rental}
          type={videoContractModal.type}
          onClose={() => setVideoContractModal({ isOpen: false, rental: null, type: null })}
          onSuccess={handleVideoContractSuccess}
        />
      )}

      <ViewCustomerDetailsDrawer
        isOpen={customerDetailsDrawer.isOpen}
        onClose={() => setCustomerDetailsDrawer({ isOpen: false, customerId: null, rental: null })}
        customerId={customerDetailsDrawer.customerId}
        rental={customerDetailsDrawer.rental}
      />
    </div>
  );
};

export default Rentals;
