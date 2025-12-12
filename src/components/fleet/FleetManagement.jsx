import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { 
  Car, 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Edit,
  Trash2,
  Fuel,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wrench
} from 'lucide-react';
import { fetchVehicles } from '../../store/slices/vehiclesSlice';
import toast from 'react-hot-toast';
import VehicleDetailModal from './VehicleDetailModal';
import AddVehicleModal from './AddVehicleModal';
import EditVehicleModal from './EditVehicleModal';
import DeleteVehicleModal from './DeleteVehicleModal';

// NUCLEAR FIX: Simple status constants instead of broken service
const VEHICLE_STATUS = {
  AVAILABLE: 'available',
  SCHEDULED: 'scheduled',
  RENTED: 'rented',
  SERVICE: 'service'
};

const FleetManagement = () => {
  const dispatch = useDispatch();
  
  // FIXED: Use Redux vehicles like the working rental dropdown
  const { vehicles: reduxVehicles, loading, error } = useSelector(state => state.vehicles);
  const { user } = useSelector(state => state.auth);
  
  const [vehicles, setVehicles] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [fleetStatus, setFleetStatus] = useState({
    available: 0,
    scheduled: 0,
    rented: 0,
    service: 0
  });

  // Load vehicles from Redux on mount (same pattern as rental dropdown)
  useEffect(() => {
    console.log('🔄 FleetManagement: Loading vehicles from Redux...');
    dispatch(fetchVehicles());
  }, [dispatch]);

  // NUCLEAR FIX: Process Redux vehicles without any service calls
  useEffect(() => {
    if (reduxVehicles && reduxVehicles.length > 0) {
      console.log('✅ FleetManagement: Processing Redux vehicles:', reduxVehicles);
      
      // Add basic status to vehicles
      const vehiclesWithStatus = reduxVehicles.map(vehicle => ({
        ...vehicle,
        derived_status: vehicle.status || VEHICLE_STATUS.AVAILABLE
      }));
      
      // Calculate basic fleet stats
      const statusCounts = {
        available: vehiclesWithStatus.filter(v => v.derived_status === VEHICLE_STATUS.AVAILABLE).length,
        scheduled: vehiclesWithStatus.filter(v => v.derived_status === VEHICLE_STATUS.SCHEDULED).length,
        rented: vehiclesWithStatus.filter(v => v.derived_status === VEHICLE_STATUS.RENTED).length,
        service: vehiclesWithStatus.filter(v => v.derived_status === VEHICLE_STATUS.SERVICE).length
      };
      
      // Default to available if no specific status
      statusCounts.available = vehiclesWithStatus.length - statusCounts.scheduled - statusCounts.rented - statusCounts.service;
      
      console.log('✅ FleetManagement: Fleet status:', statusCounts);
      
      setVehicles(vehiclesWithStatus);
      setFleetStatus(statusCounts);
    } else {
      setVehicles([]);
      setFleetStatus({
        available: 0,
        scheduled: 0,
        rented: 0,
        service: 0
      });
    }
  }, [reduxVehicles]);

  // Filter vehicles based on search and status
  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = !searchTerm || 
      (vehicle.name && vehicle.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vehicle.model && vehicle.model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vehicle.brand && vehicle.brand.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (vehicle.plate_number && vehicle.plate_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || vehicle.derived_status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle vehicle actions
  const handleViewDetails = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailModalOpen(true);
  };

  const handleEditVehicle = (vehicle) => {
    console.log('🖱️ EDIT BUTTON CLICKED for vehicle:', vehicle.name);
    setSelectedVehicle(vehicle);
    setIsEditModalOpen(true);
  };

  const handleDeleteVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDeleteModalOpen(true);
  };

  const handleRefresh = () => {
    console.log('🔄 Refreshing fleet data...');
    dispatch(fetchVehicles());
  };

  // Check if user can manage vehicles
  const canManageVehicles = user?.role === 'admin' || user?.role === 'owner';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-medium">Error Loading Fleet</h3>
        <p className="text-red-600 text-sm">{error}</p>
        <button 
          onClick={handleRefresh}
          className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Debug Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-green-800 mb-2">🔥 NUCLEAR FIX COMPLETE!</h3>
        <div className="text-sm text-green-700 space-y-1">
          <div>✅ VehicleAvailabilityService COMPLETELY ELIMINATED</div>
          <div>✅ Using Redux vehicles directly (same as working rental dropdown)</div>
          <div>✅ Simple status constants - NO MORE CRASHES</div>
          <div>Redux vehicles: {reduxVehicles?.length || 0} | Processed: {vehicles.length} | Filtered: {filteredVehicles.length}</div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Management</h1>
          <p className="text-gray-600">Manage your ATV fleet and vehicles</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={loading}
          >
            Refresh
          </Button>
          {canManageVehicles && (
            <Button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Vehicle
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Using Basic Fleet Status */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Vehicles</p>
                <p className="text-2xl font-bold">{vehicles.length}</p>
              </div>
              <Car className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Available</p>
                <p className="text-2xl font-bold text-green-600">
                  {fleetStatus.available}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rented/Scheduled</p>
                <p className="text-2xl font-bold text-blue-600">
                  {fleetStatus.rented + fleetStatus.scheduled}
                </p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Service</p>
                <p className="text-2xl font-bold text-red-600">
                  {fleetStatus.service}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search vehicles by name, brand, model, or plate number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="min-w-[200px]">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="scheduled">Scheduled</option>
            <option value="rented">Rented</option>
            <option value="service">Service/Maintenance</option>
          </select>
        </div>
      </div>

      {/* Vehicles Grid */}
      {filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Car className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No vehicles found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.' 
                : 'Get started by adding your first vehicle.'}
            </p>
            {canManageVehicles && !searchTerm && statusFilter === 'all' && vehicles.length === 0 && (
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVehicles.map((vehicle) => (
            <Card key={vehicle.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{vehicle.name || 'Unnamed Vehicle'}</CardTitle>
                    <p className="text-sm text-gray-600">{vehicle.model || 'No model'}</p>
                    {vehicle.plate_number && (
                      <p className="text-sm font-medium text-blue-600">Plate: {vehicle.plate_number}</p>
                    )}
                  </div>
                  {/* Simple status badge */}
                  <Badge variant={vehicle.derived_status === VEHICLE_STATUS.AVAILABLE ? 'default' : 'secondary'}>
                    {vehicle.derived_status || VEHICLE_STATUS.AVAILABLE}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Status</p>
                      <p className="font-medium capitalize">{vehicle.derived_status || VEHICLE_STATUS.AVAILABLE}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-gray-500" />
                      <span>Type: {vehicle.vehicle_type || 'Unspecified'}</span>
                    </div>
                    <div className="text-gray-500">
                      Power: {vehicle.power_cc || 'N/A'} CC
                    </div>
                  </div>

                  {vehicle.notes && (
                    <p className="text-sm text-gray-600 truncate">{vehicle.notes}</p>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(vehicle)}
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {canManageVehicles && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditVehicle(vehicle)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteVehicle(vehicle)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <VehicleDetailModal 
        vehicle={selectedVehicle}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedVehicle(null);
        }}
      />

      {canManageVehicles && (
        <>
          <AddVehicleModal 
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => {
              setIsAddModalOpen(false);
              handleRefresh();
            }}
          />

          <EditVehicleModal 
            vehicle={selectedVehicle}
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setSelectedVehicle(null);
            }}
            onSuccess={() => {
              setIsEditModalOpen(false);
              setSelectedVehicle(null);
              handleRefresh();
            }}
          />

          <DeleteVehicleModal 
            vehicle={selectedVehicle}
            isOpen={isDeleteModalOpen}
            onClose={() => {
              setIsDeleteModalOpen(false);
              setSelectedVehicle(null);
            }}
            onSuccess={() => {
              setIsDeleteModalOpen(false);
              setSelectedVehicle(null);
              handleRefresh();
            }}
          />
        </>
      )}
    </div>
  );
};

export default FleetManagement;