import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Plus, X, Car, FileText, Shield, DollarSign, Calendar, 
  Building, Link, Image as ImageIcon, StickyNote, AlertCircle,
  CloudUpload, Download, Eye, Trash2
} from 'lucide-react';
import VehicleImageService from '../services/VehicleImageService';
import DocumentService from '../services/DocumentService';
import toast from 'react-hot-toast';

interface VehicleFormCompleteProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingVehicle?: any;
}

const VehicleFormComplete: React.FC<VehicleFormCompleteProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingVehicle
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    model: '',
    vehicle_type: 'quad',
    power_cc: 0,
    capacity: 1,
    color: '',
    plate_number: '',
    status: 'available',
    
    // 🔥 PURCHASE COST FIELDS - BRIGHT YELLOW SECTION
    purchase_cost: '',
    purchase_date: '',
    supplier: '',
    invoice_url: '',
    
    // 🔥 INSURANCE & REGISTRATION FIELDS - BRIGHT GREEN SECTION  
    insurance_expiry_date: '',
    registration_expiry_date: '',
    insurance_policy_number: '',
    registration_number: '',
    
    // Maintenance
    current_odometer: '',
    engine_hours: '',
    last_oil_change_date: '',
    last_oil_change_odometer: '',
    
    // Notes
    general_notes: '',
    notes: '',
    
    // Image
    image_url: ''
  });

  // Vehicle Images State
  const [vehicleImages, setVehicleImages] = useState([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Documents State
  const [documents, setDocuments] = useState([]);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [docDragCounter, setDocDragCounter] = useState(0);
  const [isDocDragOver, setIsDocDragOver] = useState(false);

  useEffect(() => {
    if (editingVehicle) {
      setFormData({
        name: editingVehicle.name || '',
        model: editingVehicle.model || '',
        vehicle_type: editingVehicle.vehicle_type || 'quad',
        power_cc: editingVehicle.power_cc || 0,
        capacity: editingVehicle.capacity || 1,
        color: editingVehicle.color || '',
        plate_number: editingVehicle.plate_number || '',
        status: editingVehicle.status || 'available',
        purchase_cost: editingVehicle.purchase_cost?.toString() || '',
        purchase_date: editingVehicle.purchase_date || '',
        supplier: editingVehicle.supplier || '',
        invoice_url: editingVehicle.invoice_url || '',
        insurance_expiry_date: editingVehicle.insurance_expiry_date || '',
        registration_expiry_date: editingVehicle.registration_expiry_date || '',
        insurance_policy_number: editingVehicle.insurance_policy_number || '',
        registration_number: editingVehicle.registration_number || '',
        current_odometer: editingVehicle.current_odometer?.toString() || '',
        engine_hours: editingVehicle.engine_hours?.toString() || '',
        last_oil_change_date: editingVehicle.last_oil_change_date || '',
        last_oil_change_odometer: editingVehicle.last_oil_change_odometer?.toString() || '',
        general_notes: editingVehicle.general_notes || '',
        notes: editingVehicle.notes || '',
        image_url: editingVehicle.image_url || ''
      });

      // Load existing images and documents
      loadVehicleImages(editingVehicle.id);
      loadVehicleDocuments(editingVehicle.id);
    }
  }, [editingVehicle]);

  // FIXED: Apply Documents pattern to Vehicle Images
  const loadVehicleImages = async (vehicleId) => {
    try {
      console.log(`🔍 Loading images for vehicle: ${vehicleId}`);
      // Use same pattern as Documents: expect {success: true, data: []} wrapper
      const result = await DocumentService.getVehicleDocuments(vehicleId);
      if (result.success) {
        // Filter only image files from documents
        const imageFiles = result.data.filter(doc => 
          doc.type && doc.type.startsWith('image/')
        );
        console.log(`📊 Loaded ${imageFiles.length} images:`, imageFiles);
        setVehicleImages(imageFiles);
      } else {
        console.log('📊 No images found or failed to load');
        setVehicleImages([]);
      }
    } catch (error) {
      console.error('❌ Error loading vehicle images:', error);
      toast.error('Failed to load vehicle images');
      setVehicleImages([]);
    }
  };

  const loadVehicleDocuments = async (vehicleId) => {
    try {
      const result = await DocumentService.getVehicleDocuments(vehicleId);
      if (result.success) {
        // Filter only non-image files for documents section
        const documentFiles = result.data.filter(doc => 
          !doc.type || !doc.type.startsWith('image/')
        );
        setDocuments(documentFiles);
      }
    } catch (error) {
      console.error('Error loading vehicle documents:', error);
    }
  };

  // FIXED: Apply Documents pattern to Image Upload
  const handleImageUpload = async (files) => {
    if (!editingVehicle?.id) {
      toast.error('Please save the vehicle first before uploading images');
      return;
    }

    setUploadingImages(true);
    try {
      for (const file of files) {
        if (file.type.startsWith('image/')) {
          console.log(`📤 Uploading image: ${file.name} for vehicle: ${editingVehicle.id}`);
          
          // Use same pattern as Documents: expect {success: true} wrapper
          const result = await DocumentService.uploadVehicleDocument(editingVehicle.id, file);
          if (result.success) {
            toast.success(`Image ${file.name} uploaded successfully`);
          } else {
            toast.error(`Failed to upload ${file.name}: ${result.error}`);
          }
        }
      }
      // Reload images after successful upload
      await loadVehicleImages(editingVehicle.id);
    } catch (error) {
      console.error('❌ Error uploading images:', error);
      toast.error(`Error uploading images: ${error.message}`);
    } finally {
      setUploadingImages(false);
    }
  };

  // FIXED: Apply Documents pattern to Image Delete
  const handleImageDelete = async (documentId) => {
    try {
      console.log(`🗑️ Deleting image: ${documentId}`);
      // Use same pattern as Documents: expect {success: true} wrapper
      const result = await DocumentService.deleteVehicleDocument(documentId);
      if (result.success) {
        toast.success('Image deleted successfully');
        await loadVehicleImages(editingVehicle.id);
      } else {
        toast.error(`Failed to delete image: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error deleting image:', error);
      toast.error(`Failed to delete image: ${error.message}`);
    }
  };

  // Image Drag and Drop Handlers
  const handleImageDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    setIsDragOver(true);
  };

  const handleImageDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDragOver(false);
      }
      return newCount;
    });
  };

  const handleImageDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(0);
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') && file.size <= 5 * 1024 * 1024
    );

    if (files.length > 0) {
      console.log(`📁 Dropped ${files.length} image files`);
      handleImageUpload(files);
    } else {
      toast.error('Please drop valid image files (max 5MB each)');
    }
  };

  // Document Upload Handlers
  const handleDocumentUpload = async (files) => {
    if (!editingVehicle?.id) {
      toast.error('Please save the vehicle first before uploading documents');
      return;
    }

    setUploadingDocuments(true);
    try {
      for (const file of files) {
        const result = await DocumentService.uploadVehicleDocument(editingVehicle.id, file);
        if (result.success) {
          toast.success(`Document ${file.name} uploaded successfully`);
        } else {
          toast.error(`Failed to upload ${file.name}: ${result.error}`);
        }
      }
      await loadVehicleDocuments(editingVehicle.id);
    } catch (error) {
      console.error('Error uploading documents:', error);
      toast.error('Error uploading documents');
    } finally {
      setUploadingDocuments(false);
    }
  };

  const handleDocumentDelete = async (documentId) => {
    try {
      const result = await DocumentService.deleteVehicleDocument(documentId);
      if (result.success) {
        toast.success('Document deleted successfully');
        await loadVehicleDocuments(editingVehicle.id);
      } else {
        toast.error(`Failed to delete document: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Error deleting document');
    }
  };

  // Document Drag and Drop Handlers
  const handleDocumentDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDragCounter(prev => prev + 1);
    setIsDocDragOver(true);
  };

  const handleDocumentDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDragCounter(prev => {
      const newCount = prev - 1;
      if (newCount === 0) {
        setIsDocDragOver(false);
      }
      return newCount;
    });
  };

  const handleDocumentDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDocumentDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDocDragCounter(0);
    setIsDocDragOver(false);

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.size <= 10 * 1024 * 1024
    );

    if (files.length > 0) {
      handleDocumentUpload(files);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const vehicleData = {
        name: formData.name,
        model: formData.model,
        vehicle_type: formData.vehicle_type,
        power_cc: parseInt(formData.power_cc.toString()) || 0,
        capacity: parseInt(formData.capacity.toString()) || 1,
        color: formData.color,
        plate_number: formData.plate_number,
        status: formData.status,
        purchase_cost: parseFloat(formData.purchase_cost) || null,
        purchase_date: formData.purchase_date || null,
        supplier: formData.supplier || null,
        invoice_url: formData.invoice_url || null,
        insurance_expiry_date: formData.insurance_expiry_date || null,
        registration_expiry_date: formData.registration_expiry_date || null,
        insurance_policy_number: formData.insurance_policy_number || null,
        registration_number: formData.registration_number || null,
        current_odometer: parseFloat(formData.current_odometer) || null,
        engine_hours: parseFloat(formData.engine_hours) || null,
        last_oil_change_date: formData.last_oil_change_date || null,
        last_oil_change_odometer: parseFloat(formData.last_oil_change_odometer) || null,
        general_notes: formData.general_notes || null,
        notes: formData.notes || null,
        image_url: formData.image_url || null,
        features: [],
        location_id: null,
        vehicle_model_id: null,
        updated_at: new Date().toISOString()
      };

      let result;
      if (editingVehicle) {
        result = await supabase
          .from('saharax_0u4w4d_vehicles')
          .update(vehicleData)
          .eq('id', editingVehicle.id)
          .select()
          .single();
      } else {
        result = await supabase
          .from('saharax_0u4w4d_vehicles')
          .insert([vehicleData])
          .select()
          .single();
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      toast.success(`✅ Vehicle ${editingVehicle ? 'updated' : 'created'} successfully!`);
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast.error(`❌ Error saving vehicle: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-screen overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-purple-600">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg">
              <Car className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">
                {editingVehicle ? 'Edit Vehicle' : 'Create New Vehicle'}
              </h2>
              <p className="text-blue-100">
                Comprehensive fleet management with drag-and-drop uploads
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Basic Information */}
          <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-blue-900">Basic Information</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g., SEGWAY 1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  value={formData.model}
                  onChange={(e) => setFormData({...formData, model: e.target.value})}
                  placeholder="e.g., AT5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vehicle Type *
                </label>
                <select
                  value={formData.vehicle_type}
                  onChange={(e) => setFormData({...formData, vehicle_type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="quad">Quad</option>
                  <option value="ATV">ATV</option>
                  <option value="motorcycle">Motorcycle</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Engine Power (CC)
                </label>
                <input
                  type="number"
                  value={formData.power_cc}
                  onChange={(e) => setFormData({...formData, power_cc: parseInt(e.target.value) || 0})}
                  placeholder="e.g., 500"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Seating Capacity
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({...formData, capacity: parseInt(e.target.value) || 1})}
                  placeholder="e.g., 6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({...formData, color: e.target.value})}
                  placeholder="e.g., red"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Plate Number *
                </label>
                <input
                  type="text"
                  value={formData.plate_number}
                  onChange={(e) => setFormData({...formData, plate_number: e.target.value})}
                  placeholder="e.g., 41180"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">Available</option>
                  <option value="rented">Rented</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="out_of_service">Out of Service</option>
                </select>
              </div>
            </div>
          </div>

          {/* Insurance & Registration */}
          <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-green-600" />
              <h3 className="text-xl font-bold text-green-900">Insurance & Registration</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Policy Number
                </label>
                <input
                  type="text"
                  value={formData.insurance_policy_number}
                  onChange={(e) => setFormData({...formData, insurance_policy_number: e.target.value})}
                  placeholder="e.g., EZREZAE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Provider
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="e.g., ZAE"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Insurance Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.insurance_expiry_date}
                  onChange={(e) => setFormData({...formData, insurance_expiry_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Number
                </label>
                <input
                  type="text"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({...formData, registration_number: e.target.value})}
                  placeholder="e.g., REG-001-2025"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Registration Expiry Date
                </label>
                <input
                  type="date"
                  value={formData.registration_expiry_date}
                  onChange={(e) => setFormData({...formData, registration_expiry_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Acquisition */}
          <div className="bg-yellow-50 rounded-lg p-6 border-2 border-yellow-200">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-yellow-600" />
              <h3 className="text-xl font-bold text-yellow-900">Acquisition</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Cost (MAD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.purchase_cost}
                  onChange={(e) => setFormData({...formData, purchase_cost: e.target.value})}
                  placeholder="e.g., 45000.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purchase Date
                </label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Supplier / Seller
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  placeholder="e.g., Segway Morocco"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice/Receipt URL
                </label>
                <input
                  type="url"
                  value={formData.invoice_url}
                  onChange={(e) => setFormData({...formData, invoice_url: e.target.value})}
                  placeholder="https://example.com/invoice.pdf"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>
          </div>

          {/* Maintenance & Odometer */}
          <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
            <h3 className="text-xl font-bold text-purple-900 mb-4">Maintenance & Odometer</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Odometer (km)
                </label>
                <input
                  type="number"
                  value={formData.current_odometer}
                  onChange={(e) => setFormData({...formData, current_odometer: e.target.value})}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Engine Hours</label>
                <input
                  type="number"
                  value={formData.engine_hours}
                  onChange={(e) => setFormData({...formData, engine_hours: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Oil Change Date
                </label>
                <input
                  type="date"
                  value={formData.last_oil_change_date}
                  onChange={(e) => setFormData({...formData, last_oil_change_date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Oil Change Odometer (km)
                </label>
                <input
                  type="number"
                  value={formData.last_oil_change_odometer}
                  onChange={(e) => setFormData({...formData, last_oil_change_odometer: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Images - FIXED: Now uses Documents backend pattern */}
          <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
            <div className="flex items-center gap-2 mb-4">
              <ImageIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-xl font-bold text-blue-900">Vehicle Images</h3>
              {editingVehicle?.id && (
                <span className="text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
                  Vehicle ID: {editingVehicle.id}
                </span>
              )}
            </div>

            {/* Drag and Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
                isDragOver
                  ? 'border-blue-500 bg-blue-100 scale-105'
                  : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50'
              }`}
              onDragEnter={handleImageDragEnter}
              onDragLeave={handleImageDragLeave}
              onDragOver={handleImageDragOver}
              onDrop={handleImageDrop}
            >
              <div className="flex flex-col items-center space-y-4">
                <CloudUpload 
                  className={`w-16 h-16 transition-colors duration-200 ${
                    isDragOver ? 'text-blue-500' : 'text-gray-400'
                  }`} 
                />
                <div>
                  <p className={`text-lg font-medium transition-colors duration-200 ${
                    isDragOver ? 'text-blue-700' : 'text-gray-700'
                  }`}>
                    {isDragOver ? 'Drop images here!' : 'Drag & drop vehicle images'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or click the button below to browse files
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Supported: JPG, PNG, GIF, WebP (max 5MB each)
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      handleImageUpload(files);
                    }
                  }}
                  className="hidden"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer transition-colors"
                >
                  {uploadingImages ? 'Uploading...' : 'Choose Images'}
                </label>
              </div>
            </div>

            {/* Upload Status */}
            {uploadingImages && (
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-blue-800 font-medium">Uploading images...</span>
                </div>
              </div>
            )}

            {/* Uploaded Images Grid - FIXED: Now uses Documents data structure */}
            {vehicleImages.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Vehicle Media ({vehicleImages.length})
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {vehicleImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                        <img
                          src={image.url}
                          alt={image.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.error('Image load error:', image.url);
                            e.currentTarget.src = '/api/placeholder/200/200';
                          }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 flex space-x-2">
                          <button
                            onClick={() => window.open(image.url, '_blank')}
                            className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = image.url;
                              link.download = image.name;
                              link.click();
                            }}
                            className="p-2 bg-white rounded-full hover:bg-gray-100 transition-colors"
                            title="Download"
                          >
                            <Download className="w-4 h-4 text-gray-700" />
                          </button>
                          <button
                            onClick={() => handleImageDelete(image.id)}
                            className="p-2 bg-white rounded-full hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        </div>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 truncate">{image.name}</p>
                        <p className="text-xs text-gray-500">
                          {(image.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* No Images Message */}
            {vehicleImages.length === 0 && !uploadingImages && editingVehicle?.id && (
              <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center">
                <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">No images uploaded yet</p>
                <p className="text-sm text-gray-500">Drag and drop images above to get started</p>
              </div>
            )}
          </div>

          {/* Documents - Enhanced Drag & Drop */}
          <div className="bg-orange-50 rounded-lg p-6 border-2 border-orange-200">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-orange-600" />
              <h3 className="text-xl font-bold text-orange-900">Documents (Legal & Administrative)</h3>
            </div>

            {/* Document Drag and Drop Zone */}
            <div
              className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                isDocDragOver
                  ? 'border-orange-500 bg-orange-100 scale-105'
                  : 'border-gray-300 bg-gray-50 hover:border-orange-400 hover:bg-orange-50'
              }`}
              onDragEnter={handleDocumentDragEnter}
              onDragLeave={handleDocumentDragLeave}
              onDragOver={handleDocumentDragOver}
              onDrop={handleDocumentDrop}
            >
              <div className="flex flex-col items-center space-y-3">
                <FileText 
                  className={`w-12 h-12 transition-colors duration-200 ${
                    isDocDragOver ? 'text-orange-500' : 'text-gray-400'
                  }`} 
                />
                <div>
                  <p className={`text-base font-medium transition-colors duration-200 ${
                    isDocDragOver ? 'text-orange-700' : 'text-gray-700'
                  }`}>
                    {isDocDragOver ? 'Drop files here!' : 'Click to upload documents'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    or drag and drop files here
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB each
                  </p>
                </div>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    const files = Array.from(e.target.files);
                    if (files.length > 0) {
                      handleDocumentUpload(files);
                    }
                  }}
                  className="hidden"
                  id="document-upload"
                />
                <label
                  htmlFor="document-upload"
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 cursor-pointer transition-colors"
                >
                  {uploadingDocuments ? 'Uploading...' : 'Choose Documents'}
                </label>
              </div>
            </div>

            {/* Document Upload Tips */}
            <div className="mt-4 p-4 bg-orange-100 rounded-lg">
              <h4 className="font-medium text-orange-900 mb-2">Document Upload Tips</h4>
              <ul className="text-sm text-orange-800 space-y-1">
                <li>• Upload registration, insurance, and maintenance documents</li>
                <li>• Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG</li>
                <li>• Maximum file size: 10MB per file</li>
                <li>• Multiple files can be uploaded at once</li>
                <li>• Files are stored in vehicle-specific folders for organization</li>
              </ul>
            </div>

            {/* Uploaded Documents List */}
            {documents.length > 0 && (
              <div className="mt-6">
                <h4 className="text-lg font-medium text-gray-900 mb-3">
                  Uploaded Documents ({documents.length})
                </h4>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-sm text-gray-500">
                            {(doc.size / 1024).toFixed(1)} KB • {new Date(doc.uploadedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.open(doc.url, '_blank')}
                          className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = doc.url;
                            link.download = doc.name;
                            link.click();
                          }}
                          className="p-2 text-gray-500 hover:text-green-600 transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDocumentDelete(doc.id)}
                          className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Additional Notes */}
          <div className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <StickyNote className="w-5 h-5 text-gray-600" />
              <h3 className="text-xl font-bold text-gray-900">Additional Notes</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">General Notes</label>
                <textarea
                  value={formData.general_notes}
                  onChange={(e) => setFormData({...formData, general_notes: e.target.value})}
                  rows={3}
                  placeholder="Any additional notes about this vehicle, special instructions, known issues, modifications, etc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">System Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  placeholder="Internal notes for staff, booking system notes, etc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-8 py-3 rounded-lg font-bold text-lg transition-colors flex items-center gap-2 ${
                submitting
                  ? 'bg-gray-400 cursor-not-allowed text-white'
                  : 'bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg'
              }`}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  {editingVehicle ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  {editingVehicle ? 'Update Vehicle' : 'Create Vehicle'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VehicleFormComplete;