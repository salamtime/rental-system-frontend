import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import SimplePricingService from '../../../services/SimplePricingService';
import { Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

const PromoCodesManager = () => {
  const { t } = useTranslation();
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPromo, setEditingPromo] = useState(null);
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  });

  useEffect(() => {
    loadPromos();
  }, []);

  const loadPromos = async () => {
    try {
      setLoading(true);
      const result = await SimplePricingService.getPromoCodes();
      if (result.success) {
        setPromos(result.data);
      } else {
        toast.error('Failed to load promo codes');
      }
    } catch (error) {
      console.error('Error loading promo codes:', error);
      toast.error('Error loading promo codes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const promoData = {
        ...formData,
        code: formData.code.toUpperCase(),
        discount_value: parseFloat(formData.discount_value),
        valid_from: formData.valid_from ? new Date(formData.valid_from).toISOString() : null,
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
      };

      const result = await SimplePricingService.savePromoCode(promoData);
      if (result.success) {
        toast.success(editingPromo ? 'Promo code updated successfully' : 'Promo code created successfully');
        setShowForm(false);
        setEditingPromo(null);
        resetForm();
        loadPromos();
      } else {
        toast.error('Failed to save promo code');
      }
    } catch (error) {
      console.error('Error saving promo code:', error);
      toast.error('Error saving promo code');
    }
  };

  const handleEdit = (promo) => {
    setEditingPromo(promo);
    setFormData({
      ...promo,
      valid_from: promo.valid_from ? new Date(promo.valid_from).toISOString().slice(0, 16) : '',
      valid_until: promo.valid_until ? new Date(promo.valid_until).toISOString().slice(0, 16) : ''
    });
    setShowForm(true);
  };

  const handleDelete = async (promoId) => {
    if (window.confirm('Are you sure you want to delete this promo code?')) {
      try {
        const result = await SimplePricingService.deletePromoCode(promoId);
        if (result.success) {
          toast.success('Promo code deleted successfully');
          loadPromos();
        } else {
          toast.error('Failed to delete promo code');
        }
      } catch (error) {
        console.error('Error deleting promo code:', error);
        toast.error('Error deleting promo code');
      }
    }
  };

  const handleToggleActive = async (promo) => {
    try {
      const updatedPromo = { ...promo, is_active: !promo.is_active };
      const result = await SimplePricingService.savePromoCode(updatedPromo);
      if (result.success) {
        toast.success(`Promo code ${updatedPromo.is_active ? 'activated' : 'deactivated'}`);
        loadPromos();
      } else {
        toast.error('Failed to update promo code status');
      }
    } catch (error) {
      console.error('Error updating promo code status:', error);
      toast.error('Error updating promo code status');
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Promo code copied to clipboard');
  };

  const resetForm = () => {
    setFormData({
      code: '',
      discount_type: 'percent',
      discount_value: '',
      valid_from: '',
      valid_until: '',
      is_active: true
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingPromo(null);
    resetForm();
  };

  const isPromoExpired = (promo) => {
    if (!promo.valid_until) return false;
    return new Date(promo.valid_until) < new Date();
  };

  const isPromoNotYetValid = (promo) => {
    if (!promo.valid_from) return false;
    return new Date(promo.valid_from) > new Date();
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
          <h2 className="text-lg font-medium text-gray-900">Promo Codes</h2>
          <p className="text-sm text-gray-600 mt-1">
            Create and manage promotional discount codes
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Promo Code</span>
        </button>
      </div>

      {/* Promo Form */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
          <h3 className="text-md font-medium text-gray-900 mb-4">
            {editingPromo ? 'Edit Promo Code' : 'Add New Promo Code'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Promo Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 uppercase"
                  placeholder="e.g., SUMMER20"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Will be automatically converted to uppercase</p>
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
                  placeholder={formData.discount_type === 'percent' ? 'e.g., 20' : 'e.g., 100'}
                  required
                />
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

              <div>
                <label className="block text-sm font-medium text-gray-700">Valid From (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.valid_from}
                  onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Valid Until (Optional)</label>
                <input
                  type="datetime-local"
                  value={formData.valid_until}
                  onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
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
                {editingPromo ? 'Update Promo Code' : 'Create Promo Code'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Promos List */}
      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Code
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Discount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Validity Period
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
            {promos.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                  No promo codes created yet. Click "Add Promo Code" to create your first promotional offer.
                </td>
              </tr>
            ) : (
              promos.map((promo) => (
                <tr key={promo.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="text-sm font-mono font-medium text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {promo.code}
                      </div>
                      <button
                        onClick={() => handleCopyCode(promo.code)}
                        className="text-gray-400 hover:text-gray-600"
                        title="Copy code"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {promo.discount_type === 'percent' 
                        ? `${promo.discount_value}% off` 
                        : `${promo.discount_value} MAD off`
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {promo.valid_from || promo.valid_until ? (
                        <div>
                          {promo.valid_from && (
                            <div>From: {new Date(promo.valid_from).toLocaleDateString()}</div>
                          )}
                          {promo.valid_until && (
                            <div>Until: {new Date(promo.valid_until).toLocaleDateString()}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">No expiration</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleActive(promo)}
                        className={`p-1 rounded ${promo.is_active ? 'text-green-600' : 'text-gray-400'}`}
                        title={promo.is_active ? 'Active' : 'Inactive'}
                      >
                        {promo.is_active ? (
                          <ToggleRight className="w-5 h-5" />
                        ) : (
                          <ToggleLeft className="w-5 h-5" />
                        )}
                      </button>
                      {isPromoExpired(promo) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Expired
                        </span>
                      )}
                      {isPromoNotYetValid(promo) && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Not Yet Valid
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(promo)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(promo.id)}
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

export default PromoCodesManager;