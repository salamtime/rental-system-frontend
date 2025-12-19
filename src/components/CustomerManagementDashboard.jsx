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
import CustomerService, { 
  checkCustomerRentalHistory, 
  deleteCustomer, 
  deleteCustomers,
} from '../services/EnhancedUnifiedCustomerService.js';
import ViewCustomerDetailsDrawer from './admin/ViewCustomerDetailsDrawer';

// Hardcoded Supabase credentials
const SUPABASE_URL = 'https://nnaymteoxvdnsnhlyvkk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5uYXltdGVveHZkbnNuaGx5dmtrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk4MjcwMzYsImV4cCI6MjA2NTQwMzAzNn0.L7CLWRSqOq91Lz0zRq6ddRLyEN6lBgewtcfGaqLiceM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const APP_ID = '4c3a7a6153';

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
  const [detailedCustomer, setDetailedCustomer] = useState(null);

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

    // This useEffect replaces the openFullPageView function
    useEffect(() => {
        const loadDetailedCustomerData = async () => {
            if (!fullPageViewOpen || !selectedCustomer) {
                setDetailedCustomer(null);
                return;
            }

            setLoading(true);
            setError(null);
            setDetailedCustomer(null);

            try {
                const targetCustomerId = selectedCustomer.id;
                console.log(`Fetching detailed data for customer ID: ${targetCustomerId}`);

                // Step 1: Fetch the full customer profile first, to ensure we have the latest contact info.
                const { data: customerProfile, error: customerError } = await supabase
                    .from(`app_${APP_ID}_customers`)
                    .select('*')
                    .eq('id', targetCustomerId)
                    .single();

                if (customerError && customerError.code !== 'PGRST116') { // Allow 'not found'
                    throw new Error(`Failed to fetch customer profile: ${customerError.message}`);
                }

                // Step 2: Now, call the rental history service using the default import.
                const historyResult = await CustomerService.getCustomerRentalHistory(targetCustomerId);

                // Step 3: Consolidate the customer data.
                let dataToShow = { ...selectedCustomer, ...(customerProfile || {}) };
                if (!dataToShow.id) {
                    dataToShow.id = targetCustomerId; // Ensure ID is present
                }
                
                // Fallback contact info from the list if the profile is missing it
                dataToShow.email = dataToShow.email || selectedCustomer.email;
                dataToShow.phone = dataToShow.phone || selectedCustomer.phone;
                dataToShow.licence_number = dataToShow.licence_number || selectedCustomer.licence_number;
                dataToShow.nationality = dataToShow.nationality || selectedCustomer.nationality;

                // Step 4: Process and assign the rental history.
                const rentalHistory = historyResult.success ? historyResult.data : [];
                dataToShow.rentalHistory = rentalHistory;

                // Step 5: Consolidate document URLs from both profile and all rentals.
                const idScanUrls = new Set();
                const extraImages = new Set();

                if (dataToShow.id_scan_url) idScanUrls.add(dataToShow.id_scan_url);
                if (Array.isArray(dataToShow.extra_images)) {
                    dataToShow.extra_images.forEach(img => img && extraImages.add(img));
                }
                
                rentalHistory.forEach(item => {
                    if (item.id_scan_url) idScanUrls.add(item.id_scan_url);
                    if (Array.isArray(item.extra_images)) {
                        item.extra_images.forEach(img => img && extraImages.add(img));
                    }
                    if (item.customer_id_image) idScanUrls.add(item.customer_id_image);
                });

                dataToShow.all_docs = { 
                    id_scan_urls: Array.from(idScanUrls), 
                    extra_images: Array.from(extraImages) 
                };

                setDetailedCustomer(dataToShow);

            } catch (err) {
                console.error(`[CRITICAL ERROR] Failed to load full customer view: ${err.message}`);
                setError(`Failed to load customer profile: ${err.message}`);
                setFullPageViewOpen(false);
            } finally {
                setLoading(false);
            }
        };

        loadDetailedCustomerData();
    }, [fullPageViewOpen, selectedCustomer]);


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
        const historyResult = await checkCustomerRentalHistory(customerToDelete.id);

        if (historyResult.hasHistory) {
            alert(`Cannot delete customer ${customerToDelete.full_name} as they have a rental history.`);
            setDeleteModalOpen(false);
            return;
        }

        const result = await deleteCustomer(customerToDelete.id);

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
    const rentalsByCustomerId = new Map();
    rentals.forEach(rental => {
        if (!rental.customer_id) return;
        if (!rentalsByCustomerId.has(rental.customer_id)) {
            rentalsByCustomerId.set(rental.customer_id, []);
        }
        rentalsByCustomerId.get(rental.customer_id).push(rental);
    });

    const consolidatedProfiles = customers.map(customer => {
        const customerRentals = rentalsByCustomerId.get(customer.id) || [];
        const totalSpent = customerRentals.reduce((sum, rental) => sum + (rental.total_amount || 0), 0);
        const activeRentals = customerRentals.filter(r => r.status === 'active').length;

        return {
            ...customer,
            totalRentals: customerRentals.length,
            activeRentals,
            totalSpent,
            status: activeRentals > 0 ? 'Active' : 'Inactive',
        };
    });

    const profileGroupsByName = new Map();
    consolidatedProfiles.forEach(profile => {
        const name = profile.full_name?.trim().toLowerCase();
        if (!name) return;

        const existing = profileGroupsByName.get(name);
        if (!existing || profile.totalRentals > existing.totalRentals || (profile.totalRentals === existing.totalRentals && new Date(profile.created_at) > new Date(existing.created_at))) {
            profileGroupsByName.set(name, profile);
        }
    });
    const uniqueCustomerProfiles = Array.from(profileGroupsByName.values());

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
    }).format(amount || 0);
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
    const result = await deleteCustomers(selectedCustomerIds);
    if (result.success) {
      setShowBulkDeleteModal(false);
      setSelectedCustomerIds([]);
      await fetchData();
    } else {
      alert(`Error deleting customers: ${result.error}`);
    }
  };

  if (loading && !fullPageViewOpen) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (fullPageViewOpen) {
    if (loading || !detailedCustomer) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading customer profile...</p>
          </div>
        </div>
      );
    }

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
            <h1 className="text-3xl font-bold text-gray-900">Customer Profile: {detailedCustomer.full_name}</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">ID Document Scans</h2>
                {(detailedCustomer.all_docs.id_scan_urls || []).length > 0 ? (
                  <div className="space-y-4">
                  {detailedCustomer.all_docs.id_scan_urls.map((url, i) => <img key={i} src={url} alt={`ID Scan ${i + 1}`} className="w-full rounded-lg border border-gray-300" />)}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center"><p className="text-gray-500">No ID scans</p></div>
                )}
              </div>
               <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Documents</h2>
                {(detailedCustomer.all_docs.extra_images || []).length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {detailedCustomer.all_docs.extra_images.map((url, i) => <img key={i} src={url} alt={`Extra doc ${i + 1}`} className="w-full h-24 object-cover border rounded-lg cursor-pointer" onClick={() => window.open(url, '_blank')} />)}
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg p-8 text-center"><p className="text-gray-500">No additional documents</p></div>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div><span className="font-medium text-gray-600">Full Name:</span><p className="text-gray-900 break-words">{detailedCustomer.full_name || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-600">Customer ID:</span><p className="text-gray-900 text-xs break-all">{detailedCustomer.id}</p></div>
                  <div><span className="font-medium text-gray-600">Date of Birth:</span><p className="text-gray-900 break-words">{formatDate(detailedCustomer.date_of_birth)}</p></div>
                  <div><span className="font-medium text-gray-600">Place of Birth:</span><p className="text-gray-900 break-words">{detailedCustomer.place_of_birth || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-600">Nationality:</span><p className="text-gray-900 break-words">{detailedCustomer.nationality || 'N/A'}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & Legal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                  <div><span className="font-medium text-gray-600">Email:</span><p className="text-gray-900 break-words">{detailedCustomer.email || 'N/A'}</p></div>
                  <div><span className="font-medium text-gray-600">Phone:</span><p className="text-gray-900 break-words">{detailedCustomer.phone || 'N/A'}</p></div>
                  <div className="md:col-span-2"><span className="font-medium text-gray-600">License Number:</span><p className="text-gray-900 break-words">{detailedCustomer.licence_number || 'N/A'}</p></div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Rental History ({(detailedCustomer.rentalHistory || []).length} rentals)</h2>
                {(detailedCustomer.rentalHistory || []).length === 0 ? (
                  <p className="text-gray-500 text-sm">No rental history available.</p>
                ) : (
                  <div className="space-y-3">
                    {(detailedCustomer.rentalHistory || []).map((r) => {
                      const amount = r.total_amount ?? r.amount ?? 0;
                      const status = r.rental_status || r.status;
                      const bookedDate = r.created_at;
                      return (
                        <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-medium text-gray-900">{r.vehicle?.name || 'Unknown Vehicle'}</p>
                              <Link to={`/admin/rentals/${r.id}`} className="text-sm text-blue-600 hover:underline">
                                Rental ID: {r.id}
                              </Link>
                            </div>
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                              status === 'active' ? 'bg-green-100 text-green-800' : 
                              status === 'completed' ? 'bg-blue-100 text-blue-800' : 
                              'bg-gray-100 text-gray-800'
                            }`}>{status || 'N/A'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                            <div><span className="font-medium">Start:</span> {formatDate(r.rental_start_date)}</div>
                            <div><span className="font-medium">End:</span> {formatDate(r.rental_end_date)}</div>
                            <div><span className="font-medium">Amount:</span> {formatCurrency(amount)}</div>
                            <div><span className="font-medium">Booked:</span> {formatDate(bookedDate)}</div>
                          </div>
                        </div>
                      );
                    })}
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
    <div className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Customer Management</h1>
                <p className="text-gray-600">Manage, view, and analyze customer data.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Total Customers</h3>
                    <p className="text-3xl font-semibold text-gray-900">{aggregatedData.summary.totalCustomers}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Active Rentals</h3>
                    <p className="text-3xl font-semibold text-gray-900">{aggregatedData.summary.totalActiveRentals}</p>
                </div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
                    <p className="text-3xl font-semibold text-gray-900">{formatCurrency(aggregatedData.summary.totalRevenue)}</p>
                </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <input
                            type="text"
                            placeholder="Search by name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="All">All Statuses</option>
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                        </select>
                        <select
                            value={nationalityFilter}
                            onChange={(e) => setNationalityFilter(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="All">All Nationalities</option>
                            {availableNationalities.map(nat => <option key={nat} value={nat}>{nat}</option>)}
                        </select>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <button
                            onClick={clearFilters}
                            className="text-sm text-blue-600 hover:underline"
                        >
                            Clear Filters
                        </button>
                        {selectedCustomerIds.length > 0 && (
                            <button
                                onClick={() => setShowBulkDeleteModal(true)}
                                className="px-3 py-1 bg-red-600 text-white rounded-md text-sm hover:bg-red-700"
                            >
                                Delete Selected ({selectedCustomerIds.length})
                            </button>
                        )}
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="p-4 text-left">
                                    <input
                                        type="checkbox"
                                        ref={headerCheckboxRef}
                                        onChange={handleSelectAll}
                                        disabled={eligibleForSelectionCount === 0}
                                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                    />
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Customer
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Rentals
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total Spent
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Actions</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {aggregatedData.customers.map((customer) => (
                                <tr key={customer.id} className="hover:bg-gray-50">
                                    <td className="p-4">
                                        {customer.totalRentals === 0 && (
                                            <input
                                                type="checkbox"
                                                checked={selectedCustomerIds.includes(customer.id)}
                                                onChange={() => handleSelectCustomer(customer.id)}
                                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                            />
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="flex-shrink-0 h-10 w-10">
                                                <div className="h-10 w-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                    {getInitial(customer.full_name)}
                                                </div>
                                            </div>
                                            <div className="ml-4">
                                                <div
                                                    className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                                                    onClick={() => openFullPageView(customer)}
                                                >
                                                    {customer.full_name}
                                                </div>
                                                <div className="text-xs text-gray-500">{customer.nationality || 'N/A'}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{customer.email || 'No email'}</div>
                                        <div className="text-sm text-gray-500">{customer.phone || 'No phone'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${customer.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                            {customer.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">{customer.totalRentals}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(customer.totalSpent)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(customer.created_at)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button onClick={() => openFullPageView(customer)} className="text-indigo-600 hover:text-indigo-900 mr-3">View</button>
                                        <button onClick={() => openEditModal(customer)} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                        <button onClick={() => openDeleteModal(customer)} className="text-red-600 hover:text-red-900">Delete</button>
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