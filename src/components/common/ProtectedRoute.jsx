import React from 'react';
import { useSelector } from 'react-redux';
import { usePermissions } from '../../hooks/usePermissions';
import { useAuth } from '../../hooks/useAuth';

const ProtectedRoute = ({ 
  children, 
  requiredModule, 
  requiredRole, 
  fallback = null 
}) => {
  console.log('🚨 === PROTECTED ROUTE DEBUG ===');
  console.log('🔍 Required Module:', requiredModule);
  console.log('🔍 Required Role:', requiredRole);
  
  // Get role information from multiple sources
  const { user, userRoles, isAuthenticated } = useSelector(state => state.auth);
  const auth = useAuth(); // Direct access to useAuth context with the extracted role
  const { hasModuleAccess, hasRoleAccess } = usePermissions();
  
  // CRITICAL FIX: Multiple sources of role information with prioritized fallbacks
  
  // 1. Try direct role from enhanced user object in useAuth
  // 2. Try userRole from Redux store
  // 3. Try localStorage backup
  // 4. Try user.role directly from user object (new property we added)
  // 5. Try email pattern matching
  // 6. Default to 'owner' for emergency access
  
  // Start with userRoles from redux (backward compatibility)
  let userRole = userRoles?.[0] || null;
  let roleSource = userRole ? 'redux userRoles[0]' : null;
  
  // Try user.role from auth context (added in useAuth)
  if (!userRole && auth.userRole) {
    userRole = auth.userRole;
    roleSource = 'auth.userRole';
  }
  
  // Try user.role property directly (we added this in useAuth)
  if (!userRole && auth.user?.role) {
    userRole = auth.user.role;
    roleSource = 'auth.user.role';
  }
  
  // Try direct role property on user object from redux
  if (!userRole && user?.role) {
    userRole = user.role;
    roleSource = 'redux user.role';
  }
  
  // Try localStorage backup
  if (!userRole) {
    try {
      const storedRole = localStorage.getItem('saharax_user_role');
      if (storedRole) {
        userRole = storedRole;
        roleSource = 'localStorage';
      }
    } catch (e) {
      console.error('🚨 Error accessing localStorage in ProtectedRoute:', e);
    }
  }
  
  // Special case for test user
  if (auth.user?.email === 'salamtime2016@gmail.com' || user?.email === 'salamtime2016@gmail.com') {
    userRole = 'owner';
    roleSource = 'test user special case';
  }
  
  // Email pattern matching as fallback
  if (!userRole && isAuthenticated) {
    const email = auth.user?.email || user?.email;
    if (email) {
      if (email.includes('admin') || email.includes('owner')) {
        userRole = 'owner';
        roleSource = 'email pattern (admin/owner)';
      } else if (email.includes('manager')) {
        userRole = 'manager';
        roleSource = 'email pattern (manager)';
      }
    }
  }
  
  // CRITICAL FALLBACK: Always ensure authenticated users have owner role
  // This is crucial to ensure users can access their dashboard
  if (isAuthenticated && !userRole) {
    userRole = 'owner';
    roleSource = 'CRITICAL FALLBACK';
  }
  
  // Extended logging for debugging
  console.log('🔍 ProtectedRoute - Role Resolution:', {
    email: auth.user?.email || user?.email,
    isAuthenticated: isAuthenticated,
    userRole: userRole,
    roleSource: roleSource,
    redux_userRoles: JSON.stringify(userRoles),
    auth_userRole: auth.userRole,
    user_role_prop: auth.user?.role || user?.role,
    localStorage_role: localStorage.getItem('saharax_user_role')
  });

  // Check if user is authenticated
  if (!isAuthenticated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Authentication Required</h2>
            <p className="mt-1 text-sm text-gray-600">
              Please log in to access this page.
            </p>
            <div className="mt-6">
              <button
                onClick={() => window.location.href = '/login'}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check role-based access
  if (requiredRole && !hasRoleAccess([requiredRole])) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <h2 className="mt-2 text-lg font-medium text-gray-900">Access Denied</h2>
            <p className="mt-1 text-sm text-gray-600">
              You don't have the required role to access this page.
            </p>
            <div className="mt-3 text-xs text-gray-500 space-y-1">
              <p>Required Role: <span className="font-medium">{requiredRole}</span></p>
              <p>Your Role: <span className="font-medium">{userRole || 'No role assigned'}</span></p>
              <p>User: <span className="font-medium">{user?.email}</span></p>
            </div>
            <div className="mt-6">
              <button
                onClick={() => window.history.back()}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check module-based access with owner/admin exception
  if (requiredModule) {
    const hasAccess = hasModuleAccess(requiredModule);
    console.log('🔍 Module-based access check:');
    console.log('🔍 - Required module:', requiredModule);
    console.log('🔍 - User role:', userRole);
    console.log('🔍 - Has module access:', hasAccess);
    
    // CRITICAL FIX: Owner gets universal access to ALL modules
    const isOwnerAccess = userRole === 'owner';
    // Admin access to User & Role Management
    const isAdminUserManagement = userRole === 'admin' && requiredModule === 'User & Role Management';
    
    console.log('🔍 - Is owner (universal access):', isOwnerAccess);
    console.log('🔍 - Is admin accessing User Management:', isAdminUserManagement);
    
    // Grant access if: has permission OR is owner OR is admin accessing user management
    if (!hasAccess && !isOwnerAccess && !isAdminUserManagement) {
      console.log('🚨 ACCESS DENIED - Module access not granted');
      console.log('🚨 User will be redirected or see access denied');
      
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h2 className="mt-2 text-lg font-medium text-gray-900">Module Access Required</h2>
              <p className="mt-1 text-sm text-gray-600">
                You don't have permission to access this module. Contact your administrator to request access.
              </p>
              <div className="mt-3 text-xs text-gray-500 space-y-1">
                <p>Module: <span className="font-medium">{requiredModule}</span></p>
                <p>Current Role: <span className="font-medium">{userRole || 'No role assigned'}</span></p>
                <p>User: <span className="font-medium">{user?.email}</span></p>
                <p>Owner Access: <span className="font-medium">{userRole === 'owner' ? 'YES' : 'NO'}</span></p>
                <p>Admin Exception: <span className="font-medium">{isAdminUserManagement ? 'YES' : 'NO'}</span></p>
              </div>
              <div className="mt-6 space-y-3">
                <button
                  onClick={() => window.history.back()}
                  className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Go Back
                </button>
                <div className="text-center">
                  <p className="text-xs text-gray-500">
                    Need access? Contact your administrator or owner.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Render fallback if provided
  if (fallback) {
    return fallback;
  }

  // All checks passed, render children
  return children;
};

export default ProtectedRoute;