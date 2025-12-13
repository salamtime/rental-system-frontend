import React, { useState, useEffect } from 'react';
import { useVehicleAvailability } from '../../hooks/useVehicleAvailability';
import VehicleStatusBadge from '../VehicleStatusBadge';

const FleetStatusIndicator = ({ location, showDetails = false }) => {
  const { fleetStatus, loading, error } = useVehicleAvailability();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">Loading fleet status...</span>
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading fleet status: {error}
      </div>
    );
  }

  if (showDetails) {
    return (
      <div className="bg-white p-4 rounded-lg border">
        <h4 className="font-medium text-gray-900 mb-3">
          Fleet Status {location && `- ${location}`}
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Available:</span>
            <VehicleStatusBadge status="available" size="sm" showIcon={false} />
            <span className="font-medium">{fleetStatus.available}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Scheduled:</span>
            <VehicleStatusBadge status="scheduled" size="sm" showIcon={false} />
            <span className="font-medium">{fleetStatus.scheduled}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Rented:</span>
            <VehicleStatusBadge status="rented" size="sm" showIcon={false} />
            <span className="font-medium">{fleetStatus.rented}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600">Service:</span>
            <VehicleStatusBadge status="service" size="sm" showIcon={false} />
            <span className="font-medium">{fleetStatus.service}</span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between items-center font-medium">
              <span>Total Vehicles:</span>
              <span>{fleetStatus.available + fleetStatus.scheduled + fleetStatus.rented + fleetStatus.service}</span>
            </div>
            <div className="flex justify-between items-center text-green-600">
              <span>Available Now:</span>
              <span className="font-bold">{fleetStatus.available}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm text-gray-600">Fleet Status:</span>
      <div className="flex space-x-1">
        {fleetStatus.available > 0 && (
          <VehicleStatusBadge status="available" size="sm" />
        )}
        {fleetStatus.scheduled > 0 && (
          <VehicleStatusBadge status="scheduled" size="sm" />
        )}
        {fleetStatus.rented > 0 && (
          <VehicleStatusBadge status="rented" size="sm" />
        )}
        {fleetStatus.service > 0 && (
          <VehicleStatusBadge status="service" size="sm" />
        )}
      </div>
    </div>
  );
};

export default FleetStatusIndicator;