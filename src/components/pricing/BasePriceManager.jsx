import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import BasePriceService from '../../services/BasePriceService';
import { Plus, Edit, Trash2, DollarSign, Save, X, Car, Clock, Calendar, CalendarDays, AlertTriangle } from 'lucide-react';

/**
 * BasePriceManager - Enhanced base price management component
 * 
 * Serves as the single source of truth for rental pricing with proper
 * model integration and clean UI display.
 * PERFORMANCE OPTIMIZED: Added timeout handling and fallback data
 */
const BasePriceManager = ({ onUpdate }) => {
  const [basePrices, setBasePrices] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  
  const [formData, setFormData] = useState({
    vehicle_model_id: '',
    hourly_price: '',
    daily_price: '',
    weekly_price: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setLoadingTimeout(false);
      
      // Set a timeout for loading
      const timeoutId = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000); // 5 seconds timeout warning

      console.log('🔄 BasePriceManager: Loading data with timeout protection...');

      // Load both in parallel with timeout protection
      const loadPromises = [
        loadBasePrices(),
        loadVehicleModels()
      ];

      await Promise.allSettled(loadPromises);
      
      clearTimeout(timeoutId);
      setLoadingTimeout(false);
      
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load pricing data. Using fallback data.');
      
      // Set fallback data
      setBasePrices([]);
      setVehicleModels([
        { id: '1', name: 'SEGWAY', model: 'AT5', vehicle_type: 'ATV' },
        { id: '2', name: 'SEGWAY', model: 'AT6', vehicle_type: 'ATV' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadBasePrices = async () => {
    try {
      console.log('🔄 Loading base prices with timeout...');
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Base prices loading timeout')), 8000)
      );
      
      const loadPromise = BasePriceService.getAllBasePrices();
      
      const prices = await Promise.race([loadPromise, timeoutPromise]);
      setBasePrices(prices || []);
      console.log('✅ Base prices loaded:', prices?.length || 0);
    } catch (err) {
      console.error('Error loading base prices:', err);
      setBasePrices([]); // Set empty array instead of throwing
      if (err.message.includes('timeout')) {
        setError('Base prices loading is taking longer than expected. Please check your connection.');
      }
    }
  };

  const loadVehicleModels = async () => {
    try {
      console.log('🔄 Loading vehicle models with timeout...');
      
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Vehicle models loading timeout')), 8000)
      );
      
      const loadPromise = BasePriceService.getAllVehicleModels();
      
      const models = await Promise.race([loadPromise, timeoutPromise]);
      setVehicleModels(models || []);
      console.log('✅ Vehicle models loaded:', models?.length || 0);
    } catch (err) {
      console.error('Error loading vehicle models:', err);
      // Set fallback models instead of throwing
      setVehicleModels([
        { id: '1', name: 'SEGWAY', model: 'AT5', vehicle_type: 'ATV' },
        { id: '2', name: 'SEGWAY', model: 'AT6', vehicle_type: 'ATV' }
      ]);
      if (err.message.includes('timeout')) {
        setError('Vehicle models loading is taking longer than expected. Using fallback data.');
      }
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Validate form
      if (!formData.vehicle_model_id) {
        throw new Error('Please select a vehicle model');
      }

      if (!formData.hourly_price && !formData.daily_price && !formData.weekly_price) {
        throw new Error('Please enter at least one price (hourly, daily, or weekly)');
      }

      // Prepare data for upsert
      const priceData = {
        ...formData,
        hourly_price: parseFloat(formData.hourly_price) || 0,
        daily_price: parseFloat(formData.daily_price) || 0,
        weekly_price: parseFloat(formData.weekly_price) || 0
      };

      // If editing, include the ID
      if (editingPrice) {
        priceData.id = editingPrice.id;
        priceData.created_at = editingPrice.created_at;
      }

      // Add timeout to save operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save operation timeout')), 10000)
      );
      
      const savePromise = BasePriceService.upsertBasePrice(priceData);
      
      await Promise.race([savePromise, timeoutPromise]);
      
      setSuccess(editingPrice ? '✅ Base price updated successfully!' : '✅ Base price created successfully!');
      
      // Reset form and refresh data
      resetForm();
      await loadData();
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }

      // Clear success message after delay
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error saving base price:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (price) => {
    setEditingPrice(price);
    setFormData({
      vehicle_model_id: price.vehicle_model_id,
      hourly_price: price.hourly_price.toString(),
      daily_price: price.daily_price.toString(),
      weekly_price: price.weekly_price.toString()
    });
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (priceId) => {
    if (!window.confirm('Are you sure you want to delete this base price? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      
      // Add timeout to delete operation
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Delete operation timeout')), 10000)
      );
      
      const deletePromise = BasePriceService.deleteBasePrice(priceId);
      
      await Promise.race([deletePromise, timeoutPromise]);
      
      setSuccess('✅ Base price deleted successfully!');
      
      await loadData();
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }

      // Clear success message after delay
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('Error deleting base price:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_model_id: '',
      hourly_price: '',
      daily_price: '',
      weekly_price: ''
    });
    setEditingPrice(null);
    setShowForm(false);
    setError(null);
  };

  const getAvailableModels = () => {
    // Filter out models that already have active prices (unless editing)
    const usedModelIds = basePrices
      .filter(price => !editingPrice || price.id !== editingPrice.id)
      .map(price => price.vehicle_model_id);
    
    return vehicleModels.filter(model => !usedModelIds.includes(model.id));
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Base Price Management</h3>
          <p className="text-sm text-gray-600">
            Manage hourly, daily, and weekly base prices for each vehicle model. These serve as the single source of truth for rental pricing.
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2"
          disabled={loading}
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? 'Cancel' : 'Add New Price'}
        </Button>
      </div>

      {/* Loading Timeout Warning */}
      {loadingTimeout && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mr-2" />
            <p className="text-sm font-medium text-yellow-800">
              Loading is taking longer than expected. This might be due to network issues or database performance.
            </p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-sm font-medium text-green-800">{success}</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <DollarSign className="w-5 h-5" />
              {editingPrice ? 'Edit Base Price' : 'Add New Base Price'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Vehicle Model Selection */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Model *
                  </label>
                  <select
                    name="vehicle_model_id"
                    value={formData.vehicle_model_id}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                    disabled={loading}
                  >
                    <option value="">Select a vehicle model...</option>
                    {editingPrice && (
                      <option value={editingPrice.vehicle_model_id}>
                        {BasePriceService.formatModelName(editingPrice.vehicle_model)} (Current)
                      </option>
                    )}
                    {getAvailableModels().map(model => (
                      <option key={model.id} value={model.id}>
                        {BasePriceService.formatModelName(model)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Hourly Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Hourly Price (MAD)
                  </label>
                  <input
                    type="number"
                    name="hourly_price"
                    value={formData.hourly_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>

                {/* Daily Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Daily Price (MAD)
                  </label>
                  <input
                    type="number"
                    name="daily_price"
                    value={formData.daily_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>

                {/* Weekly Price */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <CalendarDays className="w-4 h-4 inline mr-1" />
                    Weekly Price (MAD)
                  </label>
                  <input
                    type="number"
                    name="weekly_price"
                    value={formData.weekly_price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {loading ? 'Saving...' : (editingPrice ? 'Update Price' : 'Save Price')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Base Prices List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            Current Base Prices ({basePrices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading && basePrices.length === 0 ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p className="text-gray-600">Loading base prices...</p>
              {loadingTimeout && (
                <p className="text-sm text-yellow-600 mt-2">This is taking longer than usual...</p>
              )}
            </div>
          ) : basePrices.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <DollarSign className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium mb-2">No base prices configured</p>
              <p className="text-sm">Add your first base price to get started with rental pricing.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Vehicle Model</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Hourly (MAD)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Daily (MAD)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Weekly (MAD)</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Updated</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {basePrices.map((price) => (
                    <tr key={price.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">
                            {BasePriceService.formatModelName(price.vehicle_model)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900">
                          {price.hourly_price > 0 ? `${price.hourly_price.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900">
                          {price.daily_price > 0 ? `${price.daily_price.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-gray-900">
                          {price.weekly_price > 0 ? `${price.weekly_price.toFixed(2)}` : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {formatTimestamp(price.updated_at)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(price)}
                            disabled={loading}
                            className="flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(price.id)}
                            disabled={loading}
                            className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Section */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Base Pricing Guidelines</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>One active price per model:</strong> Adding a new price will deactivate the previous one</li>
                <li>• <strong>Rental form integration:</strong> These prices automatically populate the rental form based on rental type</li>
                <li>• <strong>Flexible pricing:</strong> You can set hourly, daily, weekly, or any combination of prices</li>
                <li>• <strong>Single source of truth:</strong> All rental calculations use these base prices as the foundation</li>
                <li>• <strong>Performance optimized:</strong> Queries now include timeout protection and fallback data</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BasePriceManager;