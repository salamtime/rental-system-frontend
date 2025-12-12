import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Search, Filter, DollarSign, Calendar, TrendingUp, Settings, X, FileText, AlertTriangle, Clock, CheckCircle, BarChart3, Target, Percent, Globe } from 'lucide-react';
import GridSkeleton from './ui/GridSkeleton';
import { TBL } from '../config/tables';

interface PricingRule {
  id: string;
  name: string;
  description: string;
  rule_type: 'seasonal' | 'demand' | 'vehicle_type' | 'duration' | 'location' | 'custom';
  vehicle_types: string[];
  locations: string[];
  conditions: PricingCondition[];
  adjustments: PricingAdjustment[];
  priority: number;
  is_active: boolean;
  valid_from: string;
  valid_to: string;
  created_at: string;
  updated_at: string;
}

interface PricingCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'between' | 'in' | 'not_in';
  value: any;
  description: string;
}

interface PricingAdjustment {
  type: 'percentage' | 'fixed_amount' | 'multiplier';
  value: number;
  target: 'base_price' | 'total_price' | 'hourly_rate' | 'daily_rate';
  description: string;
}

interface BasePrice {
  id: string;
  vehicle_type: string;
  location_id: string | null;
  hourly_rate: number;
  daily_rate: number;
  weekly_rate: number;
  monthly_rate: number;
  minimum_duration: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PricingAnalytics {
  total_rules: number;
  active_rules: number;
  avg_price_adjustment: number;
  most_used_rule_type: string;
  revenue_impact: number;
  bookings_affected: number;
}

const DynamicPricingManagement: React.FC = () => {
  // Console log for canonical path identification
  console.log('PRICING_MANAGEMENT_CANONICAL_PATH: /workspace/react_template/src/components/DynamicPricingManagement.tsx');

  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [basePrices, setBasePrices] = useState<BasePrice[]>([]);
  const [analytics, setAnalytics] = useState<PricingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [viewingRule, setViewingRule] = useState<PricingRule | null>(null);
  const [activeTab, setActiveTab] = useState<'rules' | 'base_prices' | 'analytics' | 'preview'>('rules');

  const [showAddBasePriceForm, setShowAddBasePriceForm] = useState(false);
  const [editingBasePrice, setEditingBasePrice] = useState<BasePrice | null>(null);

  const getEmptyRuleFormData = () => ({
    name: '',
    description: '',
    rule_type: 'seasonal' as const,
    vehicle_types: [] as string[],
    locations: [] as string[],
    conditions: [] as PricingCondition[],
    adjustments: [] as PricingAdjustment[],
    priority: 1,
    is_active: true,
    valid_from: new Date().toISOString().split('T')[0],
    valid_to: ''
  });

  const getEmptyBasePriceFormData = () => ({
    vehicle_type: 'quad',
    location_id: null,
    hourly_rate: 0,
    daily_rate: 0,
    weekly_rate: 0,
    monthly_rate: 0,
    minimum_duration: 1,
    currency: 'MAD',
    is_active: true
  });

  const [ruleFormData, setRuleFormData] = useState(getEmptyRuleFormData());
  const [basePriceFormData, setBasePriceFormData] = useState(getEmptyBasePriceFormData());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);
    
