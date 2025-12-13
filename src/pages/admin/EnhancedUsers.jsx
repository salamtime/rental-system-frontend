import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import ProtectedRoute from '../../components/common/ProtectedRoute';
import UserManagement from '../../components/admin/UserManagement';

const EnhancedUsers = () => {
  const { user, userRoles } = useSelector(state => state.auth);

  // CRITICAL FIX: Remove forced redirect - allow page to render
  // Check permissions but don't redirect immediately
  const hasPermission = user?.role === 'owner' || 
                       user?.role === 'admin' || 
                       userRoles?.some(role => ['owner', 'admin'].includes(role?.toLowerCase()));

  return (
    <ProtectedRoute requiredModule="User & Role Management">
      <div className="min-h-screen bg-gray-50">
        {hasPermission ? (
          <UserManagement />
        ) : (
          <div className="p-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">Access Restricted</h3>
              <p className="text-yellow-700">
                You need Owner or Admin privileges to access User & Role Management.
              </p>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default EnhancedUsers;