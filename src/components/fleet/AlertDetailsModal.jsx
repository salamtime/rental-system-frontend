import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchVehicles } from '../../store/slices/vehiclesSlice';
import { format } from 'date-fns';
import { X, Wrench, Fuel, Calendar, AlertTriangle } from 'lucide-react';

const AlertDetailsModal = ({ isOpen, onClose, alertInfo }) => {
  const dispatch = useDispatch();
  const { vehicleAlerts, loading } = useSelector(state => state.vehicles);

  useEffect(() => {
    if (isOpen && alertInfo?.vehicleId) {
      // Fetch vehicles instead of non-existent alerts function
      dispatch(fetchVehicles());
    }
  }, [isOpen, alertInfo?.vehicleId, dispatch]);

  if (!isOpen || !alertInfo) return null;

  const vehicleAlertsData = vehicleAlerts[alertInfo.vehicleId];
  const alerts = alertInfo.type === 'maintenance' ? vehicleAlertsData?.maintenance || [] : vehicleAlertsData?.fuel || [];

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertIcon = () => {
    return alertInfo.type === 'maintenance' ? (
      <Wrench className="w-5 h-5 text-orange-600" />
    ) : (
      <Fuel className="w-5 h-5 text-red-600" />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            {getAlertIcon()}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {alertInfo.type === 'maintenance' ? 'Maintenance Alerts' : 'Fuel Alert'}
              </h2>
              <p className="text-sm text-gray-600">{alertInfo.vehicleName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading alert details...</span>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No detailed alert information available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert, index) => (
                <div key={alert.id || index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 mb-1">{alert.title}</h3>
                      <p className="text-sm text-gray-600">{alert.description}</p>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(alert.priority)}`}>
                      {alert.priority?.toUpperCase() || 'MEDIUM'}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {format(new Date(alert.date), 'MMM dd, yyyy HH:mm')}
                      </span>
                      <span>Status: {alert.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex justify-end space-x-3">
            {alertInfo.type === 'maintenance' && (
              <button className="px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 transition-colors">
                Schedule Maintenance
              </button>
            )}
            {alertInfo.type === 'fuel' && (
              <button className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors">
                Schedule Refuel
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlertDetailsModal;