import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';

/**
 * RoleBasedNavigation - Dynamic navigation component based on user roles and permissions
 * 
 * Renders navigation items based on user's role and permissions,
 * providing role-appropriate access to different system areas.
 */
const RoleBasedNavigation = () => {
  const { user, getUserRole, signOut } = useAuth();
  const { 
    canViewVehicles, 
    canViewRentals, 
    canViewUsers, 
    canViewReports, 
    canConfigureSystem 
  } = usePermissions();
  const location = useLocation();
  const userRole = getUserRole();

  if (!user) return null;

  const navigationItems = [
    {
      name: 'Dashboard',
      path: getDashboardPath(userRole),
      icon: 'dashboard',
      show: true
    },
    {
      name: 'Rentals',
      path: '/admin/rentals',
      icon: 'rentals',
      show: canViewRentals()
    },
    {
      name: 'Vehicles',
      path: '/admin/vehicles',
      icon: 'vehicles',
      show: canViewVehicles()
    },
    {
      name: 'Users',
      path: '/admin/users',
      icon: 'users',
      show: canViewUsers()
    },
    {
      name: 'Reports',
      path: '/admin/reports',
      icon: 'reports',
      show: canViewReports()
    },
    {
      name: 'Settings',
      path: '/admin/settings',
      icon: 'settings',
      show: canConfigureSystem()
    }
  ];

  const roleInfo = getRoleInfo(userRole);

  // CRITICAL: Safe array filtering
  const safeNavigationItems = Array.isArray(navigationItems) ? navigationItems : [];
  const visibleItems = safeNavigationItems.filter(item => item.show);

  return (
    <nav className="h-full flex flex-col bg-white border-r border-gray-200">
      {/* User Info Section */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.full_name || user.email}
            </p>
            <p className="text-xs text-gray-500 truncate">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${roleInfo.color}-100 text-${roleInfo.color}-800`}>
                {roleInfo.name}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors duration-150 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <NavigationIcon 
                    icon={item.icon} 
                    className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                    }`}
                  />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sign Out */}
      <div className="border-t border-gray-200 p-4">
        <button
          onClick={signOut}
          className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
        >
          <svg className="mr-3 h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign Out
        </button>
      </div>
    </nav>
  );
};

/**
 * NavigationIcon - Icon component for navigation items
 */
const NavigationIcon = ({ icon, className }) => {
  const icons = {
    dashboard: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6a2 2 0 01-2 2H10a2 2 0 01-2-2V5z" />
      </svg>
    ),
    rentals: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    vehicles: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    users: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
      </svg>
    ),
    reports: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    settings: (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    )
  };

  return icons[icon] || icons.dashboard;
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

export default RoleBasedNavigation;