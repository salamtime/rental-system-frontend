import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

/**
 * RoleBasedHeader - Application header with role-based features and navigation
 * 
 * Displays user information, role-specific actions, and provides
 * quick access to key features based on user permissions.
 */
const RoleBasedHeader = () => {
  const { user, signOut, getUserRole } = useAuth();
  const { 
    canManagePricing, 
    canViewRentals, 
    canViewVehicles, 
    canViewReports 
  } = usePermissions();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const userRole = getUserRole();
  const roleInfo = getRoleInfo(userRole);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (!user) return null;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link to={getDashboardPath(userRole)} className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">RM</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Rental Manager</h1>
                <p className="text-xs text-gray-500">{roleInfo.description}</p>
              </div>
            </Link>
          </div>

          {/* Role-Based Quick Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <RoleBasedQuickActions />
          </div>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium text-gray-900">
                  {user.full_name || user.email}
                </p>
                <p className="text-xs text-gray-500">{roleInfo.name}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* User Dropdown Menu */}
            {showUserMenu && (
              <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                <div className="py-1">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">
                      {user.full_name || user.email}
                    </p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${roleInfo.color}-100 text-${roleInfo.color}-800 mt-1`}>
                      {roleInfo.name}
                    </span>
                  </div>

                  {/* Menu Items */}
                  <Link
                    to="/profile"
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Profile Settings
                  </Link>
                  
                  <Link
                    to={getDashboardPath(userRole)}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Dashboard
                  </Link>

                  <div className="border-t border-gray-200"></div>
                  
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Quick Actions */}
      <div className="md:hidden border-t border-gray-200 px-4 py-2">
        <RoleBasedQuickActions mobile />
      </div>
    </header>
  );
};

/**
 * RoleBasedQuickActions - Quick action buttons based on user role
 */
const RoleBasedQuickActions = ({ mobile = false }) => {
  const { 
    canViewRentals, 
    canViewVehicles, 
    canManagePricing, 
    canViewReports 
  } = usePermissions();

  const actions = [];

  if (canViewRentals()) {
    actions.push({
      name: 'New Rental',
      path: '/admin/rentals/new',
      color: 'blue',
      icon: 'plus'
    });
  }

  if (canViewVehicles()) {
    actions.push({
      name: 'Vehicles',
      path: '/admin/vehicles',
      color: 'green',
      icon: 'truck'
    });
  }

  if (canManagePricing()) {
    actions.push({
      name: 'Pricing',
      path: '/admin/pricing',
      color: 'purple',
      icon: 'dollar'
    });
  }

  if (canViewReports()) {
    actions.push({
      name: 'Reports',
      path: '/admin/reports',
      color: 'indigo',
      icon: 'chart'
    });
  }

  const buttonClass = mobile
    ? 'inline-flex items-center px-3 py-1 text-xs font-medium rounded-md mr-2 mb-2'
    : 'inline-flex items-center px-4 py-2 text-sm font-medium rounded-md';

  // CRITICAL: Safe array access
  const safeActions = Array.isArray(actions) ? actions : [];

  return (
    <div className={mobile ? 'flex flex-wrap' : 'flex space-x-3'}>
      {safeActions.map((action) => (
        <Link
          key={action.path}
          to={action.path}
          className={`${buttonClass} bg-${action.color}-100 text-${action.color}-700 hover:bg-${action.color}-200 transition-colors duration-150`}
        >
          <QuickActionIcon icon={action.icon} className="w-4 h-4 mr-1" />
          {action.name}
        </Link>
      ))}
    </div>
  );
};

/**
 * QuickActionIcon - Icons for quick actions
 */
const QuickActionIcon = ({ icon, className }) => {
  const icons = {
    plus: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    ),
    truck: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    dollar: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
      </svg>
    ),
    chart: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  };

  return icons[icon] || icons.plus;
};

/**
 * Get dashboard path based on role
 */
const getDashboardPath = (role) => {
  switch (role) {
    case 'owner':
    case 'admin':
      return '/admin/dashboard';
    case 'employee':
      return '/employee/dashboard';
    case 'guide':
      return '/guide/dashboard';
    case 'customer':
      return '/customer/dashboard';
    default:
      return '/admin/dashboard';
  }
};

/**
 * Get role display information
 */
const getRoleInfo = (role) => {
  const roleInfo = {
    owner: {
      name: 'Owner',
      color: 'purple',
      description: 'Full system access'
    },
    admin: {
      name: 'Administrator',
      color: 'red',
      description: 'Administrative access'
    },
    employee: {
      name: 'Employee',
      color: 'blue',
      description: 'Daily operations'
    },
    guide: {
      name: 'Guide',
      color: 'green',
      description: 'Tour operations'
    },
    customer: {
      name: 'Customer',
      color: 'gray',
      description: 'Self-service access'
    }
  };

  return roleInfo[role] || roleInfo.customer;
};

export default RoleBasedHeader;