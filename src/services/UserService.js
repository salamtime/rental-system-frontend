import { supabase } from '../lib/supabase';

/**
 * Fetches all users from Supabase Auth.
 * This requires service-level access.
 */
export const getUsers = async () => {
  const { data: { users }, error } = await supabase.auth.admin.listUsers();
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
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm user
    user_metadata: { name, role },
  });
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
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { name, role },
  });
  if (error) {
    console.error('Error updating user:', error);
    throw error;
  }
  return data;
};

/**
 * Deletes a user.
 */
export const deleteUser = async (userId) => {
  const { error } = await supabase.auth.admin.deleteUser(userId);
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
 * Fetches the effective permissions for a given user based on their ID and role.
 *
 * @param {string} userId - The UUID of the user.
 * @param {string} userRole - The role of the user (e.g., 'owner', 'manager', 'customer').
 * @returns {Promise<Array<{module_name: string, has_access: boolean}>>} A list of module permissions.
 */
export const getUserPermissions = async (userId, userRole) => {
  if (userRole === 'owner') {
    return []; 
  }

  if (!userId || !userRole) {
    const errorMessage = `Invalid arguments for getUserPermissions: userId=${userId}, userRole=${userRole}.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  try {
    const { data, error } = await supabase.rpc('get_user_effective_permissions', {
      p_user_id: userId,
      p_user_role: userRole,
    });

    if (error) {
      console.error('Error fetching user permissions via RPC:', error);
      throw error;
    }

    return data || [];
  } catch (err) {
    console.error('An unexpected error occurred in getUserPermissions:', err);
    return [];
  }
};