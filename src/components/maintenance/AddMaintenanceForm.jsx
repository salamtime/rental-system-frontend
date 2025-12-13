import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import MaintenanceTrackingService from '../../services/MaintenanceTrackingService';
import InventoryService from '../../services/InventoryService';
import { supabase } from '../../lib/supabase';
import { 
  X, 
  Save, 
  Calculator, 
  Car, 
  Wrench, 
  Calendar, 
  DollarSign,
  FileText,
  PackageIcon,
  PlusIcon,
  TrashIcon,
  SearchIcon,
  AlertTriangleIcon,
  ToggleLeftIcon,
  ToggleRightIcon,
  InfoIcon
} from 'lucide-react';

// Import maintenance-inventory mapping
import {
  getSuggestedCategories,
  getMaintenanceTypeDescription,
  isItemTypicalForMaintenance,
  filterItemsByMaintenanceType,
  getNonTypicalParts,
  removeNonTypicalParts
} from '../../config/maintenanceInventoryMapping';

/**
 * AddMaintenanceForm - Mobile-friendly form for adding maintenance records
 * 
 * Features auto-prefill from pricing catalog and comprehensive cost tracking
 * ENHANCED: Smart Parts Used picker with context-aware filtering and stock validation
 * UPDATED: Removed external cost field completely
 */
