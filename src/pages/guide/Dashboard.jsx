import React from 'react';
import { useAuth } from '../../contexts/AuthContext';

/**
 * GuideDashboard - Dashboard for guide role users
 */
const GuideDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Guide Dashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Welcome, {user?.email} - Tour Operations Interface
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">My Tours</h2>
          <p className="text-gray-600 mb-4">View and manage your assigned tours.</p>
          <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
            View Tours
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">Assigned Vehicles</h2>
          <p className="text-gray-600 mb-4">Check status of vehicles assigned to your tours.</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
            Vehicle Status
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-2">Customer Communication</h2>
          <p className="text-gray-600 mb-4">Communicate with tour customers.</p>
          <button className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700">
            Messages
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuideDashboard;