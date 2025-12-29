import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Search, Filter, DollarSign, CheckCircle, AlertCircle, RefreshCw, X, Save, Loader, Truck, Settings, TrendingUp, Clock, Calculator } from 'lucide-react';
import { calculateTieredPrice, getPricingOptions, formatPriceSource } from '../utils/pricingCalculations';

interface BasePrice {
  id: string;
  vehicle_model_id: string;
  hourly_price: number;
  daily_price: number;
  is_active: boolean;
  price_source?: string;
  dynamic_pricing_enabled?: boolean;
  requires_manual_extension?: boolean;
  created_at: string;
  updated_at: string;
  vehicle_model?: {
    name: string;
    model: string;
    vehicle_type?: string;
  };
}

interface PricingTier {
  id: string;
  vehicle_model_id: string;
  min_hours: number;
  max_hours: number;
  price_amount: number;
  calculation_method: 'percentage' | 'fixed' | 'custom';
  discount_percentage?: number;
  is_active: boolean;
}

interface ExtensionRule {
  id: string;
  base_price_id: string;
  grace_period_minutes: number;
  extension_price_multiplier: number;
  auto_adjust_enabled: boolean;
  requires_manual_extension: boolean;
}

interface TransportFees {
  pickup_fee: number;
  dropoff_fee: number;
}

interface VehicleModel {
  id: string;
  name: string;
  model: string;
  vehicle_type?: string;
}