const AddMaintenanceForm = ({ onCancel, onSuccess, editingRecord = null }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  // CRITICAL: Always initialize as arrays
  const [vehicles, setVehicles] = useState([]);
  const [pricingCatalog, setPricingCatalog] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [itemSearchTerm, setItemSearchTerm] = useState('');
  const [stockWarnings, setStockWarnings] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // NEW: Smart filtering states
  const [showAllItems, setShowAllItems] = useState(false);
  const [previousMaintenanceType, setPreviousMaintenanceType] = useState('');
  const [showMaintenanceTypeChangePrompt, setShowMaintenanceTypeChangePrompt] = useState(false);
  const [nonTypicalPartsToHandle, setNonTypicalPartsToHandle] = useState([]);
  
  const [formData, setFormData] = useState({
    vehicle_id: '',
    maintenance_type: 'Oil Change',
    status: 'scheduled',
    scheduled_date: new Date().toISOString().split('T')[0],
    completed_date: '',
    odometer_reading: '',
    labor_rate_mad: '', // Fixed price, not hourly rate
    parts_cost_mad: '',
    tax_mad: '',
    notes: '',
    technician_name: '',
    parts_used: [] // NEW: Parts used array
  });

  // 🚨🚨🚨 CRITICAL DEBUG: Log when component mounts and receives editingRecord
  useEffect(() => {
    console.log('🚨🚨🚨 CRITICAL DEBUG: AddMaintenanceForm MOUNTED');
    console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord received:', editingRecord);
    
    if (editingRecord) {
      console.log('🚨🚨🚨 CRITICAL DEBUG: COMPLETE EDITINGRECORD OBJECT:', JSON.stringify(editingRecord, null, 2));
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord keys:', Object.keys(editingRecord));
      
      // 🚨🚨🚨 CRITICAL FIX: Check ALL possible cost field variations (removed external cost)
      console.log('🚨🚨🚨 CRITICAL DEBUG: Cost field analysis:');
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord.cost:', editingRecord.cost);
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord.total_cost:', editingRecord.total_cost);
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord.total_cost_mad:', editingRecord.total_cost_mad);
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord.labor_rate_mad:', editingRecord.labor_rate_mad);
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord.labor_cost_mad:', editingRecord.labor_cost_mad);
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord.parts_cost_mad:', editingRecord.parts_cost_mad);
      console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord.tax_mad:', editingRecord.tax_mad);
      
      // 🚨🚨🚨 CRITICAL FIX: Set form data IMMEDIATELY with enhanced cost mapping (removed external cost)
      console.log('🚨🚨🚨 CRITICAL FIX: Setting form data IMMEDIATELY with enhanced cost mapping (no external cost)');
      
      // FIXED: Only use existing database values, no auto-calculation
      const laborCost = editingRecord.labor_rate_mad || editingRecord.labor_cost_mad || '';
      const partsCost = editingRecord.parts_cost_mad || '';
      const taxCost = editingRecord.tax_mad || 0;
      
      console.log('🚨🚨🚨 CRITICAL DEBUG: Calculated costs (no external):');
      console.log('🚨🚨🚨 CRITICAL DEBUG: laborCost:', laborCost);
      console.log('🚨🚨🚨 CRITICAL DEBUG: partsCost:', partsCost);
      console.log('🚨🚨🚨 CRITICAL DEBUG: taxCost:', taxCost);
      
      const mappedData = {
        vehicle_id: editingRecord.vehicle_id?.toString() || '',
        maintenance_type: editingRecord.maintenance_type || editingRecord.type || 'Oil Change',
        status: editingRecord.status || 'scheduled',
        scheduled_date: editingRecord.service_date || editingRecord.scheduled_date || editingRecord.date || new Date().toISOString().split('T')[0],
        completed_date: editingRecord.completed_date || '',
        odometer_reading: editingRecord.odometer_reading?.toString() || editingRecord.odometerReading?.toString() || '',
        notes: editingRecord.description || editingRecord.notes || editingRecord.details || '',
        technician_name: editingRecord.technician_name || editingRecord.technician || '',
        // 🚨🚨🚨 CRITICAL FIX: Enhanced cost mapping (removed external cost and auto-calculation)
        labor_rate_mad: laborCost?.toString() || '',
        parts_cost_mad: partsCost?.toString() || '',
        tax_mad: taxCost?.toString() || '',
        parts_used: [] // Will be set after inventory loads
      };
      
      console.log('🚨🚨🚨 CRITICAL FIX: MAPPED DATA WITH COSTS (no external):', JSON.stringify(mappedData, null, 2));
      console.log('🚨🚨🚨 CRITICAL FIX: Setting formData now...');
      
      setFormData(mappedData);
      setPreviousMaintenanceType(mappedData.maintenance_type);
      
      console.log('🚨🚨🚨 CRITICAL FIX: Form data set IMMEDIATELY with costs (no external)');
      
      // 🚨🚨🚨 CRITICAL DEBUG: Verify form data was set correctly after a short delay
      setTimeout(() => {
        console.log('🚨🚨🚨 CRITICAL DEBUG: VERIFYING FORM DATA AFTER SET:');
        console.log('🚨🚨🚨 CRITICAL DEBUG: Current formData state after set:', formData);
      }, 100);
    } else {
      console.log('🚨🚨🚨 CRITICAL DEBUG: NO EDITING RECORD - NEW MAINTENANCE MODE');
    }
    
    loadInitialData();
  }, [editingRecord]); // Only depend on editingRecord

  // Enhanced filtering with smart suggestions
  useEffect(() => {
    if (!itemSearchTerm) {
      // Apply smart filtering based on maintenance type and showAllItems state
      const filtered = getFilteredItemsForDisplay();
      setFilteredItems(filtered);
    } else {
      // Search within current scope (suggested or all items)
      const baseItems = getFilteredItemsForDisplay();
      const searchFiltered = baseItems.filter(item =>
        item.name.toLowerCase().includes(itemSearchTerm.toLowerCase()) ||
        (item.sku && item.sku.toLowerCase().includes(itemSearchTerm.toLowerCase()))
      );
      setFilteredItems(searchFiltered);
    }
  }, [itemSearchTerm, inventoryItems, formData.maintenance_type, showAllItems]);

  useEffect(() => {
    // Auto-prefill from pricing catalog when maintenance type changes
    if (formData.maintenance_type && pricingCatalog.length > 0) {
      const pricing = pricingCatalog.find(p => p.maintenance_type === formData.maintenance_type);
      if (pricing && !editingRecord) {
        setFormData(prev => ({
          ...prev,
          labor_rate_mad: pricing.default_labor_rate_mad?.toString() || '',
          parts_cost_mad: pricing.default_parts_cost_mad?.toString() || ''
        }));
      }
    }
  }, [formData.maintenance_type, pricingCatalog, editingRecord]);

  // NEW: Handle maintenance type changes with non-typical parts check
  useEffect(() => {
    if (previousMaintenanceType && 
        formData.maintenance_type !== previousMaintenanceType && 
        formData.parts_used.length > 0) {
      
      // Check for non-typical parts with the new maintenance type
      const nonTypicalParts = getNonTypicalParts(
        formData.parts_used, 
        inventoryItems, 
        formData.maintenance_type
      );
      
      if (nonTypicalParts.length > 0) {
        setNonTypicalPartsToHandle(nonTypicalParts);
        setShowMaintenanceTypeChangePrompt(true);
      }
    }
    
    setPreviousMaintenanceType(formData.maintenance_type);
  }, [formData.maintenance_type, formData.parts_used, inventoryItems, previousMaintenanceType]);

  // 🚨🚨🚨 CRITICAL FIX: Handle parts data AFTER inventory loads
  useEffect(() => {
    console.log('🚨🚨🚨 CRITICAL DEBUG: Parts useEffect triggered');
    console.log('🚨🚨🚨 CRITICAL DEBUG: editingRecord exists?', !!editingRecord);
    console.log('🚨🚨🚨 CRITICAL DEBUG: inventoryItems length:', inventoryItems.length);
    
    if (editingRecord && inventoryItems.length > 0) {
      console.log('🚨🚨🚨 CRITICAL DEBUG: PROCESSING PARTS DATA');
      
      // Check multiple possible field names for parts data
      const partsData = editingRecord.parts_used || 
                       editingRecord.parts || 
                       editingRecord.maintenance_parts ||
                       editingRecord.items_used ||
                       editingRecord.inventory_parts ||
                       [];
      
      console.log('🚨🚨🚨 CRITICAL DEBUG: Found parts data:', partsData);
      
      if (Array.isArray(partsData) && partsData.length > 0) {
        const mappedParts = partsData.map(part => {
          console.log('🚨🚨🚨 CRITICAL DEBUG: Processing part:', part);
          return {
            item_id: part.item_id?.toString() || part.id?.toString() || part.inventory_item_id?.toString() || '',
            quantity: part.quantity || part.qty || 1,
            notes: part.notes || part.description || '',
            unit_cost_mad: part.unit_cost_mad || part.unit_cost || part.cost_per_unit || 0,
            total_cost_mad: part.total_cost_mad || part.total_cost || part.cost || 0,
            item_name: part.item_name || part.name || part.inventory_item_name || ''
          };
        });
        
        console.log('🚨🚨🚨 CRITICAL DEBUG: Mapped parts:', mappedParts);
        
        setFormData(prev => ({
          ...prev,
          parts_used: mappedParts
        }));
      }
    }
  }, [editingRecord, inventoryItems]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setLoadingItems(true);
      
      console.log('🚨🚨🚨 CRITICAL DEBUG: Loading initial data...');
      
      // Load vehicles, pricing catalog, and inventory items
      const [vehiclesData, pricingData, itemsData] = await Promise.all([
        supabase.from('saharax_0u4w4d_vehicles').select('id, name, model, plate_number, current_odometer').order('name'),
        MaintenanceTrackingService.getMaintenancePricingCatalog(),
        InventoryService.getItems({ active: true })
      ]);

      if (vehiclesData.error) throw vehiclesData.error;
      
      // CRITICAL: Always ensure arrays
      const safeVehicles = Array.isArray(vehiclesData.data) ? vehiclesData.data : [];
      const safePricing = Array.isArray(pricingData) ? pricingData : [];
      const safeItems = Array.isArray(itemsData) ? itemsData : [];
      
      console.log('🚨🚨🚨 CRITICAL DEBUG: Loaded vehicles:', safeVehicles.length);
      console.log('🚨🚨🚨 CRITICAL DEBUG: Loaded pricing:', safePricing.length);
      console.log('🚨🚨🚨 CRITICAL DEBUG: Loaded inventory items:', safeItems.length);
      
      setVehicles(safeVehicles);
      setPricingCatalog(safePricing);
      
      // Include ALL active items for selection (not just those with stock > 0)
      // This allows editing existing records that may reference items now out of stock
      const activeItems = safeItems.filter(item => item.active);
      setInventoryItems(activeItems);
      
      console.log('🚨🚨🚨 CRITICAL DEBUG: Active inventory items set:', activeItems.length);
      
    } catch (err) {
      console.error('❌ Error loading initial data:', err);
      setError(`Failed to load data: ${err.message}`);
      // CRITICAL: Set empty arrays on error
      setVehicles([]);
      setPricingCatalog([]);
      setInventoryItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
      setLoadingItems(false);
    }
  };

  // NEW: Get filtered items for display based on maintenance type and toggle state
  const getFilteredItemsForDisplay = () => {
    if (!inventoryItems.length) return [];
    
    const { suggested, all } = filterItemsByMaintenanceType(
      inventoryItems, 
      formData.maintenance_type, 
      showAllItems
    );
    
    return showAllItems ? all : suggested;
  };

  // NEW: Get smart suggestions info
  const getSmartSuggestionsInfo = () => {
    const suggestedCategories = getSuggestedCategories(formData.maintenance_type);
    const description = getMaintenanceTypeDescription(formData.maintenance_type);
    const { suggested, all, hasNonTypical } = filterItemsByMaintenanceType(
      inventoryItems, 
      formData.maintenance_type, 
      false
    );
    
    return {
      suggestedCategories,
      description,
      suggestedCount: suggested.length,
      totalCount: all.length,
      hasNonTypical,
      hasSuggestions: suggestedCategories.length > 0
    };
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('🚨🚨🚨 CRITICAL DEBUG: Form field changed:', name, '=', value);
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // NEW: Handle maintenance type change prompt responses
  const handleKeepNonTypicalParts = () => {
    setShowMaintenanceTypeChangePrompt(false);
    setNonTypicalPartsToHandle([]);
  };

  const handleRemoveNonTypicalParts = () => {
    const updatedPartsUsed = removeNonTypicalParts(
      formData.parts_used,
      inventoryItems,
      formData.maintenance_type
    );
    
    setFormData(prev => ({
      ...prev,
      parts_used: updatedPartsUsed
    }));
    
    setShowMaintenanceTypeChangePrompt(false);
    setNonTypicalPartsToHandle([]);
  };

  // NEW: Parts Used Management Functions
  const addPartsUsed = () => {
    console.log('➕ Adding new part to parts_used');
    setFormData(prev => ({
      ...prev,
      parts_used: [...prev.parts_used, {
        item_id: '',
        quantity: 1,
        notes: ''
      }]
    }));
  };

  const removePartsUsed = (index) => {
    console.log('➖ Removing part at index:', index);
    const newPartsUsed = formData.parts_used.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, parts_used: newPartsUsed }));
  };

  const updatePartsUsed = (index, field, value) => {
    console.log('🔄 Updating part at index:', index, 'field:', field, 'value:', value);
    const newPartsUsed = [...formData.parts_used];
    newPartsUsed[index] = { ...newPartsUsed[index], [field]: value };
    setFormData(prev => ({ ...prev, parts_used: newPartsUsed }));
  };

  const getItemDetails = (itemId) => {
    const item = inventoryItems.find(item => item.id === parseInt(itemId));
    return item || null;
  };

  // NEW: Check if an item is non-typical for current maintenance type
  const isItemNonTypical = (itemId) => {
    const item = getItemDetails(itemId);
    return item && !isItemTypicalForMaintenance(item, formData.maintenance_type);
  };

  // ENHANCED: Stock validation function with detailed checking
  const validateStockForPart = (itemId, requestedQuantity) => {
    const item = getItemDetails(itemId);
    if (!item) return { valid: false, error: 'Item not found' };
    
    const available = item.stock_on_hand || 0;
    const requested = parseInt(requestedQuantity) || 0;
    
    if (requested <= 0) {
      return { valid: false, error: 'Quantity must be greater than 0' };
    }
    
    if (requested > available) {
      return { 
        valid: false, 
        error: `Insufficient stock. Requested: ${requested}, Available: ${available}`,
        available,
        requested,
        shortage: requested - available
      };
    }
    
    return { 
      valid: true, 
      available, 
      requested,
      remaining: available - requested
    };
  };

  // ENHANCED: Get maximum allowed quantity for an item
  const getMaxQuantityForItem = (itemId) => {
    const item = getItemDetails(itemId);
    return item ? (item.stock_on_hand || 0) : 0;
  };

  // NEW: Check parts availability
  const checkPartsAvailability = async (partsUsed) => {
    const checks = [];
    
    for (const part of partsUsed) {
      try {
        const item = await InventoryService.getItemById(part.item_id);
        if (item) {
          const required = parseInt(part.quantity);
          const available = item.stock_on_hand || 0;
          const sufficient = available >= required;
          
          checks.push({
            item_id: part.item_id,
            item_name: item.name,
            required,
            available,
            sufficient,
            shortage: sufficient ? 0 : required - available
          });
        }
      } catch (error) {
        console.error(`Error checking availability for item ${part.item_id}:`, error);
      }
    }
    
    return checks;
  };

  // 🚨🚨🚨 CRITICAL FIX: Enhanced total cost calculation with debug logging (removed external cost)
  const calculateTotalCost = () => {
    const laborCost = parseFloat(formData.labor_rate_mad) || 0;
    const partsCost = parseFloat(formData.parts_cost_mad) || 0;
    const tax = parseFloat(formData.tax_mad) || 0;
    
    // Add calculated parts cost from inventory
    let inventoryPartsCost = 0;
    formData.parts_used.forEach(part => {
      const item = inventoryItems.find(item => item.id === parseInt(part.item_id));
      if (item && part.quantity) {
        inventoryPartsCost += (item.cost_mad || 0) * parseInt(part.quantity);
      }
    });
    
    const totalCost = laborCost + partsCost + tax + inventoryPartsCost; // Removed external cost
    
    console.log('🚨🚨🚨 CRITICAL DEBUG: Cost calculation (no external):');
    console.log('🚨🚨🚨 CRITICAL DEBUG: laborCost:', laborCost);
    console.log('🚨🚨🚨 CRITICAL DEBUG: partsCost:', partsCost);
    console.log('🚨🚨🚨 CRITICAL DEBUG: tax:', tax);
    console.log('🚨🚨🚨 CRITICAL DEBUG: inventoryPartsCost:', inventoryPartsCost);
    console.log('🚨🚨🚨 CRITICAL DEBUG: totalCost:', totalCost);
    
    return {
      laborCost,
      inventoryPartsCost,
      totalCost
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      console.log('🚀 Form submission started');
      console.log('🚀 Current form data:', formData);

      // Validate required fields
      if (!formData.vehicle_id) {
        throw new Error('Please select a vehicle');
      }

      if (!formData.maintenance_type) {
        throw new Error('Please select a maintenance type');
      }

      if (!formData.scheduled_date) {
        throw new Error('Please enter a scheduled date');
      }

      // ENHANCED: Validate parts used with stock validation
      const partsErrors = [];
      const stockValidationErrors = [];
      
      formData.parts_used.forEach((part, index) => {
        if (!part.item_id) {
          partsErrors.push(`Part ${index + 1}: Item is required`);
        }
        if (!part.quantity || part.quantity <= 0) {
          partsErrors.push(`Part ${index + 1}: Valid quantity is required`);
        }
        
        // ENHANCED: Stock validation for each part
        if (part.item_id && part.quantity > 0) {
          const stockValidation = validateStockForPart(part.item_id, part.quantity);
          if (!stockValidation.valid) {
            const item = getItemDetails(part.item_id);
            const itemName = item ? item.name : `Item ${part.item_id}`;
            stockValidationErrors.push(`${itemName}: ${stockValidation.error}`);
          }
        }
      });
      
      if (partsErrors.length > 0) {
        throw new Error(`Parts validation errors: ${partsErrors.join(', ')}`);
      }
      
      if (stockValidationErrors.length > 0) {
        throw new Error(`Stock validation errors: ${stockValidationErrors.join('; ')}`);
      }

      // Check stock availability for parts (only for new records or increased quantities)
      if (formData.parts_used.length > 0 && !editingRecord) {
        const stockChecks = await checkPartsAvailability(formData.parts_used);
        const warnings = stockChecks.filter(check => !check.sufficient);
        setStockWarnings(warnings);
        
        if (warnings.length > 0) {
          const shortageDetails = warnings.map(warning => 
            `${warning.item_name}: need ${warning.required}, have ${warning.available}`
          ).join('; ');
          throw new Error(`Insufficient inventory: ${shortageDetails}`);
        }
      }

      // CRITICAL FIX: Convert vehicle_id to integer BEFORE sending to service
      const vehicleIdAsInteger = parseInt(formData.vehicle_id);
      if (!vehicleIdAsInteger || isNaN(vehicleIdAsInteger)) {
        throw new Error('Invalid vehicle selection');
      }

      // Enrich parts_used with inventory data for proper cost calculation
      const enrichedPartsUsed = await Promise.all(
        formData.parts_used.map(async (part) => {
          try {
            const item = await InventoryService.getItemById(part.item_id);
            return {
              ...part,
              quantity: parseInt(part.quantity),
              item_name: item ? item.name : (part.item_name || 'Unknown Item'),
              unit_cost_mad: item ? (item.cost_mad || 0) : (part.unit_cost_mad || 0),
              total_cost_mad: item ? ((item.cost_mad || 0) * parseInt(part.quantity)) : (part.total_cost_mad || 0),
              unit: item ? item.unit : 'units'
            };
          } catch (error) {
            console.error(`Error enriching part ${part.item_id}:`, error);
            return {
              ...part,
              quantity: parseInt(part.quantity),
              item_name: part.item_name || 'Unknown Item',
              unit_cost_mad: part.unit_cost_mad || 0,
              total_cost_mad: part.total_cost_mad || 0,
              unit: 'units'
            };
          }
        })
      );

      const maintenanceData = {
        vehicle_id: vehicleIdAsInteger, // FIXED: Send as integer, not string
        maintenance_type: formData.maintenance_type,
        status: formData.status,
        scheduled_date: formData.scheduled_date,
        completed_date: formData.status === 'completed' ? (formData.completed_date || formData.scheduled_date) : null,
        odometer_reading: formData.odometer_reading ? parseInt(formData.odometer_reading) : null,
        labor_rate_mad: parseFloat(formData.labor_rate_mad) || 0, // Now fixed price
        parts_cost_mad: parseFloat(formData.parts_cost_mad) || 0,
        tax_mad: parseFloat(formData.tax_mad) || 0,
        notes: formData.notes.trim(),
        technician_name: formData.technician_name.trim(),
        parts_used: enrichedPartsUsed, // Use enriched parts data
        created_by: 'Admin' // TODO: Get from auth context
        // REMOVED: external_cost_mad field completely
      };

      console.log('🔍 Form submitting vehicle_id:', vehicleIdAsInteger, typeof vehicleIdAsInteger);
      console.log('📝 Complete maintenance data (no external cost):', maintenanceData);
      console.log('📦 Parts used:', enrichedPartsUsed);

      if (editingRecord) {
        console.log('🔄 Updating existing record with ID:', editingRecord.id);
        await MaintenanceTrackingService.updateMaintenanceRecord(editingRecord.id, maintenanceData);
        console.log('✅ Record updated successfully');
      } else {
        console.log('➕ Creating new record');
        await MaintenanceTrackingService.createMaintenanceRecord(maintenanceData);
        console.log('✅ Record created successfully');
      }

      console.log('🎉 Form submission completed successfully');
      onSuccess();
      
    } catch (err) {
      console.error('❌ Error saving maintenance record:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const { laborCost, inventoryPartsCost, totalCost } = calculateTotalCost();
  const smartInfo = getSmartSuggestionsInfo();

  // CRITICAL: Safe array access
  const safeVehicles = Array.isArray(vehicles) ? vehicles : [];
  const safeMaintenanceTypes = Array.isArray(MaintenanceTrackingService.MAINTENANCE_TYPES) ? MaintenanceTrackingService.MAINTENANCE_TYPES : ['Oil Change', 'Filter Replacement', 'Brake Service', 'Tire Service', 'Engine Service', 'Transmission Service', 'Electrical Service', 'Body Work', 'General Inspection', 'Other'];

  // 🚨🚨🚨 CRITICAL DEBUG: Log current form state continuously (removed external cost)
  console.log('🚨🚨🚨 CRITICAL DEBUG: Current form state (render, no external):', {
    editingRecord: !!editingRecord,
    formDataVehicleId: formData.vehicle_id,
    formDataMaintenanceType: formData.maintenance_type,
    formDataStatus: formData.status,
    formDataScheduledDate: formData.scheduled_date,
    formDataNotes: formData.notes,
    formDataLaborCost: formData.labor_rate_mad,
    formDataPartsCost: formData.parts_cost_mad,
    formDataTax: formData.tax_mad,
    formDataPartsUsedCount: formData.parts_used.length,
    calculatedTotalCost: totalCost,
    vehiclesLoaded: safeVehicles.length,
    inventoryItemsLoaded: inventoryItems.length
  });

  return (
    <Card className="border-0 shadow-none">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            {editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'}
            {editingRecord && (
              <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                ID: {editingRecord.id}
              </span>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="p-2"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm font-medium text-red-800">{error}</p>
          </div>
        )}

        {/* 🚨🚨🚨 CRITICAL DEBUG: Enhanced debug UI showing all form data (removed external cost) */}
        {editingRecord && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <p className="text-sm font-medium text-blue-800">🚨🚨🚨 CRITICAL DEBUG: Edit Mode Active</p>
            <p className="text-xs text-blue-600">
              Vehicle ID: {formData.vehicle_id} | Type: {formData.maintenance_type} | Status: {formData.status} | Parts: {formData.parts_used.length}
            </p>
            <p className="text-xs text-blue-600">
              Notes: "{formData.notes}" | Date: {formData.scheduled_date}
            </p>
            <p className="text-xs text-blue-600">
              Labor: {formData.labor_rate_mad} | Parts: {formData.parts_cost_mad} | Tax: {formData.tax_mad}
            </p>
            <p className="text-xs text-blue-600">
              Calculated Total: {totalCost.toFixed(2)} MAD | Vehicles: {safeVehicles.length} | Inventory: {inventoryItems.length}
            </p>
          </div>
        )}

        {/* Stock Warnings */}
        {stockWarnings.length > 0 && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <AlertTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">Insufficient Inventory</p>
                <ul className="text-yellow-700 text-sm mt-1">
                  {stockWarnings.map((warning, index) => (
                    <li key={index}>
                      {warning.item_name}: need {warning.required}, have {warning.available} 
                      (short {warning.shortage})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Maintenance Type Change Prompt */}
        {showMaintenanceTypeChangePrompt && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <InfoIcon className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
              <div className="flex-1">
                <p className="text-blue-800 font-medium">Maintenance Type Changed</p>
                <p className="text-blue-700 text-sm mt-1">
                  You have {nonTypicalPartsToHandle.length} part(s) that are not typical for "{formData.maintenance_type}". 
                  What would you like to do?
                </p>
                <div className="flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleKeepNonTypicalParts}
                    className="text-blue-700 border-blue-300 hover:bg-blue-100"
                  >
                    Keep All Parts
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleRemoveNonTypicalParts}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Remove Non-Typical
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vehicle and Type Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Car className="w-4 h-4 inline mr-1" />
                Vehicle *
              </label>
              <select
                name="vehicle_id"
                value={formData.vehicle_id}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              >
                <option value="">Select a vehicle...</option>
                {safeVehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.name} ({vehicle.plate_number})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Wrench className="w-4 h-4 inline mr-1" />
                Maintenance Type *
              </label>
              <select
                name="maintenance_type"
                value={formData.maintenance_type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              >
                {safeMaintenanceTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Status and Dates */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status *
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Scheduled Date *
              </label>
              <input
                type="date"
                name="scheduled_date"
                value={formData.scheduled_date}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={loading}
              />
            </div>

            {formData.status === 'completed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Completed Date
                </label>
                <input
                  type="date"
                  name="completed_date"
                  value={formData.completed_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  disabled={loading}
                />
              </div>
            )}
          </div>

          {/* Odometer and Technician */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Odometer Reading (km)
              </label>
              <input
                type="number"
                name="odometer_reading"
                value={formData.odometer_reading}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min="0"
                disabled={loading}
                placeholder="Current odometer reading"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Technician Name
              </label>
              <input
                type="text"
                name="technician_name"
                value={formData.technician_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={loading}
                placeholder="Name of technician"
              />
            </div>
          </div>

          {/* 🚨🚨🚨 CRITICAL FIX: Enhanced Cost Breakdown with Debug Info (REMOVED EXTERNAL COST) */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-blue-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Cost Breakdown (MAD)
              {editingRecord && (
                <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Original Cost: {editingRecord.cost || 'N/A'}
                </span>
              )}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* FIXED: Labor Rate is now a fixed price field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DollarSign className="w-4 h-4 inline mr-1" />
                  Labor Cost (MAD)
                </label>
                <input
                  type="number"
                  name="labor_rate_mad"
                  value={formData.labor_rate_mad}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  placeholder="Fixed labor cost"
                />
                <p className="text-xs text-gray-500 mt-1">Fixed price for labor work</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parts Cost (MAD)
                </label>
                <input
                  type="number"
                  name="parts_cost_mad"
                  value={formData.parts_cost_mad}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  placeholder="0.00"
                />
              </div>

              {/* REMOVED: External Cost field completely */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax (MAD)
                </label>
                <input
                  type="number"
                  name="tax_mad"
                  value={formData.tax_mad}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  min="0"
                  step="0.01"
                  disabled={loading}
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* 🚨🚨🚨 CRITICAL FIX: Enhanced Cost Summary with Debug Info (REMOVED EXTERNAL COST) */}
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Labor Cost:</span>
                <span className="font-medium">MAD {laborCost.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Parts Cost:</span>
                <span className="font-medium">MAD {parseFloat(formData.parts_cost_mad || 0).toFixed(2)}</span>
              </div>
              {/* REMOVED: External Cost display */}
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600">Tax:</span>
                <span className="font-medium">MAD {parseFloat(formData.tax_mad || 0).toFixed(2)}</span>
              </div>
              {inventoryPartsCost > 0 && (
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-gray-600">Inventory Parts Cost:</span>
                  <span className="font-medium">MAD {inventoryPartsCost.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-lg font-bold text-blue-900 pt-2 border-t">
                <span>Total Cost:</span>
                <span>MAD {totalCost.toFixed(2)}</span>
              </div>
              {editingRecord && (
                <div className="text-xs text-gray-500 mt-2">
                  Debug: Form values - Labor: {formData.labor_rate_mad}, Parts: {formData.parts_cost_mad}, Tax: {formData.tax_mad}
                </div>
              )}
            </div>
          </div>

          {/* ENHANCED: Smart Parts Used Section with Stock Validation */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <PackageIcon className="h-5 w-5 mr-2" />
                Parts Used {formData.parts_used.length > 0 && (
                  <span className="ml-2 bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                    {formData.parts_used.length}
                  </span>
                )}
              </h3>
              <button
                type="button"
                onClick={addPartsUsed}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Part
              </button>
            </div>

            {/* Smart Suggestions Info */}
            {smartInfo.hasSuggestions && (
              <div className="mb-4 bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      Smart Suggestions for {formData.maintenance_type}
                    </p>
                    <p className="text-xs text-gray-600 mb-2">{smartInfo.description}</p>
                    <p className="text-xs text-blue-600">
                      Showing {showAllItems ? smartInfo.totalCount : smartInfo.suggestedCount} of {smartInfo.totalCount} items
                      {smartInfo.suggestedCategories.length > 0 && !showAllItems && (
                        <span className="ml-1">
                          ({smartInfo.suggestedCategories.join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAllItems(!showAllItems)}
                    className="flex items-center text-xs text-blue-600 hover:text-blue-800 ml-3"
                  >
                    {showAllItems ? (
                      <>
                        <ToggleRightIcon className="h-4 w-4 mr-1" />
                        Show Suggested
                      </>
                    ) : (
                      <>
                        <ToggleLeftIcon className="h-4 w-4 mr-1" />
                        Show All Items
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loadingItems && (
              <div className="text-center py-4">
                <p className="text-gray-600">Loading inventory items...</p>
              </div>
            )}

            {/* No Active Items Message */}
            {!loadingItems && inventoryItems.length === 0 && (
              <div className="text-center py-4">
                <p className="text-gray-600">No active items found. Activate items in Inventory.</p>
              </div>
            )}

            {/* Item Search - Show when parts are added */}
            {formData.parts_used.length > 0 && inventoryItems.length > 0 && (
              <div className="mb-4">
                <div className="relative">
                  <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder={`Search items by name or SKU... (${showAllItems ? 'all items' : 'suggested items'})`}
                    value={itemSearchTerm}
                    onChange={(e) => setItemSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}

            {/* Parts List */}
            {formData.parts_used.length === 0 ? (
              <p className="text-gray-600 text-center py-4">No parts used in this maintenance</p>
            ) : (
              <div className="space-y-3">
                {formData.parts_used.map((part, index) => {
                  const maxQuantity = getMaxQuantityForItem(part.item_id);
                  const stockValidation = part.item_id ? validateStockForPart(part.item_id, part.quantity) : null;
                  
                  return (
                    <div key={index} className="bg-white rounded-lg p-3 border border-blue-200">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Inventory Item *
                          </label>
                          <select
                            value={part.item_id}
                            onChange={(e) => updatePartsUsed(index, 'item_id', e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">Select item</option>
                            {filteredItems.map(item => (
                              <option 
                                key={item.id} 
                                value={item.id}
                                disabled={item.stock_on_hand <= 0 && !editingRecord}
                              >
                                {item.name} {item.sku ? `(${item.sku})` : ''} - {item.stock_on_hand} {item.unit} available
                                {item.stock_on_hand <= 0 && !editingRecord ? ' - Out of stock' : ''}
                              </option>
                            ))}
                            {/* Show item by name if not found in current inventory (for edit mode) */}
                            {part.item_name && !filteredItems.find(item => item.id === parseInt(part.item_id)) && (
                              <option value={part.item_id} disabled>
                                {part.item_name} (No longer available)
                              </option>
                            )}
                          </select>
                          {part.item_id && (
                            <div className="mt-1 text-xs text-gray-500">
                              {(() => {
                                const item = getItemDetails(part.item_id);
                                if (item) {
                                  const isNonTypical = isItemNonTypical(part.item_id);
                                  return (
                                    <div className="flex items-center justify-between">
                                      <span>{item.category} • Cost: {item.cost_mad} MAD/{item.unit}</span>
                                      {isNonTypical && (
                                        <span className="text-orange-600 text-xs bg-orange-50 px-2 py-0.5 rounded">
                                          Non-typical for {formData.maintenance_type}
                                        </span>
                                      )}
                                    </div>
                                  );
                                } else if (part.item_name) {
                                  return `${part.item_name} • Cost: ${part.unit_cost_mad || 0} MAD`;
                                }
                                return '';
                              })()}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Quantity *
                            {maxQuantity > 0 && (
                              <span className="text-xs text-blue-600 ml-1">(max: {maxQuantity})</span>
                            )}
                          </label>
                          <input
                            type="number"
                            min="1"
                            max={maxQuantity > 0 ? maxQuantity : undefined}
                            value={part.quantity}
                            onChange={(e) => updatePartsUsed(index, 'quantity', e.target.value)}
                            className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:border-transparent ${
                              stockValidation && !stockValidation.valid 
                                ? 'border-red-300 focus:ring-red-500' 
                                : 'border-gray-300 focus:ring-blue-500'
                            }`}
                            placeholder="1"
                          />
                          {/* ENHANCED: Stock validation feedback */}
                          {stockValidation && (
                            <div className="mt-1 text-xs">
                              {stockValidation.valid ? (
                                <span className="text-green-600">
                                  ✅ Available: {stockValidation.available}, Remaining: {stockValidation.remaining}
                                </span>
                              ) : (
                                <span className="text-red-600">
                                  ❌ {stockValidation.error}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removePartsUsed(index)}
                            className="w-full p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <TrashIcon className="h-4 w-4 mx-auto" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes
                        </label>
                        <input
                          type="text"
                          value={part.notes}
                          onChange={(e) => updatePartsUsed(index, 'notes', e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Optional notes about this part usage..."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={loading}
              placeholder="Additional notes about the maintenance work..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button
              type="submit"
              disabled={loading || stockWarnings.length > 0}
              className={`flex items-center justify-center gap-2 flex-1 ${
                loading || stockWarnings.length > 0
                  ? 'bg-gray-400 cursor-not-allowed'
                  : ''
              }`}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {editingRecord ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {editingRecord ? 'Update Maintenance' : 'Create Maintenance'}
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={loading}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddMaintenanceForm;