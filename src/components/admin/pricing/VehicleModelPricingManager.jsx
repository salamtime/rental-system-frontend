import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Plus, DollarSign, Edit, Loader2, AlertCircle } from 'lucide-react';
import AddPricingModal from './AddPricingModal';
import EditPricingModal from './EditPricingModal';
import VehicleModelsService from '../../../services/VehicleModelsService';
import toast from 'react-hot-toast';

const VehicleModelPricingManager = () => {
  // Hardcoded AT5 and AT6 pricing data with editable values
  const [pricingData, setPricingData] = useState([
    {
      id: 'AT5',
      vehicle_model_id: 'AT5',
      model_name: 'AT5',
      hourly_mad: 150.00,
      daily_mad: 800.00,
      created_at: '2025-09-16T00:00:00Z',
      updated_at: '2025-09-16T00:00:00Z'
    },
    {
      id: 'AT6',
      vehicle_model_id: 'AT6', 
      model_name: 'AT6',
      hourly_mad: 180.00,
      daily_mad: 950.00,
      created_at: '2025-09-16T00:00:00Z',
      updated_at: '2025-09-16T00:00:00Z'
    }
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load any saved pricing from localStorage on mount
  useEffect(() => {
    loadSavedPricing();
  }, []);

  const loadSavedPricing = () => {
    try {
      // Check localStorage for any saved pricing updates
      const savedAT5 = localStorage.getItem('pricing_AT5');
      const savedAT6 = localStorage.getItem('pricing_AT6');
      
      setPricingData(prev => prev.map(item => {
        if (item.id === 'AT5' && savedAT5) {
          const saved = JSON.parse(savedAT5);
          return { ...item, hourly_mad: saved.hourly_mad, daily_mad: saved.daily_mad };
        }
        if (item.id === 'AT6' && savedAT6) {
          const saved = JSON.parse(savedAT6);
          return { ...item, hourly_mad: saved.hourly_mad, daily_mad: saved.daily_mad };
        }
        return item;
      }));
    } catch (error) {
      console.log('No saved pricing found');
    }
  };

  const handleAddPricingSuccess = () => {
    setIsAddModalOpen(false);
    loadSavedPricing(); // Reload to show any updates
    console.log('✅ Pricing added successfully');
  };

  const handleEditPricing = (pricingItem) => {
    setEditingPricing(pricingItem);
    setIsEditModalOpen(true);
  };

  const handleEditPricingSuccess = () => {
    setIsEditModalOpen(false);
    setEditingPricing(null);
    loadSavedPricing(); // Reload to show updates
    console.log('✅ Pricing updated successfully');
  };

  const formatMAD = (amount) => {
    return `${parseFloat(amount || 0).toFixed(0)} MAD`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Vehicle Model Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading pricing data...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Vehicle Model Pricing
            </CardTitle>
            <Button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Pricing
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            Manage hourly and daily pricing for different vehicle models
          </p>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 text-sm">
                <strong>Error:</strong> {error}
              </p>
            </div>
          )}
          
          {/* Hardcoded AT5 and AT6 pricing boxes */}
          <div className="grid gap-4 md:grid-cols-2">
            {pricingData.map((pricing) => (
              <div 
                key={pricing.id} 
                className="border rounded-lg p-6 space-y-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-xl text-gray-900">
                    {pricing.model_name}
                  </h4>
                  <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    Model
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Hourly Rate:</span>
                    <span className="font-semibold text-lg">{formatMAD(pricing.hourly_mad)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Daily Rate:</span>
                    <span className="font-semibold text-lg">{formatMAD(pricing.daily_mad)}</span>
                  </div>
                </div>
                
                <div className="pt-3 border-t flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Added: {formatDate(pricing.created_at)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPricing(pricing)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Edit
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Pricing Modal */}
      <AddPricingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleAddPricingSuccess}
      />

      {/* Edit Pricing Modal */}
      <EditPricingModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditPricingSuccess}
        pricingData={editingPricing}
      />
    </div>
  );
};

export default VehicleModelPricingManager;