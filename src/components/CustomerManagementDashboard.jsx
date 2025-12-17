import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Link } from 'react-router-dom';
import {
  Users,
  Search,
  Trash2,
  CheckCircle,
  Download,
} from 'lucide-react';
import CustomerService from '../services/EnhancedUnifiedCustomerService';
import ViewCustomerDetailsDrawer from './admin/ViewCustomerDetailsDrawer';

// Hardcoded Supabase credentials
const SUPABASE_URL = 'https://nnaymteoxvdnsnhlyvkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYXltdGVveHZkbnNuaGx5dmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MjcwMzYsImV4cCI6MjA2NTQwMzAzNn0.L7CLWRSqOq91Lz0zRq6ddRLyEN6lBgewtcfGaqLiceM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const APP_ID = '4c3a7a6153';

const BulkDeleteConfirmationModal = ({ isOpen, onClose, onConfirm, selectedCount }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3 text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <h3 className="text-lg leading-6 font-medium text-gray-900 mt-2">Confirm Bulk Deletion</h3>
          <div className="mt-2 px-7 py-3">
            <p className="text-sm text-gray-500">
              Are you sure you want to delete <strong>{selectedCount}</strong> selected customer(s)? This action cannot be undone.
            </p>
          </div>
          <div className="flex justify-center space-x-3 px-4 py-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors duration-200 flex items-center"
            >
              Delete Selected
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const CustomerManagementDashboard = () => {
  const [customers, setCustomers] = useState([]);
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [nationalityFilter, setNationalityFilter] = useState('All');
  
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [fullPageViewOpen, setFullPageViewOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const headerCheckboxRef = useRef(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [customersResponse, rentalsResponse] = await Promise.all([
        supabase.from(`app_${APP_ID}_customers`).select('*'),
        supabase.from(`app_${APP_ID}_rentals`).select(`*, vehicle:app_${APP_ID}_vehicles(*)`),
      ]);

      if (customersResponse.error) {
        throw new Error(`Customer fetch failed: ${customersResponse.error.message}`);
      }
      setCustomers(customersResponse.data || []);

      if (rentalsResponse.error) {
        console.error('Error fetching rentals with vehicles:', rentalsResponse.error.message);
        setRentals([]);
      } else {
        setRentals(rentalsResponse.data || []);
      }
      
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
      setCustomers([]);
      setRentals([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomer = async () => {
    try {
      setActionLoading(true);
      setError(null);

      const { error } = await supabase
        .from(`app_${APP_ID}_customers`)
        .update(editFormData)
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      setEditModalOpen(false);
      setSelectedCustomer(null);
      setEditFormData({});
      await fetchData();
    } catch (err) {
      setError(err.message);
      console.error('Error updating customer:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCustomer = async () => {
    try {
        setActionLoading(true);
        setError(null);

        const customerToDelete = selectedCustomer;
        const historyResult = await CustomerService.checkCustomerRentalHistory(customerToDelete.id);

        if (historyResult.hasHistory) {
            alert(`Cannot delete customer ${customerToDelete.full_name} as they have a rental history.`);
            setDeleteModalOpen(false);
            return;
        }

        const result = await CustomerService.deleteCustomer(customerToDelete.id);

        if (result.success) {
            setDeleteModalOpen(false);
            setSelectedCustomer(null);
            await fetchData();
        } else {
            throw new Error(result.error);
        }
    } catch (err) {
        setError(err.message);
        console.error('Error deleting customer:', err);
    } finally {
        setActionLoading(false);
    }
};

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setNationalityFilter('All');
  };

  const aggregatedData = useMemo(() => {
    // Step 1: Create a map of rentals grouped by customer_id for efficient lookup.
    const rentalsByCustomerId = new Map();
    rentals.forEach(rental => {
        if (!rental.customer_id) return;
        if (!rentalsByCustomerId.has(rental.customer_id)) {
            rentalsByCustomerId.set(rental.customer_id, []);
        }
        rentalsByCustomerId.get(rental.customer_id).push(rental);
    });

    // Step 2: Process each customer from the raw customer list.
    const consolidatedProfiles = customers.map(customer => {
        const customerRentals = rentalsByCustomerId.get(customer.id) || [];

        // Process rental history with vehicle data.
        const rentalHistoryWithVehicles = customerRentals.map(rental => {
            const vehicle = rental.vehicle;
            return {
                ...rental,
                vehicle_model: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Vehicle data not found',
                vehicle_plate_number: vehicle ? vehicle.plate_number : 'Unknown plate',
            };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // De-duplicate all documents associated with this customer.
        const allDocs = new Set();
        [customer, ...customerRentals].forEach(item => {
            if (item.id_scan_url) allDocs.add(item.id_scan_url);
            if (item.customer_id_image) allDocs.add(item.customer_id_image);
            if (Array.isArray(item.extra_images)) {
                item.extra_images.forEach(img => allDocs.add(img));
            }
        });
        
        const totalSpent = rentalHistoryWithVehicles.reduce((sum, rental) => sum + (rental.total_amount || 0), 0);
        const activeRentals = rentalHistoryWithVehicles.filter(r => r.status === 'active').length;

        return {
            ...customer,
            totalRentals: rentalHistoryWithVehicles.length,
            activeRentals,
            totalSpent,
            status: activeRentals > 0 ? 'Active' : 'Inactive',
            rentalHistory: rentalHistoryWithVehicles,
            all_docs: {
                // To ensure no duplicates in the modal, we put all unique URLs into one array.
                // The modal will render this single list.
                id_scan_urls: Array.from(allDocs),
                customer_id_images: [],
                extra_images: [],
            },
        };
    });

    // Step 3: De-duplicate the list of profiles by name to fix the "duplicate names" regression.
    // We choose the profile with the most rentals (or most recent) as the "primary" one.
    const profileGroupsByName = new Map();
    consolidatedProfiles.forEach(profile => {
        const name = profile.full_name?.trim().toLowerCase();
        if (!name) return; // Ignore profiles without a name for this de-duplication

        const existing = profileGroupsByName.get(name);
        if (!existing || profile.totalRentals > existing.totalRentals || (profile.totalRentals === existing.totalRentals && new Date(profile.created_at) > new Date(existing.created_at))) {
            profileGroupsByName.set(name, profile);
        }
    });
    const uniqueCustomerProfiles = Array.from(profileGroupsByName.values());


    // Step 4: Filter the de-duplicated and consolidated profiles.
    let filteredCustomers = uniqueCustomerProfiles.filter(customer => {
        const matchesSearch = !searchTerm ||
            (customer.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || customer.status === statusFilter;
        const matchesNationality = nationalityFilter === 'All' ||
            (customer.nationality || '').toLowerCase() === nationalityFilter.toLowerCase();
        return matchesSearch && matchesStatus && matchesNationality;
    });

    filteredCustomers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Step 5: Calculate summary statistics.
    const totalUniqueCustomers = uniqueCustomerProfiles.length;
    const totalActiveRentals = rentals.filter(rental => rental.status === 'active').length;
    const totalRevenue = rentals.reduce((sum, rental) => sum + (rental.total_amount || 0), 0);

    return {
        customers: filteredCustomers,
        summary: {
            totalCustomers: totalUniqueCustomers,
            totalActiveRentals,
            totalRevenue
        }
    };
  }, [customers, rentals, searchTerm, statusFilter, nationalityFilter]);

  const availableNationalities = useMemo(() => {
    const nationalities = customers
      .map(customer => customer.nationality)
      .filter(nationality => nationality && nationality.trim() !== '')
      .filter((nationality, index, arr) => arr.indexOf(nationality) === index)
      .sort();
    return nationalities;
  }, [customers]);

  useEffect(() => {
    fetchData();
  }, []);

  const eligibleForSelectionCount = useMemo(() => {
    return aggregatedData.customers.filter(c => c.totalRentals === 0).length;
  }, [aggregatedData.customers]);

  useEffect(() => {
    if (headerCheckboxRef.current) {
      const selectedCount = selectedCustomerIds.length;
      headerCheckboxRef.current.checked = selectedCount > 0 && selectedCount === eligibleForSelectionCount;
      headerCheckboxRef.current.indeterminate = selectedCount > 0 && selectedCount < eligibleForSelectionCount;
    }
  }, [selectedCustomerIds, eligibleForSelectionCount]);

  const getInitial = (name) => {
    return name ? name.charAt(0).toUpperCase() : '?';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ar-MA', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const openViewModal = (customer) => {
    setSelectedCustomer(customer);
    setViewModalOpen(true);
  };

  const openFullPageView = (customer) => {
    setSelectedCustomer(customer);
    setFullPageViewOpen(true);
  };

  const openEditModal = (customer) => {
    setSelectedCustomer(customer);
    setEditFormData({
      full_name: customer.full_name || '',
      email: customer.email || '',
      phone: customer.phone || '',
      nationality: customer.nationality || '',
      address: customer.address || '',
      date_of_birth: customer.date_of_birth || '',
      licence_number: customer.licence_number || '',
      id_number: customer.id_number || '',
      place_of_birth: customer.place_of_birth || ''
    });
    setEditModalOpen(true);
  };

  const openDeleteModal = (customer) => {
    setSelectedCustomer(customer);
    setDeleteModalOpen(true);
  };

  const handleSelectCustomer = (customerId) => {
    setSelectedCustomerIds(prev =>
      prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allEligibleIds = aggregatedData.customers
        .filter(c => c.totalRentals === 0)
        .map(c => c.id);
      setSelectedCustomerIds(allEligibleIds);
    } else {
      setSelectedCustomerIds([]);
    }
  };

  const confirmBulkDelete = async () => {
    const result = await CustomerService.deleteCustomers(selectedCustomerIds);
    if (result.success) {
      setShowBulkDeleteModal(false);
      setSelectedCustomerIds([]);
      await fetchData();
    } else {
      alert(`Error deleting customers: ${result.error}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (fullPageViewOpen && selectedCustomer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <button
                onClick={() => setFullPageViewOpen(false)}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Dashboard
              </button>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Customer Profile: {selectedCustomer.full_name}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">ID Document Scans</h2>
                {selectedCustomer.all_docs.id_scan_urls.length > 0 ? (
                  <div className="space-y-4">
                  {selectedCustomer.all_docs.id_scan_urls.map((url, i) => <img key={i} src={url} alt={`ID Scan ${i + 1}`} className="w-full rounded-lg border border-gray-300" />)}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center"><p className="text-gray-500">No ID scans</p></div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">ID Documents</h2>
                {selectedCustomer.all_docs.customer_id_images.length > 0 ? (
                  <div className="space-y-4">
                  {selectedCustomer.all_docs.customer_id_images.map((url, i) => <img key={i} src={url} alt={`ID Document ${i + 1}`} className="w-full rounded-lg border border-gray-300" />)}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center"><p className="text-gray-500">No ID documents</p></div>
                )}
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Documents</h2>
                {selectedCustomer.all_docs.extra_images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedCustomer.all_docs.extra_images.map((url, i) => <img key={i} src={url} alt={`Extra doc ${i + 1}`} className="w-full h-24 object-cover border rounded-lg cursor-pointer" onClick={() => window.open(url, '_blank')} />)}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center"><p className="text-gray-500">No additional documents</p></div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-600">Full Name:</span><p className="text-gray-900">{selectedCustomer.full_name || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-600">Customer ID:</span><p className="text-gray-900 text-xs break-all">{selectedCustomer.id}</p></div>
                  <div><span className="font-medium text-gray-600">Date of Birth:</span><p className="text-gray-900">{formatDate(selectedCustomer.date_of_birth)}</p></div>
                  <div><span className="font-medium text-gray-600">Place of Birth:</span><p className="text-gray-900">{selectedCustomer.place_of_birth || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-600">Nationality:</span><p className="text-gray-900">{selectedCustomer.nationality || 'N/A'}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div><span className="font-medium text-gray-600">Email:</span><p className="text-gray-900">{selectedCustomer.email || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-600">Phone:</span><p className="text-gray-900">{selectedCustomer.phone || 'N/A'}</p></div>
                  <div className="md:col-span-2"><span className="font-medium text-gray-600">Address:</span><p className="text-gray-900">{selectedCustomer.address || 'N/A'}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Rental History ({(selectedCustomer.rentalHistory || []).length} rentals)</h2>
                {(selectedCustomer.rentalHistory || []).length === 0 ? (
                  <p className="text-gray-500 text-sm">No rental history available.</p>
                ) : (
                  <div className="space-y-3">
                    {(selectedCustomer.rentalHistory || []).map((rental) => (
                      <div key={rental.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{rental.vehicle_model} - {rental.vehicle_plate_number}</p>
                            <Link to={`/admin/rentals/${rental.id}`} className="text-sm text-blue-600 hover:underline">
                              Rental ID: {rental.rental_id || rental.id}
                            </Link>
                          </div>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${rental.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{rental.status}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                          <div><span className="font-medium">Start:</span> {formatDate(rental.rental_start_date)}</div>
                          <div><span className="font-medium">End:</span> {formatDate(rental.rental_end_date)}</div>
                          <div><span className="font-medium">Amount:</span> {formatCurrency(rental.total_amount || 0)}</div>
                          <div><span className="font-medium">Booked:</span> {formatDate(rental.created_at)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-4 md:mb-0">Customer Management Dashboard</h1>
            <button onClick={fetchData} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center">
              {loading ? (<><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Loading...</>) : ('Refresh Data')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg"><Users className="w-6 h-6 text-blue-600" /></div>
                <div className="ml-4"><p className="text-sm font-medium text-gray-600">Total Customers</p><p className="text-2xl font-bold text-gray-900">{aggregatedData.summary.totalCustomers}</p></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="w-6 h-6 text-green-600" /></div>
                <div className="ml-4"><p className="text-sm font-medium text-gray-600">Active Rentals</p><p className="text-2xl font-bold text-gray-900">{aggregatedData.summary.totalActiveRentals}</p></div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg"><Download className="w-6 h-6 text-yellow-600" /></div>
                <div className="ml-4"><p className="text-sm font-medium text-gray-600">Total Revenue</p><p className="text-2xl font-bold text-gray-900">{formatCurrency(aggregatedData.summary.totalRevenue)}</p></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="flex-1 min-w-0">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                  <input type="text" placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div className="min-w-0">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="All">All Status</option><option value="Active">Active</option><option value="Inactive">Inactive</option>
                </select>
              </div>
              <div className="min-w-0">
                <select value={nationalityFilter} onChange={(e) => setNationalityFilter(e.target.value)} className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500">
                  <option value="All">All Nationalities</option>
                  {availableNationalities.map(nationality => (<option key={nationality} value={nationality}>{nationality}</option>))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button onClick={clearFilters} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors duration-200">Clear Filters</button>
              <div className="text-sm text-gray-600">Showing {aggregatedData.customers.length} of {customers.length} customers</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left"><input ref={headerCheckboxRef} type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" onChange={handleSelectAll} /></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nationality</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rentals</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Spent</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {aggregatedData.customers.map((customer) => (
                    <tr key={customer.id} className={`hover:bg-gray-50 ${selectedCustomerIds.includes(customer.id) ? 'bg-blue-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap"><input type="checkbox" className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50" checked={selectedCustomerIds.includes(customer.id)} onChange={() => handleSelectCustomer(customer.id)} disabled={customer.totalRentals > 0} /></td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10"><div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center"><span className="text-sm font-medium text-blue-800">{getInitial(customer.full_name)}</span></div></div>
                          <div className="ml-4"><button onClick={() => openFullPageView(customer)} className="text-sm font-medium text-blue-600 hover:text-blue-800 text-left">{customer.full_name}</button></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer.nationality || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{customer.email || 'N/A'}</div><div className="text-sm text-gray-500">{customer.phone || 'N/A'}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap"><div className="text-sm text-gray-900">{customer.totalRentals} Total</div><div className="text-sm text-gray-500">{customer.activeRentals} Active</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(customer.totalSpent)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${customer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{customer.status}</span></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button onClick={() => openViewModal(customer)} className="bg-blue-100 text-blue-700 hover:bg-blue-200 px-2 py-1 rounded text-xs font-medium transition-colors duration-200">View</button>
                          <button onClick={() => openEditModal(customer)} className="bg-green-100 text-green-700 hover:bg-green-200 px-2 py-1 rounded text-xs font-medium transition-colors duration-200">Edit</button>
                          <button onClick={() => openDeleteModal(customer)} className="bg-red-100 text-red-700 hover:bg-red-200 px-2 py-1 rounded text-xs font-medium transition-colors duration-200">Delete</button>
                        </div>
                      </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewModalOpen && selectedCustomer && (
        <ViewCustomerDetailsDrawer
          isOpen={viewModalOpen}
          onClose={() => setViewModalOpen(false)}
          customerId={selectedCustomer.id}
        />
      )}
    </div>
  );
};

export default CustomerManagementDashboard;