import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Edit, Trash2, Search, Filter, Car, Fuel, Calendar, AlertTriangle, X, FileText, Gauge, Wrench, Shield, Image as ImageIcon, StickyNote, File, Clock, CheckCircle, AlertCircle, DollarSign, LayoutGrid, List } from 'lucide-react';
import VehicleModelService from '../services/VehicleModelService';
import VehicleModelMigrationRunner from './VehicleModelMigrationRunner';
import SegwayCleanupRunner from './SegwayCleanupRunner';
import VehicleImageUpload from './VehicleImageUpload';
import DocumentUpload from './DocumentUpload';
import VehicleDocuments from './VehicleDocuments';
import VehicleModelEditModal from './admin/VehicleModelEditModal';
import MaintenanceFormModal from './admin/maintenance/MaintenanceFormModal';
import MaintenanceTrackingService from '../services/MaintenanceTrackingService';
import alertService from '../services/AlertService';
import GridSkeleton from './ui/GridSkeleton';
import { TBL } from '../config/tables';
import FuelTransactionService from '../services/FuelTransactionService';
import VehicleGridView from './VehicleGridView';
import VehicleListView from './VehicleListView';

interface Vehicle {
  id: number;
  name: string;
  model: string;
  vehicle_type: string;
  power_cc: number;
  capacity: number;
  color: string;
  location_id: number | null;
  status: 'available' | 'rented' | 'maintenance' | 'out_of_service';
  image_url: string;
  features: string[];
  plate_number: string;
  current_odometer: string | null;
  engine_hours: string | null;
  last_oil_change_date: string | null;
  last_oil_change_odometer: string | null;
  next_oil_change_due: string | null;
  next_oil_change_odometer: string | null;
  registration_number: string;
  registration_expiry_date: string | null;
  insurance_policy_number: string;
  insurance_provider: string;
  insurance_expiry_date: string | null;
  general_notes: string;
  notes: string;
  created_at: string;
  updated_at: string;
  vehicle_model_id: string;
  documents?: VehicleDocument[];
  document_count?: number;
  // New acquisition fields
  purchase_cost_mad: number | null;
  purchase_date: string | null;
  purchase_supplier: string | null;
  purchase_invoice_url: string | null;
}

interface VehicleDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  category?: string;
}

interface VehicleModel {
  id: string;
  name: string;
  model: string;
  vehicle_type: string;
  power_cc_min: number;
  power_cc_max: number;
  capacity_min: number;
  capacity_max: number;
  description: string;
  image_url: string | null;
  features: string[];
  is_active: boolean;
  vehicles?: { count: number }[];
}

// Updated FuelLog interface to match FuelTransactionService unified transaction format
interface FuelLog {
  id: string;
  transaction_date: string;
  transaction_type: string;
  fuel_type: string;
  amount: number;
  cost: number;
  unit_price: number;
  fuel_station: string;
  location: string;
  odometer_reading?: number;
  notes: string;
  filled_by: string;
  vehicle_id?: number;
  saharax_0u4w4d_vehicles?: {
    id: number;
    name: string;
    plate_number: string;
  };
  created_at: string;
  source_table: string;
  invoice_image?: string;
}

interface MaintenanceRecord {
  id: string;
  vehicle_id: number;
  service_date: string;
  maintenance_type: string;
  status: string;
  description: string;
  cost?: number;
  odometer_reading?: number;
  next_service_date?: string;
  technician_name: string;
  created_at: string;
  updated_at: string;
}