    try {
      // Mock data for demonstration - replace with actual Supabase queries
      const mockPricingRules: PricingRule[] = [
        {
          id: '1',
          name: 'Summer Peak Season',
          description: 'Higher rates during summer months (June-August)',
          rule_type: 'seasonal',
          vehicle_types: ['quad', 'ATV'],
          locations: [],
          conditions: [
            {
              field: 'booking_date',
              operator: 'between',
              value: ['2024-06-01', '2024-08-31'],
              description: 'Summer months'
            }
          ],
          adjustments: [
            {
              type: 'percentage',
              value: 25,
              target: 'base_price',
              description: '+25% increase'
            }
          ],
          priority: 1,
          is_active: true,
          valid_from: '2024-06-01',
          valid_to: '2024-08-31',
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-01-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Weekend Premium',
          description: 'Weekend surcharge for high demand periods',
          rule_type: 'demand',
          vehicle_types: ['quad', 'ATV', 'motorcycle'],
          locations: [],
          conditions: [
            {
              field: 'day_of_week',
              operator: 'in',
              value: ['saturday', 'sunday'],
              description: 'Weekends'
            }
          ],
          adjustments: [
            {
              type: 'percentage',
              value: 15,
              target: 'base_price',
              description: '+15% weekend premium'
            }
          ],
          priority: 2,
          is_active: true,
          valid_from: '2024-01-01',
          valid_to: '2024-12-31',
          created_at: '2024-01-10T10:00:00Z',
          updated_at: '2024-01-10T10:00:00Z'
        },
        {
          id: '3',
          name: 'Long Duration Discount',
          description: 'Discount for rentals longer than 7 days',
          rule_type: 'duration',
          vehicle_types: [],
          locations: [],
          conditions: [
            {
              field: 'rental_duration_days',
              operator: 'greater_than',
              value: 7,
              description: 'More than 7 days'
            }
          ],
          adjustments: [
            {
              type: 'percentage',
              value: -10,
              target: 'total_price',
              description: '-10% long term discount'
            }
          ],
          priority: 3,
          is_active: true,
          valid_from: '2024-01-01',
          valid_to: '2024-12-31',
          created_at: '2024-01-05T10:00:00Z',
          updated_at: '2024-01-05T10:00:00Z'
        }
      ];

      const mockBasePrices: BasePrice[] = [
        {
          id: '1',
          vehicle_type: 'quad',
          location_id: null,
          hourly_rate: 150,
          daily_rate: 800,
          weekly_rate: 4500,
          monthly_rate: 15000,
          minimum_duration: 2,
          currency: 'MAD',
          is_active: true,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        },
        {
          id: '2',
          vehicle_type: 'ATV',
          location_id: null,
          hourly_rate: 200,
          daily_rate: 1000,
          weekly_rate: 5500,
          monthly_rate: 18000,
          minimum_duration: 2,
          currency: 'MAD',
          is_active: true,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        },
        {
          id: '3',
          vehicle_type: 'motorcycle',
          location_id: null,
          hourly_rate: 120,
          daily_rate: 600,
          weekly_rate: 3500,
          monthly_rate: 12000,
          minimum_duration: 1,
          currency: 'MAD',
          is_active: true,
          created_at: '2024-01-01T10:00:00Z',
          updated_at: '2024-01-01T10:00:00Z'
        }
      ];

      const mockAnalytics: PricingAnalytics = {
        total_rules: mockPricingRules.length,
        active_rules: mockPricingRules.filter(r => r.is_active).length,
        avg_price_adjustment: 10.5,
        most_used_rule_type: 'seasonal',
        revenue_impact: 125000,
        bookings_affected: 245
      };

      setPricingRules(mockPricingRules);
      setBasePrices(mockBasePrices);
      setAnalytics(mockAnalytics);

      const endTime = performance.now();
      console.log(`✅ Pricing data loaded in ${(endTime - startTime).toFixed(2)}ms`);

    } catch (error) {
      console.error('❌ Error fetching pricing data:', error);
      setError(`Failed to load pricing data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRule = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    setSubmitting(true);
    
    try {
      if (editingRule) {
        // Update existing rule
        const updatedRule = {
          ...editingRule,
          ...ruleFormData,
          updated_at: new Date().toISOString()
        };
        
        setPricingRules(prev => prev.map(rule => 
          rule.id === editingRule.id ? updatedRule : rule
        ));
        
        alert('Pricing rule updated successfully!');
      } else {
        // Create new rule
        const newRule: PricingRule = {
          id: Date.now().toString(),
          ...ruleFormData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setPricingRules(prev => [...prev, newRule]);
        alert('Pricing rule created successfully!');
      }
      
      resetRuleForm();
      
    } catch (error) {
      console.error('❌ Error saving pricing rule:', error);
      alert(`Failed to save pricing rule: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitBasePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) return;
    setSubmitting(true);
    
    try {
      if (editingBasePrice) {
        // Update existing base price
        const updatedPrice = {
          ...editingBasePrice,
          ...basePriceFormData,
          updated_at: new Date().toISOString()
        };
        
        setBasePrices(prev => prev.map(price => 
          price.id === editingBasePrice.id ? updatedPrice : price
        ));
        
        alert('Base price updated successfully!');
      } else {
        // Create new base price
        const newPrice: BasePrice = {
          id: Date.now().toString(),
          ...basePriceFormData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setBasePrices(prev => [...prev, newPrice]);
        alert('Base price created successfully!');
      }
      
      resetBasePriceForm();
      
    } catch (error) {
      console.error('❌ Error saving base price:', error);
      alert(`Failed to save base price: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetRuleForm = () => {
    setRuleFormData(getEmptyRuleFormData());
    setShowAddForm(false);
    setEditingRule(null);
    setViewingRule(null);
  };

  const resetBasePriceForm = () => {
    setBasePriceFormData(getEmptyBasePriceFormData());
    setShowAddBasePriceForm(false);
    setEditingBasePrice(null);
  };

  const handleEditRule = (rule: PricingRule) => {
    setRuleFormData({
      name: rule.name,
      description: rule.description,
      rule_type: rule.rule_type,
      vehicle_types: rule.vehicle_types,
      locations: rule.locations,
      conditions: rule.conditions,
      adjustments: rule.adjustments,
      priority: rule.priority,
      is_active: rule.is_active,
      valid_from: rule.valid_from,
      valid_to: rule.valid_to
    });
    setEditingRule(rule);
    setViewingRule(null);
    setShowAddForm(true);
  };

  const handleViewRule = (rule: PricingRule) => {
    setRuleFormData({
      name: rule.name,
      description: rule.description,
      rule_type: rule.rule_type,
      vehicle_types: rule.vehicle_types,
      locations: rule.locations,
      conditions: rule.conditions,
      adjustments: rule.adjustments,
      priority: rule.priority,
      is_active: rule.is_active,
      valid_from: rule.valid_from,
      valid_to: rule.valid_to
    });
    setViewingRule(rule);
    setEditingRule(null);
    setShowAddForm(true);
  };

  const handleDeleteRule = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this pricing rule?')) {
      try {
        setPricingRules(prev => prev.filter(rule => rule.id !== id));
        alert('Pricing rule deleted successfully!');
      } catch (error) {
        console.error('Error deleting pricing rule:', error);
        alert('Failed to delete pricing rule');
      }
    }
  };

  const handleEditBasePrice = (price: BasePrice) => {
    setBasePriceFormData({
      vehicle_type: price.vehicle_type,
      location_id: price.location_id,
      hourly_rate: price.hourly_rate,
      daily_rate: price.daily_rate,
      weekly_rate: price.weekly_rate,
      monthly_rate: price.monthly_rate,
      minimum_duration: price.minimum_duration,
      currency: price.currency,
      is_active: price.is_active
    });
    setEditingBasePrice(price);
    setShowAddBasePriceForm(true);
  };

  const handleDeleteBasePrice = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this base price?')) {
      try {
        setBasePrices(prev => prev.filter(price => price.id !== id));
        alert('Base price deleted successfully!');
      } catch (error) {
        console.error('Error deleting base price:', error);
        alert('Failed to delete base price');
      }
    }
  };

  const toggleRuleStatus = async (id: string) => {
    try {
      setPricingRules(prev => prev.map(rule => 
        rule.id === id 
          ? { ...rule, is_active: !rule.is_active, updated_at: new Date().toISOString() }
          : rule
      ));
    } catch (error) {
      console.error('Error toggling rule status:', error);
    }
  };

  const getRuleTypeColor = (type: string) => {
    switch (type) {
      case 'seasonal': return 'bg-blue-100 text-blue-800';
      case 'demand': return 'bg-purple-100 text-purple-800';
      case 'vehicle_type': return 'bg-green-100 text-green-800';
      case 'duration': return 'bg-yellow-100 text-yellow-800';
      case 'location': return 'bg-red-100 text-red-800';
      case 'custom': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const filteredRules = pricingRules.filter(rule => {
    const matchesSearch = rule.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         rule.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || rule.rule_type === typeFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && rule.is_active) ||
                         (statusFilter === 'inactive' && !rule.is_active);
    return matchesSearch && matchesType && matchesStatus;
  });

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="animate-pulse h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="animate-pulse h-4 bg-gray-200 rounded w-96"></div>
        </div>

        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="animate-pulse py-2 px-1 border-b-2 border-transparent">
                <div className="h-6 bg-gray-200 rounded w-24"></div>
              </div>
            ))}
          </nav>
        </div>

        <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="animate-pulse h-10 bg-gray-200 rounded w-64"></div>
            <div className="flex gap-2">
              <div className="animate-pulse h-10 bg-gray-200 rounded w-32"></div>
              <div className="animate-pulse h-10 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="animate-pulse h-10 bg-gray-200 rounded w-32"></div>
        </div>

        <GridSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Dynamic Pricing Management</h1>
          <p className="text-gray-600">Manage pricing rules, base prices, and analytics</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-800 mb-2">Failed to Load Data</h3>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchData}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dynamic Pricing Management</h1>
        <p className="text-gray-600">Manage pricing rules, base prices, and revenue optimization strategies</p>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Settings className="inline-block w-4 h-4 mr-2" />
            Pricing Rules ({pricingRules.length})
          </button>
          <button
            onClick={() => setActiveTab('base_prices')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'base_prices'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <DollarSign className="inline-block w-4 h-4 mr-2" />
            Base Prices ({basePrices.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BarChart3 className="inline-block w-4 h-4 mr-2" />
            Analytics & Reports
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'preview'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Target className="inline-block w-4 h-4 mr-2" />
            Price Preview
          </button>
        </nav>
      </div>

      {/* Pricing Rules Tab */}
      {activeTab === 'rules' && (
        <>
          {/* Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search pricing rules..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="demand">Demand-based</option>
                  <option value="vehicle_type">Vehicle Type</option>
                  <option value="duration">Duration</option>
                  <option value="location">Location</option>
                  <option value="custom">Custom</option>
                </select>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={() => {
                resetRuleForm();
                setShowAddForm(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Pricing Rule
            </button>
          </div>

          {/* Pricing Rules Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRules.map((rule) => (
              <div key={rule.id} className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{rule.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{rule.description}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => handleViewRule(rule)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="View Details"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEditRule(rule)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit Rule"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRuleTypeColor(rule.rule_type)}`}>
                      {rule.rule_type.replace('_', ' ')}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(rule.is_active)}`}>
                      {rule.is_active ? 'Active' : 'Inactive'}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Priority: {rule.priority}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Valid From:</span>
                      <span>{new Date(rule.valid_from).toLocaleDateString()}</span>
                    </div>
                    {rule.valid_to && (
                      <div className="flex justify-between">
                        <span>Valid To:</span>
                        <span>{new Date(rule.valid_to).toLocaleDateString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Adjustments:</span>
                      <span className="font-medium">
                        {rule.adjustments.length} rule{rule.adjustments.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Updated {new Date(rule.updated_at).toLocaleDateString()}
                      </span>
                      <button
                        onClick={() => toggleRuleStatus(rule.id)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          rule.is_active
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {rule.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredRules.length === 0 && (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pricing rules found matching your criteria</p>
            </div>
          )}
        </>
      )}

      {/* Base Prices Tab */}
      {activeTab === 'base_prices' && (
        <>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Base Pricing Configuration</h2>
            <button
              onClick={() => {
                resetBasePriceForm();
                setShowAddBasePriceForm(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Base Price
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hourly Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Daily Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weekly Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Monthly Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {basePrices.map((price) => (
                    <tr key={price.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <span className="capitalize">{price.vehicle_type}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(price.hourly_rate)}/hr
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(price.daily_rate)}/day
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(price.weekly_rate)}/week
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(price.monthly_rate)}/month
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {price.minimum_duration}h
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(price.is_active)}`}>
                          {price.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditBasePrice(price)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                            title="Edit Price"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteBasePrice(price.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                            title="Delete Price"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {basePrices.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No base prices configured</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Pricing Analytics & Performance</h2>
          </div>

          {/* Analytics Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Total Rules</h3>
                  <p className="text-2xl font-bold text-blue-600">{analytics.total_rules}</p>
                  <p className="text-xs text-gray-500">{analytics.active_rules} active</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Revenue Impact</h3>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(analytics.revenue_impact)}</p>
                  <p className="text-xs text-gray-500">This month</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Percent className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Avg Adjustment</h3>
                  <p className="text-2xl font-bold text-purple-600">+{analytics.avg_price_adjustment}%</p>
                  <p className="text-xs text-gray-500">Across all rules</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <Target className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Bookings Affected</h3>
                  <p className="text-2xl font-bold text-yellow-600">{analytics.bookings_affected}</p>
                  <p className="text-xs text-gray-500">This month</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Most Used Rule</h3>
                  <p className="text-lg font-bold text-red-600 capitalize">{analytics.most_used_rule_type}</p>
                  <p className="text-xs text-gray-500">Rule type</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-700">Success Rate</h3>
                  <p className="text-2xl font-bold text-indigo-600">94.2%</p>
                  <p className="text-xs text-gray-500">Rule applications</p>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Chart Placeholder */}
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Impact Over Time</h3>
            <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Chart visualization would be implemented here</p>
                <p className="text-sm text-gray-400">Integration with charting library needed</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Price Preview Tab */}
      {activeTab === 'preview' && (
        <>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Price Preview & Testing</h2>
            <p className="text-gray-600">Test how pricing rules affect final prices for different scenarios</p>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-2">Price Preview Tool</p>
              <p className="text-sm text-gray-400">Interactive pricing calculator would be implemented here</p>
              <p className="text-sm text-gray-400">Users can test different scenarios and see real-time price calculations</p>
            </div>
          </div>
        </>
      )}

      {/* Add/Edit Pricing Rule Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-screen overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Settings className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {viewingRule ? 'Pricing Rule Details' : editingRule ? 'Edit Pricing Rule' : 'Add New Pricing Rule'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {viewingRule ? 'View comprehensive rule information' : 'Configure dynamic pricing rules for your fleet'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetRuleForm}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitRule} className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">Basic Information</h3>
                  <span className="text-red-500">*</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={ruleFormData.name}
                      onChange={(e) => setRuleFormData({...ruleFormData, name: e.target.value})}
                      placeholder="e.g., Summer Peak Season"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!!viewingRule}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rule Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={ruleFormData.rule_type}
                      onChange={(e) => setRuleFormData({...ruleFormData, rule_type: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingRule}
                      required
                    >
                      <option value="seasonal">Seasonal</option>
                      <option value="demand">Demand-based</option>
                      <option value="vehicle_type">Vehicle Type</option>
                      <option value="duration">Duration</option>
                      <option value="location">Location</option>
                      <option value="custom">Custom</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={ruleFormData.description}
                    onChange={(e) => setRuleFormData({...ruleFormData, description: e.target.value})}
                    rows={3}
                    placeholder="Describe when and how this pricing rule should be applied..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    disabled={!!viewingRule}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={ruleFormData.priority}
                      onChange={(e) => setRuleFormData({...ruleFormData, priority: parseInt(e.target.value) || 1})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingRule}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid From</label>
                    <input
                      type="date"
                      value={ruleFormData.valid_from}
                      onChange={(e) => setRuleFormData({...ruleFormData, valid_from: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingRule}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valid To (Optional)</label>
                    <input
                      type="date"
                      value={ruleFormData.valid_to}
                      onChange={(e) => setRuleFormData({...ruleFormData, valid_to: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingRule}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={ruleFormData.is_active}
                    onChange={(e) => setRuleFormData({...ruleFormData, is_active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={!!viewingRule}
                  />
                  <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                    Rule is active
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetRuleForm}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                {!viewingRule && (
                  <button
                    type="submit"
                    disabled={submitting}
                    className={`px-6 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                      submitting
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        {editingRule ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4" />
                        {editingRule ? 'Update Rule' : 'Create Rule'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Base Price Modal */}
      {showAddBasePriceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {editingBasePrice ? 'Edit Base Price' : 'Add New Base Price'}
                  </h2>
                  <p className="text-sm text-gray-600">Configure base pricing for vehicle types</p>
                </div>
              </div>
              <button
                onClick={resetBasePriceForm}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBasePrice} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={basePriceFormData.vehicle_type}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, vehicle_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    required
                  >
                    <option value="quad">Quad</option>
                    <option value="ATV">ATV</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="scooter">Scooter</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    value={basePriceFormData.currency}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, currency: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="MAD">MAD (Moroccan Dirham)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePriceFormData.hourly_rate}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, hourly_rate: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePriceFormData.daily_rate}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, daily_rate: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePriceFormData.weekly_rate}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, weekly_rate: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rate</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={basePriceFormData.monthly_rate}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, monthly_rate: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Duration (hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={basePriceFormData.minimum_duration}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, minimum_duration: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="price_is_active"
                    checked={basePriceFormData.is_active}
                    onChange={(e) => setBasePriceFormData({...basePriceFormData, is_active: e.target.checked})}
                    className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                  />
                  <label htmlFor="price_is_active" className="ml-2 block text-sm text-gray-900">
                    Price is active
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetBasePriceForm}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-6 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                    submitting
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      {editingBasePrice ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-4 h-4" />
                      {editingBasePrice ? 'Update Price' : 'Create Price'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicPricingManagement;