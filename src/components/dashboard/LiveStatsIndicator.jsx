import React from 'react';
import { useSelector } from 'react-redux';
import { useDashboardStats } from '../../hooks/useDashboardStats';

const LiveStatsIndicator = () => {
  const liveStats = useDashboardStats();
  const vehiclesLoading = useSelector(state => state.vehicles.loading);
  const rentalsLoading = useSelector(state => state.rentals.loading);
  
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
        <span className="text-sm font-medium text-blue-800">Live Stats Connected</span>
      </div>
      <div className="text-xs text-blue-600 space-y-1">
        <div>Active Rentals: {rentalsLoading ? 'Loading...' : liveStats.activeRentals}</div>
        <div>Available Vehicles: {vehiclesLoading ? 'Loading...' : liveStats.availableVehicles}</div>
        <div>Total Vehicles: {vehiclesLoading ? 'Loading...' : liveStats.totalVehicles}</div>
      </div>
    </div>
  );
};

export default LiveStatsIndicator;