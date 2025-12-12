import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Search, Plus, ChevronDown, ChevronUp, Calendar, Clock, Filter, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fetchAllBookings, createBooking, updateBooking, deleteBooking } from '../../store/slices/bookingsSlice';
import { fetchTours, selectAllTours } from '../../store/slices/toursSlice';
import { fetchVehicles } from '../../store/slices/vehiclesSlice';
import BookingModal from '../../components/admin/BookingModal';
import BookingDetailsModal from '../../components/admin/BookingDetailsModal';
import BookingDeleteModal from '../../components/admin/BookingDeleteModal';

const ToursBookings = () => {
  const dispatch = useDispatch();
  const { items: bookingsItems = [], loading, error } = useSelector(state => state.bookings || { items: [] });
  const bookings = bookingsItems || []; // Ensure bookings is always an array
  const tours = useSelector(selectAllTours) || [];
  
  // Local state for UI management
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedTourId, setSelectedTourId] = useState('');
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [selectedTourPackage, setSelectedTourPackage] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  // Filter options
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'on_tour', label: 'Currently On Tour' },
  ];
  
  // Fetch bookings and related data on component mount and when refreshTrigger changes
  useEffect(() => {
    console.log('🔄 Fetching bookings data...');
    dispatch(fetchAllBookings())
      .then(action => {
        console.log('📋 Bookings fetched:', action.payload);
      })
      .catch(error => {
        console.error('❌ Error fetching bookings:', error);
      });
    dispatch(fetchTours());
    dispatch(fetchVehicles());
  }, [dispatch, refreshTrigger]);
  
  // Filter bookings based on search term and filters (with proper null checks)
  const filteredBookings = Array.isArray(bookings) ? bookings.filter(booking => {
    if (!booking) return false;
    
    // Apply search term filter
    const searchMatches = !searchTerm || 
      (booking.customerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (booking.customerEmail?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (booking.tourName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (booking.id?.toString().toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    // Apply status filter
    const statusMatches = 
      statusFilter === 'all' || 
      (booking.status?.toLowerCase() === statusFilter.toLowerCase());
    
    // Apply date filter
    const dateMatches = 
      !dateFilter || 
      (booking.tourDate === dateFilter || booking.selectedDate === dateFilter);
    
    // Apply tour filter
    const tourMatches = 
      !selectedTourId || 
      booking.tourId === selectedTourId || 
      booking.tourPackageId === selectedTourId;
    
    return searchMatches && statusMatches && dateMatches && tourMatches;
  }) : [];
  
  // Handle opening the booking modal for a new booking
  const handleNewBooking = (tourId) => {
    const selectedTour = tours.find(tour => tour.id === tourId);
    setSelectedTourPackage(selectedTour);
    setSelectedBooking(null);
    setIsBookingModalOpen(true);
  };
  
  // Handle opening the booking details modal
  const handleViewBookingDetails = (booking) => {
    setSelectedBooking(booking);
    setIsDetailsModalOpen(true);
  };
  
  // Handle editing a booking
  const handleEditBooking = (booking) => {
    const selectedTour = tours.find(tour => tour.id === booking.tourPackageId || tour.id === booking.tourId);
    setSelectedTourPackage(selectedTour);
    setSelectedBooking(booking);
    setIsDetailsModalOpen(false); // Close details modal first
    setIsBookingModalOpen(true);
  };
  
  // Handle deleting a booking
  const handleDeleteBooking = (booking) => {
    setSelectedBooking(booking);
    setIsDetailsModalOpen(false); // Close details modal first
    setIsDeleteModalOpen(true);
  };
  
  // Handle saving a booking (new or updated)
  const handleSaveBooking = async (bookingData) => {
    try {
      console.log('Saving booking:', bookingData);
      let result;
      
      if (bookingData.id) {
        // Update existing booking
        result = await dispatch(updateBooking({ 
          id: bookingData.id, 
          bookingData 
        })).unwrap();
        console.log('Updated booking result:', result);
      } else {
        // Create new booking
        result = await dispatch(createBooking(bookingData)).unwrap();
        console.log('Created new booking result:', result);
      }
      
      // Refresh bookings data
      setRefreshTrigger(prev => prev + 1);
      
      // Close modal
      setIsBookingModalOpen(false);
      
      return result;
    } catch (error) {
      console.error('Failed to save booking:', error);
      throw error;
    }
  };

  // Handle confirm delete booking
  const handleConfirmDelete = async (bookingId) => {
    try {
      console.log('Deleting booking:', bookingId);
      
      // Use the Redux action to delete the booking
      const result = await dispatch(deleteBooking(bookingId)).unwrap();
      console.log('Delete booking result:', result);
      
      // Refresh bookings data
      setRefreshTrigger(prev => prev + 1);
      
      // Close modal
      setIsDeleteModalOpen(false);
    } catch (error) {
      console.error('Failed to delete booking:', error);
    }
  };
  
  // Group bookings by date for better organization (with null checks)
  const groupedBookings = Array.isArray(filteredBookings) ? filteredBookings.reduce((groups, booking) => {
    if (!booking) return groups;
    const date = booking.tourDate || booking.selectedDate || 'Unscheduled';
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(booking);
    return groups;
  }, {}) : {};
  
  // Sort dates in chronological order (with proper null check)
  const sortedDates = Object.keys(groupedBookings || {}).sort((a, b) => {
    if (a === 'Unscheduled') return 1;
    if (b === 'Unscheduled') return -1;
    try {
      return new Date(a) - new Date(b);
    } catch (e) {
      console.error('Error sorting dates:', e);
      return 0;
    }
  });
  
  // Get status class for styling
  const getStatusClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'on_tour':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Reset filters
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('');
    setSelectedTourId('');
  };
  
  // Manual refresh of data
  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };
  
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <h1 className="text-2xl font-bold mb-4 md:mb-0">Tours & Bookings Management</h1>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <button 
            onClick={handleRefresh}
            className="flex items-center justify-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
          
          <button 
            onClick={() => handleNewBooking(selectedTourId)}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </button>
        </div>
      </div>
      
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search bookings by name, email, or tour..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {showFilters ? (
                  <ChevronUp className="ml-2 h-4 w-4" />
                ) : (
                  <ChevronDown className="ml-2 h-4 w-4" />
                )}
              </button>
              
              {(searchTerm || statusFilter !== 'all' || dateFilter || selectedTourId) && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 border border-gray-300 rounded-md bg-white hover:bg-gray-50 text-sm"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tour Date
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="date"
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tour Package
                </label>
                <select
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedTourId}
                  onChange={(e) => setSelectedTourId(e.target.value)}
                >
                  <option value="">All Packages</option>
                  {tours.map(tour => (
                    <option key={tour.id} value={tour.id}>
                      {tour.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          {/* Filter Status */}
          {filteredBookings.length > 0 && (
            <div className="mt-4 text-sm text-gray-500">
              Showing {filteredBookings.length} of {bookings.length} bookings
              {statusFilter !== 'all' && ` - Status: ${statusOptions.find(o => o.value === statusFilter)?.label}`}
              {dateFilter && ` - Date: ${format(new Date(dateFilter), 'MMM d, yyyy')}`}
              {selectedTourId && ` - Tour: ${tours.find(t => t.id === selectedTourId)?.name}`}
            </div>
          )}
        </div>
      </div>
      
      {/* Booking List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-700 mx-auto"></div>
            <p className="mt-3 text-gray-600">Loading bookings...</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No bookings found matching your criteria.</p>
            {(searchTerm || statusFilter !== 'all' || dateFilter || selectedTourId) && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 text-sm bg-gray-100 text-blue-600 rounded-md hover:bg-gray-200"
              >
                Clear Filters
              </button>
            )}
          </div>
        ) : (
          <div>
            {sortedDates.map(date => (
              <div key={date} className="border-b last:border-b-0">
                <div className="bg-gray-50 px-6 py-3">
                  <h2 className="text-sm font-medium text-gray-700">
                    {date === 'Unscheduled' ? (
                      'Unscheduled Bookings'
                    ) : (
                      <>
                        <span>Bookings for </span>
                        <span className="font-bold">
                          {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                        </span>
                        <span className="ml-2 bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2.5 py-0.5">
                          {groupedBookings[date].length} bookings
                        </span>
                      </>
                    )}
                  </h2>
                </div>
                
                <div className="divide-y divide-gray-200">
                  {groupedBookings[date].map(booking => (
                    <div 
                      key={booking.id} 
                      className="px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleViewBookingDetails(booking)}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between">
                        <div className="flex flex-col mb-2 md:mb-0">
                          <div className="flex items-center">
                            <h3 className="text-base font-semibold text-gray-900">
                              {booking.customerName || 'Unnamed Customer'}
                            </h3>
                            <span className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClass(booking.status)}`}>
                              {booking.status || 'Unknown Status'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            {booking.tourName || booking.tourPackageName || 'No tour specified'}
                            {booking.tourLocation && <span className="ml-2 text-gray-500">📍 {booking.tourLocation}</span>}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex items-center text-sm text-gray-700">
                              <Clock className="h-4 w-4 mr-1" />
                              {booking.tourTime || booking.selectedTime || 'No time set'}
                            </div>
                            <p className="text-sm text-gray-600">
                              {booking.quadCount || 1} quad{(booking.quadCount || 1) > 1 ? 's' : ''}
                              {booking.totalParticipants ? `, ${booking.totalParticipants} people` : ''}
                            </p>
                          </div>
                          
                          <div className="hidden md:block w-6 h-6">
                            <ChevronDown className="w-6 h-6 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            <p>Error loading bookings: {error}</p>
            <button 
              onClick={handleRefresh}
              className="mt-2 px-4 py-1 text-sm bg-white border border-red-300 text-red-500 rounded hover:bg-red-50"
            >
              Retry
            </button>
          </div>
        )}
      </div>
      
      {/* Booking Modal - for creating and editing bookings */}
      <BookingModal 
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        booking={selectedBooking}
        onSave={handleSaveBooking}
        selectedTourPackage={selectedTourPackage}
      />
      
      {/* Booking Details Modal - for viewing booking details */}
      <BookingDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        booking={selectedBooking}
        onEdit={() => {
          setIsDetailsModalOpen(false);
          handleEditBooking(selectedBooking);
        }}
        onDelete={() => handleDeleteBooking(selectedBooking)}
      />
      
      {/* Booking Delete Confirmation Modal */}
      <BookingDeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        booking={selectedBooking}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
};

export default ToursBookings;