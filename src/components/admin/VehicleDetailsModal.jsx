import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabaseClient';
import { 
  XCircleIcon, 
  TruckIcon, 
  WrenchIcon, 
  ShieldIcon, 
  ClockIcon, 
  CalendarIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  FileTextIcon,
  DollarSignIcon,
  UserIcon,
  MapPinIcon,
  SettingsIcon
} from 'lucide-react';

const VehicleDetailsModal = ({ isOpen, onClose, vehicle }) => {
  const { t } = useTranslation();
  const [maintenanceHistory, setMaintenanceHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load maintenance history when modal opens
  useEffect(() => {
    if (isOpen && vehicle?.id) {
      loadMaintenanceHistory(vehicle.id);
    }
  }, [isOpen, vehicle?.id]);

  // Load maintenance history from the correct Supabase table
  const loadMaintenanceHistory = async (vehicleId) => {
    setLoading(true);
    try {
      console.log('🔍 Loading maintenance history for vehicle:', vehicleId);
      
      // Query the correct maintenance table used by the maintenance system
      const { data, error } = await supabase
        .from('saharax_0u4w4d_maintenance')
        .select(`
          *,
          vehicle:vehicle_id(id, name, model, image_url),
          parts:saharax_0u4w4d_maintenance_parts(*)
        `)
        .eq('vehicle_id', vehicleId)
        .order('date', { ascending: false });

      if (error) {
        console.error('❌ Error loading maintenance records:', error);
        throw error;
      }

      console.log('✅ Raw maintenance data loaded:', data);

      // Transform the data to match the expected format for display
      const transformedData = (data || []).map(record => {
        // Calculate total cost from parts
        const totalCost = record.parts?.reduce((sum, part) => {
          return sum + (parseFloat(part.total_cost) || 0);
        }, 0) || 0;

        return {
          id: record.id,
          service_date: record.date,
          service_type: record.description || record.type || 'Maintenance Service',
          odometer_reading: record.odometer_reading,
          engine_hours: record.engine_hours,
          service_notes: record.notes || record.details || '',
          performed_by: record.technician || '',
          cost: totalCost
        };
      });

      console.log('✅ Transformed maintenance data:', transformedData);
      setMaintenanceHistory(transformedData);
    } catch (error) {
      console.error('❌ Error loading maintenance history:', error);
      setMaintenanceHistory([]);
    } finally {
      setLoading(false);
    }
  };

  // Get status badge styling
  const getStatusBadge = (status) => {
    const statusConfig = {
      available: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon, text: 'Available' },
      rented: { color: 'bg-blue-100 text-blue-800', icon: TruckIcon, text: 'Rented' },
      maintenance: { color: 'bg-yellow-100 text-yellow-800', icon: WrenchIcon, text: 'In Maintenance' },
      out_of_service: { color: 'bg-red-100 text-red-800', icon: XCircleIcon, text: 'Out of Service' }
    };
    
    const config = statusConfig[status] || statusConfig.available;
    const IconComponent = config.icon;
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-1.5" />
        {config.text}
      </span>
    );
  };

  // Check if dates are expired or due soon
  const isExpiringSoon = (date) => {
    if (!date) return false;
    const today = new Date();
    const expiryDate = new Date(date);
    const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isExpired = (date) => {
    if (!date) return false;
    const today = new Date();
    const expiryDate = new Date(date);
    return expiryDate < today;
  };

  // Format date for display
  const formatDate = (date) => {
    if (!date) return 'Not set';
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  // Format number with commas
  const formatNumber = (num) => {
    if (!num || isNaN(num)) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Get maintenance alerts
  const getMaintenanceAlerts = () => {
    const alerts = [];
    const today = new Date();
    
    if (vehicle?.next_oil_change_due) {
      const dueDate = new Date(vehicle.next_oil_change_due);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDue <= 0) {
        alerts.push({ type: 'error', message: 'Oil change is overdue!', icon: AlertTriangleIcon });
      } else if (daysUntilDue <= 7) {
        alerts.push({ type: 'warning', message: `Oil change due in ${daysUntilDue} days`, icon: WrenchIcon });
      }
    }
    
    if (vehicle?.registration_expiry_date) {
      const expiryDate = new Date(vehicle.registration_expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        alerts.push({ type: 'error', message: 'Registration has expired!', icon: AlertTriangleIcon });
      } else if (daysUntilExpiry <= 30) {
        alerts.push({ type: 'warning', message: `Registration expires in ${daysUntilExpiry} days`, icon: ShieldIcon });
      }
    }
    
    if (vehicle?.insurance_expiry_date) {
      const expiryDate = new Date(vehicle.insurance_expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiry <= 0) {
        alerts.push({ type: 'error', message: 'Insurance has expired!', icon: AlertTriangleIcon });
      } else if (daysUntilExpiry <= 30) {
        alerts.push({ type: 'warning', message: `Insurance expires in ${daysUntilExpiry} days`, icon: ShieldIcon });
      }
    }
    
    return alerts;
  };

  const alerts = getMaintenanceAlerts();

  if (!isOpen || !vehicle) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
      <div className="relative w-full max-w-6xl max-h-[95vh] bg-white rounded-xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <TruckIcon className="h-8 w-8" />
              <div>
                <h2 className="text-2xl font-bold">{vehicle.name || 'Vehicle Details'}</h2>
                <p className="text-blue-100 text-sm">{vehicle.model} • {vehicle.vehicle_type}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {getStatusBadge(vehicle.status)}
              <button 
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-white hover:bg-opacity-20"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
          
          {/* System Alerts */}
          {alerts.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-medium text-blue-100">System Alerts</h4>
              {alerts.map((alert, index) => {
                const IconComponent = alert.icon;
                return (
                  <div key={index} className={`flex items-center p-3 rounded-lg text-sm ${
                    alert.type === 'error' 
                      ? 'bg-red-100 text-red-800 border border-red-200' 
                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                  }`}>
                    <IconComponent className="h-4 w-4 mr-2 flex-shrink-0" />
                    {alert.message}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-200px)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Left Column */}
            <div className="space-y-6">
              
              {/* Basic Information */}
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-200">
                <h3 className="font-semibold text-lg mb-4 text-blue-900 flex items-center">
                  <FileTextIcon className="h-5 w-5 mr-2" />
                  Basic Information
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID:</span>
                    <span className="font-medium">{vehicle.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <div>{getStatusBadge(vehicle.status)}</div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Model:</span>
                    <span className="font-medium">{vehicle.model || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium capitalize">{vehicle.vehicle_type?.replace('_', ' ') || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Color:</span>
                    <span className="font-medium">{vehicle.color || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="font-medium">{vehicle.capacity ? `${vehicle.capacity} ${vehicle.capacity === 1 ? 'person' : 'people'}` : 'Not specified'}</span>
                  </div>
                  {vehicle.user_email && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Owner:</span>
                      <span className="font-medium">{vehicle.user_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Fleet Information */}
              <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                <h3 className="font-semibold text-lg mb-4 text-green-900 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Fleet Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Current Odometer</span>
                      <SettingsIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {vehicle.current_odometer ? `${formatNumber(vehicle.current_odometer)} km` : 'Not recorded'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Engine Hours</span>
                      <ClockIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      {vehicle.engine_hours ? `${vehicle.engine_hours} hrs` : 'Not recorded'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Last Oil Change</span>
                      <WrenchIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-900 mt-1">
                      {formatDate(vehicle.last_oil_change_date)}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Next Oil Change Due</span>
                      <CalendarIcon className="h-4 w-4 text-gray-400" />
                    </div>
                    <p className={`text-lg font-medium mt-1 ${
                      isExpired(vehicle.next_oil_change_due) ? 'text-red-600' : 
                      isExpiringSoon(vehicle.next_oil_change_due) ? 'text-yellow-600' : 'text-gray-900'
                    }`}>
                      {formatDate(vehicle.next_oil_change_due)}
                      {isExpired(vehicle.next_oil_change_due) && (
                        <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">OVERDUE</span>
                      )}
                      {isExpiringSoon(vehicle.next_oil_change_due) && !isExpired(vehicle.next_oil_change_due) && (
                        <span className="ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">DUE SOON</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Legal & Administrative */}
              <div className="bg-red-50 p-6 rounded-xl border border-red-200">
                <h3 className="font-semibold text-lg mb-4 text-red-900 flex items-center">
                  <ShieldIcon className="h-5 w-5 mr-2" />
                  Legal & Administrative
                </h3>
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600">Registration Number</p>
                        <p className="text-lg font-medium text-gray-900">
                          {vehicle.registration_number || 'Not set'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Expires</p>
                        <p className={`text-sm font-medium ${
                          isExpired(vehicle.registration_expiry_date) ? 'text-red-600' : 
                          isExpiringSoon(vehicle.registration_expiry_date) ? 'text-yellow-600' : 'text-gray-900'
                        }`}>
                          {formatDate(vehicle.registration_expiry_date)}
                          {isExpired(vehicle.registration_expiry_date) && (
                            <span className="ml-1 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">EXPIRED</span>
                          )}
                          {isExpiringSoon(vehicle.registration_expiry_date) && !isExpired(vehicle.registration_expiry_date) && (
                            <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">SOON</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-600">Insurance Policy</p>
                        <p className="text-lg font-medium text-gray-900">
                          {vehicle.insurance_policy_number || 'Not set'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Expires</p>
                        <p className={`text-sm font-medium ${
                          isExpired(vehicle.insurance_expiry_date) ? 'text-red-600' : 
                          isExpiringSoon(vehicle.insurance_expiry_date) ? 'text-yellow-600' : 'text-gray-900'
                        }`}>
                          {formatDate(vehicle.insurance_expiry_date)}
                          {isExpired(vehicle.insurance_expiry_date) && (
                            <span className="ml-1 text-xs bg-red-100 text-red-800 px-1 py-0.5 rounded">EXPIRED</span>
                          )}
                          {isExpiringSoon(vehicle.insurance_expiry_date) && !isExpired(vehicle.insurance_expiry_date) && (
                            <span className="ml-1 text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">SOON</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Vehicle Image */}
              {vehicle.image_url && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900">Vehicle Image</h3>
                  <div className="flex justify-center">
                    <img 
                      src={vehicle.image_url} 
                      alt={vehicle.name}
                      className="max-w-full max-h-64 object-cover rounded-lg shadow-sm"
                    />
                  </div>
                </div>
              )}

              {/* Specifications */}
              <div className="bg-purple-50 p-6 rounded-xl border border-purple-200">
                <h3 className="font-semibold text-lg mb-4 text-purple-900 flex items-center">
                  <SettingsIcon className="h-5 w-5 mr-2" />
                  Specifications
                </h3>
                <div className="space-y-3">
                  {vehicle.power_cc && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Engine:</span>
                      <span className="font-medium">{vehicle.power_cc}cc</span>
                    </div>
                  )}
                  {vehicle.capacity && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium">{vehicle.capacity} {vehicle.capacity === 1 ? 'person' : 'people'}</span>
                    </div>
                  )}
                  {vehicle.color && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Color:</span>
                      <span className="font-medium">{vehicle.color}</span>
                    </div>
                  )}
                  {vehicle.features && Array.isArray(vehicle.features) && vehicle.features.length > 0 && (
                    <div>
                      <span className="text-gray-600 block mb-2">Features:</span>
                      <div className="flex flex-wrap gap-2">
                        {vehicle.features.map((feature, index) => (
                          <span key={index} className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Maintenance History - FIXED */}
              <div className="bg-yellow-50 p-6 rounded-xl border border-yellow-200">
                <h3 className="font-semibold text-lg mb-4 text-yellow-900 flex items-center">
                  <WrenchIcon className="h-5 w-5 mr-2" />
                  Maintenance History
                  <span className="ml-2 text-sm font-normal text-yellow-700">
                    ({maintenanceHistory.length} {maintenanceHistory.length === 1 ? 'record' : 'records'})
                  </span>
                </h3>
                
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-600"></div>
                  </div>
                ) : maintenanceHistory.length > 0 ? (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {maintenanceHistory.map((entry, index) => (
                      <div key={entry.id || index} className="bg-white p-4 rounded-lg shadow-sm border border-yellow-200">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium text-gray-900">{entry.service_type}</p>
                            <p className="text-sm text-gray-600">{formatDate(entry.service_date)}</p>
                          </div>
                          <div className="text-right">
                            {entry.cost && entry.cost > 0 && (
                              <p className="font-medium text-gray-900 flex items-center">
                                <DollarSignIcon className="h-4 w-4 mr-1" />
                                ${typeof entry.cost === 'number' ? entry.cost.toFixed(2) : entry.cost}
                              </p>
                            )}
                            {entry.performed_by && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <UserIcon className="h-3 w-3 mr-1" />
                                {entry.performed_by}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-2">
                          <div>
                            <span className="font-medium">Odometer:</span> {
                              entry.odometer_reading && entry.odometer_reading > 0 
                                ? `${formatNumber(entry.odometer_reading)} km` 
                                : 'Not recorded'
                            }
                          </div>
                          <div>
                            <span className="font-medium">Hours:</span> {
                              entry.engine_hours && entry.engine_hours > 0 
                                ? `${entry.engine_hours} hrs` 
                                : 'Not recorded'
                            }
                          </div>
                        </div>
                        
                        {entry.service_notes && entry.service_notes.trim() && (
                          <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">
                            {entry.service_notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <WrenchIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">No maintenance history recorded yet.</p>
                  </div>
                )}
              </div>

              {/* Additional Notes */}
              {(vehicle.general_notes || vehicle.notes) && (
                <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                  <h3 className="font-semibold text-lg mb-4 text-gray-900 flex items-center">
                    <FileTextIcon className="h-5 w-5 mr-2" />
                    Additional Notes
                  </h3>
                  <div className="space-y-4">
                    {vehicle.general_notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">General Notes:</p>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-gray-900 whitespace-pre-wrap">{vehicle.general_notes}</p>
                        </div>
                      </div>
                    )}
                    {vehicle.notes && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">System Notes:</p>
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                          <p className="text-gray-900 whitespace-pre-wrap">{vehicle.notes}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsModal;