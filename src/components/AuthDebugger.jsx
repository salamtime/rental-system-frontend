import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

const AuthDebugger = () => {
  const authState = useSelector(state => state.auth);
  
  useEffect(() => {
    console.log('🔍 AUTH DEBUGGER - Complete auth state:', {
      user: authState.user,
      userRoles: authState.userRoles,
      isAuthenticated: authState.isAuthenticated,
      authChecked: authState.authChecked,
      loading: authState.loading,
      error: authState.error,
      session: authState.session
    });

    if (authState.user) {
      console.log('🔍 AUTH DEBUGGER - User details:', {
        email: authState.user.email,
        id: authState.user.id,
        role: authState.user.role,
        user_metadata: authState.user.user_metadata,
        app_metadata: authState.user.app_metadata,
        raw_user_meta_data: authState.user.raw_user_meta_data,
        raw_app_meta_data: authState.user.raw_app_meta_data
      });
    }

    console.log('🔍 AUTH DEBUGGER - Role extraction test:');
    if (authState.userRoles && Array.isArray(authState.userRoles)) {
      console.log('✅ userRoles array exists:', authState.userRoles);
      console.log('✅ Has owner role:', authState.userRoles.includes('owner'));
      console.log('✅ Has admin role:', authState.userRoles.includes('admin'));
    } else {
      console.log('❌ userRoles array missing or invalid');
    }

    // Test email patterns
    if (authState.user?.email) {
      console.log('🔍 Email pattern tests:');
      console.log('- Contains "owner":', authState.user.email.includes('owner'));
      console.log('- Contains "admin":', authState.user.email.includes('admin'));
      console.log('- Is demo owner:', authState.user.email === 'owner_demo@saharax.com');
    }
  }, [authState]);

  if (!authState.user) {
    return (
      <div className="fixed top-4 right-4 bg-red-100 border-2 border-red-500 p-4 rounded-lg shadow-lg z-50 max-w-md">
        <h3 className="font-bold text-red-600 mb-2">🔍 Auth Debug - No User</h3>
        <div className="text-sm text-red-800">
          User not logged in or auth state not loaded
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-100 border-2 border-blue-500 p-4 rounded-lg shadow-lg z-50 max-w-md max-h-96 overflow-y-auto">
      <h3 className="font-bold text-blue-600 mb-2">🔍 Auth Debug Info</h3>
      <div className="text-xs text-blue-800 space-y-2">
        <div><strong>Email:</strong> {authState.user.email}</div>
        <div><strong>User Roles:</strong> {JSON.stringify(authState.userRoles)}</div>
        <div><strong>Direct Role:</strong> {authState.user.role || 'None'}</div>
        <div><strong>User Metadata Role:</strong> {authState.user.user_metadata?.role || 'None'}</div>
        <div><strong>App Metadata Role:</strong> {authState.user.app_metadata?.role || 'None'}</div>
        <div><strong>Is Owner (userRoles):</strong> {authState.userRoles?.includes('owner') ? 'Yes' : 'No'}</div>
        <div><strong>Is Admin (userRoles):</strong> {authState.userRoles?.includes('admin') ? 'Yes' : 'No'}</div>
        <div><strong>Email has "owner":</strong> {authState.user.email?.includes('owner') ? 'Yes' : 'No'}</div>
        <div><strong>Is Authenticated:</strong> {authState.isAuthenticated ? 'Yes' : 'No'}</div>
      </div>
    </div>
  );
};

export default AuthDebugger;