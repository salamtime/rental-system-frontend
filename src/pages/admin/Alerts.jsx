import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Filter, 
  Bell, 
  Car, 
  Fuel, 
  Wrench, 
  DollarSign,
  Calendar,
  AlertCircle,
  Info,
  X,
  RefreshCw
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import alertService from '../../services/AlertService';
import fuelService from '../../services/FuelService';
import MaintenanceService from '../../services/MaintenanceService';
import { supabase } from '../../lib/supabase';

// Configuration: 48 hours window as per requirements
const RETURN_DUE_SOON_HOURS = 48;

const Alerts = () => {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    priority: 'all',
    category: 'all',
    status: 'all'
  });
  const [refreshing, setRefreshing] = useState(false);

  // Helper function to get current time in Africa/Casablanca timezone
  const getCasablancaTime = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Casablanca"}));
  };

  // Helper function to format amounts properly
  const formatAmount = (amount) => {
    if (!amount || amount === null || amount === undefined) {
      return '0.00 MAD';
    }
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) {
      return '0.00 MAD';
    }
    return `${numAmount.toFixed(2)} MAD`;
  };

  // Load all alerts on component mount
  useEffect(() => {
    loadAllAlerts();
    
    // Subscribe to AlertService updates
    const unsubscribeAlerts = alertService.subscribe(() => {
      console.log('🔔 AlertService updated, refreshing alerts...');
      loadAllAlerts();
    });

    // Subscribe to Fuel service updates
    const unsubscribeFuel = fuelService.subscribe(() => {
      console.log('⛽ FuelService updated, refreshing alerts...');
      loadAllAlerts();
    });

    return () => {
      unsubscribeAlerts();
      unsubscribeFuel();
    };
  }, []);

  // Apply filters when alerts or filters change
  useEffect(() => {
    applyFilters();
  }, [alerts, filters]);

  const loadAllAlerts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading alerts from all modules...');
      
      // Load alerts from all sources in parallel
      const [
        fleetAlerts,
        fuelAlerts, 
        maintenanceAlerts,
        rentalAlerts,
        priceApprovalAlerts
      ] = await Promise.all([
        loadFleetAlerts(),
        loadFuelAlerts(),
        loadMaintenanceAlerts(),
        loadRentalReturnAlerts(),
        loadPriceApprovalAlerts()
      ]);

      // Combine all alerts
      const allAlerts = [
        ...fleetAlerts,
        ...fuelAlerts,
        ...maintenanceAlerts,
        ...rentalAlerts,
        ...priceApprovalAlerts
      ];

      // Sort by priority and creation date
      const sortedAlerts = allAlerts.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
        
        if (priorityDiff !== 0) return priorityDiff;
        
        return new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0);
      });

      setAlerts(sortedAlerts);
      console.log(`✅ Loaded ${sortedAlerts.length} total alerts from all modules`);
      console.log('Alert breakdown:', {
        fleet: fleetAlerts.length,
        fuel: fuelAlerts.length,
        maintenance: maintenanceAlerts.length,
        rental: rentalAlerts.length,
        priceApproval: priceApprovalAlerts.length
      });
      
    } catch (err) {
      console.error('❌ Supabase Error', { message: err.message, details: err.details, hint: err.hint, code: err.code });
      setError(err.message || 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  const loadFleetAlerts = async () => {
    try {
      console.log('🚗 Loading Fleet Management alerts...');
      
      // Get alerts from AlertService (includes vehicle alerts)
      const fleetAlerts = alertService.getAllAlerts().map(alert => ({
        ...alert,
        source: 'fleet',
        category: alert.category || 'vehicle',
        icon: getAlertIcon(alert.category || 'vehicle'),
        createdAt: alert.createdAt || new Date().toISOString()
      }));

      console.log(`✅ Loaded ${fleetAlerts.length} fleet alerts`);
      return fleetAlerts;
    } catch (error) {
      console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
      return [];
    }
  };

  const loadFuelAlerts = async () => {
    try {
      console.log('⛽ Loading Fuel Management alerts...');
      
      const fuelAlerts = [];
      
      // Check if fuel_tank table exists first
      try {
        const { data: tankCheck, error: checkError } = await supabase
          .from('fuel_tank')
          .select('id')
          .limit(1);
        
        if (checkError && checkError.code === '42P01') {
          console.log('⚠️ fuel_tank table does not exist, skipping fuel alerts');
          return [];
        }
        
        // Check for low fuel alerts
        const tank = await fuelService.getTankStatus();
        if (tank) {
          const currentPercentage = (parseFloat(tank.current_volume) / parseFloat(tank.capacity)) * 100;
          const lowThreshold = parseFloat(tank.low_threshold || 15);
          
          if (currentPercentage <= lowThreshold) {
            fuelAlerts.push({
              id: `fuel-low-${Date.now()}`,
              title: 'Low Fuel Alert',
              message: `Main tank is at ${currentPercentage.toFixed(1)}% capacity (${tank.current_volume}L remaining)`,
              type: 'warning',
              priority: currentPercentage <= 5 ? 'high' : 'medium',
              category: 'fuel',
              source: 'fuel',
              icon: 'fuel',
              createdAt: new Date().toISOString(),
              data: {
                tankId: tank.id,
                currentVolume: tank.current_volume,
                capacity: tank.capacity,
                percentage: currentPercentage
              }
            });
          }
        }
      } catch (fuelError) {
        console.log('⚠️ Fuel system not available:', fuelError.message);
      }

      console.log(`✅ Loaded ${fuelAlerts.length} fuel alerts`);
      return fuelAlerts;
    } catch (error) {
      console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
      return [];
    }
  };

  const loadMaintenanceAlerts = async () => {
    try {
      console.log('🔧 Loading Maintenance Management alerts...');
      
      const maintenanceAlerts = [];
      
      // Try to get upcoming maintenance records - use correct table and column names
      try {
        const { data: upcomingMaintenance, error } = await supabase
          .from('app_687f658e98_maintenance')
          .select('*')
          .eq('status', 'scheduled')
          .order('date', { ascending: true });

        if (error) {
          console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
          return [];
        }

        upcomingMaintenance?.forEach(maintenance => {
          const scheduledDate = new Date(maintenance.date || maintenance.scheduled_date);
          const today = getCasablancaTime();
          const daysUntilDue = Math.ceil((scheduledDate - today) / (1000 * 60 * 60 * 24));
          
          let alertType = 'info';
          let alertTitle = 'Maintenance Due Soon';
          let priority = 'low';
          
          if (daysUntilDue < 0) {
            alertType = 'error';
            alertTitle = 'Maintenance Overdue';
            priority = 'high';
          } else if (daysUntilDue <= 1) {
            alertType = 'warning';
            alertTitle = 'Maintenance Due Tomorrow';
            priority = 'medium';
          } else if (daysUntilDue <= 7) {
            priority = 'medium';
          }
          
          if (daysUntilDue <= 7 || daysUntilDue < 0) {
            maintenanceAlerts.push({
              id: `maintenance-${maintenance.id}`,
              title: alertTitle,
              message: `${maintenance.vehicle_name || 'Vehicle'} - ${maintenance.type || maintenance.maintenance_type} ${daysUntilDue < 0 ? `overdue by ${Math.abs(daysUntilDue)} days` : `due in ${daysUntilDue} days`}`,
              type: alertType,
              priority: priority,
              category: 'maintenance',
              source: 'maintenance',
              icon: 'maintenance',
              createdAt: new Date().toISOString(),
              data: {
                maintenanceId: maintenance.id,
                vehicleId: maintenance.vehicle_id,
                vehicleName: maintenance.vehicle_name,
                maintenanceType: maintenance.type || maintenance.maintenance_type,
                scheduledDate: maintenance.date || maintenance.scheduled_date,
                daysUntilDue: daysUntilDue
              }
            });
          }
        });
      } catch (maintenanceError) {
        console.log('⚠️ Maintenance system not available:', maintenanceError.message);
      }

      console.log(`✅ Loaded ${maintenanceAlerts.length} maintenance alerts`);
      return maintenanceAlerts;
    } catch (error) {
      console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
      return [];
    }
  };

  const loadRentalReturnAlerts = async () => {
    try {
      console.log('💰 Loading Rental Return alerts...');
      console.log(`Using ${RETURN_DUE_SOON_HOURS}h window for due soon alerts`);
      
      const rentalAlerts = [];
      const now = getCasablancaTime();
      const dueSoonWindow = new Date(now.getTime() + (RETURN_DUE_SOON_HOURS * 60 * 60 * 1000));
      
      console.log(`Current time (Casablanca): ${now.toISOString()}`);
      console.log(`Due soon window (${RETURN_DUE_SOON_HOURS}h): ${dueSoonWindow.toISOString()}`);
      
      // Query for rentals that are not completed and not cancelled
      // Fixed: Check both rental_completed_at AND rental_status to handle data inconsistencies
      const { data: rentals, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          id,
          customer_name,
          rental_end_date,
          rental_status,
          total_amount,
          remaining_amount,
          rental_completed_at,
          vehicle_id,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(name, model, plate_number)
        `)
        .is('rental_completed_at', null)
        .neq('rental_status', 'cancelled')
        .neq('rental_status', 'completed')
        .order('rental_end_date', { ascending: true });

      if (error) {
        console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        return [];
      }

      console.log(`📊 Found ${rentals?.length || 0} active rentals (not completed, not cancelled)`);
      
      if (rentals && rentals.length > 0) {
        console.log('\n📋 Processing rentals for alerts:');
        
        rentals.forEach(rental => {
          const dueDate = new Date(rental.rental_end_date);
          const hoursUntilDue = (dueDate - now) / (1000 * 60 * 60);
          const isOverdue = now > dueDate;
          const isDueSoon = !isOverdue && dueDate <= dueSoonWindow;
          
          console.log(`Rental ${rental.id}: ${rental.customer_name}, due in ${hoursUntilDue.toFixed(1)}h, ${isOverdue ? 'OVERDUE' : isDueSoon ? 'DUE SOON' : 'OK'}`);
          
          if (isOverdue || isDueSoon) {
            // Calculate amount due: remaining_amount (already the amount due)
            let amountDue = Math.max(0, parseFloat(rental.remaining_amount || 0));
            
            // Get vehicle info with fallback to "SEGWAY"
            const makeModel = rental.vehicle?.model || rental.vehicle?.name || 'SEGWAY';
            const plateNumber = rental.vehicle?.plate_number || 'N/A';
            
            let alertData = {
              id: `rental-return-${rental.id}`,
              category: 'rental',
              source: 'rental',
              icon: 'rental',
              createdAt: new Date().toISOString(),
              data: {
                rentalId: rental.id,
                customerId: rental.customer_name,
                vehicleId: rental.vehicle_id,
                makeModel: makeModel,
                plateNumber: plateNumber,
                dueDate: rental.rental_end_date,
                amountDue: amountDue
              },
              onClick: () => navigate(`/admin/rentals/${rental.id}`)
            };
            
            if (isOverdue) {
              const daysOverdue = Math.max(1, Math.ceil(Math.abs(hoursUntilDue) / 24));
              const alert = {
                ...alertData,
                title: 'Rental Return Overdue',
                message: `${rental.customer_name} – ${makeModel} (${plateNumber}) overdue by ${daysOverdue} days. Amount: ${formatAmount(amountDue)}`,
                type: 'error',
                priority: 'high',
                data: {
                  ...alertData.data,
                  daysOverdue: daysOverdue
                }
              };
              rentalAlerts.push(alert);
              console.log(`  → Added OVERDUE alert: ${alert.message}`);
            } else if (isDueSoon) {
              const hoursUntilDueRounded = Math.max(1, Math.ceil(hoursUntilDue));
              const alert = {
                ...alertData,
                title: 'Rental Return Due Soon',
                message: `${rental.customer_name} – ${makeModel} (${plateNumber}) due in ${hoursUntilDueRounded} hours. Amount: ${formatAmount(amountDue)}`,
                type: 'warning',
                priority: 'medium',
                data: {
                  ...alertData.data,
                  hoursUntilDue: hoursUntilDueRounded
                }
              };
              rentalAlerts.push(alert);
              console.log(`  → Added DUE SOON alert: ${alert.message}`);
            }
          }
        });
      } else {
        console.log('⚠️ No active rentals found');
      }

      console.log(`✅ Generated ${rentalAlerts.length} rental return alerts`);
      return rentalAlerts;
    } catch (error) {
      console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
      return [];
    }
  };

  const loadPriceApprovalAlerts = async () => {
    try {
      console.log('💵 Loading Price Approval alerts...');
      
      const priceApprovalAlerts = [];
      
      // Query for rentals with pending price approval
      const { data: pendingRentals, error } = await supabase
        .from('app_4c3a7a6153_rentals')
        .select(`
          id,
          customer_name,
          pending_total_request,
          total_amount,
          price_override_reason,
          created_at,
          vehicle_id,
          vehicle:saharax_0u4w4d_vehicles!app_4c3a7a6153_rentals_vehicle_id_fkey(name, model, plate_number)
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Supabase Error loading price approvals:', { message: error.message, details: error.details, hint: error.hint, code: error.code });
        return [];
      }

      if (pendingRentals && pendingRentals.length > 0) {
        console.log(`📊 Found ${pendingRentals.length} pending price approval requests`);
        
        pendingRentals.forEach(rental => {
          const makeModel = rental.vehicle?.model || rental.vehicle?.name || 'Vehicle';
          const plateNumber = rental.vehicle?.plate_number || 'N/A';
          
          priceApprovalAlerts.push({
            id: `price-approval-${rental.id}`,
            title: 'Price Approval Required',
            message: `${rental.customer_name} – ${makeModel} (${plateNumber}). Manual: ${formatAmount(rental.pending_total_request)} (Auto: ${formatAmount(rental.total_amount)})`,
            type: 'warning',
            priority: 'high',
            category: 'rental',
            source: 'price_approval',
            icon: 'rental',
            createdAt: rental.created_at || new Date().toISOString(),
            data: {
              rentalId: rental.id,
              customerId: rental.customer_name,
              vehicleId: rental.vehicle_id,
              makeModel: makeModel,
              plateNumber: plateNumber,
              manualPrice: rental.pending_total_request,
              autoPrice: rental.total_amount,
              reason: rental.price_override_reason
            },
            onClick: () => navigate(`/admin/rentals/${rental.id}`)
          });
        });
      }

      console.log(`✅ Loaded ${priceApprovalAlerts.length} price approval alerts`);
      return priceApprovalAlerts;
    } catch (error) {
      console.error('❌ Supabase Error', { message: error.message, details: error.details, hint: error.hint, code: error.code });
      return [];
    }
  };

  const applyFilters = () => {
    let filtered = [...alerts];

    if (filters.priority !== 'all') {
      filtered = filtered.filter(alert => alert.priority === filters.priority);
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(alert => alert.category === filters.category);
    }

    if (filters.status !== 'all') {
      if (filters.status === 'unread') {
        filtered = filtered.filter(alert => !alert.read);
      } else if (filters.status === 'read') {
        filtered = filtered.filter(alert => alert.read);
      }
    }

    setFilteredAlerts(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllAlerts();
    setRefreshing(false);
  };

  const handleMarkAsRead = (alertId) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const handleDismissAlert = (alertId) => {
    setAlerts(prevAlerts =>
      prevAlerts.filter(alert => alert.id !== alertId)
    );
  };

  const handleAlertClick = (alert) => {
    // Mark as read
    handleMarkAsRead(alert.id);
    
    // Handle deep linking
    if (alert.onClick) {
      alert.onClick();
    } else if (alert.data?.rentalId) {
      navigate(`/admin/rentals/${alert.data.rentalId}`);
    }
  };

  const getAlertIcon = (category) => {
    switch (category) {
      case 'vehicle':
      case 'fleet':
        return Car;
      case 'fuel':
        return Fuel;
      case 'maintenance':
        return Wrench;
      case 'rental':
        return DollarSign;
      default:
        return AlertTriangle;
    }
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'error':
        return AlertCircle;
      case 'warning':
        return AlertTriangle;
      case 'info':
        return Info;
      case 'success':
        return CheckCircle;
      default:
        return Bell;
    }
  };

  const getAlertTypeColor = (type, priority) => {
    if (priority === 'high') {
      return 'bg-red-50 border-red-200 text-red-800';
    } else if (priority === 'medium') {
      return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    } else {
      return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryBadgeColor = (category) => {
    switch (category) {
      case 'vehicle':
      case 'fleet':
        return 'bg-blue-100 text-blue-800';
      case 'fuel':
        return 'bg-orange-100 text-orange-800';
      case 'maintenance':
        return 'bg-purple-100 text-purple-800';
      case 'rental':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertStats = () => {
    const total = alerts.length;
    const highPriority = alerts.filter(a => a.priority === 'high').length;
    const unread = alerts.filter(a => !a.read).length;
    const byCategory = alerts.reduce((acc, alert) => {
      acc[alert.category] = (acc[alert.category] || 0) + 1;
      return acc;
    }, {});

    return { total, highPriority, unread, byCategory };
  };

  const stats = getAlertStats();

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-6"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🚨 Unified Alerts Dashboard
            </h1>
            <p className="text-gray-600">
              Centralized alerts from Fleet, Fuel, Maintenance, Rental Management, and Price Approvals
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-800 font-medium">Error loading alerts</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Bell className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-600">Total Alerts</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.highPriority}</p>
              <p className="text-sm text-gray-600">High Priority</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.unread}</p>
              <p className="text-sm text-gray-600">Unread</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{Object.keys(stats.byCategory).length}</p>
              <p className="text-sm text-gray-600">Categories</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>

          <select
            value={filters.priority}
            onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>

          <select
            value={filters.category}
            onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Categories</option>
            <option value="vehicle">Fleet/Vehicle</option>
            <option value="fuel">Fuel</option>
            <option value="maintenance">Maintenance</option>
            <option value="rental">Rental</option>
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded text-sm"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>

          <div className="text-sm text-gray-500">
            Showing {filteredAlerts.length} of {alerts.length} alerts
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow border text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Alerts Found</h3>
            <p className="text-gray-600">
              {alerts.length === 0 
                ? "Great! No alerts at the moment. All systems are running smoothly."
                : "No alerts match your current filters. Try adjusting the filter criteria."
              }
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const IconComponent = getAlertIcon(alert.category);
            const TypeIconComponent = getAlertTypeIcon(alert.type);
            
            return (
              <div
                key={alert.id}
                className={`bg-white border rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer ${
                  !alert.read ? 'border-l-4 border-l-blue-500' : ''
                } ${getAlertTypeColor(alert.type, alert.priority)}`}
                onClick={() => handleAlertClick(alert)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-white rounded-lg shadow-sm">
                          <IconComponent className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <TypeIconComponent className="w-4 h-4" />
                          <h3 className="text-lg font-semibold text-gray-900 truncate">
                            {alert.title}
                          </h3>
                          {!alert.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                          )}
                        </div>
                        
                        <p className="text-gray-700 mb-3">{alert.message}</p>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityBadgeColor(alert.priority)}`}>
                            {alert.priority?.toUpperCase() || 'UNKNOWN'}
                          </span>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryBadgeColor(alert.category)}`}>
                            {alert.category?.toUpperCase() || 'GENERAL'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {alert.source?.toUpperCase() || 'SYSTEM'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(alert.createdAt || alert.created_at).toLocaleString('en-US', {
                              timeZone: 'Africa/Casablanca',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      {!alert.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsRead(alert.id);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Mark as read"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissAlert(alert.id);
                        }}
                        className="p-1 text-gray-400 hover:bg-gray-50 rounded"
                        title="Dismiss alert"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Category Breakdown */}
      {Object.keys(stats.byCategory).length > 0 && (
        <div className="mt-8 bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Alerts by Category</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(stats.byCategory).map(([category, count]) => {
              const IconComponent = getAlertIcon(category);
              return (
                <div key={category} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <IconComponent className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">{category}</p>
                    <p className="text-lg font-bold text-gray-700">{count}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Alerts;