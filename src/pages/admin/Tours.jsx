import React from 'react';

/**
 * ToursPage - Tours and bookings management
 */
const ToursPage = () => {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Tours & Bookings</h1>
        <p className="text-gray-600 mt-1">Manage tour operations and customer bookings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Tours & Bookings Module</h2>
          <p className="text-gray-600 mb-6">
            Complete tour management system for guided experiences and customer bookings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ToursPage;