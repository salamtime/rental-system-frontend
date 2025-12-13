// Secure user creation utility using edge functions
import { supabase, supabaseAdmin } from '../utils/supabaseClient';

/**
 * Create a new user with proper role and permissions
 * This uses the admin client for secure user creation
 */
export const createUserSecurely = async (userData) => {
  try {
    const { email, password, name, role = 'customer', status = true } = userData;

    // Validate required fields
    if (!email || !password || !name) {
      throw new Error('Email, password, and name are required');
    }

    // Create user using admin client
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        role,
        full_name: name,
        status: status ? 'active' : 'inactive',
        permissions: role === 'owner' ? [] : [] // Permissions will be set separately
      }
    });

    if (error) {
      throw error;
    }

    return {
      success: true,
      user: data.user,
      credentials: {
        email,
        password,
        name,
        role
      }
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update user information securely
 */
export const updateUserSecurely = async (userId, updates) => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, updates);

    if (error) {
      throw error;
    }

    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    console.error('Error updating user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete user securely
 */
export const deleteUserSecurely = async (userId) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      throw error;
    }

    return {
      success: true
    };
  } catch (error) {
    console.error('Error deleting user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * List all users securely
 */
export const listUsersSecurely = async () => {
  try {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    return {
      success: true,
      users: data.users || []
    };
  } catch (error) {
    console.error('Error listing users:', error);
    return {
      success: false,
      error: error.message,
      users: []
    };
  }
};