const VehicleManagement: React.FC = () => {
  // Console log for canonical path identification
  console.log('VEHICLE_FORM_CANONICAL_PATH: /workspace/react_template/src/components/VehicleManagement.tsx');

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehicleModels, setVehicleModels] = useState<VehicleModel[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [viewingVehicle, setViewingVehicle] = useState<Vehicle | null>(null);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'models' | 'fuel' | 'maintenance'>('vehicles');
  const [deletingModelId, setDeletingModelId] = useState<string | null>(null);
  const [showAddModelForm, setShowAddModelForm] = useState(false);
  const [modelFormData, setModelFormData] = useState({
    name: '',
    model: '',
    vehicle_type: 'quad',
    description: ''
  });
  const [modelFormError, setModelFormError] = useState('');
  const [showMigration, setShowMigration] = useState(false);
  const [showSegwayCleanup, setShowSegwayCleanup] = useState(false);
  const [vehicleImageUrl, setVehicleImageUrl] = useState('');
  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>([]);
  
  const [editingVehicleModel, setEditingVehicleModel] = useState<VehicleModel | null>(null);
  const [showEditModelModal, setShowEditModelModal] = useState(false);
  const [modelEditError, setModelEditError] = useState('');

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editingMaintenanceRecord, setEditingMaintenanceRecord] = useState<MaintenanceRecord | null>(null);
  const [vehicleMaintenanceHistory, setVehicleMaintenanceHistory] = useState<MaintenanceRecord[]>([]);
  const [vehicleAlerts, setVehicleAlerts] = useState<any[]>([]);
  const [maintenanceFormData, setMaintenanceFormData] = useState({
    type: 'oil_change',
    notes: '',
    cost: '',
    odometer_reading: '',
    engine_hours: '',
    service_date: new Date().toISOString().split('T')[0],
    next_service_date: '',
    status: 'scheduled',
    oil_change_interval: '500',
    next_oil_change_odometer: ''
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const getEmptyFormData = () => ({
    name: '',
    model: '',
    vehicle_type: 'quad',
    power_cc: 0,
    capacity: 1,
    color: '',
    plate_number: '',
    status: 'available',
    current_odometer: '',
    engine_hours: '',
    last_oil_change_date: '',
    last_oil_change_odometer: '',
    next_oil_change_due: '',
    next_oil_change_odometer: '',
    registration_number: '',
    registration_expiry_date: '',
    insurance_policy_number: '',
    insurance_provider: '',
    insurance_expiry_date: '',
    general_notes: '',
    notes: '',
    // New acquisition fields
    purchase_cost_mad: '',
    purchase_date: '',
    purchase_supplier: '',
    purchase_invoice_url: ''
  });

  const [formData, setFormData] = useState(getEmptyFormData());

  const getVehicleDocumentCount = async (vehicleId: number): Promise<number> => {
    try {
      const { data: files, error } = await supabase.storage
        .from('vehicle-documents')
        .list(vehicleId.toString(), {
          limit: 1000,
          offset: 0
        });

      if (error) {
        console.error('Error counting documents for vehicle', vehicleId, ':', error);
        return 0;
      }

      const validFiles = files ? files.filter(file => 
        file.name && 
        !file.name.endsWith('/') && 
        file.name !== '.emptyFolderPlaceholder'
      ) : [];

      return validFiles.length;
    } catch (error) {
      console.error('Error counting documents for vehicle', vehicleId, ':', error);
      return 0;
    }
  };

  const loadVehicleDocumentCounts = async (vehicleList: Vehicle[]) => {
    try {
      const vehiclesWithCounts = await Promise.all(
        vehicleList.map(async (vehicle) => {
          const documentCount = await getVehicleDocumentCount(vehicle.id);
          return {
            ...vehicle,
            document_count: documentCount
          };
        })
      );
      
      return vehiclesWithCounts;
    } catch (error) {
      console.error('Error loading vehicle document counts:', error);
      return vehicleList.map(vehicle => ({ ...vehicle, document_count: 0 }));
    }
  };

  const refreshVehicleDocumentCount = async (vehicleId: number) => {
    try {
      console.log('🔄 Refreshing document count for vehicle:', vehicleId);
      const newCount = await getVehicleDocumentCount(vehicleId);
      
      setVehicles(prev => prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, document_count: newCount }
          : vehicle
      ));
      
      if (editingVehicle?.id === vehicleId) {
        setEditingVehicle(prev => prev ? { ...prev, document_count: newCount } : prev);
      }
      
      if (viewingVehicle?.id === vehicleId) {
        setViewingVehicle(prev => prev ? { ...prev, document_count: newCount } : prev);
      }
      
      console.log('✅ Document count refreshed for vehicle', vehicleId, '- New count:', newCount);
    } catch (error) {
      console.error('❌ Error refreshing document count:', error);
    }
  };

  // CRITICAL FIX: Load maintenance records from database using MaintenanceTrackingService
  const loadMaintenanceData = async () => {
    try {
      console.log('🔧 Loading maintenance records from database...');
      const records = await MaintenanceTrackingService.getAllMaintenanceRecords();
      console.log('✅ Loaded maintenance records:', records.length);
      setMaintenanceRecords(records);
    } catch (error) {
      console.error('❌ Error loading maintenance records:', error);
      setMaintenanceRecords([]);
    }
  };

  // FIXED: Load fuel logs using FuelTransactionService
  const loadFuelData = async () => {
    try {
      console.log('⛽ Loading fuel transactions via FuelTransactionService...');
      const result = await FuelTransactionService.getAllTransactions({
        limit: 20,
        offset: 0
      });
      
      if (result.success) {
        console.log('✅ Loaded fuel transactions:', result.transactions.length);
        setFuelLogs(result.transactions);
      } else {
        console.error('❌ Error loading fuel transactions:', result.error);
        setFuelLogs([]);
      }
    } catch (error) {
      console.error('❌ Error loading fuel data:', error);
      setFuelLogs([]);
    }
  };

  // Fixed useEffect with proper dependency handling
  useEffect(() => {
    let unsubscribeAlerts: (() => void) | undefined;

    try {
      // Load maintenance data from database
      loadMaintenanceData();

      unsubscribeAlerts = alertService.subscribe((alerts) => {
        if (viewingVehicle || editingVehicle) {
          const vehicleId = (viewingVehicle || editingVehicle)?.id.toString();
          if (vehicleId) {
            const vehicleSpecificAlerts = alertService.getVehicleAlerts(vehicleId);
            setVehicleAlerts(vehicleSpecificAlerts);
          }
        }
      });
    } catch (error) {
      console.error('Error setting up subscriptions:', error);
    }

    return () => {
      if (unsubscribeAlerts) {
        unsubscribeAlerts();
      }
    };
  }, [viewingVehicle, editingVehicle]);

  useEffect(() => {
    const vehicle = viewingVehicle || editingVehicle;
    if (vehicle && maintenanceFormData.type === 'oil_change') {
      if (vehicle.current_odometer && !maintenanceFormData.odometer_reading) {
        setMaintenanceFormData(prev => ({
          ...prev,
          odometer_reading: vehicle.current_odometer?.toString() || ''
        }));
      }
      
      // Use next_oil_change_odometer from vehicle if available
      if (vehicle.next_oil_change_odometer && !maintenanceFormData.next_oil_change_odometer) {
        setMaintenanceFormData(prev => ({
          ...prev,
          next_oil_change_odometer: vehicle.next_oil_change_odometer?.toString() || ''
        }));
      }
      
      // Use default interval of 500km
      setMaintenanceFormData(prev => ({
        ...prev,
        oil_change_interval: '500'
      }));
    }
  }, [viewingVehicle, editingVehicle, maintenanceFormData.type]);

  useEffect(() => {
    if (maintenanceFormData.type === 'oil_change' && 
        maintenanceFormData.odometer_reading && 
        maintenanceFormData.oil_change_interval) {
      const currentOdometer = parseFloat(maintenanceFormData.odometer_reading);
      const interval = parseFloat(maintenanceFormData.oil_change_interval);
      if (!isNaN(currentOdometer) && !isNaN(interval)) {
        const nextOdometer = currentOdometer + interval;
        setMaintenanceFormData(prev => ({
          ...prev,
          next_oil_change_odometer: nextOdometer.toString()
        }));
      }
    }
  }, [maintenanceFormData.odometer_reading, maintenanceFormData.oil_change_interval, maintenanceFormData.type]);

  const sanitizeFormData = (data: any) => {
    const sanitized = { ...data };
    
    if (sanitized.current_odometer === '' || sanitized.current_odometer === undefined) {
      sanitized.current_odometer = null;
    } else if (typeof sanitized.current_odometer === 'string') {
      const parsed = parseFloat(sanitized.current_odometer);
      sanitized.current_odometer = isNaN(parsed) ? null : parsed;
    }
    
    if (sanitized.engine_hours === '' || sanitized.engine_hours === undefined) {
      sanitized.engine_hours = null;
    } else if (typeof sanitized.engine_hours === 'string') {
      const parsed = parseFloat(sanitized.engine_hours);
      sanitized.engine_hours = isNaN(parsed) ? null : parsed;
    }
    
    if (sanitized.last_oil_change_odometer === '' || sanitized.last_oil_change_odometer === undefined) {
      sanitized.last_oil_change_odometer = null;
    } else if (typeof sanitized.last_oil_change_odometer === 'string') {
      const parsed = parseFloat(sanitized.last_oil_change_odometer);
      sanitized.last_oil_change_odometer = isNaN(parsed) ? null : parsed;
    }
    
    if (sanitized.next_oil_change_odometer === '' || sanitized.next_oil_change_odometer === undefined) {
      sanitized.next_oil_change_odometer = null;
    } else if (typeof sanitized.next_oil_change_odometer === 'string') {
      const parsed = parseFloat(sanitized.next_oil_change_odometer);
      sanitized.next_oil_change_odometer = isNaN(parsed) ? null : parsed;
    }
    
    if (sanitized.last_oil_change_date === '' || sanitized.last_oil_change_date === undefined) {
      sanitized.last_oil_change_date = null;
    }
    
    if (sanitized.next_oil_change_due === '' || sanitized.next_oil_change_due === undefined) {
      sanitized.next_oil_change_due = null;
    }
    
    if (sanitized.registration_expiry_date === '' || sanitized.registration_expiry_date === undefined) {
      sanitized.registration_expiry_date = null;
    }
    
    if (sanitized.insurance_expiry_date === '' || sanitized.insurance_expiry_date === undefined) {
      sanitized.insurance_expiry_date = null;
    }
    
    // Process acquisition fields
    if (sanitized.purchase_cost_mad === '' || sanitized.purchase_cost_mad === undefined) {
      sanitized.purchase_cost_mad = null;
    } else if (typeof sanitized.purchase_cost_mad === 'string') {
      const parsed = parseFloat(sanitized.purchase_cost_mad);
      sanitized.purchase_cost_mad = isNaN(parsed) ? null : parsed;
    }
    
    if (sanitized.purchase_date === '' || sanitized.purchase_date === undefined) {
      sanitized.purchase_date = null;
    }
    
    if (!sanitized.power_cc || sanitized.power_cc === '' || sanitized.power_cc === undefined) {
      sanitized.power_cc = 0;
    } else if (typeof sanitized.power_cc === 'string') {
      sanitized.power_cc = parseInt(sanitized.power_cc) || 0;
    }
    
    if (!sanitized.capacity || sanitized.capacity === '' || sanitized.capacity < 1 || sanitized.capacity === undefined) {
      sanitized.capacity = 1;
    } else if (typeof sanitized.capacity === 'string') {
      sanitized.capacity = parseInt(sanitized.capacity) || 1;
    }
    
    sanitized.name = sanitized.name ? sanitized.name.trim() : '';
    sanitized.model = sanitized.model ? sanitized.model.trim() : '';
    sanitized.color = sanitized.color ? sanitized.color.trim() : '';
    sanitized.plate_number = sanitized.plate_number ? sanitized.plate_number.trim() : '';
    sanitized.registration_number = sanitized.registration_number ? sanitized.registration_number.trim() : '';
    sanitized.insurance_policy_number = sanitized.insurance_policy_number ? sanitized.insurance_policy_number.trim() : '';
    sanitized.insurance_provider = sanitized.insurance_provider ? sanitized.insurance_provider.trim() : '';
    sanitized.general_notes = sanitized.general_notes ? sanitized.general_notes.trim() : '';
    sanitized.notes = sanitized.notes ? sanitized.notes.trim() : '';
    sanitized.purchase_supplier = sanitized.purchase_supplier ? sanitized.purchase_supplier.trim() : '';
    sanitized.purchase_invoice_url = sanitized.purchase_invoice_url ? sanitized.purchase_invoice_url.trim() : '';
    
    sanitized.image_url = sanitized.image_url || '';
    
    return sanitized;
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);
    
    try {
      const [vehiclesResult, modelsResult] = await Promise.allSettled([
        supabase
          .from(TBL.VEHICLES)
          .select('id, name, model, vehicle_type, power_cc, capacity, color, status, image_url, plate_number, current_odometer, engine_hours, next_oil_change_due, next_oil_change_odometer, last_oil_change_odometer, last_oil_change_date, created_at, registration_number, registration_expiry_date, insurance_policy_number, insurance_provider, insurance_expiry_date, purchase_cost_mad, purchase_date, purchase_supplier, purchase_invoice_url')
          .order('created_at', { ascending: false })
          .limit(50),
        
        VehicleModelService.getAllVehicleModels()
      ]);

      let vehiclesData = [];
      let modelsData = [];

      if (vehiclesResult.status === 'fulfilled' && vehiclesResult.value.data) {
        vehiclesData = vehiclesResult.value.data;
        alertService.updateAllOilChangeAlerts(vehiclesData);
        
        console.log('📊 Loading document counts for vehicles...');
        vehiclesData = await loadVehicleDocumentCounts(vehiclesData);
        console.log('✅ Document counts loaded for', vehiclesData.length, 'vehicles');
      } else if (vehiclesResult.status === 'rejected') {
        console.error('❌ Vehicles fetch failed:', vehiclesResult.reason);
      }

      if (modelsResult.status === 'fulfilled' && modelsResult.value) {
        modelsData = modelsResult.value;
      } else if (modelsResult.status === 'rejected') {
        console.error('❌ Models fetch failed:', modelsResult.reason);
      }

      setVehicles(vehiclesData);
      setVehicleModels(modelsData);

      // FIXED: Load fuel data using FuelTransactionService
      await loadFuelData();

      // CRITICAL FIX: Load maintenance records from database
      await loadMaintenanceData();

      const segwayModels = modelsData.filter(m => 
        m.name.toLowerCase().includes('segway') && 
        !['segway at6', 'segway at5'].includes(m.name.toLowerCase())
      );
      
      setShowSegwayCleanup(segwayModels.length > 0);
      
      const targetModels = ['segway at6', 'segway at5'];
      const currentModelNames = modelsData.map(m => m.name.toLowerCase().trim());
      const needsMigration = !segwayModels.length && (
        modelsData.length !== 2 || 
        !targetModels.every(target => currentModelNames.includes(target))
      );
      
      setShowMigration(needsMigration);

      const endTime = performance.now();

    } catch (error) {
      console.error('❌ Error fetching data:', error);
      setError(`Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadVehicleMaintenanceData = async (vehicleId: string) => {
    try {
      console.log('🔧 Loading maintenance data for vehicle:', vehicleId);
      
      // Get maintenance records for this vehicle from database
      const allRecords = await MaintenanceTrackingService.getAllMaintenanceRecords();
      const vehicleRecords = allRecords.filter(record => record.vehicle_id === parseInt(vehicleId));
      
      console.log('✅ Found maintenance records for vehicle:', vehicleRecords.length);
      setVehicleMaintenanceHistory(vehicleRecords);
      
      // Get alerts for this vehicle
      const alerts = alertService.getVehicleAlerts(vehicleId);
      setVehicleAlerts(alerts);
    } catch (error) {
      console.error('❌ Error loading vehicle maintenance data:', error);
      setVehicleMaintenanceHistory([]);
      setVehicleAlerts([]);
    }
  };

  const handleAddMaintenanceRecord = async () => {
    if (!viewingVehicle && !editingVehicle) return;
    
    const vehicle = viewingVehicle || editingVehicle;
    try {
      console.log('🔧 Creating maintenance record via MaintenanceTrackingService...');
      
      const maintenanceData = {
        vehicle_id: vehicle.id,
        maintenance_type: maintenanceFormData.type.replace('_', ' '),
        status: maintenanceFormData.status,
        service_date: maintenanceFormData.service_date,
        next_service_date: maintenanceFormData.type === 'oil_change' ? null : maintenanceFormData.next_service_date || null,
        description: maintenanceFormData.notes,
        cost: parseFloat(maintenanceFormData.cost) || 0,
        odometer_reading: parseFloat(maintenanceFormData.odometer_reading) || null,
        technician_name: '',
        // Oil change specific fields
        labor_rate_mad: 0,
        parts_cost_mad: 0,
        external_cost_mad: parseFloat(maintenanceFormData.cost) || 0,
        tax_mad: 0
      };

      console.log('🔧 Maintenance data to create:', maintenanceData);
      
      const newRecord = await MaintenanceTrackingService.createMaintenanceRecord(maintenanceData);
      console.log('✅ Maintenance record created:', newRecord);
      
      // Handle oil change specific updates
      if (maintenanceFormData.type === 'oil_change' && maintenanceData.odometer_reading && maintenanceFormData.next_oil_change_odometer) {
        const vehicleUpdates = {
          last_oil_change_odometer: maintenanceData.odometer_reading,
          last_oil_change_date: maintenanceFormData.service_date,
          next_oil_change_odometer: parseFloat(maintenanceFormData.next_oil_change_odometer),
          current_odometer: maintenanceData.odometer_reading
        };

        const { error } = await supabase
          .from(TBL.VEHICLES)
          .update({
            ...vehicleUpdates,
            updated_at: new Date().toISOString()
          })
          .eq('id', vehicle.id);

        if (error) {
          console.error('Error updating vehicle odometer:', error);
        } else {
          setFormData(prev => ({
            ...prev,
            ...vehicleUpdates,
            current_odometer: vehicleUpdates.current_odometer.toString()
          }));

          alertService.createOrUpdateOilChangeAlert(
            vehicle.id.toString(),
            vehicle.name,
            vehicleUpdates.current_odometer,
            vehicleUpdates.next_oil_change_odometer
          );
        }
      }
      
      // Update vehicle status if needed
      if (['scheduled', 'in_progress'].includes(maintenanceFormData.status)) {
        await updateVehicleStatus(vehicle.id, 'maintenance');
      }

      // Reset form
      setMaintenanceFormData({
        type: 'oil_change',
        notes: '',
        cost: '',
        odometer_reading: '',
        engine_hours: '',
        service_date: new Date().toISOString().split('T')[0],
        next_service_date: '',
        status: 'scheduled',
        oil_change_interval: '500',
        next_oil_change_odometer: ''
      });

      // Reload maintenance data
      await loadVehicleMaintenanceData(vehicle.id.toString());
      await loadMaintenanceData(); // Reload all maintenance records
      
      alert('Maintenance record added successfully!');
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      alert(`Failed to add maintenance record: ${error.message}`);
    }
  };

  const handleCompleteMaintenanceRecord = async (recordId: string) => {
    try {
      console.log('🔧 Completing maintenance record:', recordId);
      
      // Find the record
      const record = maintenanceRecords.find(r => r.id === recordId);
      if (!record) {
        console.error('Record not found:', recordId);
        return;
      }

      // Update the record status
      await MaintenanceTrackingService.updateMaintenanceRecord(recordId, { 
        status: 'completed',
        completed_date: new Date().toISOString()
      });

      // Check if vehicle should be set back to available
      const vehicleMaintenanceRecords = maintenanceRecords.filter(r => 
        r.vehicle_id === record.vehicle_id && r.id !== recordId
      );
      const openRecords = vehicleMaintenanceRecords.filter(r => 
        ['scheduled', 'in_progress', 'pending'].includes(r.status)
      );

      if (openRecords.length === 0) {
        await updateVehicleStatus(record.vehicle_id, 'available');
      }

      // Reload data
      await loadVehicleMaintenanceData(record.vehicle_id.toString());
      await loadMaintenanceData();
      
      alert('Maintenance record completed!');
    } catch (error) {
      console.error('Error completing maintenance record:', error);
      alert(`Failed to complete maintenance record: ${error.message}`);
    }
  };

  const updateVehicleStatus = async (vehicleId: number, status: string) => {
    try {
      const { error } = await supabase
        .from(TBL.VEHICLES)
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', vehicleId);

      if (error) throw error;

      setVehicles(prev => prev.map(v => 
        v.id === vehicleId ? { ...v, status } : v
      ));
    } catch (error) {
      console.error('Error updating vehicle status:', error);
    }
  };

  const getOilChangeProgress = (vehicle: Vehicle) => {
    if (!vehicle.current_odometer || !vehicle.last_oil_change_odometer || !vehicle.next_oil_change_odometer) {
      return 0;
    }
    
    const current = parseFloat(vehicle.current_odometer);
    const last = parseFloat(vehicle.last_oil_change_odometer);
    const next = parseFloat(vehicle.next_oil_change_odometer);
    
    const totalInterval = next - last;
    const currentProgress = current - last;
    
    return Math.min(Math.max(currentProgress / totalInterval, 0), 1);
  };

  const isOilChangeDue = (vehicle: Vehicle) => {
    if (!vehicle.current_odometer || !vehicle.next_oil_change_odometer) return false;
    
    const current = parseFloat(vehicle.current_odometer);
    const next = parseFloat(vehicle.next_oil_change_odometer);
    
    return current >= (next - 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (submitting) {
      return;
    }
    
    setSubmitting(true);
    
    try {
      const sanitizedData = sanitizeFormData({
        ...formData,
        image_url: vehicleImageUrl || ''
      });

      if (editingVehicle) {
        const { data: updatedVehicle, error } = await supabase
          .from(TBL.VEHICLES)
          .update({
            ...sanitizedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingVehicle.id)
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to update vehicle: ${error.message}`);
        }

        if (vehicleDocuments.length > 0) {
          // In real implementation, save documents to storage and update vehicle record
        }
        
        // CRITICAL: Trigger AlertService after successful save
        if (sanitizedData.current_odometer && sanitizedData.next_oil_change_odometer) {
          alertService.createOrUpdateOilChangeAlert(
            editingVehicle.id.toString(),
            sanitizedData.name,
            sanitizedData.current_odometer,
            sanitizedData.next_oil_change_odometer
          );
        }
        
        alert('Vehicle updated successfully!');
      } else {
        const { data: newVehicle, error } = await supabase
          .from(TBL.VEHICLES)
          .insert([{
            ...sanitizedData,
            features: [],
            location_id: null,
            vehicle_model_id: vehicleModels[0]?.id || null
          }])
          .select()
          .single();

        if (error) {
          throw new Error(`Failed to create vehicle: ${error.message}`);
        }

        if (vehicleDocuments.length > 0 && newVehicle) {
          // In real implementation, save documents to storage and link to vehicle
        }
        
        // CRITICAL: Trigger AlertService after successful save
        if (newVehicle && sanitizedData.current_odometer && sanitizedData.next_oil_change_odometer) {
          alertService.createOrUpdateOilChangeAlert(
            newVehicle.id.toString(),
            sanitizedData.name,
            sanitizedData.current_odometer,
            sanitizedData.next_oil_change_odometer
          );
        }
        
        alert('Vehicle created successfully!');
      }

      resetForm();
      await fetchData();
      
    } catch (error) {
      console.error('❌ Error saving vehicle:', error);
      alert(`Failed to save vehicle: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData(getEmptyFormData());
    
    setVehicleImageUrl('');
    setVehicleDocuments([]);
    
    setShowAddForm(false);
    setEditingVehicle(null);
    setViewingVehicle(null);
    
    setVehicleMaintenanceHistory([]);
    setVehicleAlerts([]);
    
    setMaintenanceFormData({
      type: 'oil_change',
      notes: '',
      cost: '',
      odometer_reading: '',
      engine_hours: '',
      service_date: new Date().toISOString().split('T')[0],
      next_service_date: '',
      status: 'scheduled',
      oil_change_interval: '500',
      next_oil_change_odometer: ''
    });
  };

  const openAddVehicleModal = () => {
    resetForm();
    
    setFormData(getEmptyFormData());
    setVehicleImageUrl('');
    setVehicleDocuments([]);
    
    setEditingVehicle(null);
    setViewingVehicle(null);
    
    setVehicleMaintenanceHistory([]);
    setVehicleAlerts([]);
    
    setShowAddForm(true);
  };

  const handleEdit = async (vehicle: Vehicle) => {
    try {
      const { data: fullVehicle, error } = await supabase
        .from(TBL.VEHICLES)
        .select('*')
        .eq('id', vehicle.id)
        .single();
      
      if (error) {
        throw error;
      }
      
      setFormData({
        name: fullVehicle.name || '',
        model: fullVehicle.model || '',
        vehicle_type: fullVehicle.vehicle_type || 'quad',
        power_cc: fullVehicle.power_cc || 0,
        capacity: fullVehicle.capacity || 1,
        color: fullVehicle.color || '',
        plate_number: fullVehicle.plate_number || '',
        status: fullVehicle.status || 'available',
        current_odometer: fullVehicle.current_odometer?.toString() || '',
        engine_hours: fullVehicle.engine_hours?.toString() || '',
        last_oil_change_date: fullVehicle.last_oil_change_date || '',
        last_oil_change_odometer: fullVehicle.last_oil_change_odometer?.toString() || '',
        next_oil_change_due: fullVehicle.next_oil_change_due || '',
        next_oil_change_odometer: fullVehicle.next_oil_change_odometer?.toString() || '',
        registration_number: fullVehicle.registration_number || '',
        registration_expiry_date: fullVehicle.registration_expiry_date || '',
        insurance_policy_number: fullVehicle.insurance_policy_number || '',
        insurance_provider: fullVehicle.insurance_provider || '',
        insurance_expiry_date: fullVehicle.insurance_expiry_date || '',
        general_notes: fullVehicle.general_notes || '',
        notes: fullVehicle.notes || '',
        // Load acquisition fields
        purchase_cost_mad: fullVehicle.purchase_cost_mad?.toString() || '',
        purchase_date: fullVehicle.purchase_date || '',
        purchase_supplier: fullVehicle.purchase_supplier || '',
        purchase_invoice_url: fullVehicle.purchase_invoice_url || ''
      });
      
      setVehicleImageUrl(fullVehicle.image_url || '');
      setVehicleDocuments(fullVehicle.documents || []);
      setEditingVehicle(fullVehicle);
      setViewingVehicle(null);
      
      await loadVehicleMaintenanceData(fullVehicle.id.toString());
      
      setShowAddForm(true);
      
    } catch (error) {
      alert(`Failed to load vehicle details: ${error.message}`);
    }
  };

  const handleView = async (vehicle: Vehicle) => {
    try {
      const { data: fullVehicle, error } = await supabase
        .from(TBL.VEHICLES)
        .select('*')
        .eq('id', vehicle.id)
        .single();
      
      if (error) {
        throw error;
      }

      setFormData({
        name: fullVehicle.name || '',
        model: fullVehicle.model || '',
        vehicle_type: fullVehicle.vehicle_type || 'quad',
        power_cc: fullVehicle.power_cc || 0,
        capacity: fullVehicle.capacity || 1,
        color: fullVehicle.color || '',
        plate_number: fullVehicle.plate_number || '',
        status: fullVehicle.status || 'available',
        current_odometer: fullVehicle.current_odometer?.toString() || '',
        engine_hours: fullVehicle.engine_hours?.toString() || '',
        last_oil_change_date: fullVehicle.last_oil_change_date || '',
        last_oil_change_odometer: fullVehicle.last_oil_change_odometer?.toString() || '',
        next_oil_change_due: fullVehicle.next_oil_change_due || '',
        next_oil_change_odometer: fullVehicle.next_oil_change_odometer?.toString() || '',
        registration_number: fullVehicle.registration_number || '',
        registration_expiry_date: fullVehicle.registration_expiry_date || '',
        insurance_policy_number: fullVehicle.insurance_policy_number || '',
        insurance_provider: fullVehicle.insurance_provider || '',
        insurance_expiry_date: fullVehicle.insurance_expiry_date || '',
        general_notes: fullVehicle.general_notes || '',
        notes: fullVehicle.notes || '',
        // Load acquisition fields
        purchase_cost_mad: fullVehicle.purchase_cost_mad?.toString() || '',
        purchase_date: fullVehicle.purchase_date || '',
        purchase_supplier: fullVehicle.purchase_supplier || '',
        purchase_invoice_url: fullVehicle.purchase_invoice_url || ''
      });
      
      setVehicleImageUrl(fullVehicle.image_url || '');
      setVehicleDocuments(fullVehicle.documents || []);
      setViewingVehicle(fullVehicle);
      setEditingVehicle(null);
      
      await loadVehicleMaintenanceData(fullVehicle.id.toString());
      
      setShowAddForm(true);
      
    } catch (error) {
      alert(`Failed to load vehicle details: ${error.message}`);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this vehicle?')) {
      try {
        const { error } = await supabase
          .from(TBL.VEHICLES)
          .delete()
          .eq('id', id);

        if (error) throw error;
        fetchData();
      } catch (error) {
        console.error('Error deleting vehicle:', error);
      }
    }
  };

  const handleDeleteModel = async (model: VehicleModel) => {
    const vehicleCount = model.vehicles?.[0]?.count || 0;
    
    let confirmMessage = `Are you sure you want to delete the vehicle model "${model.name}"?`;
    
    if (vehicleCount > 0) {
      confirmMessage += `\n\nWarning: This model is currently used by ${vehicleCount} vehicle(s). Deletion will be blocked if vehicles are still referencing this model.`;
    }
    
    confirmMessage += '\n\nThis action cannot be undone.';

    if (window.confirm(confirmMessage)) {
      setDeletingModelId(model.id);
      try {
        await VehicleModelService.deleteVehicleModel(model.id);
        
        alert(`Vehicle model "${model.name}" has been deleted successfully.`);
        
        await fetchData();
      } catch (error) {
        console.error('Error deleting model:', error);
        alert(error.message || 'Failed to delete vehicle model.');
      } finally {
        setDeletingModelId(null);
      }
    }
  };

  const handleEditModel = (model: VehicleModel) => {
    setEditingVehicleModel(model);
    setShowEditModelModal(true);
    setModelEditError('');
  };

  const handleModelEditSave = async (updatedModel: VehicleModel) => {
    try {
      await fetchData();
      
      alert(`Vehicle model "${updatedModel.name}" has been updated successfully.`);
    } catch (error) {
      console.error('Error after model update:', error);
    }
  };

  const handleModelEditError = (error: string) => {
    setModelEditError(error);
    alert(`Error updating vehicle model: ${error}`);
  };

  const closeEditModal = () => {
    setShowEditModelModal(false);
    setEditingVehicleModel(null);
    setModelEditError('');
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setModelFormError('');
    
    try {
      if (!modelFormData.name.trim()) {
        throw new Error('Model name is required');
      }
      if (!modelFormData.model.trim()) {
        throw new Error('Model identifier is required');
      }

      await VehicleModelService.createVehicleModel({
        name: modelFormData.name.trim(),
        model: modelFormData.model.trim(),
        vehicle_type: modelFormData.vehicle_type,
        description: modelFormData.description.trim(),
        power_cc_min: 0,
        power_cc_max: 0,
        capacity_min: 1,
        capacity_max: 1,
        features: []
      });

      setModelFormData({
        name: '',
        model: '',
        vehicle_type: 'quad',
        description: ''
      });
      setShowAddModelForm(false);
      await fetchData();
      
      alert('Vehicle model added successfully!');
    } catch (error) {
      console.error('Error adding model:', error);
      setModelFormError(error.message || 'Failed to create vehicle model');
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    try {
      const updatedDocuments = vehicleDocuments.filter(doc => doc.id !== documentId);
      setVehicleDocuments(updatedDocuments);
      
      if (viewingVehicle) {
        setViewingVehicle({
          ...viewingVehicle,
          documents: updatedDocuments
        });
        
        await refreshVehicleDocumentCount(viewingVehicle.id);
      }
      
      if (editingVehicle) {
        setEditingVehicle({
          ...editingVehicle,
          documents: updatedDocuments
        });
        
        await refreshVehicleDocumentCount(editingVehicle.id);
      }
      
    } catch (error) {
      console.error('Error handling document deletion in parent:', error);
      throw error;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'rented': return 'bg-blue-100 text-blue-800';
      case 'maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'out_of_service': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isMaintenanceDue = (vehicle: Vehicle) => {
    if (isOilChangeDue(vehicle)) return true;
    
    if (!vehicle.next_oil_change_due) return false;
    const dueDate = new Date(vehicle.next_oil_change_due);
    const today = new Date();
    const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilDue <= 30;
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.plate_number.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    const matchesType = typeFilter === 'all' || vehicle.vehicle_type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Management</h1>
          <p className="text-gray-600">Manage your fleet of vehicles, models, and fuel logs</p>
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

  const isNewVehicle = !viewingVehicle && !editingVehicle;
  const loadFromStorageValue = !isNewVehicle;
  
  console.log('🔍 VehicleManagement Debug:', {
    isNewVehicle,
    loadFromStorageValue,
    viewingVehicle: !!viewingVehicle,
    editingVehicle: !!editingVehicle,
    vehicleDocumentsLength: vehicleDocuments.length
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Vehicle Management</h1>
        <p className="text-gray-600">Manage your fleet of vehicles, models, fuel logs, and maintenance records</p>
      </div>

      {showSegwayCleanup && activeTab === 'models' && (
        <SegwayCleanupRunner onComplete={fetchData} />
      )}

      {showMigration && activeTab === 'models' && !showSegwayCleanup && (
        <VehicleModelMigrationRunner onComplete={fetchData} />
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('vehicles')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'vehicles'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Car className="inline-block w-4 h-4 mr-2" />
            Vehicles ({vehicles.length})
          </button>
          <button
            onClick={() => setActiveTab('models')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'models'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Vehicle Models ({vehicleModels.length})
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'fuel'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Fuel className="inline-block w-4 h-4 mr-2" />
            Fuel Logs ({fuelLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('maintenance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'maintenance'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Wrench className="inline-block w-4 h-4 mr-2" />
            Maintenance Records ({maintenanceRecords.length})
          </button>
        </nav>
      </div>

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <>
          {/* Controls */}
          <div className="mb-6 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search vehicles..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex gap-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
                
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Types</option>
                  <option value="quad">Quad</option>
                  <option value="ATV">ATV</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-gray-300 p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}
                  title="List View"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
              <button
                onClick={openAddVehicleModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Vehicle
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <VehicleGridView
              vehicles={filteredVehicles}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getStatusColor={getStatusColor}
              isMaintenanceDue={isMaintenanceDue}
              getOilChangeProgress={getOilChangeProgress}
              isOilChangeDue={isOilChangeDue}
            />
          ) : (
            <VehicleListView
              vehicles={filteredVehicles}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              getStatusColor={getStatusColor}
            />
          )}

          {filteredVehicles.length === 0 && (
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No vehicles found matching your criteria</p>
            </div>
          )}
        </>
      )}

      {/* Vehicle Models Tab */}
      {activeTab === 'models' && (
        <>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Vehicle Models</h2>
            <button
              onClick={() => setShowAddModelForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Model
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicleModels.map((model) => (
              <div key={model.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditModel(model)}
                      className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                      title="Edit Model"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteModel(model)}
                      disabled={deletingModelId === model.id}
                      className={`p-1 transition-colors ${
                        deletingModelId === model.id
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-red-600 hover:text-red-900'
                      }`}
                      title={deletingModelId === model.id ? 'Deleting...' : 'Delete Model'}
                    >
                      {deletingModelId === model.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mb-4">{model.description || 'No description available'}</p>
                
                <div className="grid grid-cols-2 gap-2 text-sm text-gray-500">
                  <div>Model: {model.model}</div>
                  <div>Type: {model.vehicle_type}</div>
                  <div>Power: {model.power_cc_min}-{model.power_cc_max}cc</div>
                  <div>Capacity: {model.capacity_min}-{model.capacity_max}</div>
                  <div>Active Vehicles: {model.vehicles?.[0]?.count || 0}</div>
                  <div>Status: {model.is_active ? 'Active' : 'Inactive'}</div>
                </div>
                
                {model.features && model.features.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-medium text-gray-700 mb-1">Features:</p>
                    <div className="flex flex-wrap gap-1">
                      {model.features.map((feature, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {vehicleModels.length === 0 && (
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No vehicle models found</p>
            </div>
          )}
        </>
      )}

      {/* FIXED: Fuel Logs Tab - Now using FuelTransactionService */}
      {activeTab === 'fuel' && (
        <>
          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Station</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fuel Type</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fuelLogs.map((log) => {
                    // Get vehicle info from the relation or fallback to vehicles array
                    const vehicleInfo = log.saharax_0u4w4d_vehicles || 
                      vehicles.find(v => v.id === log.vehicle_id);
                    
                    return (
                      <tr key={log.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(log.transaction_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.transaction_type === 'tank_refill' ? '—' : 
                           vehicleInfo ? `${vehicleInfo.name} (${vehicleInfo.plate_number})` : 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="capitalize">
                            {log.transaction_type === 'tank_refill' ? 'Tank Refill' :
                             log.transaction_type === 'vehicle_refill' ? 'Vehicle Refill' :
                             log.transaction_type === 'withdrawal' ? 'Withdrawal' : log.transaction_type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.amount}L
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {log.cost > 0 ? `${log.cost.toFixed(2)} MAD` : '—'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.fuel_station || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {log.fuel_type || 'Gasoline'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {fuelLogs.length === 0 && (
              <div className="text-center py-12">
                <Fuel className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No fuel logs found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* FIXED: Maintenance Records Tab with Total Cost Column */}
      {activeTab === 'maintenance' && (
        <>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">Maintenance Records</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setShowMaintenanceModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Maintenance
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Odometer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {maintenanceRecords.map((record) => {
                    const vehicle = vehicles.find(v => v.id === record.vehicle_id);
                    return (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.service_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {vehicle ? `${vehicle.name} (${vehicle.plate_number})` : `Vehicle ID: ${record.vehicle_id}`}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="capitalize">{record.maintenance_type}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            record.status === 'completed' ? 'bg-green-100 text-green-800' :
                            record.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            record.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.odometer_reading ? `${record.odometer_reading} km` : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="text-green-600">
                              {record.cost ? `${record.cost.toFixed(2)} MAD` : '0.00 MAD'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                console.log('🔧 CRITICAL DEBUG: Setting editingMaintenanceRecord to:', record);
                                setEditingMaintenanceRecord(record);
                                setShowMaintenanceModal(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 transition-colors"
                              title="Edit Record"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            {record.status !== 'completed' && (
                              <button
                                onClick={() => handleCompleteMaintenanceRecord(record.id)}
                                className="text-green-600 hover:text-green-900 transition-colors"
                                title="Mark as Completed"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {maintenanceRecords.length === 0 && (
              <div className="text-center py-12">
                <Wrench className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">No maintenance records found</p>
                <p className="text-sm text-gray-400">Add maintenance records by editing vehicles or clicking "Add Maintenance"</p>
              </div>
            )}
          </div>

          {/* Maintenance Summary */}
          {maintenanceRecords.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-600" />
                  <h3 className="text-sm font-medium text-gray-700">Total Records</h3>
                </div>
                <p className="text-2xl font-bold text-blue-600 mt-2">{maintenanceRecords.length}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-medium text-gray-700">Completed</h3>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {maintenanceRecords.filter(r => r.status === 'completed').length}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-600" />
                  <h3 className="text-sm font-medium text-gray-700">Pending</h3>
                </div>
                <p className="text-2xl font-bold text-yellow-600 mt-2">
                  {maintenanceRecords.filter(r => ['scheduled', 'in_progress'].includes(r.status)).length}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-sm font-medium text-gray-700">Total Cost</h3>
                </div>
                <p className="text-2xl font-bold text-green-600 mt-2">
                  {maintenanceRecords.reduce((sum, r) => sum + (r.cost || 0), 0).toFixed(2)} MAD
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Vehicle Model Edit Modal */}
      <VehicleModelEditModal
        vehicleModel={editingVehicleModel}
        isOpen={showEditModelModal}
        onClose={closeEditModal}
        onSave={handleModelEditSave}
        onError={handleModelEditError}
      />

      {/* CRITICAL FIX: Maintenance Form Modal - Fixed prop name from 'record' to 'maintenance' */}
      <MaintenanceFormModal
        maintenance={editingMaintenanceRecord}
        isOpen={showMaintenanceModal}
        onClose={() => {
          console.log('🔧 CRITICAL DEBUG: Closing maintenance modal, clearing editingMaintenanceRecord');
          setShowMaintenanceModal(false);
          setEditingMaintenanceRecord(null);
        }}
        vehicles={vehicles}
        onSave={async () => {
          console.log('🔧 CRITICAL DEBUG: Maintenance saved, refreshing records');
          await loadMaintenanceData(); // Reload from database
          setShowMaintenanceModal(false);
          setEditingMaintenanceRecord(null);
        }}
      />

      {/* Vehicle Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Car className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {viewingVehicle ? 'Vehicle Details' : editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle'}
                  </h2>
                  <p className="text-sm text-gray-600">
                    {viewingVehicle ? 'View comprehensive vehicle information' : 'Create a new vehicle with comprehensive fleet management'}
                  </p>
                </div>
              </div>
              <button
                onClick={resetForm}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Information Section */}
              <div className="bg-blue-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-semibold text-blue-900">Basic Information</h3>
                  <span className="text-red-500">*</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="e.g., ATV-001, Raptor-Blue"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Model <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({...formData, model: e.target.value})}
                      placeholder="e.g., Yamaha Raptor 700, Honda TRX450R"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.vehicle_type}
                      onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                      required
                    >
                      <option value="quad">Quad</option>
                      <option value="ATV">ATV</option>
                      <option value="motorcycle">Motorcycle</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Engine Power (CC)</label>
                    <input
                      type="number"
                      value={formData.power_cc}
                      onChange={(e) => setFormData({...formData, power_cc: parseInt(e.target.value) || 0})}
                      placeholder="e.g., 700, 450, 1000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                      min="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Seating Capacity</label>
                    <input
                      type="number"
                      value={formData.capacity}
                      onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 1})}
                      placeholder="1, 2, 4, etc."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                      min="1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                    <input
                      type="text"
                      value={formData.color}
                      onChange={(e) => setFormData({...formData, color: e.target.value})}
                      placeholder="e.g., Red, Blue, Black, Camo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Plate Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.plate_number}
                      onChange={(e) => setFormData({...formData, plate_number: e.target.value})}
                      placeholder="e.g., ABC-123, XYZ-456"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    >
                      <option value="available">Available</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="rented">Rented</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="out_of_service">Out of Service</option>
                    </select>
                  </div>
                </div>

                {/* Insurance fields inline */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Policy Number</label>
                    <input
                      type="text"
                      value={formData.insurance_policy_number}
                      onChange={(e) => setFormData({...formData, insurance_policy_number: e.target.value})}
                      placeholder="e.g., POL-2025-001"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                    <input
                      type="text"
                      value={formData.insurance_provider}
                      onChange={(e) => setFormData({...formData, insurance_provider: e.target.value})}
                      placeholder="e.g., Wafa Assurance"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Expiry Date</label>
                    <input
                      type="date"
                      value={formData.insurance_expiry_date}
                      onChange={(e) => setFormData({...formData, insurance_expiry_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                </div>

                {/* Registration fields inline */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number</label>
                    <input
                      type="text"
                      value={formData.registration_number}
                      onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                      placeholder="e.g., REG-001-2025"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Registration Expiry Date</label>
                    <input
                      type="date"
                      value={formData.registration_expiry_date}
                      onChange={(e) => setFormData({...formData, registration_expiry_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                </div>
              </div>

              {/* Fleet Information Section - WITH NEW FIELDS */}
              <div className="bg-orange-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Gauge className="w-5 h-5 text-orange-600" />
                  <h3 className="text-lg font-semibold text-orange-900">Fleet Information</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Current Odometer (km)
                    </label>
                    <input
                      type="number"
                      value={formData.current_odometer}
                      onChange={(e) => setFormData({...formData, current_odometer: e.target.value})}
                      placeholder="e.g., 15000"
                      className="w-full p-2 border rounded-md"
                      disabled={!!viewingVehicle}
                      min="0"
                      step="0.1"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Engine Hours
                    </label>
                    <input
                      type="number"
                      value={formData.engine_hours}
                      onChange={(e) => setFormData({...formData, engine_hours: e.target.value})}
                      placeholder="e.g., 250.5"
                      className="w-full p-2 border rounded-md"
                      disabled={!!viewingVehicle}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Last Oil Change Date
                    </label>
                    <input
                      type="date"
                      value={formData.last_oil_change_date}
                      onChange={(e) => setFormData({...formData, last_oil_change_date: e.target.value})}
                      className="w-full p-2 border rounded-md"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Last Oil Change Odometer (km)
                    </label>
                    <input
                      type="number"
                      value={formData.last_oil_change_odometer}
                      onChange={(e) => setFormData({...formData, last_oil_change_odometer: e.target.value})}
                      placeholder="e.g., 14500"
                      className="w-full p-2 border rounded-md"
                      disabled={!!viewingVehicle}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>

                {/* NEW FIELDS: Next Oil Change Planning */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Next Oil Change Date
                    </label>
                    <input
                      type="date"
                      value={formData.next_oil_change_due}
                      onChange={(e) => setFormData({...formData, next_oil_change_due: e.target.value})}
                      className="w-full p-2 border rounded-md"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />
                      Next Oil Change Odometer (km)
                    </label>
                    <input
                      type="number"
                      value={formData.next_oil_change_odometer}
                      onChange={(e) => setFormData({...formData, next_oil_change_odometer: e.target.value})}
                      placeholder="e.g., 15000"
                      className="w-full p-2 border rounded-md"
                      disabled={!!viewingVehicle}
                      min="0"
                      step="0.1"
                    />
                  </div>
                </div>
              </div>

              {/* Acquisition Information */}
              <div className="bg-green-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <h3 className="text-lg font-semibold text-green-900">Acquisition</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost (MAD)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.purchase_cost_mad}
                      onChange={(e) => setFormData({...formData, purchase_cost_mad: e.target.value})}
                      placeholder="e.g., 45000.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                    <input
                      type="date"
                      value={formData.purchase_date}
                      onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / Seller</label>
                    <input
                      type="text"
                      value={formData.purchase_supplier}
                      onChange={(e) => setFormData({...formData, purchase_supplier: e.target.value})}
                      placeholder="e.g., Segway Morocco"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice/Receipt URL</label>
                    <input
                      type="url"
                      value={formData.purchase_invoice_url}
                      onChange={(e) => setFormData({...formData, purchase_invoice_url: e.target.value})}
                      placeholder="https://example.com/invoice.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Image Section - NOW USING NEW COMPONENT */}
              <div className="bg-purple-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <ImageIcon className="w-5 h-5 text-purple-600" />
                  <h3 className="text-lg font-semibold text-purple-900">Vehicle Image</h3>
                </div>
                
                <VehicleImageUpload
                  vehicleId={editingVehicle?.id?.toString() || viewingVehicle?.id?.toString() || 'new'}
                  currentImageUrl={vehicleImageUrl}
                  onImageChange={setVehicleImageUrl}
                  disabled={!!viewingVehicle}
                  className="w-full"
                />
              </div>

              {/* Legal & Administrative Documents Section */}
              <div className="bg-indigo-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <File className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-lg font-semibold text-indigo-900">Documents (Legal & Administrative)</h3>
                  {vehicleDocuments.length > 0 && (
                    <span className="bg-indigo-100 text-indigo-800 text-xs font-medium px-2 py-1 rounded-full">
                      {vehicleDocuments.length}
                    </span>
                  )}
                </div>
                
                <VehicleDocuments
                  key={`vehicle-docs-${isNewVehicle ? 'new' : (viewingVehicle?.id || editingVehicle?.id)}`}
                  vehicleId={(viewingVehicle?.id || editingVehicle?.id || null)?.toString()}
                  documents={vehicleDocuments}
                  onDeleteDocument={handleDeleteDocument}
                  canDelete={true}
                  loadFromStorage={loadFromStorageValue}
                  className="w-full"
                />
                
                {!viewingVehicle && (
                  <div className="mt-4">
                    <DocumentUpload
                      vehicleId={editingVehicle?.id?.toString() || null}
                      documents={vehicleDocuments}
                      onDocumentsChange={setVehicleDocuments}
                      disabled={!!viewingVehicle}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {/* Additional Notes Section */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <StickyNote className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Additional Notes</h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
                    <textarea
                      value={formData.general_notes}
                      onChange={(e) => setFormData({...formData, general_notes: e.target.value})}
                      rows={4}
                      placeholder="Any additional notes about this vehicle, special instructions, known issues, modifications, etc..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">System Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      rows={4}
                      placeholder="Internal notes for staff, booking system notes, etc..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-transparent resize-none"
                      disabled={!!viewingVehicle}
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                {!viewingVehicle && (
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
                        {editingVehicle ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4" />
                        {editingVehicle ? 'Update Vehicle' : 'Create Vehicle'}
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {showAddModelForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Vehicle Model</h2>
              
              {modelFormError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{modelFormError}</p>
                </div>
              )}
              
              <form onSubmit={handleAddModel} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Name *</label>
                  <input
                    type="text"
                    value={modelFormData.name}
                    onChange={(e) => setModelFormData({...modelFormData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Segway AT6"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Identifier *</label>
                  <input
                    type="text"
                    value={modelFormData.model}
                    onChange={(e) => setModelFormData({...modelFormData, model: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., AT6"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Type</label>
                  <select
                    value={modelFormData.vehicle_type}
                    onChange={(e) => setModelFormData({...modelFormData, vehicle_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="quad">Quad</option>
                    <option value="ATV">ATV</option>
                    <option value="motorcycle">Motorcycle</option>
                    <option value="scooter">Scooter</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={modelFormData.description}
                    onChange={(e) => setModelFormData({...modelFormData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Optional description of the vehicle model"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModelForm(false);
                      setModelFormError('');
                      setModelFormData({
                        name: '',
                        model: '',
                        vehicle_type: 'quad',
                        description: ''
                      });
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                  >
                    Add Model
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VehicleManagement;