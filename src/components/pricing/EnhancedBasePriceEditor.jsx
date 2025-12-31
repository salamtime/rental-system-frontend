import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import EnhancedBasePriceService from '../../services/EnhancedBasePriceService';
import { Plus, Edit, Trash2, DollarSign, Save, X, Car, Clock, Calendar, CalendarDays, RefreshCw, Calculator, AlertTriangle, CheckCircle } from 'lucide-react';

/**
 * EnhancedBasePriceEditor - Base price management using separate base_prices table
 * 
 * Works with the app_4c3a7a6153_base_prices table for proper pricing management
 * FIXED: Daily prices now display as fixed amounts, not multipliers of hourly
 */
const EnhancedBasePriceEditor = ({ onUpdate }) => {
  const [basePrices, setBasePrices] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [autoCalculate, setAutoCalculate] = useState(true);
  const [validationWarnings, setValidationWarnings] = useState([]);
  
  const [formData, setFormData] = useState({
    vehicle_model_id: '',
    hourly_price: '',
    daily_price: '',
    weekly_price: ''
  });

  useEffect(() => {
    loadBasePrices();
    loadVehicleModels();
  }, []);

  // Auto-calculate prices when hourly price changes
  useEffect(() => {
    if (autoCalculate && formData.hourly_price && !editingPrice) {
      const hourly = parseFloat(formData.hourly_price);
      if (hourly > 0) {
        const calculated = EnhancedBasePriceService.calculateCorrectPricing(hourly);
        setFormData(prev => ({
          ...prev,
          daily_price: calculated.daily_price.toString(),
          weekly_price: calculated.weekly_price.toString()
        }));
      }
    }
  }, [formData.hourly_price, autoCalculate, editingPrice]);

  // Validate pricing ratios when prices change
  useEffect(() => {
    const hourly = parseFloat(formData.hourly_price) || 0;
    const daily = parseFloat(formData.daily_price) || 0;
    const weekly = parseFloat(formData.weekly_price) || 0;
    
    if (hourly > 0 || daily > 0 || weekly > 0) {
      const warnings = EnhancedBasePriceService.validatePricingRatios(hourly, daily, weekly);
      setValidationWarnings(warnings);
    } else {
      setValidationWarnings([]);
    }
  }, [formData.hourly_price, formData.daily_price, formData.weekly_price]);

  const loadBasePrices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const prices = await EnhancedBasePriceService.getAllBasePricesWithModels();
      setBasePrices(prices);
      console.log('📋 Base prices loaded from base_prices table:', prices);
    } catch (err) {
      console.error('Error loading base prices:', err);
      setError(`Failed to load base prices: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleModels = async () => {
    try {
      const models = await EnhancedBasePriceService.getAllVehicleModels();
      setVehicleModels(models);
      console.log('🚗 Vehicle models loaded:', models);
    } catch (err) {
      console.error('Error loading vehicle models:', err);
      setError(`Failed to load vehicle models: ${err.message}`);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAutoCalculateToggle = () => {
    setAutoCalculate(!autoCalculate);
    if (!autoCalculate && formData.hourly_price) {
      // Recalculate when enabling auto-calculate
      const hourly = parseFloat(formData.hourly_price);
      if (hourly > 0) {
        const calculated = EnhancedBasePriceService.calculateCorrectPricing(hourly);
        setFormData(prev => ({
          ...prev,
          daily_price: calculated.daily_price.toString(),
          weekly_price: calculated.weekly_price.toString()
        }));
      }
    }
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

      // Prepare data for upsert to base_prices table
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

      await EnhancedBasePriceService.upsertBasePrice(priceData);
      
      setSuccess(editingPrice ? '✅ Base price updated successfully!' : '✅ Base price created successfully!');
      
      // Reset form and refresh data
      resetForm();
      await loadBasePrices();
      
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
    setAutoCalculate(false); // Disable auto-calculate when editing
  };

  const handleDelete = async (priceId) => {
    if (!window.confirm('Are you sure you want to delete this base price? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      await EnhancedBasePriceService.deleteBasePrice(priceId);
      setSuccess('✅ Base price deleted successfully!');
      
      await loadBasePrices();
      
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

  const handleFixAllPricing = async () => {
    if (!window.confirm('This will recalculate all pricing data using standard rental pricing logic. Continue?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await EnhancedBasePriceService.fixExistingPricingData();
      setSuccess('✅ All pricing data has been corrected!');
      
      await loadBasePrices();
      
      // Notify parent component
      if (onUpdate) {
        onUpdate();
      }

      // Clear success message after delay
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      console.error('Error fixing pricing data:', err);
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
    setValidationWarnings([]);
    setAutoCalculate(true);
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

  const calculatePricingRatios = (price) => {
    const dailyHourlyRatio = price.daily_price / price.hourly_price;
    const weeklyDailyRatio = price.weekly_price / price.daily_price;
    return { dailyHourlyRatio, weeklyDailyRatio };
  };

  const isPricingCorrect = (price) => {
    const issues = EnhancedBasePriceService.validatePricingRatios(
      price.hourly_price,
      price.daily_price,
      price.weekly_price
    );
    return issues.length === 0;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Rental Price Management</h3>
          <p className="text-sm text-gray-600">
            Manage hourly, daily, and weekly base prices for each vehicle model. These serve as the single source of truth for rental pricing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleFixAllPricing}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
            disabled={loading}
          >
            <Calculator className="w-4 h-4" />
            Fix All Pricing
          </Button>
          <Button
            onClick={loadBasePrices}
            className="flex items-center gap-2"
            disabled={loading}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2"
            disabled={loading}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Cancel' : 'Add New Price'}
          </Button>
        </div>
      </div>

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
                    {editingPrice && editingPrice.vehicle_model && (
                      <option value={editingPrice.vehicle_model_id}>
                        {EnhancedBasePriceService.formatModelName(editingPrice.vehicle_model)} (Current)
                      </option>
                    )}
                    {getAvailableModels().map(model => (
                      <option key={model.id} value={model.id}>
                        {EnhancedBasePriceService.formatModelName(model)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto-Calculate Toggle */}
                {!editingPrice && (
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={autoCalculate}
                        onChange={handleAutoCalculateToggle}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Auto-calculate daily and weekly prices from hourly rate
                      </span>
                      <Calculator className="w-4 h-4 text-blue-500" />
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Daily = Hourly × 8 hours × 0.9 (10% discount) | Weekly = Daily × 7 days × 0.85 (15% bulk discount)
                    </p>
                  </div>
                )}

                {/* Hourly Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    Hourly Price (MAD) *
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
                    required
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      autoCalculate && !editingPrice ? 'bg-gray-100' : ''
                    }`}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={loading || (autoCalculate && !editingPrice)}
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
                    className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${
                      autoCalculate && !editingPrice ? 'bg-gray-100' : ''
                    }`}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    disabled={loading || (autoCalculate && !editingPrice)}
                  />
                </div>
              </div>

              {/* Validation Warnings */}
              {validationWarnings.length > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Pricing Validation Warnings:</span>
                  </div>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {validationWarnings.map((warning, index) => (
                      <li key={index}>• {warning}</li>
                    ))}
                  </ul>
                </div>
              )}

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
                  {basePrices.map((price) => {
                    const isCorrect = isPricingCorrect(price);
                    
                    return (
                      <tr key={price.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!isCorrect ? 'bg-yellow-50' : ''}`}>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <Car className="w-4 h-4 text-gray-400" />
                            <span className="font-medium">
                              {EnhancedBasePriceService.formatModelName(price.vehicle_model)}
                            </span>
                            {!isCorrect && (
                              <AlertTriangle className="w-4 h-4 text-yellow-500" title="Pricing needs attention" />
                            )}
                            {isCorrect && (
                              <CheckCircle className="w-4 h-4 text-green-500" title="Pricing looks good" />
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-gray-900 font-medium">
                            {price.hourly_price > 0 ? `${price.hourly_price.toFixed(2)}` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {/* FIXED: Display daily price as fixed amount, not multiplier */}
                          <span className="text-gray-900 font-medium">
                            {price.daily_price > 0 ? `${price.daily_price.toFixed(2)}` : '-'}
                          </span>
                          {/* REMOVED: "x hourly" display - daily is now independent */}
                        </td>
                        <td className="py-3 px-4">
                          {/* FIXED: Display weekly price as fixed amount, not multiplier */}
                          <span className="text-gray-900 font-medium">
                            {price.weekly_price > 0 ? `${price.weekly_price.toFixed(2)}` : '-'}
                          </span>
                          {/* REMOVED: "x daily" display - weekly is now independent */}
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
                    );
                  })}
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
                <li>• <strong>Fixed Pricing:</strong> Daily and weekly prices are independent fixed amounts, not multipliers of hourly rates</li>
                <li>• <strong>Auto-calculation:</strong> Enable to automatically calculate daily and weekly prices from hourly rates using standard discounts</li>
                <li>• <strong>Standard ratios:</strong> Daily = 8 hours with 10% discount, Weekly = 7 days with 15% bulk discount</li>
                <li>• <strong>Validation:</strong> System warns about unusual pricing ratios that may confuse customers</li>
                <li>• <strong>Fix All Pricing:</strong> Automatically corrects all existing prices using standard rental logic</li>
                <li>• <strong>Single source of truth:</strong> All rental calculations use these base prices as the foundation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedBasePriceEditor;