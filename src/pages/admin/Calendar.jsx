import React from 'react';

/**
 * CalendarPage - Schedule and appointment management
 * 
 * Features to implement:
 * - Monthly/weekly/daily calendar views
 * - Rental scheduling
 * - Tour bookings
 * - Maintenance appointments
 * - Resource allocation
 */
const CalendarPage = () => {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Calendar</h1>
        <p className="text-gray-600 mt-1">Schedule management and appointments</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Calendar Module</h2>
          <p className="text-gray-600 mb-6">
            Comprehensive scheduling system for rentals, tours, and maintenance appointments.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-2xl mx-auto">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">Rental Scheduling</h3>
              <p className="text-sm text-blue-700">Book and manage vehicle rentals</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Tour Planning</h3>
              <p className="text-sm text-green-700">Schedule guided tours and activities</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <h3 className="font-semibold text-orange-900 mb-2">Maintenance</h3>
              <p className="text-sm text-orange-700">Plan vehicle service appointments</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;