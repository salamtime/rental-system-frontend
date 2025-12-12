import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import MaintenanceTrackingService from '../../services/MaintenanceTrackingService';
import AddMaintenanceForm from './AddMaintenanceForm';
import MaintenanceListView from './MaintenanceListView';
import MaintenancePricingCatalog from './MaintenancePricingCatalog';
import { 
  Plus, 
  Wrench, 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Car,
  Calendar,
  TrendingUp,
  Settings
} from 'lucide-react';

/**
 * MaintenanceTrackingDashboard - Main dashboard for maintenance tracking system
 * 
 * Mobile-friendly, comprehensive maintenance management interface
 */
const MaintenanceTrackingDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Data states - ALWAYS INITIALIZE AS ARRAYS
  const [vehiclesInMaintenance, setVehiclesInMaintenance] = useState([]);
  const [upcomingMaintenance, setUpcomingMaintenance] = useState([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [vehiclesData, upcomingData, historyData, statsData] = await Promise.all([
        MaintenanceTrackingService.getVehiclesInMaintenance(),
        MaintenanceTrackingService.getUpcomingMaintenance(),
        MaintenanceTrackingService.getMaintenanceHistory({ limit: 10 }),
        MaintenanceTrackingService.getMaintenanceStatistics()
      ]);

      // CRITICAL: Always ensure arrays, never undefined
      const safeVehiclesData = Array.isArray(vehiclesData) ? vehiclesData : [];
      const safeUpcomingData = Array.isArray(upcomingData) ? upcomingData : [];
      const safeHistoryData = Array.isArray(historyData) ? historyData : [];
      const safeStatsData = statsData || {};

      setVehiclesInMaintenance(safeVehiclesData);
      setUpcomingMaintenance(safeUpcomingData);
      setMaintenanceHistory(safeHistoryData);
      setStatistics(safeStatsData);

      console.log('✅ Dashboard data loaded successfully');
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
      // CRITICAL: Set empty arrays on error
      setVehiclesInMaintenance([]);
      setUpcomingMaintenance([]);
      setMaintenanceHistory([]);
      setStatistics({});
    } finally {
      setLoading(false);
    }
  };

  const handleMaintenanceAdded = async () => {
    setSuccess('✅ Maintenance record added successfully!');
    setShowAddForm(false);
    await loadDashboardData();
    
    // Clear success message after delay
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleMaintenanceUpdated = async () => {
    setSuccess('✅ Maintenance record updated successfully!');
    await loadDashboardData();
    
    // Clear success message after delay
    setTimeout(() => setSuccess(null), 3000);
  };

  const getOverdueCount = () => {
    // CRITICAL: Always ensure array
    const safeUpcoming = Array.isArray(upcomingMaintenance) ? upcomingMaintenance : [];
    return safeUpcoming.filter(item => item.isOverdue).length;
  };

  const getDueSoonCount = () => {
    // CRITICAL: Always ensure array
    const safeUpcoming = Array.isArray(upcomingMaintenance) ? upcomingMaintenance : [];
    return safeUpcoming.filter(item => item.isDueSoon && !item.isOverdue).length;
  };

  // CRITICAL: Safe array access for all data
  const safeVehiclesInMaintenance = Array.isArray(vehiclesInMaintenance) ? vehiclesInMaintenance : [];
  const safeUpcomingMaintenance = Array.isArray(upcomingMaintenance) ? upcomingMaintenance : [];
  const safeMaintenanceHistory = Array.isArray(maintenanceHistory) ? maintenanceHistory : [];

  if (loading && activeTab === 'dashboard') {
    return (
      <div className="p-4 md:p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Quad Maintenance</h1>
        <p className="text-gray-600">Comprehensive maintenance tracking for your ATV fleet</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Wrench className="inline-block w-4 h-4 mr-2" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Car className="inline-block w-4 h-4 mr-2" />
            Maintenance Records
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'pricing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline-block w-4 h-4 mr-2" />
            Pricing Catalog
          </button>
        </nav>
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Vehicles in Maintenance</p>
                    <p className="text-2xl font-bold text-blue-600">{statistics.vehiclesInMaintenance || 0}</p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Car className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Overdue Items</p>
                    <p className="text-2xl font-bold text-red-600">{getOverdueCount()}</p>
                  </div>
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Due Soon</p>
                    <p className="text-2xl font-bold text-yellow-600">{getDueSoonCount()}</p>
                  </div>
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monthly Cost</p>
                    <p className="text-2xl font-bold text-green-600">
                      {MaintenanceTrackingService.formatCurrency(statistics.totalCostThisMonth)}
                    </p>
                  </div>
                  <div className="p-2 bg-green-100 rounded-lg">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Vehicles in Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Vehicles in Maintenance ({safeVehiclesInMaintenance.length})
                  </span>
                  <Button
                    size="sm"
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Maintenance
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {safeVehiclesInMaintenance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Car className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">No vehicles in maintenance</p>
                    <p className="text-sm">All vehicles are available for rental</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {safeVehiclesInMaintenance.slice(0, 5).map((vehicleData) => {
                      // CRITICAL: Safe access to nested arrays
                      const safeMaintenanceRecords = Array.isArray(vehicleData.maintenance_records) ? vehicleData.maintenance_records : [];
                      const safeVehicle = vehicleData.vehicle || {};
                      
                      return (
                        <div key={safeVehicle.id || Math.random()} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {safeVehicle.name || 'Unknown Vehicle'} ({safeVehicle.plate_number || 'N/A'})
                            </h4>
                            <span className="text-xs text-gray-500">
                              {safeMaintenanceRecords.length} open item{safeMaintenanceRecords.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="space-y-1">
                            {safeMaintenanceRecords.slice(0, 2).map((record) => (
                              <div key={record.id || Math.random()} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{record.maintenance_type || 'Unknown Type'}</span>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  MaintenanceTrackingService.getStatusColor(record.status)
                                }`}>
                                  {record.status || 'unknown'}
                                </span>
                              </div>
                            ))}
                            {safeMaintenanceRecords.length > 2 && (
                              <p className="text-xs text-gray-500">
                                +{safeMaintenanceRecords.length - 2} more items
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {safeVehiclesInMaintenance.length > 5 && (
                      <button
                        onClick={() => setActiveTab('maintenance')}
                        className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
                      >
                        View all {safeVehiclesInMaintenance.length} vehicles →
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming/Overdue Maintenance */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Upcoming & Overdue ({safeUpcomingMaintenance.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {safeUpcomingMaintenance.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-lg font-medium mb-2">All caught up!</p>
                    <p className="text-sm">No upcoming maintenance scheduled</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {safeUpcomingMaintenance.slice(0, 5).map((record) => {
                      // CRITICAL: Safe access to nested vehicle object
                      const safeVehicle = record.vehicle || {};
                      
                      return (
                        <div key={record.id || Math.random()} className={`p-3 rounded-lg border ${
                          MaintenanceTrackingService.getPriorityColor(record.priority)
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">
                              {safeVehicle.name || 'Unknown Vehicle'} - {record.maintenance_type || 'Unknown Type'}
                            </h4>
                            <span className="text-xs font-medium">
                              {record.isOverdue ? 'OVERDUE' : 'DUE SOON'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Scheduled: {MaintenanceTrackingService.formatDate(record.scheduled_date)}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              MaintenanceTrackingService.getStatusColor(record.status)
                            }`}>
                              {record.status || 'unknown'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    {safeUpcomingMaintenance.length > 5 && (
                      <button
                        onClick={() => setActiveTab('maintenance')}
                        className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-2"
                      >
                        View all {safeUpcomingMaintenance.length} items →
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Maintenance History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Recent Maintenance History
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {safeMaintenanceHistory.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium mb-2">No maintenance history</p>
                  <p className="text-sm">Start tracking maintenance to see history here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Vehicle</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Type</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Date</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Status</th>
                        <th className="text-left py-2 px-3 font-medium text-gray-900">Cost</th>
                      </tr>
                    </thead>
                    <tbody>
                      {safeMaintenanceHistory.slice(0, 10).map((record) => {
                        // CRITICAL: Safe access to nested vehicle object
                        const safeVehicle = record.vehicle || {};
                        
                        return (
                          <tr key={record.id || Math.random()} className="border-b border-gray-100">
                            <td className="py-2 px-3">
                              <div>
                                <p className="font-medium text-gray-900">{safeVehicle.name || 'Unknown Vehicle'}</p>
                                <p className="text-xs text-gray-500">{safeVehicle.plate_number || 'N/A'}</p>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-gray-600">{record.maintenance_type || 'Unknown Type'}</td>
                            <td className="py-2 px-3 text-gray-600">
                              {MaintenanceTrackingService.formatDate(record.scheduled_date)}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                MaintenanceTrackingService.getStatusColor(record.status)
                              }`}>
                                {record.status || 'unknown'}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-gray-900 font-medium">
                              {MaintenanceTrackingService.formatCurrency(record.total_cost_mad)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {safeMaintenanceHistory.length > 10 && (
                    <div className="text-center pt-4">
                      <button
                        onClick={() => setActiveTab('maintenance')}
                        className="text-sm text-blue-600 hover:text-blue-700"
                      >
                        View complete history →
                      </button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Maintenance Records Tab */}
      {activeTab === 'maintenance' && (
        <MaintenanceListView 
          onMaintenanceUpdated={handleMaintenanceUpdated}
          onAddMaintenance={() => setShowAddForm(true)}
        />
      )}

      {/* Pricing Catalog Tab */}
      {activeTab === 'pricing' && (
        <MaintenancePricingCatalog />
      )}

      {/* Add Maintenance Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <AddMaintenanceForm
              onCancel={() => setShowAddForm(false)}
              onSuccess={handleMaintenanceAdded}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceTrackingDashboard;