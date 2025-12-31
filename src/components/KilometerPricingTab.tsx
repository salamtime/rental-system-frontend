import React, { useState, useEffect } from 'react';
import { Info, Package, Plus, Edit, Trash2, CheckCircle, XCircle, Loader, X, Save, AlertCircle, Car, Filter } from 'lucide-react';
import KilometerPricingHelpModal from './KilometerPricingHelpModal';
import PackageService from '../services/PackageService';

interface RentalPackage {
  id: number;
  name: string;
  description: string;
  vehicle_model_id: string;
  base_price: number;
  included_kilometers: number | null;
  extra_km_rate: number | null;
  rate_type_id: number;
  is_active: boolean;
  vehicle_model?: {
    id: string;
    name: string;
    model: string;
    vehicle_type: string;
  };
}

interface RateType {
  id: number;
  name: string;
  is_kilometer_based: boolean;
}

interface VehicleModel {
  id: string;
  name: string;
  model: string;
  vehicle_type: string;
}

interface PackageFormData {
  name: string;
  description: string;
  vehicle_model_id: string;
  base_price: number;
  included_kilometers: number | null;
  extra_km_rate: number | null;
  rate_type_id: number;
  is_active: boolean;
}

const KilometerPricingTab: React.FC = () => {
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [packages, setPackages] = useState<RentalPackage[]>([]);
  const [filteredPackages, setFilteredPackages] = useState<RentalPackage[]>([]);
  const [rateTypes, setRateTypes] = useState<RateType[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingBasePrice, setLoadingBasePrice] = useState(false);
  const [filterVehicleModel, setFilterVehicleModel] = useState<string>('');
  
  // Form state
  const [showPackageForm, setShowPackageForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<RentalPackage | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<PackageFormData>({
    name: '',
    description: '',
    vehicle_model_id: '',
    base_price: 0,
    included_kilometers: null,
    extra_km_rate: null,
    rate_type_id: 2, // Default to Daily
    is_active: true
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Apply filter
    if (filterVehicleModel) {
      setFilteredPackages(packages.filter(pkg => pkg.vehicle_model_id === filterVehicleModel));
    } else {
      setFilteredPackages(packages);
    }
  }, [filterVehicleModel, packages]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [packagesData, rateTypesData, vehicleModelsData] = await Promise.all([
        PackageService.getPackages(),
        PackageService.getRateTypes(),
        PackageService.getVehicleModels()
      ]);
      setPackages(packagesData);
      setFilteredPackages(packagesData);
      setRateTypes(rateTypesData);
      setVehicleModels(vehicleModelsData);
    } catch (err: any) {
      console.error('Error loading kilometer pricing data:', err);
      setError(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      vehicle_model_id: '',
      base_price: 0,
      included_kilometers: null,
      extra_km_rate: null,
      rate_type_id: 2,
      is_active: true
    });
    setEditingPackage(null);
    setShowPackageForm(false);
    setError(null);
  };

  const handleCreatePackage = () => {
    resetForm();
    setShowPackageForm(true);
  };

  const handleEditPackage = (pkg: RentalPackage) => {
    setEditingPackage(pkg);
    setFormData({
      name: pkg.name,
      description: pkg.description || '',
      vehicle_model_id: pkg.vehicle_model_id || '',
      base_price: pkg.base_price,
      included_kilometers: pkg.included_kilometers,
      extra_km_rate: pkg.extra_km_rate,
      rate_type_id: pkg.rate_type_id,
      is_active: pkg.is_active
    });
    setShowPackageForm(true);
    setError(null);
  };

  const handleDeletePackage = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this package? This action cannot be undone.')) {
      return;
    }

    try {
      await PackageService.deletePackage(id);
      setSuccessMessage('Package deleted successfully!');
      setTimeout(() => setSuccessMessage(null), 3000);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting package:', err);
      setError(err.message || 'Failed to delete package');
    }
  };

  const handleFormChange = (field: keyof PackageFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVehicleModelChange = async (vehicleModelId: string) => {
    setFormData(prev => ({
      ...prev,
      vehicle_model_id: vehicleModelId
    }));
    
    // Auto-populate base price from base_prices table
    if (vehicleModelId) {
      setLoadingBasePrice(true);
      try {
        const rateType = rateTypes.find(rt => rt.id === formData.rate_type_id);
        const rateTypeName = rateType?.name.toLowerCase() || 'daily';
        const basePrice = await PackageService.getBasePriceForModel(vehicleModelId, rateTypeName);
        
        if (basePrice > 0) {
          setFormData(prev => ({
            ...prev,
            base_price: basePrice
          }));
        } else {
          // If no base price found, show a warning but don't block
          console.warn(`No base price found for vehicle model ${vehicleModelId} with rate type ${rateTypeName}`);
        }
      } catch (err) {
        console.error('Error loading base price:', err);
      } finally {
        setLoadingBasePrice(false);
      }
    }
  };

  const handleRateTypeChange = async (rateTypeId: number) => {
    const rateType = rateTypes.find(rt => rt.id === rateTypeId);
    
    // If switching to Hourly (non-kilometer-based), clear kilometer fields
    if (rateType && !rateType.is_kilometer_based) {
      setFormData(prev => ({
        ...prev,
        rate_type_id: rateTypeId,
        included_kilometers: null,
        extra_km_rate: null
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        rate_type_id: rateTypeId
      }));
    }
    
    // Reload base price for new rate type
    if (formData.vehicle_model_id) {
      setLoadingBasePrice(true);
      try {
        const rateTypeName = rateType?.name.toLowerCase() || 'daily';
        const basePrice = await PackageService.getBasePriceForModel(formData.vehicle_model_id, rateTypeName);
        
        if (basePrice > 0) {
          setFormData(prev => ({
            ...prev,
            base_price: basePrice
          }));
        }
      } catch (err) {
        console.error('Error loading base price:', err);
      } finally {
        setLoadingBasePrice(false);
      }
    }
  };

  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Package name is required';
    }
    if (!formData.vehicle_model_id) {
      return 'Vehicle model is required';
    }
    if (formData.base_price <= 0) {
      return 'Base price must be greater than 0';
    }
    
    const rateType = rateTypes.find(rt => rt.id === formData.rate_type_id);
    if (rateType?.is_kilometer_based) {
      if (!formData.included_kilometers || formData.included_kilometers <= 0) {
        return 'Included kilometers is required and must be greater than 0';
      }
      if (!formData.extra_km_rate || formData.extra_km_rate <= 0) {
        return 'Overage rate is required and must be greater than 0';
      }
    }
    
    return null;
  };

  const handleSubmitPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (editingPackage) {
        await PackageService.updatePackage(editingPackage.id, formData);
        setSuccessMessage('Package updated successfully!');
      } else {
        await PackageService.createPackage(formData);
        setSuccessMessage('Package created successfully!');
      }
      
      setTimeout(() => setSuccessMessage(null), 3000);
      resetForm();
      await loadData();
    } catch (err: any) {
      console.error('Error saving package:', err);
      setError(err.message || 'Failed to save package');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedRateType = rateTypes.find(rt => rt.id === formData.rate_type_id);
  const isKilometerBased = selectedRateType?.is_kilometer_based ?? true;
  
  const getVehicleModelDisplay = (model: VehicleModel | undefined) => {
    if (!model) return 'Unknown Model';
    if (model.name && model.model) {
      // Avoid duplication if name already contains model
      if (model.name.toLowerCase().includes(model.model.toLowerCase())) {
        return model.name;
      }
      return `${model.name} ${model.model}`;
    }
    return model.name || model.model || 'Unknown';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        <span className="ml-3 text-gray-600">Loading packages...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 font-medium">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && !showPackageForm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Header with Info Button */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-xl font-semibold text-gray-900">Kilometer-Based Pricing Packages</h3>
          <button
            onClick={() => setShowHelpModal(true)}
            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors group"
            title="Learn about kilometer-based pricing"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
        
        <button
          onClick={handleCreatePackage}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Package
        </button>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-blue-900">
              Configure rental packages with included kilometers and overage rates. Each package is tied to a specific vehicle model.
              Click the <strong className="inline-flex items-center gap-1"><Info className="w-4 h-4 inline" /> info icon</strong> above 
              to learn how kilometer-based pricing works and see examples.
            </p>
          </div>
        </div>
      </div>

      {/* Filter by Vehicle Model */}
      {vehicleModels.length > 0 && packages.length > 0 && (
        <div className="mb-6 flex items-center gap-3">
          <Filter className="w-5 h-5 text-gray-600" />
          <select
            value={filterVehicleModel}
            onChange={(e) => setFilterVehicleModel(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Vehicle Models</option>
            {vehicleModels.map(model => (
              <option key={model.id} value={model.id}>
                {getVehicleModelDisplay(model)}
              </option>
            ))}
          </select>
          {filterVehicleModel && (
            <button
              onClick={() => setFilterVehicleModel('')}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Clear filter
            </button>
          )}
        </div>
      )}

      {/* Packages List */}
      {filteredPackages.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium mb-2">
            {filterVehicleModel ? 'No packages found for this vehicle model' : 'No packages created yet'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            {filterVehicleModel 
              ? 'Try selecting a different vehicle model or clear the filter'
              : 'Create your first kilometer-based pricing package to get started'}
          </p>
          {!filterVehicleModel && (
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-purple-600 hover:text-purple-700 text-sm font-medium underline"
            >
              Learn how to create packages
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPackages.map((pkg) => (
            <div
              key={pkg.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{pkg.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{pkg.description}</p>
                  {pkg.vehicle_model && (
                    <div className="flex items-center gap-1 mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-md w-fit">
                      <Car className="w-3 h-3" />
                      <span className="font-medium">{getVehicleModelDisplay(pkg.vehicle_model)}</span>
                    </div>
                  )}
                </div>
                {pkg.is_active ? (
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Base Price:</span>
                  <span className="font-medium text-gray-900">{pkg.base_price} MAD</span>
                </div>
                {pkg.included_kilometers && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Included KM:</span>
                      <span className="font-medium text-gray-900">{pkg.included_kilometers} km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Overage Rate:</span>
                      <span className="font-medium text-gray-900">{pkg.extra_km_rate} MAD/km</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Type:</span>
                  <span className="font-medium text-gray-900">
                    {rateTypes.find(rt => rt.id === pkg.rate_type_id)?.name || 'Unknown'}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => handleEditPackage(pkg)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button 
                  onClick={() => handleDeletePackage(pkg.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Package Form Modal */}
      {showPackageForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">
                  {editingPackage ? 'Edit Package' : 'Create New Package'}
                </h3>
                <p className="text-sm text-purple-100 mt-1">
                  {editingPackage ? 'Update package details' : 'Configure a new rental package for a specific vehicle model'}
                </p>
              </div>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                disabled={submitting}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmitPackage} className="flex-1 overflow-y-auto p-6">
              {/* Error Message in Form */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {/* Vehicle Model Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Model <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.vehicle_model_id}
                    onChange={(e) => handleVehicleModelChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    disabled={loadingBasePrice}
                  >
                    <option value="">Select a vehicle model</option>
                    {vehicleModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {getVehicleModelDisplay(model)}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Base price will be auto-populated from the vehicle model's pricing (if available)
                  </p>
                </div>

                {/* Package Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Package Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFormChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Daily 200km, Weekly 1500km"
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleFormChange('description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Brief description of this package"
                    rows={2}
                  />
                </div>

                {/* Rate Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rate Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.rate_type_id}
                    onChange={(e) => handleRateTypeChange(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    required
                    disabled={loadingBasePrice}
                  >
                    {rateTypes
                      .filter(rt => rt.name.toLowerCase() !== 'hourly')
                      .map(rt => (
                        <option key={rt.id} value={rt.id}>
                          {rt.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    {isKilometerBased 
                      ? 'Kilometer-based: Requires included kilometers and overage rate'
                      : 'No kilometer tracking for this rate type'}
                  </p>
                </div>

                {/* Base Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Base Price (MAD) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.base_price}
                      onChange={(e) => handleFormChange('base_price', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="300"
                      min="0"
                      step="0.01"
                      required
                    />
                    {loadingBasePrice && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader className="w-4 h-4 text-purple-600 animate-spin" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-populated from vehicle model's base pricing (you can adjust if needed)
                  </p>
                </div>

                {/* Conditional Kilometer Fields */}
                {isKilometerBased && (
                  <>
                    {/* Included Kilometers */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Included Kilometers <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.included_kilometers || ''}
                        onChange={(e) => handleFormChange('included_kilometers', parseInt(e.target.value) || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="200"
                        min="0"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Number of kilometers included in the base price
                      </p>
                    </div>

                    {/* Overage Rate */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Overage Rate (MAD/km) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        value={formData.extra_km_rate || ''}
                        onChange={(e) => handleFormChange('extra_km_rate', parseFloat(e.target.value) || null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="2.50"
                        min="0"
                        step="0.01"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Price per kilometer beyond the included amount
                      </p>
                    </div>
                  </>
                )}

                {/* Is Active */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleFormChange('is_active', e.target.checked)}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="is_active" className="text-sm font-medium text-gray-700">
                    Active (available for new rentals)
                  </label>
                </div>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmitPackage}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={submitting || loadingBasePrice}
              >
                {submitting ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {editingPackage ? 'Update Package' : 'Create Package'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Modal */}
      <KilometerPricingHelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};

export default KilometerPricingTab;