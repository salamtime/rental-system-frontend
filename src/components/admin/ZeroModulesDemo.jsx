import React, { useState } from 'react';
import { Shield, AlertTriangle, Users, Settings } from 'lucide-react';
import { useModulePermissions, AVAILABLE_MODULES } from '../../hooks/useModulePermissions';
import ModulePermissionsSection from './ModulePermissionsSection';

const ZeroModulesDemo = () => {
  const [selectedUser, setSelectedUser] = useState({
    id: 'demo-user-1',
    email: 'demo@example.com',
    name: 'Demo User',
    role: 'employee'
  });

  const {
    permissions,
    loading,
    deactivateAllModules,
    getActiveModulesCount
  } = useModulePermissions(selectedUser.id);

  const handleDeactivateAll = async () => {
    const success = await deactivateAllModules();
    if (success) {
      console.log('All modules deactivated successfully');
    }
  };

  const activeCount = getActiveModulesCount();

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center space-x-3 mb-4">
          <Shield className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Zero Modules Permissions Demo</h1>
        </div>
        
        <p className="text-gray-600 mb-4">
          This demo shows the permissions management system configured for 0 active modules. 
          When all modules are deactivated, users have no functional access to any system features.
        </p>

        {/* Current Status */}
        <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Users className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium">Demo User:</span>
            <span className="text-sm text-gray-600">{selectedUser.email}</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium">Active Modules:</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              activeCount === 0 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {activeCount}/{AVAILABLE_MODULES.length}
            </span>
          </div>
        </div>
      </div>

      {/* Zero Modules Status Alert */}
      {activeCount === 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-red-800 mb-2">
                Zero Modules Configuration Active
              </h3>
              <p className="text-red-700 mb-3">
                All modules have been deactivated for this user. This configuration provides:
              </p>
              <ul className="text-sm text-red-600 space-y-1 ml-4">
                <li>• No access to any functional modules</li>
                <li>• Basic interface only (login/logout)</li>
                <li>• Complete restriction of system capabilities</li>
                <li>• Requires individual module reactivation for access</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleDeactivateAll}
            disabled={loading || activeCount === 0}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {activeCount === 0 ? 'Already Deactivated' : `Deactivate All ${activeCount} Modules`}
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
          >
            Refresh Demo
          </button>
        </div>
      </div>

      {/* Permissions Management Section */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Module Permissions Management</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage individual module permissions for the demo user
          </p>
        </div>
        
        <div className="p-6">
          <ModulePermissionsSection 
            targetUser={selectedUser}
            onPermissionChange={(userId, moduleName, hasAccess) => {
              console.log(`Permission changed: ${moduleName} = ${hasAccess} for user ${userId}`);
            }}
          />
        </div>
      </div>

      {/* System Impact */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Impact of Zero Modules</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 rounded-lg border border-red-200">
            <h3 className="font-medium text-red-800 mb-2">Restricted Access</h3>
            <ul className="text-sm text-red-600 space-y-1">
              <li>• No dashboard access</li>
              <li>• No booking capabilities</li>
              <li>• No fleet management</li>
              <li>• No financial data access</li>
            </ul>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-800 mb-2">Available Functions</h3>
            <ul className="text-sm text-blue-600 space-y-1">
              <li>• Basic authentication</li>
              <li>• Profile viewing</li>
              <li>• System notifications</li>
              <li>• Help/Support access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZeroModulesDemo;