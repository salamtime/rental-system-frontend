import { supabase, supabaseAdmin } from './supabaseClient';

/**
 * Fetches all users from Supabase Auth.
 * This requires service-level access.
 */
export const getUsers = async () => {
  if (!supabaseAdmin) {
    throw new Error('Admin client not initialized. Service role key is missing.');
  }
  
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
  return users;
};

/**
 * Adds a new user.
 */
export const addUser = async (email, password, name, role) => {
  if (!supabaseAdmin) {
    throw new Error('Admin client not initialized. Service role key is missing.');
  }
  
  console.log('=== addUser START ===');
  console.log('Email:', email);
  console.log('Name:', name);
  console.log('Role:', role);
  
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm user
    user_metadata: { name, role },
  });
  
  console.log('Create user response - data:', data);
  console.log('Create user response - error:', error);
  console.log('=== addUser END ===');
  
  if (error) {
    console.error('Error adding user:', error);
    throw error;
  }
  return data;
};

/**
 * Updates a user's metadata (name and role).
 */
export const updateUser = async (userId, name, role) => {
  if (!supabaseAdmin) {
    throw new Error('Admin client not initialized. Service role key is missing.');
  }
  
  console.log('=== updateUser START ===');
  console.log('User ID:', userId);
  console.log('Name:', name);
  console.log('Role:', role);
  
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: { name, role },
  });
  
  console.log('Update user response - data:', data);
  console.log('Update user response - error:', error);
  console.log('=== updateUser END ===');
  
  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }
  return data;
};

/**
 * Updates a user's complete profile including email, name, role, and optionally password.
 * @param {string} userId - The user's UUID
 * @param {Object} updates - Object containing the fields to update
 * @param {string} updates.email - New email address
 * @param {string} updates.name - New full name
 * @param {string} updates.role - New role
 * @param {string} [updates.password] - New password (optional)
 */
export const updateUserProfile = async (userId, updates) => {
  if (!supabaseAdmin) {
    throw new Error('Admin client not initialized. Service role key is missing.');
  }
  
  console.log('=== updateUserProfile START ===');
  console.log('User ID:', userId);
  console.log('Updates:', { ...updates, password: updates.password ? '***' : undefined });
  
  const updatePayload = {
    email: updates.email,
    user_metadata: { 
      full_name: updates.name,
      role: updates.role 
    },
  };
  
  // Only include password if provided
  if (updates.password && updates.password.trim() !== '') {
    updatePayload.password = updates.password;
  }
  
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);
  
  console.log('Update user profile response - data:', data);
  console.log('Update user profile response - error:', error);
  console.log('=== updateUserProfile END ===');
  
  if (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
  return data;
};

/**
 * Deletes a user.
 */
export const deleteUser = async (userId) => {
  if (!supabaseAdmin) {
    throw new Error('Admin client not initialized. Service role key is missing.');
  }
  
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

/**
 * Sets the permissions for a user.
 */
export const setUserPermissions = async (userId, moduleIds) => {
  // First, delete existing permissions for the user
  const { error: deleteError } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error clearing old permissions:', deleteError);
    throw deleteError;
  }

  // Then, insert the new permissions
  if (moduleIds.length > 0) {
    const permissionsToInsert = moduleIds.map(moduleId => ({
      user_id: userId,
      module_id: moduleId,
      has_access: true,
    }));

    const { error: insertError } = await supabase
      .from('user_permissions')
      .insert(permissionsToInsert);

    if (insertError) {
      console.error('Error setting new permissions:', insertError);
      throw insertError;
    }
  }
};

/**
 * Fetches the effective permissions for a given user using the RPC function.
 * @param {string} userId - The UUID of the user.
 * @returns {Promise<Object>} - Object mapping module names to boolean permissions
 */
export const getUserPermissions = async (userId) => {
  if (!userId) {
    console.warn('No userId provided to getUserPermissions');
    return {};
  }

  try {
    console.log('=== UserService.getUserPermissions START ===');
    console.log('User ID:', userId);

    // Call the RPC function with correct parameter name
    const { data, error } = await supabase.rpc('get_user_effective_permissions', {
      v_user_id: userId
    });

    console.log('RPC response - data:', data);
    console.log('RPC response - error:', error);

    if (error) {
      console.error('Error fetching user permissions via RPC:', error);
      // Return empty permissions on error instead of throwing
      return {};
    }

    // Map the results: convert array to object { module_name: is_allowed }
    const permissionsMap = {};
    data?.forEach(item => {
      permissionsMap[item.module_name] = item.is_allowed;
    });

    console.log('Permissions map:', permissionsMap);
    console.log('=== UserService.getUserPermissions END ===');
    
    return permissionsMap;
  } catch (error) {
    console.error('An unexpected error occurred in getUserPermissions:', error);
    // Return empty permissions on error instead of throwing
    return {};
  }
};