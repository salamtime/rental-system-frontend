import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import PricingService from '../../services/PricingService'; // FIXED: Changed from named import to default import
import { supabase } from '../../lib/supabase';
import { Edit, Save, X, Plus, Trash2 } from 'lucide-react';

const DailyTiersEditor = ({ onUpdate }) => {
  const [dailyTiers, setDailyTiers] = useState([]);
  const [vehicleModels, setVehicleModels] = useState([]);
  const [newTierForm, setNewTierForm] = useState({
    vehicle_model_id: '',
    min_days: '',
    max_days: '',
    price_per_day: ''
  });
  const [showNewForm, setShowNewForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const { data: models, error: modelsError } = await supabase
        .from('saharax_0u4w4d_vehicle_models')
        .select('*')
        .eq('is_active', true)
        .order('model', { ascending: true });

      if (modelsError) {
        console.error('Error loading vehicle models:', modelsError);
        setVehicleModels([]);
      } else {
        setVehicleModels(models || []);
      }

      const tiers = await PricingService.getDailyTiers();
      setDailyTiers(tiers || []);
    } catch (error) {
      console.error('Error loading daily tiers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getModelLabel = (model) => {
    const modelName = model.model || model.name || 'Unknown Model';
    const vehicleType = model.vehicle_type ? ` (${model.vehicle_type})` : '';
    const shortId = model.id ? model.id.substring(0, 8) : 'unknown';
    return `${modelName}${vehicleType} • ${shortId}`;
  };

  const getModelDisplayName = (modelId) => {
    const model = vehicleModels.find(m => m.id === modelId);
    return model ? getModelLabel(model) : `Model ID: ${modelId}`;
  };

  const addNewTier = async () => {
    try {
      await PricingService.upsertDailyTier(
        newTierForm.vehicle_model_id,
        newTierForm.min_days,
        newTierForm.max_days || null,
        newTierForm.price_per_day
      );
      await loadData();
      setNewTierForm({
        vehicle_model_id: '',
        min_days: '',
        max_days: '',
        price_per_day: ''
      });
      setShowNewForm(false);
      onUpdate?.();
    } catch (error) {
      console.error('Error adding daily tier:', error);
      alert('Error adding daily tier: ' + error.message);
    }
  };

  const deleteTier = async (id) => {
    if (confirm('Are you sure you want to delete this tier?')) {
      try {
        await PricingService.deleteDailyTier(id);
        await loadData();
        onUpdate?.();
      } catch (error) {
        console.error('Error deleting daily tier:', error);
        alert('Error deleting daily tier: ' + error.message);
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading daily tiers...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Daily Tier Pricing</CardTitle>
          <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
            <Plus className="w-4 h-4 mr-2" />
            Add New Tier
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {showNewForm && (
          <Card className="mb-6 border-dashed">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Vehicle Model</Label>
                  <Select
                    value={newTierForm.vehicle_model_id}
                    onValueChange={(value) => setNewTierForm(prev => ({ ...prev, vehicle_model_id: value }))}
                  >
                    <SelectTrigger className="h-auto min-h-[40px]">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleModels.length === 0 ? (
                        <SelectItem value="no-models-available" disabled>
                          No models available
                        </SelectItem>
                      ) : (
                        vehicleModels
                          .filter(model => model && model.id)
                          .map(model => (
                            <SelectItem 
                              key={model.id} 
                              value={model.id.toString()}
                              className="py-3"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">
                                  {model.model || model.name || 'Unknown Model'}
                                </span>
                                <span className="text-xs text-gray-500">
                                  {model.vehicle_type} • ID: {model.id.substring(0, 8)}...
                                </span>
                              </div>
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Min Days</Label>
                  <Input
                    type="number"
                    value={newTierForm.min_days}
                    onChange={(e) => setNewTierForm(prev => ({ ...prev, min_days: e.target.value }))}
                    placeholder="1"
                  />
                </div>
                <div>
                  <Label>Max Days (optional)</Label>
                  <Input
                    type="number"
                    value={newTierForm.max_days}
                    onChange={(e) => setNewTierForm(prev => ({ ...prev, max_days: e.target.value }))}
                    placeholder="Leave empty for no limit"
                  />
                </div>
                <div>
                  <Label>Price per Day</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newTierForm.price_per_day}
                    onChange={(e) => setNewTierForm(prev => ({ ...prev, price_per_day: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button 
                  onClick={addNewTier} 
                  disabled={!newTierForm.vehicle_model_id || !newTierForm.min_days || !newTierForm.price_per_day || newTierForm.vehicle_model_id === 'no-models-available'}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Tier
                </Button>
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {dailyTiers.map((tier) => (
            <Card key={tier.id} className="border">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {getModelDisplayName(tier.vehicle_model_id)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {tier.min_days} - {tier.max_days || '∞'} days: ${parseFloat(tier.price_per_day).toFixed(2)}/day
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => deleteTier(tier.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {dailyTiers.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No daily tiers found. Add some tiers to enable volume discounts.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DailyTiersEditor;