import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import MaintenanceTrackingService from '../../services/MaintenanceTrackingService';
import AddMaintenanceForm from './AddMaintenanceForm';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Calendar,
  Wrench,
  AlertTriangle,
  CheckCircle,
  Clock,
  Car,
  Package
} from 'lucide-react';

/**
 * MaintenanceListView - List and manage all maintenance records
 * 
 * CRITICAL: All arrays must have fallback values to prevent undefined.map() errors
 */
const MaintenanceListView = ({ onMaintenanceUpdated, onAddMaintenance }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // FIXED: Removed local success state to prevent duplicate notifications
  
  // Data states - ALWAYS INITIALIZE AS ARRAYS
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [sortBy, setSortBy] = useState('service_date');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal states
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // CRITICAL FIX: Add state for full record with parts data
  const [editingRecordWithParts, setEditingRecordWithParts] = useState(null);
  const [loadingFullRecord, setLoadingFullRecord] = useState(false);
  
  // ENHANCEMENT: Add state for view modal with complete data
  const [selectedRecordWithParts, setSelectedRecordWithParts] = useState(null);
  const [loadingViewRecord, setLoadingViewRecord] = useState(false);

  useEffect(() => {
    loadMaintenanceData();
  }, []);

  useEffect(() => {
    filterAndSortRecords();
  }, [maintenanceRecords, searchTerm, statusFilter, vehicleFilter, sortBy, sortOrder]);

  const loadMaintenanceData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [recordsData, vehiclesData] = await Promise.all([
        MaintenanceTrackingService.getAllMaintenanceRecords(),
        MaintenanceTrackingService.getAllVehicles()
      ]);

      // CRITICAL: Always ensure arrays, never undefined
      const safeRecords = recordsData || [];
      const safeVehicles = vehiclesData || [];

      setMaintenanceRecords(safeRecords);
      setVehicles(safeVehicles);

      console.log('✅ Maintenance data loaded:', safeRecords.length, 'records,', safeVehicles.length, 'vehicles');
    } catch (err) {
      console.error('Error loading maintenance data:', err);
      setError(`Failed to load maintenance data: ${err.message}`);
      // CRITICAL: Set empty arrays on error
      setMaintenanceRecords([]);
      setVehicles([]);
    } finally {
      setLoading(false);
    }
  };

  const filterAndSortRecords = () => {
    try {
      // CRITICAL: Always ensure we have an array
      let filtered = Array.isArray(maintenanceRecords) ? [...maintenanceRecords] : [];

      // Apply search filter
      if (searchTerm) {
        filtered = filtered.filter(record => 
          (record.maintenance_type || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
          (record.description || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        filtered = filtered.filter(record => record.status === statusFilter);
      }

      // Apply vehicle filter
      if (vehicleFilter !== 'all') {
        filtered = filtered.filter(record => record.vehicle_id === parseInt(vehicleFilter));
      }

      // Apply sorting
      filtered.sort((a, b) => {
        let aValue = a[sortBy] || '';
        let bValue = b[sortBy] || '';

        if (sortBy === 'service_date') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });

      setFilteredRecords(filtered);
    } catch (err) {
      console.error('Error filtering records:', err);
      setFilteredRecords([]);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    try {
      setLoading(true);
      await MaintenanceTrackingService.deleteMaintenanceRecord(recordId);
      
      // FIXED: Only call parent callback, no local success notification
      setShowDeleteModal(false);
      setSelectedRecord(null);
      
      await loadMaintenanceData();
      if (onMaintenanceUpdated) {
        onMaintenanceUpdated();
      }
    } catch (err) {
      console.error('Error deleting maintenance record:', err);
      setError(`Failed to delete maintenance record: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ENHANCEMENT: Load full maintenance record with parts data for viewing
  const handleViewRecord = async (record) => {
    try {
      console.log('👁️ Loading full maintenance record for viewing:', record.id);
      setLoadingViewRecord(true);
      setSelectedRecord(record);
      
      // Load the complete maintenance record with parts data
      const fullRecord = await MaintenanceTrackingService.getMaintenanceById(record.id);
      
      if (fullRecord) {
        console.log('✅ Full maintenance record loaded for viewing with parts:', fullRecord);
        console.log('🔍 Parts data for viewing:', fullRecord.parts_used);
        
        // Map the parts data for display
        const mappedRecord = {
          ...fullRecord,
          // Ensure parts_used is properly formatted for display
          parts_used: (fullRecord.parts_used || []).map(part => ({
            item_id: part.item_id,
            quantity: part.quantity || 0,
            notes: part.notes || '',
            item_name: part.inventory_item?.name || part.part_name || 'Unknown Item',
            unit_cost_mad: part.unit_cost_mad || 0,
            unit: part.inventory_item?.unit || 'units'
          })),
          // Map field names for compatibility
          scheduled_date: fullRecord.service_date || fullRecord.scheduled_date,
          notes: fullRecord.description || fullRecord.notes || ''
        };
        
        console.log('🔄 Mapped record for viewing:', mappedRecord);
        setSelectedRecordWithParts(mappedRecord);
        setShowViewModal(true);
      } else {
        // Fallback to basic record if full record fails to load
        console.warn('⚠️ Failed to load complete record, using basic record');
        setSelectedRecordWithParts(record);
        setShowViewModal(true);
      }
    } catch (err) {
      console.error('❌ Error loading full maintenance record for viewing:', err);
      // Fallback to basic record on error
      setSelectedRecordWithParts(record);
      setShowViewModal(true);
    } finally {
      setLoadingViewRecord(false);
    }
  };

  // CRITICAL FIX: Load full maintenance record with parts data for editing
  const handleEditRecord = async (record) => {
    try {
      console.log('🔧 Loading full maintenance record for editing:', record.id);
      setLoadingFullRecord(true);
      setSelectedRecord(record);
      
      // Load the complete maintenance record with parts data
      const fullRecord = await MaintenanceTrackingService.getMaintenanceById(record.id);
      
      if (fullRecord) {
        console.log('✅ Full maintenance record loaded with parts:', fullRecord);
        console.log('🔍 Parts data:', fullRecord.parts_used);
        
        // Map the parts data to the format expected by AddMaintenanceForm
        const mappedRecord = {
          ...fullRecord,
          // Ensure parts_used is properly formatted
          parts_used: (fullRecord.parts_used || []).map(part => ({
            item_id: part.item_id?.toString() || '',
            quantity: part.quantity || 0,
            notes: part.notes || '',
            // Include additional data for display
            item_name: part.inventory_item?.name || part.part_name || 'Unknown Item',
            unit_cost_mad: part.unit_cost_mad || 0
          })),
          // Map field names for compatibility
          scheduled_date: fullRecord.service_date || fullRecord.scheduled_date,
          notes: fullRecord.description || fullRecord.notes || ''
        };
        
        console.log('🔄 Mapped record for editing:', mappedRecord);
        setEditingRecordWithParts(mappedRecord);
        setShowEditModal(true);
      } else {
        throw new Error('Failed to load maintenance record details');
      }
    } catch (err) {
      console.error('❌ Error loading full maintenance record:', err);
      setError(`Failed to load maintenance details: ${err.message}`);
    } finally {
      setLoadingFullRecord(false);
    }
  };

  const handleEditSuccess = async () => {
    // FIXED: Only call parent callback, no local success notification
    setShowEditModal(false);
    setSelectedRecord(null);
    setEditingRecordWithParts(null);
    
    await loadMaintenanceData();
    if (onMaintenanceUpdated) {
      onMaintenanceUpdated();
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setSelectedRecord(null);
    setEditingRecordWithParts(null);
  };

  const handleViewClose = () => {
    setShowViewModal(false);
    setSelectedRecord(null);
    setSelectedRecordWithParts(null);
  };

  const getVehicleName = (vehicleId) => {
    // CRITICAL: Always ensure vehicles is an array
    const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
    const vehicle = safeVehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.name} (${vehicle.plate_number})` : 'Unknown Vehicle';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'in_progress': return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading && maintenanceRecords.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Maintenance Records</h2>
          <p className="text-gray-600">
            Manage and track all maintenance activities ({(filteredRecords || []).length} records)
          </p>
        </div>
        <Button
          onClick={onAddMaintenance}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Maintenance
        </Button>
      </div>

      {/* FIXED: Removed local success message display - only show errors */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search maintenance..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            {/* Vehicle Filter */}
            <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by vehicle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vehicles</SelectItem>
                {(vehicles || []).map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id.toString()}>
                    {vehicle.name} ({vehicle.plate_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
              const [field, order] = value.split('-');
              setSortBy(field);
              setSortOrder(order);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service_date-desc">Date (Newest)</SelectItem>
                <SelectItem value="service_date-asc">Date (Oldest)</SelectItem>
                <SelectItem value="maintenance_type-asc">Type (A-Z)</SelectItem>
                <SelectItem value="maintenance_type-desc">Type (Z-A)</SelectItem>
                <SelectItem value="status-asc">Status (A-Z)</SelectItem>
                <SelectItem value="cost-desc">Cost (High-Low)</SelectItem>
                <SelectItem value="cost-asc">Cost (Low-High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Records List */}
      <Card>
        <CardContent className="p-0">
          {(filteredRecords || []).length === 0 ? (
            <div className="text-center py-12">
              <Car className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No maintenance records found</h3>
              <p className="text-gray-500 mb-4">
                {(maintenanceRecords || []).length === 0 
                  ? "Start by adding your first maintenance record"
                  : "Try adjusting your filters to see more records"
                }
              </p>
              <Button onClick={onAddMaintenance} className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Add First Maintenance Record
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Vehicle</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Service Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Cost</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(filteredRecords || []).map((record) => (
                    <tr key={record.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {getVehicleName(record.vehicle_id)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {record.maintenance_type || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(record.status)}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            MaintenanceTrackingService.getStatusColor(record.status)
                          }`}>
                            {record.status || 'unknown'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {MaintenanceTrackingService.formatDate(record.service_date)}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900">
                        {MaintenanceTrackingService.formatCurrency(record.cost)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleViewRecord(record)}
                            disabled={loadingViewRecord}
                            className="flex items-center gap-1"
                          >
                            {loadingViewRecord && selectedRecord?.id === record.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <Eye className="w-3 h-3" />
                                View
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditRecord(record)}
                            disabled={loadingFullRecord}
                            className="flex items-center gap-1"
                          >
                            {loadingFullRecord && selectedRecord?.id === record.id ? (
                              <>
                                <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Loading...
                              </>
                            ) : (
                              <>
                                <Edit className="w-3 h-3" />
                                Edit
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedRecord(record);
                              setShowDeleteModal(true);
                            }}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ENHANCED View Modal - Now shows parts information */}
      {showViewModal && selectedRecordWithParts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Maintenance Record Details</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewClose}
                >
                  Close
                </Button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle</label>
                    <p className="text-gray-900">{getVehicleName(selectedRecordWithParts.vehicle_id)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Maintenance Type</label>
                    <p className="text-gray-900">{selectedRecordWithParts.maintenance_type || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedRecordWithParts.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        MaintenanceTrackingService.getStatusColor(selectedRecordWithParts.status)
                      }`}>
                        {selectedRecordWithParts.status || 'unknown'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Service Date</label>
                    <p className="text-gray-900">{MaintenanceTrackingService.formatDate(selectedRecordWithParts.service_date)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
                    <p className="text-gray-900 font-medium">{MaintenanceTrackingService.formatCurrency(selectedRecordWithParts.cost)}</p>
                  </div>
                  {selectedRecordWithParts.next_service_date && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Next Service Date</label>
                      <p className="text-gray-900">{MaintenanceTrackingService.formatDate(selectedRecordWithParts.next_service_date)}</p>
                    </div>
                  )}
                </div>

                {/* ENHANCEMENT: Parts Used Section */}
                {selectedRecordWithParts?.parts_used && selectedRecordWithParts.parts_used.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Parts Used
                    </label>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {selectedRecordWithParts.parts_used.map((part, index) => (
                        <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">{part.item_name || 'Unknown Part'}</span>
                              <span className="text-gray-500 text-sm">x{part.quantity} {part.unit || 'units'}</span>
                            </div>
                            {part.notes && (
                              <p className="text-xs text-gray-600 mt-1">{part.notes}</p>
                            )}
                          </div>
                          <div className="text-right ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {MaintenanceTrackingService.formatCurrency(part.unit_cost_mad * part.quantity)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {MaintenanceTrackingService.formatCurrency(part.unit_cost_mad)} each
                            </div>
                          </div>
                        </div>
                      ))}
                      <div className="mt-3 pt-2 border-t border-gray-200">
                        <div className="flex justify-between items-center text-sm font-medium">
                          <span className="text-gray-700">Total Parts Cost:</span>
                          <span className="text-gray-900">
                            {MaintenanceTrackingService.formatCurrency(
                              selectedRecordWithParts.parts_used.reduce((total, part) => 
                                total + (part.unit_cost_mad * part.quantity), 0
                              )
                            )}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* No Parts Message */}
                {(!selectedRecordWithParts?.parts_used || selectedRecordWithParts.parts_used.length === 0) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Parts Used
                    </label>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600 text-sm">No parts used in this maintenance</p>
                    </div>
                  </div>
                )}

                {selectedRecordWithParts.description && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{selectedRecordWithParts.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRITICAL FIX: Edit Modal - Now uses full record with parts data */}
      {showEditModal && editingRecordWithParts && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <AddMaintenanceForm
              editingRecord={editingRecordWithParts}
              onCancel={handleEditCancel}
              onSuccess={handleEditSuccess}
            />
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Maintenance Record</h3>
              </div>
              
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this maintenance record for{' '}
                <strong>{getVehicleName(selectedRecord.vehicle_id)}</strong>? This action cannot be undone.
              </p>

              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedRecord(null);
                  }}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDeleteRecord(selectedRecord.id)}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Delete Record
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MaintenanceListView;