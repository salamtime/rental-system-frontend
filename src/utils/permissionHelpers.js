/**
 * Permission Helper Utilities
 * Provides role-based access control helpers
 * Updated to work with both user objects and direct role strings
 */

/**
 * Check if user has admin or owner role
 * @param {Object|string} userOrRole - User object from Supabase auth or role string
 * @returns {boolean}
 */
export const isAdminOrOwner = (userOrRole) => {
  let role;
  
  if (typeof userOrRole === 'string') {
    role = userOrRole.toLowerCase();
  } else if (userOrRole && userOrRole.user_metadata) {
    role = userOrRole.user_metadata.role?.toLowerCase();
  } else if (userOrRole && userOrRole.role) {
    role = userOrRole.role.toLowerCase();
  } else {
    return false;
  }
  
  return role === 'admin' || role === 'owner';
};

/**
 * Check if user has employee or guide role
 * @param {Object|string} userOrRole - User object from Supabase auth or role string
 * @returns {boolean}
 */
export const isEmployeeOrGuide = (userOrRole) => {
  let role;
  
  if (typeof userOrRole === 'string') {
    role = userOrRole.toLowerCase();
  } else if (userOrRole && userOrRole.user_metadata) {
    role = userOrRole.user_metadata.role?.toLowerCase();
  } else if (userOrRole && userOrRole.role) {
    role = userOrRole.role.toLowerCase();
  } else {
    return false;
  }
  
  return role === 'employee' || role === 'guide';
};

/**
 * Get user role
 * @param {Object|string} userOrRole - User object from Supabase auth or role string
 * @returns {string}
 */
export const getUserRole = (userOrRole) => {
  if (typeof userOrRole === 'string') {
    return userOrRole.toLowerCase();
  } else if (userOrRole && userOrRole.user_metadata) {
    return userOrRole.user_metadata.role?.toLowerCase() || 'unknown';
  } else if (userOrRole && userOrRole.role) {
    return userOrRole.role.toLowerCase();
  }
  return 'unknown';
};

/**
 * Check if user can approve price overrides
 * @param {Object|string} userOrRole - User object from Supabase auth or role string
 * @returns {boolean}
 */
export const canApprovePriceOverrides = (userOrRole) => {
  return isAdminOrOwner(userOrRole);
};

/**
 * Check if user needs approval for price overrides
 * @param {Object|string} userOrRole - User object from Supabase auth or role string
 * @returns {boolean}
 */
export const needsApprovalForPriceOverrides = (userOrRole) => {
  return isEmployeeOrGuide(userOrRole);
};
