import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SimplePricingService from '../../../services/SimplePricingService';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';

const DurationTiersManager = () => {
  const { t } = useTranslation();
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTier, setEditingTier] = useState(null);
  const [formData, setFormData] = useState({
    vehicle_type: 'AT5',
    rate_type: 'hour',
    min_qty: '',
    max_qty: '',
    discount_type: 'percent',
    discount_value: '',
    priority: 100,
    is_active: true
  });

  const vehicleTypes = ['AT5', 'AT6', 'Quad', 'Buggy'];

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      setLoading(true);
      const result = await SimplePricingService.getDurationTiers();
      if (result.success) {
        setTiers(result.data);
      } else {
        toast.error('Failed to load duration tiers');
      }
    } catch (error) {
      console.error('Error loading duration tiers:', error);
      toast.error('Error loading duration tiers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const tierData = {
        ...formData,
        min_qty: parseFloat(formData.min_qty),
        max_qty: formData.max_qty ? parseFloat(formData.max_qty) : null,
        discount_value: parseFloat(formData.discount_value),
        priority: parseInt(formData.priority)
      };

      const result = await SimplePricingService.saveDurationTier(tierData);
      if (result.success) {
        toast.success(editingTier ? 'Tier updated successfully' : 'Tier created successfully');
        setShowForm(false);
        setEditingTier(null);
        resetForm();
        loadTiers();
      } else {
        toast.error('Failed to save tier');
      }
    } catch (error) {
      console.error('Error saving tier:', error);
      toast.error('Error saving tier');
    }
  };

  const handleEdit = (tier) => {
    setEditingTier(tier);
    setFormData({
      ...tier,
      max_qty: tier.max_qty || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (tierId) => {
    if (window.confirm('Are you sure you want to delete this duration tier?')) {
      try {
        const result = await SimplePricingService.deleteDurationTier(tierId);
        if (result.success) {
          toast.success('Tier deleted successfully');
          loadTiers();
        } else {
          toast.error('Failed to delete tier');
        }
      } catch (error) {
        console.error('Error deleting tier:', error);
        toast.error('Error deleting tier');
      }
    }
  };

  const handleToggleActive = async (tier) => {
    try {
      const updatedTier = { ...tier, is_active: !tier.is_active };
      const result = await SimplePricingService.saveDurationTier(updatedTier);
      if (result.success) {
        toast.success(`Tier ${updatedTier.is_active ? 'activated' : 'deactivated'}`);
        loadTiers();
      } else {
        toast.error('Failed to update tier status');
      }
    } catch (error) {
      console.error('Error updating tier status:', error);
      toast.error('Error updating tier status');
    }
  };

  const resetForm = () => {
    setFormData({
      vehicle_type: 'AT5',
      rate_type: 'hour',
      min_qty: '',
      max_qty: '',
      discount_type: 'percent',
      discount_value: '',
      priority: 100,
      is_active: true
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingTier(null);
    resetForm();
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Duration Discount Tiers</h2>
          <p className="text-sm text-gray-600 mt-1">
            Set quantity-based discounts (e.g., 3+ hours = 10% off)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tier</span>
        </button>
      </div>

      {/* Tier Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            {editingTier ? 'Edit Duration Tier' : 'Add New Duration Tier'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  {vehicleTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Rate Type</label>
                <select
                  value={formData.rate_type}
                  onChange={(e) => setFormData({ ...formData, rate_type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="hour">Hourly</option>
                  <option value="day">Daily</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Min Quantity</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.min_qty}
                  onChange={(e) => setFormData({ ...formData, min_qty: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., 3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Max Quantity (Optional)</label>
                <input
                  type="number"
                  step="1"
                  min="1"
                  value={formData.max_qty}
                  onChange={(e) => setFormData({ ...formData, max_qty: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Leave empty for no upper limit"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Discount Type</label>
                <select
                  value={formData.discount_type}
                  onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="percent">Percentage (%)</option>
                  <option value="fixed">Fixed Amount (MAD)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Discount Value {formData.discount_type === 'percent' ? '(%)' : '(MAD)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={formData.discount_type === 'percent' ? "100" : undefined}
                  value={formData.discount_value}
                  onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder={formData.discount_type === 'percent' ? 'e.g., 10' : 'e.g., 50'}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <input
                  type="number"
                  min="1"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers have higher priority</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Active</label>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {editingTier ? 'Update Tier' : 'Create Tier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tiers List */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vehicle & Rate
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity Range
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tiers.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  No duration tiers configured. Click "Add Tier" to create your first discount tier.
                </td>
              </tr>
            ) : (
              tiers.map((tier) => (
                <tr key={tier.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{tier.vehicle_type}</div>
                    <div className="text-sm text-gray-500 capitalize">{tier.rate_type}ly</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {tier.min_qty}+ {tier.rate_type}s
                      {tier.max_qty && ` (max ${tier.max_qty})`}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {tier.discount_type === 'percent' 
                        ? `${tier.discount_value}%` 
                        : `${tier.discount_value} MAD`
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{tier.priority}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(tier)}
                      className={`p-1 rounded ${tier.is_active ? 'text-green-600' : 'text-gray-400'}`}
                      title={tier.is_active ? 'Active' : 'Inactive'}
                    >
                      {tier.is_active ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(tier)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(tier.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DurationTiersManager;