/**
 * Form State Persistence Utility
 * Automatically saves and restores form state using sessionStorage
 * Prevents data loss when switching tabs or refreshing the page
 */

import { useState, useEffect } from 'react';

const STORAGE_KEY_PREFIX = 'saharax_form_';

/**
 * Save form state to sessionStorage
 * @param {string} formId - Unique identifier for the form
 * @param {Object} formData - Form data to save
 */
export const saveFormState = (formId, formData) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${formId}`;
    sessionStorage.setItem(key, JSON.stringify({
      data: formData,
      timestamp: Date.now()
    }));
    console.log(`💾 Form state saved: ${formId}`);
  } catch (error) {
    console.warn('⚠️ Failed to save form state:', error);
  }
};

/**
 * Load form state from sessionStorage
 * @param {string} formId - Unique identifier for the form
 * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
 * @returns {Object|null} - Saved form data or null if not found/expired
 */
export const loadFormState = (formId, maxAge = 3600000) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${formId}`;
    const saved = sessionStorage.getItem(key);
    
    if (!saved) {
      return null;
    }
    
    const { data, timestamp } = JSON.parse(saved);
    
    // Check if data is still valid (not expired)
    if (Date.now() - timestamp > maxAge) {
      console.log(`⏰ Form state expired: ${formId}`);
      clearFormState(formId);
      return null;
    }
    
    console.log(`📥 Form state loaded: ${formId}`);
    return data;
  } catch (error) {
    console.warn('⚠️ Failed to load form state:', error);
    return null;
  }
};

/**
 * Clear form state from sessionStorage
 * @param {string} formId - Unique identifier for the form
 */
export const clearFormState = (formId) => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${formId}`;
    sessionStorage.removeItem(key);
    console.log(`🗑️ Form state cleared: ${formId}`);
  } catch (error) {
    console.warn('⚠️ Failed to clear form state:', error);
  }
};

/**
 * Clear all form states from sessionStorage
 */
export const clearAllFormStates = () => {
  try {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(STORAGE_KEY_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    });
    console.log('🗑️ All form states cleared');
  } catch (error) {
    console.warn('⚠️ Failed to clear all form states:', error);
  }
};

/**
 * React Hook for form state persistence
 * @param {string} formId - Unique identifier for the form
 * @param {Object} initialState - Initial form state
 * @returns {[Object, Function]} - [formState, setFormState]
 */
export const useFormStatePersistence = (formId, initialState = {}) => {
  const [formState, setFormState] = useState(() => {
    const saved = loadFormState(formId);
    return saved || initialState;
  });

  // Save form state whenever it changes
  useEffect(() => {
    saveFormState(formId, formState);
  }, [formId, formState]);

  // Clear form state on unmount (optional)
  useEffect(() => {
    return () => {
      // Uncomment to clear on unmount
      // clearFormState(formId);
    };
  }, [formId]);

  return [formState, setFormState];
};

export default {
  saveFormState,
  loadFormState,
  clearFormState,
  clearAllFormStates,
  useFormStatePersistence
};