const DynamicPricingManagement: React.FC = () => {
  console.log('PRICING_MANAGEMENT: Loading with TIERED PRICING support');

  // Tab state
  const [activeTab, setActiveTab] = useState<'base' | 'tiers' | 'extensions' | 'transport'>('base');

  // State for Base Prices
  const [basePrices, setBasePrices] = useState<BasePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBasePriceForm, setShowBasePriceForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState<BasePrice | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // State for Pricing Tiers
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [showTierForm, setShowTierForm] = useState(false);
  const [editingTier, setEditingTier] = useState<PricingTier | null>(null);
  const [selectedVehicleForTiers, setSelectedVehicleForTiers] = useState<string>('');

  // State for Extension Rules
  const [extensionRules, setExtensionRules] = useState<ExtensionRule[]>([]);
  const [showExtensionForm, setShowExtensionForm] = useState(false);
  const [editingExtension, setEditingExtension] = useState<ExtensionRule | null>(null);

  // State for Transport Fees
  const [transportFees, setTransportFees] = useState<TransportFees>({
    pickup_fee: 0,
    dropoff_fee: 0
  });
  const [savingTransportFees, setSavingTransportFees] = useState(false);
  const [transportFeeError, setTransportFeeError] = useState<string | null>(null);
  const [transportFeeSuccess, setTransportFeeSuccess] = useState<string | null>(null);

  // State for Price Calculator Preview
  const [previewVehicleId, setPreviewVehicleId] = useState<string>('');
  const [previewBaseRate, setPreviewBaseRate] = useState<number>(100);
  const [previewOptions, setPreviewOptions] = useState<any[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // State for Vehicle Models
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);

  // Base Price Form data
  const [basePriceFormData, setBasePriceFormData] = useState({
    vehicle_model_id: '',
    hourly_price: 0,
    daily_price: 0,
    is_active: true,
    price_source: 'auto' as 'auto' | 'manual' | 'negotiated',
    dynamic_pricing_enabled: true
  });

  // Tier Form data
  const [tierFormData, setTierFormData] = useState({
    vehicle_model_id: '',
    min_hours: 1,
    max_hours: 2,
    price_amount: 0,
    calculation_method: 'percentage' as 'percentage' | 'fixed' | 'custom',
    discount_percentage: 0,
    is_active: true
  });

  // Extension Form data
  const [extensionFormData, setExtensionFormData] = useState({
    base_price_id: '',
    grace_period_minutes: 15,
    extension_price_multiplier: 1.0,
    auto_adjust_enabled: true,
    requires_manual_extension: false
  });

  // Transport Fee Form data
  const [transportFeeFormData, setTransportFeeFormData] = useState({
    pickup_fee: 0,
    dropoff_fee: 0
  });

  // Fetch vehicle models - FIXED to use correct column names
  const fetchVehicleModels = async () => {
    try {
      console.log('🔄 Fetching vehicle models from database...');
      const { data, error } = await supabase
        .from('saharax_0u4w4d_vehicle_models')
        .select('id, name, model, vehicle_type')
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (error) {
        console.error('❌ Supabase error fetching vehicle models:', error);
        throw error;
      }
      
      if (!data || data.length === 0) {
        console.warn('⚠️ No vehicle models found in database');
        setVehicleModels([]);
        return;
      }
      
      console.log(`✅ Loaded ${data.length} vehicle models:`, data);
      setVehicleModels(data);
    } catch (error: any) {
      console.error('❌ Error fetching vehicle models:', error);
      setError(`Failed to load vehicle models: ${error.message}`);
    }
  };

  // Fetch ALL data from database
  const fetchData = async () => {
    console.log('🔄 Fetching ALL pricing data from database...');
    setLoading(true);
    setError(null);
    
    try {
      // Fetch Vehicle Models first
      await fetchVehicleModels();

      // Fetch Base Prices
      const { data: pricesData, error: pricesError } = await supabase
        .from('app_4c3a7a6153_base_prices')
        .select(`
          *,
          vehicle_model:saharax_0u4w4d_vehicle_models (
            name,
            model,
            vehicle_type
          )
        `)
        .order('created_at', { ascending: false });

      if (pricesError) {
        console.error('❌ Base prices error details:', pricesError);
        throw new Error(`Base prices error: ${pricesError.message}`);
      }

      console.log(`✅ Loaded ${pricesData?.length || 0} base prices`);
      setBasePrices(pricesData || []);

      // Fetch Pricing Tiers
      const { data: tiersData, error: tiersError } = await supabase
        .from('pricing_tiers')
        .select('*')
        .order('min_hours', { ascending: true });

      if (tiersError) {
        console.error('❌ Pricing tiers error:', tiersError);
      } else {
        console.log(`✅ Loaded ${tiersData?.length || 0} pricing tiers`);
        setPricingTiers(tiersData || []);
      }

      // Fetch Extension Rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('rental_extension_rules')
        .select('*');

      if (rulesError) {
        console.error('❌ Extension rules error:', rulesError);
      } else {
        console.log(`✅ Loaded ${rulesData?.length || 0} extension rules`);
        setExtensionRules(rulesData || []);
      }

      // Load Transport Fees
      console.log('📡 Loading transport fees from app_settings table...');
      
      try {
        const { data: dbData, error: dbError } = await supabase
          .from('app_settings')
          .select('transport_pickup_fee, transport_dropoff_fee')
          .eq('id', 1)
          .single();

        if (dbError) throw dbError;

        const fees = {
          pickup_fee: Number(dbData.transport_pickup_fee) || 0,
          dropoff_fee: Number(dbData.transport_dropoff_fee) || 0
        };
        
        console.log('✅ Loaded transport fees from database:', fees);
        setTransportFees(fees);
        setTransportFeeFormData(fees);
        
      } catch (dbError) {
        console.log('🔄 Database failed, trying localStorage...');
        const stored = localStorage.getItem('mgx_transport_fees_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          const fees = {
            pickup_fee: Number(parsed.pickup_fee) || 0,
            dropoff_fee: Number(parsed.dropoff_fee) || 0
          };
          setTransportFees(fees);
          setTransportFeeFormData(fees);
        }
      }

    } catch (error: any) {
      console.error('❌ Error fetching data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  // Helper function to get vehicle model display name
  const getVehicleModelName = (vehicleModelId: string): string => {
    const model = vehicleModels.find(v => v.id === vehicleModelId);
    if (model) {
      return model.name; // Use the full name (e.g., "SEGWAY AT5")
    }
    return vehicleModelId;
  };

  // ==================== BASE PRICES FUNCTIONS ====================
  const resetBasePriceForm = () => {
    setBasePriceFormData({
      vehicle_model_id: '',
      hourly_price: 0,
      daily_price: 0,
      is_active: true,
      price_source: 'auto',
      dynamic_pricing_enabled: true
    });
    setShowBasePriceForm(false);
    setEditingPrice(null);
  };

  const handleEditBasePrice = (price: BasePrice) => {
    setBasePriceFormData({
      vehicle_model_id: price.vehicle_model_id,
      hourly_price: price.hourly_price,
      daily_price: price.daily_price,
      is_active: price.is_active,
      price_source: (price.price_source as any) || 'auto',
      dynamic_pricing_enabled: price.dynamic_pricing_enabled ?? true
    });
    setEditingPrice(price);
    setShowBasePriceForm(true);
  };

  const handleDeleteBasePrice = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this price?')) return;

    try {
      const { error } = await supabase
        .from('app_4c3a7a6153_base_prices')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBasePrices(prev => prev.filter(price => price.id !== id));
      console.log('✅ Price deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting price:', error);
      alert('Failed to delete price');
    }
  };

  const handleSubmitBasePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);
    setError(null);

    try {
      if (!basePriceFormData.vehicle_model_id) {
        throw new Error('Vehicle model is required');
      }

      if (basePriceFormData.hourly_price <= 0 || basePriceFormData.daily_price <= 0) {
        throw new Error('Prices must be greater than 0');
      }

      const priceData = {
        vehicle_model_id: basePriceFormData.vehicle_model_id,
        hourly_price: parseFloat(basePriceFormData.hourly_price.toString()),
        daily_price: parseFloat(basePriceFormData.daily_price.toString()),
        is_active: basePriceFormData.is_active,
        price_source: basePriceFormData.price_source,
        dynamic_pricing_enabled: basePriceFormData.dynamic_pricing_enabled,
        updated_at: new Date().toISOString()
      };

      let result;
      
      if (editingPrice) {
        const { data, error } = await supabase
          .from('app_4c3a7a6153_base_prices')
          .update(priceData)
          .eq('id', editingPrice.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        
        setBasePrices(prev => prev.map(price => 
          price.id === editingPrice.id ? { ...price, ...result } : price
        ));
        
        console.log('✅ Price updated:', result);
      } else {
        const { data, error } = await supabase
          .from('app_4c3a7a6153_base_prices')
          .insert([{
            ...priceData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        result = data;
        
        setBasePrices(prev => [result, ...prev]);
        
        console.log('✅ Price created:', result);
      }

      resetBasePriceForm();
      setRefreshTrigger(prev => prev + 1);

    } catch (error: any) {
      console.error('❌ Error saving price:', error);
      setError(error.message || 'Failed to save price');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== PRICING TIERS FUNCTIONS ====================
  const resetTierForm = () => {
    setTierFormData({
      vehicle_model_id: '',
      min_hours: 1,
      max_hours: 2,
      price_amount: 0,
      calculation_method: 'percentage',
      discount_percentage: 0,
      is_active: true
    });
    setShowTierForm(false);
    setEditingTier(null);
  };

  const handleEditTier = (tier: PricingTier) => {
    setTierFormData({
      vehicle_model_id: tier.vehicle_model_id,
      min_hours: tier.min_hours,
      max_hours: tier.max_hours,
      price_amount: tier.price_amount,
      calculation_method: tier.calculation_method,
      discount_percentage: tier.discount_percentage || 0,
      is_active: tier.is_active
    });
    setEditingTier(tier);
    setShowTierForm(true);
  };

  const handleDeleteTier = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this tier?')) return;

    try {
      const { error } = await supabase
        .from('pricing_tiers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPricingTiers(prev => prev.filter(tier => tier.id !== id));
      console.log('✅ Tier deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting tier:', error);
      alert('Failed to delete tier');
    }
  };

  const handleSubmitTier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);

    try {
      const tierData = {
        vehicle_model_id: tierFormData.vehicle_model_id,
        min_hours: parseInt(tierFormData.min_hours.toString()),
        max_hours: parseInt(tierFormData.max_hours.toString()),
        price_amount: parseFloat(tierFormData.price_amount.toString()),
        calculation_method: tierFormData.calculation_method,
        discount_percentage: tierFormData.calculation_method === 'percentage' ? parseFloat(tierFormData.discount_percentage.toString()) : null,
        is_active: tierFormData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingTier) {
        const { data, error } = await supabase
          .from('pricing_tiers')
          .update(tierData)
          .eq('id', editingTier.id)
          .select()
          .single();

        if (error) throw error;
        
        setPricingTiers(prev => prev.map(tier => 
          tier.id === editingTier.id ? data : tier
        ));
      } else {
        const { data, error } = await supabase
          .from('pricing_tiers')
          .insert([{
            ...tierData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        
        setPricingTiers(prev => [...prev, data]);
      }

      resetTierForm();
      setRefreshTrigger(prev => prev + 1);

    } catch (error: any) {
      console.error('❌ Error saving tier:', error);
      alert(error.message || 'Failed to save tier');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== EXTENSION RULES FUNCTIONS ====================
  const resetExtensionForm = () => {
    setExtensionFormData({
      base_price_id: '',
      grace_period_minutes: 15,
      extension_price_multiplier: 1.0,
      auto_adjust_enabled: true,
      requires_manual_extension: false
    });
    setShowExtensionForm(false);
    setEditingExtension(null);
  };

  const handleEditExtension = (rule: ExtensionRule) => {
    setExtensionFormData({
      base_price_id: rule.base_price_id,
      grace_period_minutes: rule.grace_period_minutes,
      extension_price_multiplier: rule.extension_price_multiplier,
      auto_adjust_enabled: rule.auto_adjust_enabled,
      requires_manual_extension: rule.requires_manual_extension
    });
    setEditingExtension(rule);
    setShowExtensionForm(true);
  };

  const handleDeleteExtension = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this extension rule?')) return;

    try {
      const { error } = await supabase
        .from('rental_extension_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setExtensionRules(prev => prev.filter(rule => rule.id !== id));
      console.log('✅ Extension rule deleted successfully');
    } catch (error: any) {
      console.error('❌ Error deleting extension rule:', error);
      alert('Failed to delete extension rule');
    }
  };

  const handleSubmitExtension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    
    setSubmitting(true);

    try {
      const ruleData = {
        base_price_id: extensionFormData.base_price_id,
        grace_period_minutes: parseInt(extensionFormData.grace_period_minutes.toString()),
        extension_price_multiplier: parseFloat(extensionFormData.extension_price_multiplier.toString()),
        auto_adjust_enabled: extensionFormData.auto_adjust_enabled,
        requires_manual_extension: extensionFormData.requires_manual_extension,
        updated_at: new Date().toISOString()
      };

      if (editingExtension) {
        const { data, error } = await supabase
          .from('rental_extension_rules')
          .update(ruleData)
          .eq('id', editingExtension.id)
          .select()
          .single();

        if (error) throw error;
        
        setExtensionRules(prev => prev.map(rule => 
          rule.id === editingExtension.id ? data : rule
        ));
      } else {
        const { data, error } = await supabase
          .from('rental_extension_rules')
          .insert([{
            ...ruleData,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        
        setExtensionRules(prev => [...prev, data]);
      }

      resetExtensionForm();
      setRefreshTrigger(prev => prev + 1);

    } catch (error: any) {
      console.error('❌ Error saving extension rule:', error);
      alert(error.message || 'Failed to save extension rule');
    } finally {
      setSubmitting(false);
    }
  };

  // ==================== PRICE CALCULATOR PREVIEW ====================
  const loadPricingPreview = async () => {
    if (!previewVehicleId || previewBaseRate <= 0) return;

    setLoadingPreview(true);
    try {
      const options = await getPricingOptions(previewVehicleId, previewBaseRate, 24);
      setPreviewOptions(options);
    } catch (error) {
      console.error('Error loading pricing preview:', error);
    } finally {
      setLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (previewVehicleId && previewBaseRate > 0) {
      loadPricingPreview();
    }
  }, [previewVehicleId, previewBaseRate]);

  // ==================== TRANSPORT FEES FUNCTIONS ====================
  const handleTransportFeeChange = (field: keyof TransportFees, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTransportFeeFormData(prev => ({
      ...prev,
      [field]: numValue
    }));
  };

  const handleSaveTransportFees = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingTransportFees) return;
    
    setSavingTransportFees(true);
    setTransportFeeError(null);
    setTransportFeeSuccess(null);

    try {
      if (transportFeeFormData.pickup_fee < 0 || transportFeeFormData.dropoff_fee < 0) {
        throw new Error('Fees cannot be negative');
      }

      const { data: dbData, error: dbError } = await supabase
        .from('app_settings')
        .upsert({
          id: 1,
          transport_pickup_fee: transportFeeFormData.pickup_fee,
          transport_dropoff_fee: transportFeeFormData.dropoff_fee,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()
        .single();

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      localStorage.setItem('mgx_transport_fees_settings', JSON.stringify({
        pickup_fee: transportFeeFormData.pickup_fee,
        dropoff_fee: transportFeeFormData.dropoff_fee,
        updated_at: new Date().toISOString(),
        source: 'database'
      }));
      
      setTransportFees(transportFeeFormData);
      setTransportFeeSuccess('✅ Transport fees saved successfully!');
      
      setTimeout(() => setTransportFeeSuccess(null), 3000);

    } catch (error: any) {
      console.error('❌ Error saving transport fees:', error);
      setTransportFeeError(`Failed: ${error.message}`);
    } finally {
      setSavingTransportFees(false);
    }
  };

  const resetTransportFees = () => {
    setTransportFeeFormData(transportFees);
    setTransportFeeError(null);
    setTransportFeeSuccess(null);
  };

  // ==================== UI HELPERS ====================
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (isActive: boolean) => {
    return isActive 
      ? 'bg-green-100 text-green-800 border-green-200' 
      : 'bg-red-100 text-red-800 border-red-200';
  };

  const filteredPrices = basePrices.filter(price => {
    const matchesSearch = searchTerm === '' || 
      price.vehicle_model?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.vehicle_model?.model?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && price.is_active) ||
      (statusFilter === 'inactive' && !price.is_active);
    
    return matchesSearch && matchesStatus;
  });

  const filteredTiers = selectedVehicleForTiers 
    ? pricingTiers.filter(tier => tier.vehicle_model_id === selectedVehicleForTiers)
    : pricingTiers;

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
          <div className="h-12 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Pricing Management
            </h1>
            <p className="text-gray-600">
              Manage base prices, tiered pricing, extension rules, and transport fees
            </p>
          </div>
          
          <button
            onClick={() => setRefreshTrigger(prev => prev + 1)}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-medium text-red-800">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Debug Info - Show vehicle models count */}
      {vehicleModels.length === 0 && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <div>
              <p className="font-medium text-yellow-800">No Vehicle Models Found</p>
              <p className="text-yellow-700 text-sm mt-1">
                Please add vehicle models first before creating pricing tiers. Check the browser console for more details.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('base')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'base'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Base Prices
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('tiers')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'tiers'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Pricing Tiers
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('extensions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'extensions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Extension Rules
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('transport')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'transport'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Transport Fees
            </div>
          </button>
        </nav>
      </div>

      {/* Tab Content - Base Prices */}
      {activeTab === 'base' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Base Prices
                  </h2>
                  <p className="text-sm text-gray-600">
                    Primary hourly and daily rates for vehicle models
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowBasePriceForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Price
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* Search & Filter */}
            <div className="mb-6 bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by vehicle name or model..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="inactive">Inactive Only</option>
                </select>
                
                <div className="text-sm text-gray-500 flex items-center">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    {filteredPrices.length} prices
                  </span>
                  <span className="mx-2">•</span>
                  <span>
                    {basePrices.filter(p => p.is_active).length} active
                  </span>
                </div>
              </div>
            </div>

            {/* Prices Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vehicle Model
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Hourly Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Daily Rate (24h)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Price Source
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
                  {filteredPrices.map((price) => {
                    const sourceInfo = formatPriceSource(price.price_source || 'auto');
                    return (
                      <tr key={price.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900">
                            {price.vehicle_model?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {price.vehicle_model?.vehicle_type && (
                              <span className="text-gray-600">{price.vehicle_model.vehicle_type} </span>
                            )}
                            {price.vehicle_model?.model || 'No model'}
                          </div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-lg font-bold text-blue-600">
                            {formatCurrency(price.hourly_price)}
                          </div>
                          <div className="text-xs text-gray-500">per hour</div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="text-lg font-bold text-green-600">
                            {formatCurrency(price.daily_price)}
                          </div>
                          <div className="text-xs text-gray-500">per 24 hours</div>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sourceInfo.badge}`}>
                            <span className="mr-1">{sourceInfo.icon}</span>
                            {sourceInfo.label}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(price.is_active)}`}>
                            {price.is_active ? (
                              <>
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Active
                              </>
                            ) : 'Inactive'}
                          </span>
                        </td>
                        
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditBasePrice(price)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit price"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteBasePrice(price.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Delete price"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredPrices.length === 0 && (
                <div className="text-center py-12">
                  <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'No prices match your search criteria'
                      : 'No base prices configured yet'}
                  </p>
                  {!searchTerm && statusFilter === 'all' && (
                    <button
                      onClick={() => setShowBasePriceForm(true)}
                      className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Add your first price
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remaining tabs content continues... (keeping the same structure, just updating dropdown options to use model.name) */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          {/* Pricing Tier Manager Component */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      Pricing Tiers
                    </h2>
                    <p className="text-sm text-gray-600">
                      Configure tiered pricing for different rental durations
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowTierForm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Tier
                </button>
              </div>
            </div>

            <div className="p-6">
              {/* Vehicle Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Vehicle Model
                </label>
                <select
                  value={selectedVehicleForTiers}
                  onChange={(e) => setSelectedVehicleForTiers(e.target.value)}
                  className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Vehicles</option>
                  {vehicleModels.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tiers Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vehicle Model
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Max Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Price Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
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
                    {filteredTiers.map((tier) => (
                      <tr key={tier.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {getVehicleModelName(tier.vehicle_model_id)}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {tier.min_hours}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {tier.max_hours}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                          {tier.calculation_method}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-blue-600">
                          {tier.calculation_method === 'percentage' 
                            ? `${tier.discount_percentage}% discount`
                            : formatCurrency(tier.price_amount)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(tier.is_active)}`}>
                            {tier.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditTier(tier)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTier(tier.id)}
                              className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {filteredTiers.length === 0 && (
                  <div className="text-center py-12">
                    <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No pricing tiers configured yet</p>
                    <button
                      onClick={() => setShowTierForm(true)}
                      className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Add your first tier
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 🆕 IMPROVED Price Calculator Preview Component */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Calculator className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Price Calculator Preview
                  </h2>
                  <p className="text-sm text-gray-600">
                    See how tiered pricing affects rental costs
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Vehicle Model
                  </label>
                  <select
                    value={previewVehicleId}
                    onChange={(e) => setPreviewVehicleId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Choose a vehicle...</option>
                    {vehicleModels.map(model => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Base Hourly Rate (MAD)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={previewBaseRate}
                    onChange={(e) => setPreviewBaseRate(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {loadingPreview ? (
                <div className="text-center py-8">
                  <Loader className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                  <p className="text-gray-500">Calculating prices...</p>
                </div>
              ) : previewOptions.length > 0 ? (
                <div className="space-y-4">
                  {/* Visual Price Breakdown */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {previewOptions.slice(0, 12).map((option) => {
                      const hasSavings = option.savings > 0;
                      return (
                        <div 
                          key={option.hours}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            hasSavings 
                              ? 'border-green-500 bg-green-50' 
                              : 'border-gray-200 bg-gray-50'
                          }`}
                        >
                          <div className="text-center">
                            <div className="text-xs text-gray-600 mb-1">
                              {option.hours} {option.hours === 1 ? 'hour' : 'hours'}
                            </div>
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(option.price)}
                            </div>
                            {hasSavings && (
                              <div className="text-xs text-green-600 font-medium mt-1">
                                Save {formatCurrency(option.savings)}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dropdown Selector */}
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      📋 Booking Form Dropdown Preview
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="">Select rental duration...</option>
                      {previewOptions.map((option) => (
                        <option key={option.hours} value={option.hours}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-600 mt-2">
                      💡 This is how customers will see pricing options in the booking form
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Calculator className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Select a vehicle model to preview pricing options</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Extensions and Transport tabs remain the same... */}
      {activeTab === 'extensions' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Extension Rules
                  </h2>
                  <p className="text-sm text-gray-600">
                    Configure grace periods and extension pricing
                  </p>
                </div>
              </div>
              
              <button
                onClick={() => setShowExtensionForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Rule
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Base Price ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grace Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Extension Multiplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Auto Adjust
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                
                <tbody className="bg-white divide-y divide-gray-200">
                  {extensionRules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">
                        {rule.base_price_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {rule.grace_period_minutes} minutes
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-blue-600">
                        {rule.extension_price_multiplier}x
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          rule.auto_adjust_enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {rule.auto_adjust_enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditExtension(rule)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteExtension(rule.id)}
                            className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {extensionRules.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No extension rules configured yet</p>
                  <button
                    onClick={() => setShowExtensionForm(true)}
                    className="mt-3 text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Add your first rule
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'transport' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200 bg-blue-50 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Transport Fees (Additional Charges)
                </h2>
                <p className="text-sm text-gray-600">
                  Configure additional fees for pick-up and drop-off services
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {transportFeeSuccess && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-green-700 text-sm">{transportFeeSuccess}</p>
                </div>
              </div>
            )}

            {transportFeeError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                  <p className="text-red-700 text-sm">{transportFeeError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveTransportFees} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pick-up Fee (MAD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      MAD
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={transportFeeFormData.pickup_fee}
                      onChange={(e) => handleTransportFeeChange('pickup_fee', e.target.value)}
                      className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Additional fee when customer selects pick-up transport
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Drop-off Fee (MAD)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                      MAD
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={transportFeeFormData.dropoff_fee}
                      onChange={(e) => handleTransportFeeChange('dropoff_fee', e.target.value)}
                      className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="0"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Additional fee when customer selects drop-off transport
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Example Calculation</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Vehicle Rental (24h)</span>
                    <span className="font-medium">{formatCurrency(500)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Pick-up Service</span>
                    <span className="text-blue-600">+{formatCurrency(transportFeeFormData.pickup_fee)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Drop-off Service</span>
                    <span className="text-green-600">+{formatCurrency(transportFeeFormData.dropoff_fee)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center font-bold">
                      <span>Total Price</span>
                      <span className="text-lg">
                        {formatCurrency(500 + transportFeeFormData.pickup_fee + transportFeeFormData.dropoff_fee)}
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  * Example assumes a vehicle with 500 MAD daily rate
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-500">
                  These fees are added to the base price during booking
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetTransportFees}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={savingTransportFees}
                    className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                      savingTransportFees
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {savingTransportFees ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Transport Fees
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal forms remain unchanged - keeping all existing modal code */}
      {/* Add/Edit Base Price Modal */}
      {showBasePriceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingPrice ? 'Edit Base Price' : 'Add Base Price'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    Configure hourly and daily rates
                  </p>
                </div>
              </div>
              <button
                onClick={resetBasePriceForm}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitBasePrice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Model *
                </label>
                <select
                  value={basePriceFormData.vehicle_model_id}
                  onChange={(e) => setBasePriceFormData(prev => ({ ...prev, vehicle_model_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                  disabled={!!editingPrice}
                >
                  <option value="">Select a vehicle model</option>
                  {vehicleModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                {vehicleModels.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No vehicle models found. Please add vehicle models first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hourly Price (MAD) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={basePriceFormData.hourly_price}
                    onChange={(e) => setBasePriceFormData(prev => ({ ...prev, hourly_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Price (MAD) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={basePriceFormData.daily_price}
                    onChange={(e) => setBasePriceFormData(prev => ({ ...prev, daily_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price Source
                </label>
                <select
                  value={basePriceFormData.price_source}
                  onChange={(e) => setBasePriceFormData(prev => ({ ...prev, price_source: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="auto">Auto-calculated</option>
                  <option value="manual">Manual entry</option>
                  <option value="negotiated">Negotiated</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="dynamic_pricing"
                  checked={basePriceFormData.dynamic_pricing_enabled}
                  onChange={(e) => setBasePriceFormData(prev => ({ ...prev, dynamic_pricing_enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="dynamic_pricing" className="ml-2 text-sm text-gray-900">
                  Enable dynamic tiered pricing
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={basePriceFormData.is_active}
                  onChange={(e) => setBasePriceFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-900">
                  Price is active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetBasePriceForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || vehicleModels.length === 0}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                    submitting || vehicleModels.length === 0
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingPrice ? 'Update Price' : 'Create Price'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Tier Modal */}
      {showTierForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingTier ? 'Edit Pricing Tier' : 'Add Pricing Tier'}
                  </h2>
                </div>
              </div>
              <button
                onClick={resetTierForm}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTier} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Model *
                </label>
                <select
                  value={tierFormData.vehicle_model_id}
                  onChange={(e) => setTierFormData(prev => ({ ...prev, vehicle_model_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a vehicle model</option>
                  {vehicleModels.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
                {vehicleModels.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">
                    No vehicle models found. Please add vehicle models first.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Hours *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tierFormData.min_hours}
                    onChange={(e) => setTierFormData(prev => ({ ...prev, min_hours: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Hours *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tierFormData.max_hours}
                    onChange={(e) => setTierFormData(prev => ({ ...prev, max_hours: parseInt(e.target.value) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Calculation Method *
                </label>
                <select
                  value={tierFormData.calculation_method}
                  onChange={(e) => setTierFormData(prev => ({ ...prev, calculation_method: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">Percentage Discount</option>
                  <option value="fixed">Fixed Amount</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              {tierFormData.calculation_method === 'percentage' ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Discount Percentage (%) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={tierFormData.discount_percentage}
                    onChange={(e) => setTierFormData(prev => ({ ...prev, discount_percentage: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Amount (MAD) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={tierFormData.price_amount}
                    onChange={(e) => setTierFormData(prev => ({ ...prev, price_amount: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              )}

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="tier_active"
                  checked={tierFormData.is_active}
                  onChange={(e) => setTierFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="tier_active" className="ml-2 text-sm text-gray-900">
                  Tier is active
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetTierForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || vehicleModels.length === 0}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                    submitting || vehicleModels.length === 0
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingTier ? 'Update Tier' : 'Create Tier'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Extension Rule Modal */}
      {showExtensionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingExtension ? 'Edit Extension Rule' : 'Add Extension Rule'}
                  </h2>
                </div>
              </div>
              <button
                onClick={resetExtensionForm}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitExtension} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base Price ID *
                </label>
                <select
                  value={extensionFormData.base_price_id}
                  onChange={(e) => setExtensionFormData(prev => ({ ...prev, base_price_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Select a base price</option>
                  {basePrices.map((price) => (
                    <option key={price.id} value={price.id}>
                      {price.vehicle_model?.name} {price.vehicle_model?.model} - {formatCurrency(price.hourly_price)}/hr
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Grace Period (minutes) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={extensionFormData.grace_period_minutes}
                  onChange={(e) => setExtensionFormData(prev => ({ ...prev, grace_period_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Free grace period before extension charges apply (default: 15 minutes)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Extension Price Multiplier *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={extensionFormData.extension_price_multiplier}
                  onChange={(e) => setExtensionFormData(prev => ({ ...prev, extension_price_multiplier: parseFloat(e.target.value) || 1.0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Multiplier for extension pricing (e.g., 0.85 for 15% discount, 1.0 for no change)
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto_adjust"
                  checked={extensionFormData.auto_adjust_enabled}
                  onChange={(e) => setExtensionFormData(prev => ({ ...prev, auto_adjust_enabled: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_adjust" className="ml-2 text-sm text-gray-900">
                  Enable auto-adjust pricing
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="manual_extension"
                  checked={extensionFormData.requires_manual_extension}
                  onChange={(e) => setExtensionFormData(prev => ({ ...prev, requires_manual_extension: e.target.checked }))}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="manual_extension" className="ml-2 text-sm text-gray-900">
                  Require manual extension approval
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetExtensionForm}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-4 py-2 rounded-lg transition-colors font-medium flex items-center gap-2 ${
                    submitting
                      ? 'bg-gray-400 cursor-not-allowed text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {submitting ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingExtension ? 'Update Rule' : 'Create Rule'}
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