import React from 'react';

/**
 * SettingsPage - System configuration and settings
 */
const SettingsPage = () => {
  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600 mt-1">Configure system preferences and settings</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="text-center py-12">
          <div className="text-6xl mb-4">⚙️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings Module</h2>
          <p className="text-gray-600 mb-6">
            System configuration, preferences, and administrative settings.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;