import React from 'react';
import { Car, Edit, Trash2, FileText, Calendar, AlertTriangle, File } from 'lucide-react';

interface Vehicle {
  id: number;
  name: string;
  model: string;
  vehicle_type: string;
  power_cc: number;
  capacity: number;
  status: 'available' | 'rented' | 'maintenance' | 'out_of_service';
  image_url: string;
  plate_number: string;
  current_odometer: string | null;
  engine_hours: string | null;
  next_oil_change_due: string | null;
  next_oil_change_odometer: string | null;
  last_oil_change_odometer: string | null;
  document_count?: number;
}

interface VehicleGridViewProps {
  vehicles: Vehicle[];
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (id: number) => void;
  getStatusColor: (status: string) => string;
  isMaintenanceDue: (vehicle: Vehicle) => boolean;
  getOilChangeProgress: (vehicle: Vehicle) => number;
  isOilChangeDue: (vehicle: Vehicle) => boolean;
}

const VehicleGridView: React.FC<VehicleGridViewProps> = ({
  vehicles,
  onView,
  onEdit,
  onDelete,
  getStatusColor,
  isMaintenanceDue,
  getOilChangeProgress,
  isOilChangeDue: isOilChangeDueProp
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {vehicles.map((vehicle) => (
        <div key={vehicle.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
          <div className="relative">
            {vehicle.image_url ? (
              <img
                src={vehicle.image_url}
                alt={vehicle.name}
                className="w-full h-48 object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                <Car className="w-16 h-16 text-gray-400" />
              </div>
            )}
            
            {isMaintenanceDue(vehicle) && (
              <div className="absolute top-2 right-2 bg-yellow-500 text-white p-1 rounded-full">
                <AlertTriangle className="w-4 h-4" />
              </div>
            )}
            
            <div className="absolute top-2 left-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(vehicle.status)}`}>
                {vehicle.status}
              </span>
            </div>

            {vehicle.document_count && vehicle.document_count > 0 && (
              <div className="absolute bottom-2 right-2 bg-indigo-500 text-white px-2 py-1 rounded-full shadow-lg">
                <div className="flex items-center gap-1">
                  <File className="w-3 h-3" />
                  <span className="text-xs font-medium">{vehicle.document_count}</span>
                </div>
              </div>
            )}
          </div>
          
          <div className="p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{vehicle.name}</h3>
              <div className="flex gap-1">
                <button
                  onClick={() => onView(vehicle)}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                  title="View Details"
                >
                  <FileText className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onEdit(vehicle)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit Vehicle"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(vehicle.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  title="Delete Vehicle"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-2">{vehicle.model} • {vehicle.vehicle_type}</p>
            <p className="text-sm text-gray-600 mb-2">Plate: {vehicle.plate_number}</p>
            
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>Power: {vehicle.power_cc}cc</div>
              <div>Capacity: {vehicle.capacity}</div>
              {vehicle.current_odometer && (
                <div>Odometer: {vehicle.current_odometer}km</div>
              )}
              {vehicle.engine_hours && (
                <div>Hours: {vehicle.engine_hours}h</div>
              )}
            </div>
            
            {vehicle.current_odometer && vehicle.next_oil_change_odometer && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Oil Change</span>
                  <span>{vehicle.current_odometer}/{vehicle.next_oil_change_odometer} km</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      isOilChangeDueProp(vehicle) ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(getOilChangeProgress(vehicle) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
            
            {vehicle.next_oil_change_due && !vehicle.next_oil_change_odometer && (
              <div className="mt-2 text-xs">
                <span className={`flex items-center gap-1 ${isMaintenanceDue(vehicle) ? 'text-yellow-600' : 'text-gray-500'}`}>
                  <Calendar className="w-3 h-3" />
                  Next service: {new Date(vehicle.next_oil_change_due).toLocaleDateString()}
                </span>
              </div>
            )}

            {vehicle.document_count && vehicle.document_count > 0 && (
              <div className="mt-2 text-xs text-indigo-600">
                <span className="flex items-center gap-1">
                  <File className="w-3 h-3" />
                  {vehicle.document_count} document{vehicle.document_count !== 1 ? 's' : ''} uploaded
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default VehicleGridView;