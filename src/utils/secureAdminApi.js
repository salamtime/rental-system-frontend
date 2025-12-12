// Secure admin API utilities
// This file contains functions to interact with secure edge functions for admin operations

import { supabase, adminService } from '../utils/supabaseClient';

// API for user management operations
export const userAdminApi = {
  // List users with optional pagination
  listUsers: async (page = 1, perPage = 10) => {
    try {
      const { data, error } = await adminService.auth.users.list(page, perPage);
      
      if (error) {
        console.error('Error listing users:', error);
        return { 
          data: { users: [] }, 
          error 
        };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Exception listing users:', err);
      return { 
        data: { users: [] }, 
        error: { message: err.message } 
      };
    }
  },
  
  // Create a new user
  createUser: async (userData) => {
    try {
      const { data, error } = await adminService.auth.users.create(userData);
      
      if (error) {
        console.error('Error creating user:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Exception creating user:', err);
      return { 
        data: null, 
        error: { message: err.message } 
      };
    }
  },
  
  // Get user by ID
  getUserById: async (userId) => {
    try {
      const { data, error } = await adminService.auth.users.getById(userId);
      
      if (error) {
        console.error('Error getting user:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Exception getting user:', err);
      return { 
        data: null, 
        error: { message: err.message } 
      };
    }
  },
  
  // Update an existing user
  updateUser: async (userId, updateData) => {
    try {
      const { data, error } = await adminService.auth.users.update(userId, updateData);
      
      if (error) {
        console.error('Error updating user:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Exception updating user:', err);
      return { 
        data: null, 
        error: { message: err.message } 
      };
    }
  },
  
  // Delete a user
  deleteUser: async (userId) => {
    try {
      const { data, error } = await adminService.auth.users.delete(userId);
      
      if (error) {
        console.error('Error deleting user:', error);
        return { data: null, error };
      }
      
      return { data, error: null };
    } catch (err) {
      console.error('Exception deleting user:', err);
      return { 
        data: null, 
        error: { message: err.message } 
      };
    }
  }
};