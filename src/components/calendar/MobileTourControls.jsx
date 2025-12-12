import React from 'react';
import { Play, Square, CheckCircle, Clock } from 'lucide-react';

const MobileTourControls = ({ 
  booking, 
  canStart, 
  isOnTour, 
  isCompleted, 
  onStart, 
  onFinish 
}) => {
  const handleStart = () => {
    if (canStart && onStart) {
      onStart();
    }
  };

  const handleFinish = () => {
    if (isOnTour && onFinish) {
      // Calculate actual duration
      const startTime = new Date(booking.startTime);
      const endTime = new Date();
      const actualDuration = Math.floor((endTime - startTime) / (1000 * 60)); // in minutes
      
      onFinish(actualDuration);
    }
  };

  return (
    <div className="space-y-4">
      {/* Desktop buttons (smaller) */}
      <div className="hidden md:flex space-x-4">
        {canStart && (
          <button
            onClick={handleStart}
            className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Play className="h-5 w-5 mr-2" />
            Start Tour
          </button>
        )}

        {isOnTour && (
          <button
            onClick={handleFinish}
            className="flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <Square className="h-5 w-5 mr-2" />
            Finish Tour
          </button>
        )}

        {isCompleted && (
          <div className="flex items-center px-6 py-3 bg-gray-100 text-gray-600 rounded-lg font-medium">
            <CheckCircle className="h-5 w-5 mr-2" />
            Tour Completed
          </div>
        )}
      </div>

      {/* Mobile buttons (large, touch-friendly) */}
      <div className="md:hidden space-y-3">
        {canStart && (
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center py-4 px-6 bg-green-600 text-white rounded-xl hover:bg-green-700 active:bg-green-800 transition-colors font-semibold text-lg shadow-lg"
            style={{ minHeight: '60px' }}
          >
            <Play className="h-6 w-6 mr-3" />
            Start Tour
          </button>
        )}

        {isOnTour && (
          <button
            onClick={handleFinish}
            className="w-full flex items-center justify-center py-4 px-6 bg-red-600 text-white rounded-xl hover:bg-red-700 active:bg-red-800 transition-colors font-semibold text-lg shadow-lg"
            style={{ minHeight: '60px' }}
          >
            <Square className="h-6 w-6 mr-3" />
            Finish Tour
          </button>
        )}

        {isCompleted && (
          <div className="w-full flex items-center justify-center py-4 px-6 bg-gray-100 text-gray-600 rounded-xl font-semibold text-lg">
            <CheckCircle className="h-6 w-6 mr-3" />
            Tour Completed
          </div>
        )}

        {/* Tour Status Indicator */}
        <div className="flex items-center justify-center py-2 text-sm text-gray-600">
          <Clock className="h-4 w-4 mr-2" />
          {canStart && 'Ready to start tour'}
          {isOnTour && 'Tour in progress...'}
          {isCompleted && 'Tour completed successfully'}
        </div>
      </div>
    </div>
  );
};

export default MobileTourControls;