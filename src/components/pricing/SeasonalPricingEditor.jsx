import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Trash2, Plus, Edit, Save, X } from 'lucide-react';
import PricingService from '../../services/PricingService';

/**
 * SeasonalPricingEditor - Manage seasonal pricing rules
 * FIXED: Now uses localStorage-only PricingService to prevent 404 errors
 */
const SeasonalPricingEditor = () => {
  const [seasons, setSeasons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    season_name: '',
    start_date: '',
    end_date: '',
    multiplier: 1.0,
    active: true,
    description: ''
  });

  // Load seasonal pricing on component mount
  useEffect(() => {
    loadSeasonalPricing();
  }, []);

  const loadSeasonalPricing = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading seasonal pricing from localStorage...');
      
      // Use localStorage-only method to prevent 404 errors
      const data = await PricingService.getAllSeasonalPricing();
      setSeasons(data || []);
      
      console.log('✅ Seasonal pricing loaded:', data?.length || 0, 'seasons');
    } catch (error) {
      console.error('Error loading seasonal pricing:', error);
      // Don't show error to user, just use empty array
      setSeasons([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    try {
      if (!formData.season_name || !formData.start_date || !formData.end_date) {
        alert('Please fill in all required fields');
        return;
      }

      console.log('💾 Saving seasonal pricing to localStorage...', formData);

      // Use localStorage-only method to prevent 404 errors
      await PricingService.upsertSeasonalPricing(formData);
      
      // Reload data
      await loadSeasonalPricing();
      
      // Reset form
      setFormData({
        season_name: '',
        start_date: '',
        end_date: '',
        multiplier: 1.0,
        active: true,
        description: ''
      });
      setEditingId(null);
      setShowAddForm(false);

      console.log('✅ Seasonal pricing saved successfully');
    } catch (error) {
      console.error('Error saving seasonal pricing:', error);
      alert('Failed to save seasonal pricing. Please try again.');
    }
  };

  const handleEdit = (season) => {
    setFormData({
      id: season.id,
      season_name: season.season_name,
      start_date: season.start_date,
      end_date: season.end_date,
      multiplier: season.multiplier,
      active: season.active,
      description: season.description || ''
    });
    setEditingId(season.id);
    setShowAddForm(true);
  };

  const handleDelete = async (seasonId) => {
    if (!confirm('Are you sure you want to delete this seasonal pricing rule?')) {
      return;
    }

    try {
      console.log('🗑️ Deleting seasonal pricing from localStorage:', seasonId);
      
      // Use localStorage-only method to prevent 404 errors
      await PricingService.deleteSeasonalPricing(seasonId);
      
      // Reload data
      await loadSeasonalPricing();
      
      console.log('✅ Seasonal pricing deleted successfully');
    } catch (error) {
      console.error('Error deleting seasonal pricing:', error);
      alert('Failed to delete seasonal pricing. Please try again.');
    }
  };

  const handleCancel = () => {
    setFormData({
      season_name: '',
      start_date: '',
      end_date: '',
      multiplier: 1.0,
      active: true,
      description: ''
    });
    setEditingId(null);
    setShowAddForm(false);
  };

  const formatMultiplier = (multiplier) => {
    const percentage = ((multiplier - 1) * 100);
    if (percentage > 0) {
      return `+${percentage.toFixed(0)}%`;
    } else if (percentage < 0) {
      return `${percentage.toFixed(0)}%`;
    } else {
      return 'Regular';
    }
  };

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate).toLocaleDateString();
    const end = new Date(endDate).toLocaleDateString();
    return `${start} - ${end}`;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Seasonal Pricing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <div className="text-gray-500">Loading seasonal pricing...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Seasonal Pricing Rules
            <Button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Season
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Add/Edit Form */}
          {showAddForm && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit' : 'Add'} Seasonal Pricing
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="season_name">Season Name *</Label>
                  <Input
                    id="season_name"
                    value={formData.season_name}
                    onChange={(e) => handleInputChange('season_name', e.target.value)}
                    placeholder="e.g., Summer Peak"
                  />
                </div>
                
                <div>
                  <Label htmlFor="multiplier">Price Multiplier *</Label>
                  <Input
                    id="multiplier"
                    type="number"
                    step="0.01"
                    min="0.1"
                    max="5.0"
                    value={formData.multiplier}
                    onChange={(e) => handleInputChange('multiplier', parseFloat(e.target.value))}
                    placeholder="1.25 = 25% increase"
                  />
                  <div className="text-sm text-gray-500 mt-1">
                    Current: {formatMultiplier(formData.multiplier || 1.0)}
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => handleInputChange('start_date', e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="end_date">End Date *</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => handleInputChange('end_date', e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Optional description of this seasonal pricing"
                  rows={2}
                />
              </div>
              
              <div className="flex items-center space-x-2 mt-4">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => handleInputChange('active', checked)}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button onClick={handleSave} className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  {editingId ? 'Update' : 'Add'} Season
                </Button>
                <Button variant="outline" onClick={handleCancel} className="flex items-center gap-2">
                  <X className="w-4 h-4" />
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Seasons List */}
          {seasons.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="mb-4">No seasonal pricing rules found</div>
              <Button onClick={() => setShowAddForm(true)} variant="outline">
                Add Your First Season
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {seasons.map((season) => (
                <div key={season.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-4">
                        <h3 className="text-lg font-semibold">{season.season_name}</h3>
                        <span className={`px-2 py-1 rounded text-sm font-medium ${
                          season.multiplier > 1 
                            ? 'bg-red-100 text-red-800' 
                            : season.multiplier < 1 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {formatMultiplier(season.multiplier)}
                        </span>
                        <span className={`px-2 py-1 rounded text-sm ${
                          season.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {season.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div className="text-gray-600 mt-1">
                        {formatDateRange(season.start_date, season.end_date)}
                      </div>
                      
                      {season.description && (
                        <div className="text-sm text-gray-500 mt-1">
                          {season.description}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(season)}
                        className="flex items-center gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(season.id)}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Storage Info */}
          <div className="mt-6 p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Storage:</strong> Seasonal pricing is stored locally in your browser. 
              Data will persist between sessions but is specific to this browser.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SeasonalPricingEditor;