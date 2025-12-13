import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { batchUpdateRentalStatuses } from '../store/slices/rentalsSlice';
import { scheduleDailyStatusSweep } from '../services/rentalStatusService';

/**
 * Custom hook for managing automatic rental status updates
 */
export const useRentalStatusUpdater = () => {
  const dispatch = useDispatch();
  const sweepTimeoutRef = useRef(null);

  useEffect(() => {
    // Function to trigger batch status updates
    const triggerStatusUpdate = () => {
      console.log('🔄 Triggering rental status update...');
      dispatch(batchUpdateRentalStatuses());
    };

    // Schedule daily status sweep
    sweepTimeoutRef.current = scheduleDailyStatusSweep(triggerStatusUpdate);

    // Cleanup function
    return () => {
      if (sweepTimeoutRef.current) {
        clearTimeout(sweepTimeoutRef.current);
        console.log('🧹 Cleaned up daily status sweep timer');
      }
    };
  }, [dispatch]);

  // Manual trigger function
  const triggerManualUpdate = () => {
    dispatch(batchUpdateRentalStatuses());
  };

  return {
    triggerManualUpdate
  };
};