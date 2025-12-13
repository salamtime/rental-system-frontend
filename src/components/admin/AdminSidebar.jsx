import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import { 
  HomeIcon, UsersIcon, CalendarIcon, MapIcon, 
  TruckIcon, DropletIcon, SettingsIcon, LogOutIcon,
  MenuIcon, CompassIcon, Loader2, DollarSignIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../utils/supabaseClient';
import AlertNotificationBadge from './AlertNotificationBadge';
import MobileDrawer from '../navigation/MobileDrawer';
import '../../styles/mobile-drawer.css';

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [userModulePermissions, setUserModulePermissions] = useState({});
  
  const isActive = (path) => {
    return location.pathname === path;
  };
  
  // Get user roles from auth state
  const { userRoles } = useSelector(state => state.auth);
  const { user } = useAuth();

  // Fetch user module permissions
  useEffect(() => {
    const fetchUserPermissions = async () => {
      if (!user?.email) return;
      
      try {
        const APP_ID = 'b30c02e74da644baad4668e3587d86b1';
        const { data, error } = await supabase
          .from(`app_${APP_ID}_user_module_permissions`)
          .select('module_name, has_access')
          .eq('user_email', user.email);

        if (error) {
          console.error('Error fetching user permissions:', error);
          return;
        }

        // Create permissions map
        const permissionsMap = {};
        data?.forEach(perm => {
          permissionsMap[perm.module_name] = perm.has_access;
        });

        setUserModulePermissions(permissionsMap);
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      }
    };

    fetchUserPermissions();
  }, [user?.email]);
  
  // Check if user has access to a specific module
  const hasModuleAccess = useCallback((moduleId) => {
    // Check individual permission first
    if (userModulePermissions.hasOwnProperty(moduleId)) {
      return userModulePermissions[moduleId];
    }
    
    // Fall back to role-based access
    const currentRole = userRoles?.[0] || 'user';
    return getRoleBasedAccess(currentRole, moduleId);
  }, [userModulePermissions, userRoles]);

  // Role-based access fallback
  const getRoleBasedAccess = (role, moduleId) => {
    const rolePermissions = {
      owner: [
        'Dashboard', 'Tours & Booking', 'Booking Management', 'Fleet Management',
        'Quad Maintenance', 'Fuel Records', 'Inventory', 'Finance Management',
        'User & Role Management', 'System Settings', 'Alerts', 'Pricing Management'
      ],
      admin: [
        'Dashboard', 'Tours & Booking', 'Booking Management', 'Fleet Management',
        'Quad Maintenance', 'Fuel Records', 'Inventory', 'Finance Management', 'Alerts', 'Pricing Management'
      ],
      guide: [
        'Dashboard', 'Tours & Booking', 'Fuel Records', 'Quad Maintenance'
      ],
      employee: [
        'Dashboard', 'Fleet Management', 'Quad Maintenance', 'Fuel Records', 'Inventory'
      ]
    };

    return rolePermissions[role]?.includes(moduleId) || false;
  };

  // Define navigation items with module IDs
  const getAllNavigationItems = () => {
    return [
      { name: 'Dashboard Overview', href: '/admin/dashboard', icon: HomeIcon, moduleId: 'Dashboard' },
      { name: 'Calendar', href: '/admin/calendar', icon: CalendarIcon, moduleId: 'Dashboard' },
      { name: 'Tours & Bookings', href: '/admin/tours', icon: CompassIcon, moduleId: 'Tours & Booking' },
      { name: 'Rental Management', href: '/admin/rentals', icon: TruckIcon, moduleId: 'Fleet Management' },
      { name: 'Fleet Management', href: '/admin/fleet', icon: TruckIcon, moduleId: 'Fleet Management' },
      { name: 'Pricing Management', href: '/admin/pricing', icon: DollarSignIcon, moduleId: 'Pricing Management' },
      { name: 'Quad Maintenance', href: '/admin/maintenance', icon: SettingsIcon, moduleId: 'Quad Maintenance' },
      { name: 'Fuel Logs', href: '/admin/fuel', icon: DropletIcon, moduleId: 'Fuel Records' },
      { name: 'Inventory', href: '/admin/inventory', icon: MapIcon, moduleId: 'Inventory' },
      { name: 'Finance Management', href: '/admin/finance', icon: UsersIcon, moduleId: 'Finance Management' },
      { 
        name: 'Alerts', 
        href: '/admin/alerts', 
        icon: ({ className }) => <AlertNotificationBadge className={className} />, 
        moduleId: 'Alerts' 
      },
      { name: 'User & Role Management', href: '/admin/users', icon: UsersIcon, moduleId: 'User & Role Management' },
      { name: 'System Settings', href: '/admin/settings', icon: SettingsIcon, moduleId: 'System Settings' },
      { name: 'Project Export', href: '/admin/system-settings', icon: SettingsIcon, moduleId: 'System Settings' },
    ];
  };

  // Filter navigation based on individual permissions
  const getFilteredNavigation = () => {
    const allItems = getAllNavigationItems();
    return allItems.filter(item => hasModuleAccess(item.moduleId));
  };

  const navigation = getFilteredNavigation();

  // Convert navigation items to MobileDrawer format
  const getMobileNavItems = () => {
    const items = navigation.map(item => ({
      to: item.href,
      icon: getEmojiIcon(item.name),
      label: item.name
    }));
    
    // Add divider before footer actions
    items.push({ divider: true });
    
    return items;
  };

  // Map navigation items to emoji icons
  const getEmojiIcon = (name) => {
    const iconMap = {
      'Dashboard Overview': '📊',
      'Calendar': '📅',
      'Tours & Bookings': '🗺️',
      'Rental Management': '📋',
      'Fleet Management': '🚗',
      'Pricing Management': '💰',
      'Quad Maintenance': '🛠️',
      'Fuel Logs': '⛽',
      'Inventory': '📦',
      'Finance Management': '🧾',
      'Alerts': '🚨',
      'User & Role Management': '👥',
      'System Settings': '⚙️',
      'Project Export': '🧳'
    };
    return iconMap[name] || '📄';
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  const handleReturnToWebsite = useCallback(async () => {
    setIsNavigating(true);
    try {
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      setTimeout(() => setIsNavigating(false), 100);
    }
  }, [navigate]);

  return (
    <>
      {/* Desktop Sidebar - unchanged */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-gray-200 hidden md:block">
        <div className="h-16 border-b border-gray-200 flex items-center px-4">
          <Link to="/" className="text-blue-600 font-semibold text-lg">
            SaharaX Admin
          </Link>
        </div>
        
        {/* Return to Website Button */}
        <div className="px-2 py-2 border-b border-gray-200">
          <button
            onClick={handleReturnToWebsite}
            disabled={isNavigating}
            className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full transition-all duration-200 ${
              isNavigating 
                ? 'bg-gray-100 text-gray-500 cursor-wait opacity-75' 
                : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200 group'
            }`}
          >
            {isNavigating ? (
              <Loader2 className="h-5 w-5 mr-3 animate-spin text-blue-600" />
            ) : (
              <HomeIcon className="h-5 w-5 mr-3 text-gray-500 group-hover:text-blue-600" />
            )}
            <span className="flex-1">
              {isNavigating ? t('common.loading') : t('common.returnToWebsite')}
            </span>
          </button>
        </div>
        
        <div className="overflow-y-auto h-[calc(100vh-4rem)]">
          <nav className="px-2 py-2 space-y-1">
            {navigation.map((item) => {
              const isItemActive = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-md mb-1 ${isItemActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  <Icon className={`h-5 w-5 mr-3 ${isItemActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
            
            <div className="h-px bg-gray-200 my-2"></div>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center px-3 py-2 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-100"
            >
              <LogOutIcon className="h-5 w-5 mr-3 text-gray-500" />
              <span>{t('common.logout')}</span>
            </button>
          </nav>
        </div>
      </aside>
      
      {/* Mobile Burger Button */}
      <div className="md:hidden fixed top-0 left-0 z-30 m-4">
        <button
          className="p-2 sm:p-3 sm:min-w-[44px] sm:min-h-[44px] rounded-md bg-white shadow-md transition-colors flex items-center justify-center hover:bg-gray-50 active:bg-gray-100"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open navigation menu"
        >
          <MenuIcon className="h-6 w-6 text-gray-500" />
        </button>
      </div>
      
      {/* Drop-In MobileDrawer - User's Proven Solution */}
      <MobileDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        title="SaharaX Admin"
        items={getMobileNavItems()}
        footer={
          <div style={{display:"grid", gap:8}}>
            <button 
              className="rm-item" 
              onClick={() => {
                handleReturnToWebsite();
                setMobileMenuOpen(false);
              }}
              disabled={isNavigating}
            >
              <span className="rm-icon">🔙</span>
              <span className="rm-label">
                {isNavigating ? 'Loading...' : 'Return to Website'}
              </span>
            </button>
            <button 
              className="rm-item" 
              onClick={() => {
                handleSignOut();
                setMobileMenuOpen(false);
              }}
            >
              <span className="rm-icon">🚪</span>
              <span className="rm-label" style={{color:"#dc2626"}}>Logout</span>
            </button>
          </div>
        }
      />
    </>
  );
};

export default AdminSidebar;