// Module name mapping configuration
const MODULE_NAME_MAP = {
  // UI module name (lowercase): Server module name (exact match)
  'dashboard': 'Dashboard',
  'calendar': 'Calendar',
  'tours': 'Tours & Bookings',
  'rentals': 'Rental Management',
  'customers': 'Customer Management',
  'fleet': 'Fleet Management',
  'pricing': 'Pricing Management',
  'maintenance': 'Quad Maintenance',
  'fuel': 'Fuel Logs',
  'inventory': 'Inventory',
  'finance': 'Financial Reports',
  'alerts': 'Alerts & Notifications',
  'users': 'User Management',
  'settings': 'System Settings',
  'export': 'Data Export',
  'admin': 'Administration' // Add this for admin/owner checks
};

// ✅ NEW: Permission cache utility to prevent repeated permission checks
const permissionCache = {
  cache: new Map(),
  get(userId, moduleName) {
    const key = `${userId}_${moduleName}`;
    return this.cache.get(key);
  },
  set(userId, moduleName, result) {
    const key = `${userId}_${moduleName}`;
    this.cache.set(key, result);
    return result;
  },
  clear() {
    this.cache.clear();
  }
};

// Get current user from your auth system (adjust based on your setup)
export const getCurrentUser = () => {
  // This should return the user object with permissions
  return JSON.parse(localStorage.getItem('userProfile') || '{}');
};

// ✅ UPDATED: Main permission checking function with caching
export const hasPermission = (moduleName) => {
  const userProfile = getCurrentUser();
  
  if (!userProfile || !userProfile.id) {
    return false;
  }
  
  // ✅ Check cache first to avoid repeated permission lookups
  const cached = permissionCache.get(userProfile.id, moduleName);
  if (cached !== undefined) {
    return cached;
  }
  
  // For owner role, always return true for all permissions
  if (userProfile.role === 'owner') {
    return permissionCache.set(userProfile.id, moduleName, true);
  }
  
  if (!userProfile.permissions) {
    return permissionCache.set(userProfile.id, moduleName, false);
  }
  
  // Get the mapped module name, fallback to the input if no mapping
  const mappedModuleName = MODULE_NAME_MAP[moduleName.toLowerCase()] || moduleName;
  
  console.log(`🔍 Checking permission: ${moduleName} -> ${mappedModuleName}`);
  
  // Find permission in user's permissions array
  const permission = userProfile.permissions.find(p => 
    p.module_name === mappedModuleName || 
    p.module_name.toLowerCase() === moduleName.toLowerCase()
  );
  
  const result = permission ? permission.has_access : false;
  return permissionCache.set(userProfile.id, moduleName, result);
};

// ✅ NEW: Clear permission cache (call this when user logs out or permissions change)
export const clearPermissionCache = () => {
  permissionCache.clear();
  console.log('🔄 Permission cache cleared');
};

// Check if user is admin or owner
export const isAdminOrOwner = (user) => {
  if (!user) {
    const currentUser = getCurrentUser();
    return currentUser.role === 'admin' || currentUser.role === 'owner';
  }
  return user.role === 'admin' || user.role === 'owner';
};

// Check if user can approve price overrides
export const canApprovePriceOverrides = (user) => {
  // Admin/Owner can approve price overrides
  if (isAdminOrOwner(user)) {
    return true;
  }
  
  // Check if user has permission for "Pricing Management" module
  return hasPermission('pricing');
};

// Alternative: Case-insensitive comparison
export const hasPermissionCaseInsensitive = (moduleName) => {
  const userProfile = getCurrentUser();
  
  if (!userProfile || !userProfile.permissions) {
    return false;
  }
  
  // For owner role, always return true
  if (userProfile.role === 'owner') {
    return true;
  }
  
  // Try to find permission with case-insensitive comparison
  const permission = userProfile.permissions.find(p => 
    p.module_name.toLowerCase() === moduleName.toLowerCase()
  );
  
  return permission ? permission.has_access : false;
};
