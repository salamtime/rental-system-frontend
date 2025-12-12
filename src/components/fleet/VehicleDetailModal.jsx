import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Car, 
  Calendar, 
  Fuel, 
  Gauge, 
  Shield, 
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Wrench,
  DollarSign,
  ExternalLink
} from 'lucide-react';

const VehicleDetailModal = ({ vehicle, isOpen, onClose }) => {
  if (!vehicle) return null;

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Available': return 'default';
      case 'In Service': return 'secondary';
      case 'Maintenance': return 'destructive';
      case 'Out of Order': return 'destructive';
      case 'Reserved': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Available': return <CheckCircle className="h-4 w-4" />;
      case 'In Service': return <Car className="h-4 w-4" />;
      case 'Maintenance': return <Wrench className="h-4 w-4" />;
      case 'Out of Order': return <AlertTriangle className="h-4 w-4" />;
      case 'Reserved': return <Clock className="h-4 w-4" />;
      default: return <Car className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'Not set';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getDaysUntil = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const today = new Date();
    const diffTime = date - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getServiceStatus = () => {
    const daysUntilService = getDaysUntil(vehicle.next_service_due);
    if (!daysUntilService) return { text: 'Not scheduled', variant: 'secondary' };
    if (daysUntilService < 0) return { text: 'Overdue', variant: 'destructive' };
    if (daysUntilService <= 30) return { text: 'Due soon', variant: 'destructive' };
    return { text: 'On schedule', variant: 'default' };
  };

  const getInsuranceStatus = () => {
    const daysUntilExpiry = getDaysUntil(vehicle.insurance_expiry_date);
    if (!daysUntilExpiry) return { text: 'Not set', variant: 'secondary' };
    if (daysUntilExpiry < 0) return { text: 'Expired', variant: 'destructive' };
    if (daysUntilExpiry <= 30) return { text: 'Expires soon', variant: 'destructive' };
    return { text: 'Valid', variant: 'default' };
  };

  const getRegistrationStatus = () => {
    const daysUntilExpiry = getDaysUntil(vehicle.registration_expiry_date);
    if (!daysUntilExpiry) return { text: 'Not set', variant: 'secondary' };
    if (daysUntilExpiry < 0) return { text: 'Expired', variant: 'destructive' };
    if (daysUntilExpiry <= 30) return { text: 'Expires soon', variant: 'destructive' };
    return { text: 'Valid', variant: 'default' };
  };

  const serviceStatus = getServiceStatus();
  const insuranceStatus = getInsuranceStatus();
  const registrationStatus = getRegistrationStatus();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Car className="h-5 w-5" />
            {vehicle.name} - Vehicle Details
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge variant={getStatusBadgeVariant(vehicle.status)} className="flex items-center gap-1">
                  {getStatusIcon(vehicle.status)}
                  {vehicle.status}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Brand</label>
                  <p className="font-medium">{vehicle.brand}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Model</label>
                  <p className="font-medium">{vehicle.model}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Year</label>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Plate Number</label>
                  <p className="font-medium">{vehicle.plate_number}</p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">VIN Number</label>
                <p className="font-medium font-mono">{vehicle.vin_number || 'Not set'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Hire Date</label>
                <p className="font-medium">{formatDate(vehicle.hire_date)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Acquisition Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Acquisition
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Purchase Cost</label>
                <p className="font-medium text-lg">
                  {vehicle.purchase_cost_mad ? formatCurrency(vehicle.purchase_cost_mad) : 'Not set'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Purchase Date</label>
                <p className="font-medium">{formatDate(vehicle.purchase_date)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Supplier / Seller</label>
                <p className="font-medium">{vehicle.purchase_supplier || 'Not set'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Invoice/Receipt</label>
                {vehicle.purchase_invoice_url ? (
                  <a 
                    href={vehicle.purchase_invoice_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    View Document <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  <p className="font-medium text-gray-500">Not set</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service & Maintenance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Service & Maintenance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Service Status:</span>
                <Badge variant={serviceStatus.variant}>
                  {serviceStatus.text}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Last Service Date</label>
                <p className="font-medium">{formatDate(vehicle.last_service_date)}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Next Service Due</label>
                <p className="font-medium">{formatDate(vehicle.next_service_due)}</p>
                {getDaysUntil(vehicle.next_service_due) && (
                  <p className="text-sm text-gray-600">
                    ({getDaysUntil(vehicle.next_service_due)} days)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Odometer</span>
                </div>
                <span className="font-medium">{vehicle.odometer_reading} km</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fuel className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Fuel Level</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{vehicle.fuel_level}%</span>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        vehicle.fuel_level > 50 ? 'bg-green-500' : 
                        vehicle.fuel_level > 25 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${vehicle.fuel_level}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance & Registration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Insurance & Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Insurance Status:</span>
                <Badge variant={insuranceStatus.variant}>
                  {insuranceStatus.text}
                </Badge>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Insurance Policy Number</label>
                <p className="font-medium">{vehicle.insurance_policy_number || 'Not set'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Insurance Provider</label>
                <p className="font-medium">{vehicle.insurance_provider || 'Not set'}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-600">Insurance Expiry Date</label>
                <p className="font-medium">{formatDate(vehicle.insurance_expiry_date)}</p>
                {getDaysUntil(vehicle.insurance_expiry_date) && (
                  <p className="text-sm text-gray-600">
                    ({getDaysUntil(vehicle.insurance_expiry_date)} days)
                  </p>
                )}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Registration Status:</span>
                  <Badge variant={registrationStatus.variant}>
                    {registrationStatus.text}
                  </Badge>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Registration Number</label>
                  <p className="font-medium">{vehicle.registration_number || 'Not set'}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-600">Registration Expiry Date</label>
                  <p className="font-medium">{formatDate(vehicle.registration_expiry_date)}</p>
                  {getDaysUntil(vehicle.registration_expiry_date) && (
                    <p className="text-sm text-gray-600">
                      ({getDaysUntil(vehicle.registration_expiry_date)} days)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes & Additional Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Notes & Additional Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <p className="font-medium">{vehicle.notes || 'No notes available'}</p>
              </div>

              <div className="text-sm text-gray-600 border-t pt-4">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{formatDate(vehicle.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span>{formatDate(vehicle.updated_at)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VehicleDetailModal;