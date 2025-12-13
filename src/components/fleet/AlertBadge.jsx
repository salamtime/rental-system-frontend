import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { fetchVehicleAlerts } from '../../store/slices/vehiclesSlice';
import AlertModal from './AlertModal';

const AlertBadge = ({ vehicle }) => {
  const dispatch = useDispatch();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const alerts = vehicle.alerts || { totalCount: 0, maintenanceCount: 0, lowFuelCount: 0 };

  const handleBadgeClick = async () => {
    if (alerts.totalCount === 0) return;
    
    setLoading(true);
    try {
      await dispatch(fetchVehicleAlerts(vehicle.id)).unwrap();
      setShowModal(true);
    } catch (error) {
      console.error('Error fetching vehicle alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (alerts.totalCount === 0) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
        ✓ No Alerts
      </span>
    );
  }

  const getBadgeColor = () => {
    if (alerts.lowFuelCount > 0) return 'bg-red-100 text-red-800 border-red-200';
    if (alerts.maintenanceCount > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const getAlertText = () => {
    const alerts_array = [];
    if (alerts.maintenanceCount > 0) {
      alerts_array.push(`${alerts.maintenanceCount} Maintenance`);
    }
    if (alerts.lowFuelCount > 0) {
      alerts_array.push('Low Fuel');
    }
    return alerts_array.join(', ') || `${alerts.totalCount} Alert${alerts.totalCount > 1 ? 's' : ''}`;
  };

  return (
    <>
      <button
        onClick={handleBadgeClick}
        disabled={loading}
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border cursor-pointer hover:shadow-sm transition-all duration-200 ${getBadgeColor()}`}
      >
        {loading ? (
          <>
            <svg className="animate-spin -ml-1 mr-1 h-3 w-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading...
          </>
        ) : (
          <>
            {alerts.lowFuelCount > 0 && <span className="mr-1">⚠️</span>}
            {alerts.maintenanceCount > 0 && <span className="mr-1">🔧</span>}
            {getAlertText()}
          </>
        )}
      </button>

      {showModal && (
        <AlertModal
          vehicleId={vehicle.id}
          isOpen={showModal}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};

export default AlertBadge;