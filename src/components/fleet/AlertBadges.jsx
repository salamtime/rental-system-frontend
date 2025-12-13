import React from 'react';
import { Wrench, Fuel } from 'lucide-react';

const AlertBadges = ({ vehicle, onAlertClick }) => {
  const alerts = vehicle?.alerts || { maintenanceCount: 0, lowFuelCount: 0, totalCount: 0 };

  if (alerts.totalCount === 0) {
    return null;
  }

  const handleMaintenanceClick = () => {
    if (onAlertClick) {
      onAlertClick({
        type: 'maintenance',
        vehicleId: vehicle.id,
        vehicleName: vehicle.name || vehicle.model,
        count: alerts.maintenanceCount
      });
    }
  };

  const handleFuelClick = () => {
    if (onAlertClick) {
      onAlertClick({
        type: 'fuel',
        vehicleId: vehicle.id,
        vehicleName: vehicle.name || vehicle.model,
        count: alerts.lowFuelCount
      });
    }
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {/* Maintenance Alert Badge */}
      {alerts.maintenanceCount > 0 && (
        <button
          onClick={handleMaintenanceClick}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 hover:bg-orange-200 transition-colors"
          title={`${alerts.maintenanceCount} maintenance alert${alerts.maintenanceCount > 1 ? 's' : ''} pending`}
        >
          <Wrench className="w-3 h-3 mr-1" />
          {alerts.maintenanceCount} Maintenance
        </button>
      )}
      
      {/* Low Fuel Alert Badge */}
      {alerts.lowFuelCount > 0 && (
        <button
          onClick={handleFuelClick}
          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
          title="Vehicle fuel level is below threshold"
        >
          <Fuel className="w-3 h-3 mr-1" />
          Low Fuel
        </button>
      )}
    </div>
  );
};

export default AlertBadges;