import React, { useState, useEffect } from 'react';
import { DollarSign, Save, RefreshCw, Settings, Database, HardDrive, Package2, Wifi, WifiOff } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings.js';
import toast from 'react-hot-toast';
import DataSourceStatus from '../common/DataSourceStatus';

const PricingSettings = () => {
  // Settings hook for pricing configuration
  const { 
    settings, 
    loading: settingsLoading, 
    error: settingsError, 
    saving: settingsSaving, 
    saveSettings, 
    resetToDefaults,
    source,
    online,
    loadSettings
  } = useSettings();

  // Local state for form inputs
  const [formData, setFormData] = useState({
    defaultRate1h: 0,
    defaultRate2h: 0,
    vipRate1h: 0,
    vipRate2h: 0,
    extraPassengerFee: 0,
    depositPercentage: 0
  });

  const [formErrors, setFormErrors] = useState({});

  // Update form data when settings are loaded
  useEffect(() => {
    if (settings) {
      setFormData({
        defaultRate1h: settings.defaultRate1h || 0,
        defaultRate2h: settings.defaultRate2h || 0,
        vipRate1h: settings.vipRate1h || 0,
        vipRate2h: settings.vipRate2h || 0,
        extraPassengerFee: settings.extraPassengerFee || 0,
        depositPercentage: settings.depositPercentage || 0
      });
    }
  }, [settings]);

  // Handle form input changes
  const handleInputChange = (field, value) => {
    const numericValue = parseFloat(value) || 0;
    setFormData(prev => ({
      ...prev,
      [field]: numericValue
    }));

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Validate form data
  const validateForm = () => {
    const errors = {};

    if (formData.defaultRate1h < 0) errors.defaultRate1h = 'Must be non-negative';
    if (formData.defaultRate2h < 0) errors.defaultRate2h = 'Must be non-negative';
    if (formData.vipRate1h < 0) errors.vipRate1h = 'Must be non-negative';
    if (formData.vipRate2h < 0) errors.vipRate2h = 'Must be non-negative';
    if (formData.extraPassengerFee < 0) errors.extraPassengerFee = 'Must be non-negative';
    if (formData.depositPercentage < 0 || formData.depositPercentage > 100) {
      errors.depositPercentage = 'Must be between 0 and 100';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Save pricing settings
  const handleSaveSettings = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }

    const result = await saveSettings(formData);
    if (result.success) {
      console.log('Settings saved successfully');
    }
  };

  // Reset to default values
  const handleResetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all pricing settings to default values?')) {
      return;
    }

    const result = await resetToDefaults();
    if (result.success) {
      console.log('Settings reset to defaults');
    }
  };

  // Reload settings from the source
  const handleReloadSettings = async () => {
    toast.promise(loadSettings(), {
      loading: 'Reloading settings...',
      success: 'Settings reloaded',
      error: 'Failed to reload settings'
    });
  };

  if (settingsLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <DollarSign className="h-6 w-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Pricing Settings
          </h3>
        </div>
        
        {/* Data Source Indicator */}
        <div className="flex items-center gap-4">
          <DataSourceStatus />
          
          <div className="flex items-center">
            {online ? (
              <Wifi className="h-4 w-4 text-green-600 mr-1" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600 mr-1" />
            )}
            <span className={`text-xs font-medium ${online ? 'text-green-600' : 'text-red-600'}`}>
              {online ? 'Online' : 'Offline'}
            </span>
          </div>
          
          <button
            onClick={handleReloadSettings}
            className="flex items-center text-xs px-2 py-1 text-blue-700 bg-blue-50 rounded hover:bg-blue-100"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Reload
          </button>
        </div>
      </div>

      {/* Error message */}
      {settingsError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-red-800">Error: {settingsError.message}</span>
          </div>
        </div>
      )}

      <div className="bg-gray-50 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Default Rates */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Default Rates</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                1-Hour Rate ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.defaultRate1h}
                onChange={(e) => handleInputChange('defaultRate1h', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.defaultRate1h ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.defaultRate1h && (
                <p className="text-sm text-red-600 mt-1">{formErrors.defaultRate1h}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                2-Hour Rate ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.defaultRate2h}
                onChange={(e) => handleInputChange('defaultRate2h', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.defaultRate2h ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.defaultRate2h && (
                <p className="text-sm text-red-600 mt-1">{formErrors.defaultRate2h}</p>
              )}
            </div>
          </div>

          {/* VIP Rates */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">VIP Rates</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIP 1-Hour Rate ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.vipRate1h}
                onChange={(e) => handleInputChange('vipRate1h', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.vipRate1h ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.vipRate1h && (
                <p className="text-sm text-red-600 mt-1">{formErrors.vipRate1h}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                VIP 2-Hour Rate ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.vipRate2h}
                onChange={(e) => handleInputChange('vipRate2h', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.vipRate2h ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.vipRate2h && (
                <p className="text-sm text-red-600 mt-1">{formErrors.vipRate2h}</p>
              )}
            </div>
          </div>

          {/* Additional Fees */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Additional Fees</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Extra Passenger Fee ($)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.extraPassengerFee}
                onChange={(e) => handleInputChange('extraPassengerFee', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.extraPassengerFee ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.extraPassengerFee && (
                <p className="text-sm text-red-600 mt-1">{formErrors.extraPassengerFee}</p>
              )}
            </div>
          </div>

          {/* Deposit Settings */}
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Deposit Settings</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deposit Percentage (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="1"
                value={formData.depositPercentage}
                onChange={(e) => handleInputChange('depositPercentage', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  formErrors.depositPercentage ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {formErrors.depositPercentage && (
                <p className="text-sm text-red-600 mt-1">{formErrors.depositPercentage}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSaveSettings}
            disabled={settingsSaving}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {settingsSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {settingsSaving ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button
            onClick={handleResetToDefaults}
            disabled={settingsSaving}
            className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
          >
            <Settings className="h-4 w-4" />
            Reset to Defaults
          </button>
        </div>
        
        {/* Data Source Info Footer */}
        <div className="mt-6 pt-4 border-t border-gray-200 text-sm text-gray-500">
          <div className="flex flex-col space-y-1">
            <div className="flex items-center">
              <span className="font-medium mr-2">Data Source:</span>
              {source === 'database' && (
                <span className="text-green-600 flex items-center">
                  <Database className="h-4 w-4 mr-1" /> Database
                </span>
              )}
              {source === 'cache' && (
                <span className="text-amber-600 flex items-center">
                  <HardDrive className="h-4 w-4 mr-1" /> Local Cache
                </span>
              )}
              {source === 'default' && (
                <span className="text-blue-600 flex items-center">
                  <Package2 className="h-4 w-4 mr-1" /> Default Values
                </span>
              )}
            </div>
            <div>
              {!online && source !== 'database' && (
                <div className="text-red-500 text-xs">
                  Warning: Working in offline mode. Changes will be saved locally until connection is restored.
                </div>
              )}
              {online && source !== 'database' && (
                <div className="text-amber-500 text-xs">
                  Warning: Using cached or default settings. Click Reload to try connecting to the database again.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingSettings;