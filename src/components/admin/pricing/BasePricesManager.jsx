import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SimplePricingService from '../../../services/SimplePricingService';
import { Save, Edit2, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';

const BasePricesManager = () => {
  const { t } = useTranslation();
  const [basePrices, setBasePrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRow, setEditingRow] = useState(null);
  const [editValues, setEditValues] = useState({});

  const vehicleTypes = ['AT5', 'AT6', 'Quad', 'Buggy'];

  useEffect(() => {
    loadBasePrices();
  }, []);

  const loadBasePrices = async () => {
    try {
      setLoading(true);
      const result = await SimplePricingService.getAllBasePricing();
      if (result.success) {
        // Ensure all vehicle types have entries
        const existingTypes = result.data.map(item => item.vehicle_type);
        const allPrices = vehicleTypes.map(type => {
          const existing = result.data.find(item => item.vehicle_type === type);
          return existing || {
            vehicle_type: type,
            hourly_mad: 0,
            daily_mad: 0
          };
        });
        setBasePrices(allPrices);
      } else {
        toast.error('Failed to load base prices');
      }
    } catch (error) {
      console.error('Error loading base prices:', error);
      toast.error('Error loading base prices');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (vehicleType) => {
    const price = basePrices.find(p => p.vehicle_type === vehicleType);
    setEditingRow(vehicleType);
    setEditValues({
      hourly_mad: price.hourly_mad,
      daily_mad: price.daily_mad
    });
  };

  const handleSave = async (vehicleType) => {
    try {
      const result = await SimplePricingService.saveBasePricing(
        vehicleType,
        editValues.hourly_mad,
        editValues.daily_mad
      );

      if (result.success) {
        toast.success('Base prices updated successfully');
        setEditingRow(null);
        setEditValues({});
        loadBasePrices();
      } else {
        toast.error('Failed to save base prices');
      }
    } catch (error) {
      console.error('Error saving base prices:', error);
      toast.error('Error saving base prices');
    }
  };

  const handleCancel = () => {
    setEditingRow(null);
    setEditValues({});
  };

  const handleInputChange = (field, value) => {
    setEditValues(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Base Pricing per Vehicle Type</h2>
        <p className="text-sm text-gray-600 mt-1">
          Set the standard hourly and daily rates for each vehicle type. All prices are in MAD.
        </p>
      </div>

      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Hourly Rate (MAD)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Daily Rate (MAD)
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {basePrices.map((price) => (
              <tr key={price.vehicle_type} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-800">
                          {price.vehicle_type.charAt(0)}
                        </span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {price.vehicle_type}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingRow === price.vehicle_type ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValues.hourly_mad}
                      onChange={(e) => handleInputChange('hourly_mad', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">
                      {parseFloat(price.hourly_mad || 0).toFixed(2)} MAD
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {editingRow === price.vehicle_type ? (
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editValues.daily_mad}
                      onChange={(e) => handleInputChange('daily_mad', e.target.value)}
                      className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      placeholder="0.00"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">
                      {parseFloat(price.daily_mad || 0).toFixed(2)} MAD
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingRow === price.vehicle_type ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleSave(price.vehicle_type)}
                        className="text-green-600 hover:text-green-900"
                        title="Save"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-900"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(price.vehicle_type)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Pricing Information
            </h3>
            <div className="mt-1 text-sm text-yellow-700">
              <ul className="list-disc list-inside space-y-1">
                <li>These are the base rates before any discounts or fees</li>
                <li>Duration discounts and promo codes will be applied on top of these rates</li>
                <li>Transport pickup/dropoff fees are added separately</li>
                <li>All prices are in Moroccan Dirham (MAD)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasePricesManager;