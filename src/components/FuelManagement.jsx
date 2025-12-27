import React, { useState, useEffect } from 'react';
import { 
  Fuel, 
  Plus, 
  Minus, 
  Droplets, 
  Gauge, 
  TrendingUp, 
  Car, 
  AlertTriangle,
  Calendar,
  DollarSign,
  MapPin,
  User
} from 'lucide-react';
import FuelRefillModal from './FuelRefillModal';
import FuelWithdrawalModal from './FuelWithdrawalModal';
import VehicleRefillModal from './VehicleRefillModal';
import FuelFiltersPanel from './fuel/FuelFiltersPanel';
import FuelTransactionsList from './fuel/FuelTransactionsList';
import AddFuelTransactionModal from './fuel/AddFuelTransactionModal';
import TransactionDetailsModal from './fuel/TransactionDetailsModal';
import FuelTransactionService from '../services/FuelTransactionService';

const FuelManagement = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [fuelData, setFuelData] = useState({
    tank: null,
    refills: [],
    withdrawals: []
  });
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tablesExist, setTablesExist] = useState(true); // Default to true, will be checked

  // Modal states
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [showWithdrawalModal, setShowWithdrawalModal] = useState(false);
  const [showVehicleRefillModal, setShowVehicleRefillModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [editTransaction, setEditTransaction] = useState(null);
  const [transactionType, setTransactionType] = useState('refill');

  // Filter states for transactions tab
  const [filters, setFilters] = useState({
    search: '',
    vehicleId: '',
    transactionType: '',
    fuelType: '',
    startDate: '',
    endDate: '',
    fuelStation: '',
    location: ''
  });

  useEffect(() => {
    loadFuelData();
    checkDatabaseSetup();
  }, []);

  const checkDatabaseSetup = async () => {
    try {
      console.log('Checking database setup...');
      const tablesCheck = await FuelTransactionService.checkTablesExist();
      console.log('Database check result:', tablesCheck);
      setTablesExist(tablesCheck.allTablesExist);
    } catch (error) {
      console.error('Error checking database setup:', error);
      setTablesExist(false);
    }
  };

  const loadFuelData = async () => {
    setLoading(true);
    try {
      console.log('Loading fuel data...');
      const unifiedData = await FuelTransactionService.getUnifiedFuelData();
      console.log('Loaded unified data:', unifiedData);
      setFuelData(unifiedData);
      
      // Extract unique vehicles from refills and withdrawals
      const vehicleSet = new Set();
      
      unifiedData.refills.forEach(refill => {
        if (refill.saharax_0u4w4d_vehicles) {
          vehicleSet.add(JSON.stringify(refill.saharax_0u4w4d_vehicles));
        }
      });
      
      unifiedData.withdrawals.forEach(withdrawal => {
        if (withdrawal.vehicle) {
          vehicleSet.add(JSON.stringify(withdrawal.vehicle));
        }
      });

      const uniqueVehicles = Array.from(vehicleSet).map(v => JSON.parse(v));
      console.log('Extracted vehicles:', uniqueVehicles);
      setVehicles(uniqueVehicles);
      
    } catch (error) {
      console.error('Error loading fuel data:', error);
      // Set default data on error
      setFuelData({
        tank: {
          id: 'default',
          name: 'Main Tank',
          capacity: 1000,
          initial_volume: 500,
          location: 'Main Depot',
          fuel_type: 'gasoline'
        },
        refills: [],
        withdrawals: []
      });
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  // Calculate current tank volume using unified logic
  const getCurrentVolume = () => {
    return FuelTransactionService.calculateCurrentVolume(
      fuelData.tank, 
      fuelData.refills, 
      fuelData.withdrawals
    );
  };

  const getTankPercentage = () => {
    if (!fuelData.tank || !fuelData.tank.capacity) return 0;
    const currentVolume = getCurrentVolume();
    return Math.min((currentVolume / fuelData.tank.capacity) * 100, 100);
  };

  const getTankColor = () => {
    const percentage = getTankPercentage();
    if (percentage <= 15) return 'text-red-600';
    if (percentage <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getProgressBarColor = () => {
    const percentage = getTankPercentage();
    if (percentage <= 15) return 'bg-red-500';
    if (percentage <= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  // Get recent transactions using unified data
  const getRecentRefills = () => {
    return fuelData.refills
      .filter(refill => !refill.vehicle_id) // Tank refills only
      .slice(0, 5);
  };

  const getRecentVehicleRefills = () => {
    return fuelData.refills
      .filter(refill => refill.vehicle_id) // Vehicle refills only
      .slice(0, 3);
  };

  const getRecentWithdrawals = () => {
    return fuelData.withdrawals.slice(0, 5);
  };

  // Modal handlers
  const handleRefillComplete = () => {
    loadFuelData();
    setShowRefillModal(false);
  };

  const handleWithdrawalComplete = () => {
    loadFuelData();
    setShowWithdrawalModal(false);
  };

  const handleVehicleRefillComplete = () => {
    loadFuelData();
    setShowVehicleRefillModal(false);
  };

  const handleAddTransaction = (type = 'refill', transaction = null) => {
    setTransactionType(type);
    setEditTransaction(transaction);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setShowDetailsModal(false);
    setSelectedTransaction(null);
    setEditTransaction(null);
  };

  const handleTransactionSuccess = () => {
    loadFuelData(); // Refresh data after successful transaction
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowDetailsModal(true);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      vehicleId: '',
      transactionType: '',
      fuelType: '',
      startDate: '',
      endDate: '',
      fuelStation: '',
      location: ''
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || isNaN(amount)) return '0.00 MAD';
    return `${parseFloat(amount).toFixed(2)} MAD`;
  };

  // Format date for Africa/Casablanca timezone
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      timeZone: 'Africa/Casablanca',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading fuel management data...</p>
        </div>
      </div>
    );
  }

  const safeRefills = getRecentRefills();
  const safeVehicleRefills = getRecentVehicleRefills();
  const safeWithdrawals = getRecentWithdrawals();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <Fuel className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Fuel Management</h1>
              <p className="text-gray-600">Monitor tank levels, track refills, and manage fuel withdrawals</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'transactions'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All Fuel Transactions
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Database Status Warning - Only show if tables don't exist */}
            {!tablesExist && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Database Setup Required</h4>
                    <p className="text-sm text-yellow-700">
                      Fuel management tables not found. Please run the SQL schema to set up fuel_tank, fuel_refills, and fuel_withdrawals tables.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Tank Status */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Droplets className="w-5 h-5 text-blue-600" />
                    Main Tank Status
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowRefillModal(true)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Refill
                    </button>
                    <button
                      onClick={() => setShowWithdrawalModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      <Minus className="w-4 h-4" />
                      Withdraw
                    </button>
                  </div>
                </div>

                {/* Tank Visual */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Current Volume</span>
                    <span className={`text-2xl font-bold ${getTankColor()}`}>
                      {getCurrentVolume()}L ({getTankPercentage().toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                    <div 
                      className={`h-6 rounded-full transition-all duration-500 ${getProgressBarColor()}`}
                      style={{ width: `${Math.min(getTankPercentage(), 100)}%` }}
                    ></div>
                    {getTankPercentage() <= 15 && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                  {getTankPercentage() <= 15 && (
                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      Low fuel alert - Refill recommended
                    </p>
                  )}
                </div>

                {/* Tank Statistics */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Droplets className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{getCurrentVolume()}L</p>
                    <p className="text-sm text-gray-600">Available</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <Gauge className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{fuelData.tank?.capacity || 0}L</p>
                    <p className="text-sm text-gray-600">Capacity</p>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{getTankPercentage().toFixed(1)}%</p>
                    <p className="text-sm text-gray-600">Fill Level</p>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="space-y-4">
                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Plus className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Recent Refills</h3>
                      <p className="text-sm text-gray-600">{safeRefills.length + safeVehicleRefills.length} this period</p>
                    </div>
                  </div>
                  {[...safeRefills.slice(0, 2), ...safeVehicleRefills.slice(0, 1)].map((refill, index) => (
                    <div key={`${refill.id}-${index}`} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {refill.liters_added || refill.liters}L
                          {refill.saharax_0u4w4d_vehicles && (
                            <span className="text-xs text-blue-600 ml-1">
                              ({refill.saharax_0u4w4d_vehicles.name})
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(refill.refill_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatCurrency(refill.total_cost)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(refill.unit_price || refill.price_per_liter)}/L
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Car className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Recent Withdrawals</h3>
                      <p className="text-sm text-gray-600">{safeWithdrawals.length} this period</p>
                    </div>
                  </div>
                  {safeWithdrawals.slice(0, 3).map((withdrawal) => (
                    <div key={withdrawal.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {withdrawal.vehicle?.name || `Vehicle ${withdrawal.vehicle_id}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(withdrawal.withdrawal_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{withdrawal.liters_taken}L</p>
                        {withdrawal.odometer_reading && (
                          <p className="text-xs text-gray-500">{withdrawal.odometer_reading}km</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Activity Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Refills */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Plus className="w-5 h-5 text-green-600" />
                      Recent Refills
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowRefillModal(true)}
                        className="text-green-600 hover:text-green-700 text-sm font-medium"
                      >
                        Add Refill →
                      </button>
                      <button
                        onClick={() => setShowVehicleRefillModal(true)}
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Add Vehicle Refill →
                      </button>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {safeRefills.slice(0, 3).map((refill) => (
                        <tr key={`tank-${refill.id}`}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(refill.refill_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Tank Refill
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{refill.liters_added}L</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{formatCurrency(refill.total_cost)}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(refill.unit_price)}/L</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">—</td>
                        </tr>
                      ))}
                      
                      {safeVehicleRefills.slice(0, 2).map((refill) => (
                        <tr key={`vehicle-${refill.id}`} className="bg-blue-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(refill.refill_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Car className="w-3 h-3 mr-1" />
                              Vehicle Refill
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{refill.liters_added || refill.liters}L</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{formatCurrency(refill.total_cost)}</p>
                              <p className="text-xs text-gray-500">{formatCurrency(refill.unit_price || refill.price_per_liter)}/L</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <p className="font-medium text-blue-700">
                                {refill.saharax_0u4w4d_vehicles?.name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {refill.saharax_0u4w4d_vehicles?.plate_number}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {safeRefills.length === 0 && safeVehicleRefills.length === 0 && (
                    <div className="text-center py-8">
                      <Fuel className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No refills recorded yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Withdrawals */}
              <div className="bg-white rounded-lg shadow-md border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Car className="w-5 h-5 text-blue-600" />
                      Recent Withdrawals
                    </h3>
                    <button
                      onClick={() => setShowWithdrawalModal(true)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Add Withdrawal →
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Odometer</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">By</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {safeWithdrawals.slice(0, 5).map((withdrawal) => (
                        <tr key={withdrawal.id}>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {formatDate(withdrawal.withdrawal_date)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            <div>
                              <p className="font-medium">{withdrawal.vehicle?.name || `Vehicle ${withdrawal.vehicle_id}`}</p>
                              <p className="text-xs text-gray-500">{withdrawal.vehicle?.plate_number}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{withdrawal.liters_taken}L</td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {withdrawal.odometer_reading ? `${withdrawal.odometer_reading}km` : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{withdrawal.filled_by}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {safeWithdrawals.length === 0 && (
                    <div className="text-center py-8">
                      <Car className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">No withdrawals recorded yet</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="p-6 space-y-6">
            {/* Enhanced Transaction Management */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">All Fuel Transactions</h2>
                <p className="text-gray-600">Complete transaction history with advanced filtering and management</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => handleAddTransaction('withdrawal')}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                  Add Withdrawal
                </button>
                
                <button
                  onClick={() => handleAddTransaction('tank_refill')}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Refill
                </button>
              </div>
            </div>

            {/* Database Status Warning - Only show if tables don't exist */}
            {!tablesExist && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Database Setup Required</h4>
                    <p className="text-sm text-yellow-700">
                      Fuel management tables not found. Please run the SQL schema to set up fuel_tank, fuel_refills, and fuel_withdrawals tables.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Filters Panel */}
            <FuelFiltersPanel
              filters={filters}
              onFiltersChange={handleFiltersChange}
              onClearFilters={handleClearFilters}
              vehicles={vehicles}
            />

            {/* Transactions List */}
            <FuelTransactionsList
              filters={filters}
              vehicles={vehicles}
              onAddTransaction={handleAddTransaction}
              onViewDetails={handleViewDetails}
            />
          </div>
        )}
      </div>

      {/* Original Modals */}
      <FuelRefillModal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        onSave={handleRefillComplete}
        tankData={fuelData.tank}
      />

      <FuelWithdrawalModal
        isOpen={showWithdrawalModal}
        onClose={() => setShowWithdrawalModal(false)}
        onComplete={handleWithdrawalComplete}
        tankData={fuelData.tank}
      />

      <VehicleRefillModal
        isOpen={showVehicleRefillModal}
        onClose={() => setShowVehicleRefillModal(false)}
        onSuccess={handleVehicleRefillComplete}
      />

      {/* Enhanced Transaction Modals */}
      {showAddModal && (
        <AddFuelTransactionModal
          isOpen={showAddModal}
          onClose={handleCloseModal}
          transactionType={transactionType}
          editTransaction={editTransaction}
          vehicles={vehicles}
          onSuccess={handleTransactionSuccess}
        />
      )}

      {showDetailsModal && selectedTransaction && (
        <TransactionDetailsModal
          isOpen={showDetailsModal}
          onClose={handleCloseModal}
          transaction={selectedTransaction}
          onEdit={(transaction) => {
            setShowDetailsModal(false);
            handleAddTransaction(transaction.transaction_type, transaction);
          }}
        />
      )}
    </div>
  );
};

export default FuelManagement;