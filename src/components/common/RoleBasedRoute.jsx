import React from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { hasModuleAccess } from '../../utils/permissions';

const RoleBasedRoute = ({ 
  children, 
  module = null,
  allowedRoles = [], 
  redirectTo = '/dashboard',
  requireAuth = true 
}) => {
  const { user, userRoles, isAuthenticated } = useSelector(state => state.auth);

  // If authentication is required and user is not authenticated
  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  // If no role restrictions, allow access
  if (allowedRoles.length === 0 && !module) {
    return children;
  }

  const userRole = userRoles && userRoles.length > 0 ? userRoles[0] : null;

  // Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to={redirectTo} replace />;
  }

  // Check module-based access
  if (module && !hasModuleAccess(userRole, module)) {
    return <Navigate to={redirectTo} replace />;
  }

  return children;
};

export default RoleBasedRoute;