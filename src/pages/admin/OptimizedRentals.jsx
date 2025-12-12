import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import OptimizedRentalList from '../../components/admin/OptimizedRentalList';
import AvailabilityAwareRentalForm from '../../components/AvailabilityAwareRentalForm';
import VideoContractModal from '../../components/VideoContractModal';
import optimizedRentalService from '../../services/OptimizedRentalService';

/**
 * Optimized Rentals Page with High Performance
 * 
 * Features:
 * - Paginated rental loading for fast performance
 * - Intelligent caching and optimized queries
 * - Real-time search with debouncing
 * - Enhanced filtering and sorting
 * - Responsive design with mobile support
 */
const OptimizedRentals = () => {
  const navigate = useNavigate();
  
  // UI state
  const [showForm, setShowForm] = useState(false);
  const [editingRental, setEditingRental] = useState(null);
  const [error, setError] = useState('');
  
  // Video contract modal state
  const [videoContractModal, setVideoContractModal] = useState({
    isOpen: false,
    rental: null,
    type: null // 'start' or 'close'
  });

  // =================== EVENT HANDLERS ===================

  /**
   * Handle successful rental creation/update
   */
  const handleRentalSuccess = (rentalData) => {
    setShowForm(false);
    setEditingRental(null);
    setError('');
    
    // Clear cache to refresh data
    optimizedRentalService.clearCache();
  };

  /**
   * Handle rental deletion
   */
  const handleDeleteRental = async (rental) => {
    if (!window.confirm('Are you sure you want to delete this rental?')) {
      return;
    }

    try {
      const result = await optimizedRentalService.deleteRental(rental.id);
      
      if (result.success) {
        // Cache will be cleared automatically by the service
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      setError(err.message);
      alert('❌ Failed to delete rental: ' + err.message);
    }
  };

  /**
   * Handle view rental - Navigate to rental details page
   */
  const handleViewRental = (rental) => {
    console.log('Data passed to handleViewRental in OptimizedRentals:', rental);
    navigate(`/admin/rentals/${rental.id}`);
  };

  /**
   * Handle edit rental
   */
  const handleEditRental = (rental) => {
    console.log('Data passed to handleEditRental in OptimizedRentals:', rental);
    setEditingRental(rental);
    setShowForm(true);
  };

  /**
   * Handle start contract (video check-in)
   */
  const handleStartContract = (rental) => {
    setVideoContractModal({
      isOpen: true,
      rental: rental,
      type: 'start'
    });
  };

  /**
   * Handle close contract (video check-out)
   */
  const handleCloseContract = async (rental) => {
    // For now, open video contract modal
    // In the future, this could check for existing closing video
    setVideoContractModal({
      isOpen: true,
      rental: rental,
      type: 'close'
    });
  };

  /**
   * Handle video contract success
   */
  const handleVideoContractSuccess = (updatedRental) => {
    // Close modal
    setVideoContractModal({
      isOpen: false,
      rental: null,
      type: null
    });
    
    // Show success message
    const action = videoContractModal.type === 'start' ? 'started' : 'completed';
    alert(`✅ Contract ${action} successfully!`);
    
    // Clear cache to refresh data
    optimizedRentalService.clearCache();
  };

  // =================== RENDER ===================

  // Show form view
  if (showForm) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-6">
          <AvailabilityAwareRentalForm
            onSuccess={handleRentalSuccess}
            onCancel={() => {
              setShowForm(false);
              setEditingRental(null);
            }}
            initialData={editingRental}
            mode={editingRental ? 'edit' : 'create'}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Rental Management</h1>
              <p className="text-gray-600 mt-2">
                High-performance rental system with optimized loading and intelligent caching
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <Plus className="h-5 w-5 mr-2" />
                Add New Rental
              </button>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-800">
                <h3 className="text-sm font-medium">Error</h3>
                <p className="text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="ml-auto text-red-600 hover:text-red-800"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Optimized Rental List */}
        <OptimizedRentalList
          onView={handleViewRental}
          onEdit={handleEditRental}
          onDelete={handleDeleteRental}
          onStartContract={handleStartContract}
          onCloseContract={handleCloseContract}
        />
      </div>

      {/* Video Contract Modal */}
      {videoContractModal.isOpen && (
        <VideoContractModal
          rental={videoContractModal.rental}
          type={videoContractModal.type}
          onClose={() => setVideoContractModal({ isOpen: false, rental: null, type: null })}
          onSuccess={handleVideoContractSuccess}
        />
      )}
    </div>
  );
};

export default OptimizedRentals;