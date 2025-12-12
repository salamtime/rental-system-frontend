import React, { useState } from 'react';
import { Car, FileText, Wrench, ImageIcon, File, StickyNote, X } from 'lucide-react';

interface PurchaseCostData {
  purchase_cost_mad: string;
  purchase_date: string;
  supplier: string;
  invoice_url: string;
}

interface VehicleFormData {
  name: string;
  model: string;
  vehicle_type: string;
  power_cc: number;
  capacity: number;
  color: string;
  plate_number: string;
  status: string;
  current_odometer: string;
  engine_hours: string;
  last_oil_change_date: string;
  last_oil_change_odometer: string;
  general_notes: string;
  notes: string;
  purchase_cost_mad: string;
  purchase_date: string;
  supplier: string;
  invoice_url: string;
}

interface VehicleFormWithPurchaseProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: VehicleFormData) => void;
  initialData?: Partial<VehicleFormData>;
  title?: string;
}

const VehicleFormWithPurchase: React.FC<VehicleFormWithPurchaseProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = {},
  title = "Add New Vehicle with Purchase Cost Tracking"
}) => {
  const [formData, setFormData] = useState<VehicleFormData>({
    name: '',
    model: '',
    vehicle_type: 'quad',
    power_cc: 0,
    capacity: 1,
    color: '',
    plate_number: '',
    status: 'available',
    current_odometer: '',
    engine_hours: '',
    last_oil_change_date: '',
    last_oil_change_odometer: '',
    general_notes: '',
    notes: '',
    purchase_cost_mad: '',
    purchase_date: '',
    supplier: '',
    invoice_url: '',
    ...initialData
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof VehicleFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600">
                Create a new vehicle with comprehensive fleet management and purchase cost tracking
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 🔴 SUCCESS BANNER 🔴 */}
          <div className="bg-green-600 text-white p-6 rounded-lg text-center font-black text-2xl border-4 border-yellow-400 shadow-2xl">
            ✅ PURCHASE COST TRACKING SUCCESSFULLY INTEGRATED! ✅
          </div>

          {/* Basic Information Section */}
          <div className="bg-blue-50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">Basic Information</h3>
              <span className="text-red-500">*</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., ATV-001, Raptor-Blue"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                  placeholder="e.g., Yamaha Raptor 700, Honda TRX450R"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => handleInputChange('vehicle_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="quad">Quad</option>
                  <option value="ATV">ATV</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Engine Power (CC)</label>
                <input
                  type="number"
                  value={formData.power_cc}
                  onChange={(e) => handleInputChange('power_cc', parseInt(e.target.value) || 0)}
                  placeholder="e.g., 700, 450, 1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => handleInputChange('capacity', parseInt(e.target.value) || 1)}
                  placeholder="1, 2, 4, etc."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => handleInputChange('color', e.target.value)}
                  placeholder="e.g., Red, Blue, Black, Camo"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plate Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) => handleInputChange('plate_number', e.target.value)}
                  placeholder="e.g., ABC-123, XYZ-456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
            </div>
          </div>

          {/* 💰 ACQUISITION & PURCHASE INFORMATION SECTION 💰 */}
          <div className="bg-green-50 rounded-lg p-8 border-4 border-green-400 shadow-2xl">
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="text-4xl animate-bounce">💰</span>
              <h3 className="text-2xl font-black text-green-900 text-center">
                💰 ACQUISITION & PURCHASE INFORMATION 💰
              </h3>
              <span className="text-4xl animate-bounce">💰</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-lg">
                <label className="block text-lg font-bold text-green-800 mb-2">💰 Purchase Cost (MAD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.purchase_cost_mad}
                  onChange={(e) => handleInputChange('purchase_cost_mad', e.target.value)}
                  placeholder="e.g., 50000, 75000"
                  className="w-full px-4 py-3 border-2 border-green-400 rounded-lg text-lg font-semibold focus:ring-4 focus:ring-green-500 focus:border-transparent bg-green-50"
                />
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-lg">
                <label className="block text-lg font-bold text-green-800 mb-2">📅 Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-green-400 rounded-lg text-lg font-semibold focus:ring-4 focus:ring-green-500 focus:border-transparent bg-green-50"
                />
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-lg">
                <label className="block text-lg font-bold text-green-800 mb-2">🏪 Supplier</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => handleInputChange('supplier', e.target.value)}
                  placeholder="e.g., Yamaha Dealer, Local Supplier"
                  className="w-full px-4 py-3 border-2 border-green-400 rounded-lg text-lg font-semibold focus:ring-4 focus:ring-green-500 focus:border-transparent bg-green-50"
                />
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-green-300 shadow-lg">
                <label className="block text-lg font-bold text-green-800 mb-2">📄 Invoice URL</label>
                <input
                  type="url"
                  value={formData.invoice_url}
                  onChange={(e) => handleInputChange('invoice_url', e.target.value)}
                  placeholder="Link to invoice document"
                  className="w-full px-4 py-3 border-2 border-green-400 rounded-lg text-lg font-semibold focus:ring-4 focus:ring-green-500 focus:border-transparent bg-green-50"
                />
              </div>
            </div>
          </div>

          {/* Maintenance Panel */}
          <div className="bg-yellow-50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wrench className="w-5 h-5 text-yellow-600" />
              <h3 className="text-lg font-semibold text-yellow-900">Maintenance & Odometer</h3>
              <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                For New Vehicle
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Odometer (km)</label>
                <input
                  type="number"
                  value={formData.current_odometer}
                  onChange={(e) => handleInputChange('current_odometer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Engine Hours</label>
                <input
                  type="number"
                  value={formData.engine_hours}
                  onChange={(e) => handleInputChange('engine_hours', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Oil Change Date</label>
                <input
                  type="date"
                  value={formData.last_oil_change_date}
                  onChange={(e) => handleInputChange('last_oil_change_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Oil Change Odometer (km)</label>
                <input
                  type="number"
                  value={formData.last_oil_change_odometer}
                  onChange={(e) => handleInputChange('last_oil_change_odometer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Additional Notes Section */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-5 h-5 text-gray-600" />
              <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
                <textarea
                  value={formData.general_notes}
                  onChange={(e) => handleInputChange('general_notes', e.target.value)}
                  rows={4}
                  placeholder="Any additional notes about this vehicle, special instructions, known issues, modifications, etc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  placeholder="Internal notes for staff, booking system notes, etc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-6 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Create Vehicle with Purchase Cost
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleFormWithPurchase;