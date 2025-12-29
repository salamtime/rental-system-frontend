import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { getUserPermissions } from '../services/UserService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const isLoadingProfile = useRef(false);

  const loadUserProfile = useCallback(async (authUser, session) => {
    // Prevent duplicate profile loads
    if (isLoadingProfile.current) {
      console.log('🔄 Profile load already in progress, skipping...');
      return;
    }

    if (!authUser) {
      setUserProfile(null);
      setSession(null);
      setLoading(false);
      setInitialized(true);
      return;
    }

    isLoadingProfile.current = true;

    try {
      const userRole = authUser.user_metadata?.role || 'customer';
      
      if (!authUser.id) {
        throw new Error(`Invalid userId: ${authUser.id}`);
      }

      // Call getUserPermissions with only userId parameter
      const userPermissionsMap = await getUserPermissions(authUser.id);
      
      console.log('🔍 DEBUG: userPermissionsMap from getUserPermissions:', userPermissionsMap);
      
      // Convert permissions map to array format for backward compatibility
      const userPermissions = Object.entries(userPermissionsMap).map(([module_name, is_allowed]) => ({
        module_name,
        has_access: is_allowed
      }));
      
      console.log('🔍 DEBUG: userPermissions array after conversion:', userPermissions);
      
      const profile = {
        id: authUser.id,
        email: authUser.email,
        role: userRole,
        fullName: authUser.user_metadata?.full_name,
        permissions: userPermissions,
      };
      
      console.log('🔍 DEBUG: Final profile object:', profile);

      setUserProfile(profile);
      setSession(session);
    } catch (error) {
      console.error('Failed to load user profile and permissions:', error);
      setUserProfile({
        id: authUser.id,
        email: authUser.email,
        role: authUser.user_metadata?.role || 'customer',
        fullName: authUser.user_metadata?.full_name,
        permissions: [],
      });
      setSession(session);
    } finally {
      setLoading(false);
      setInitialized(true);
      isLoadingProfile.current = false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let authListener = null;

    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (mounted) {
          await loadUserProfile(currentSession?.user ?? null, currentSession);
        }

        // Set up auth state listener
        const { data: listener } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('🔐 Auth state change:', event);
            
            // Only reload profile on significant auth events
            if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
              if (mounted) {
                setLoading(true);
                await loadUserProfile(newSession?.user ?? null, newSession);
              }
            } else if (event === 'TOKEN_REFRESHED') {
              // Just update the session without reloading the entire profile
              console.log('🔄 Token refreshed silently');
              if (mounted) {
                setSession(newSession);
              }
            }
          }
        );

        authListener = listener;
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
      if (authListener) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [loadUserProfile]);

  const signIn = async (email, password) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
    }
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLoading(false);
    }
    return { error };
  };

  const hasPermission = useCallback((moduleName) => {
    console.log("🔍 hasPermission called with moduleName:", moduleName);
    console.log("🔍 userProfile:", userProfile);
    console.log("🔍 userProfile.permissions:", userProfile?.permissions);
    
    if (!userProfile) return false;
    if (userProfile.role === 'owner') {
        return true;
    }
    
    // Map short module names to full database names
    const nameMap = {
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
      'finance': 'Finance Management',
      'alerts': 'Alerts',
      'users': 'User & Role Management',
      'settings': 'System Settings',
      'export': 'Project Export'
    };
    
    // Get the full database name from the map, or use the original name if not found
    const dbName = nameMap[moduleName.toLowerCase()] || moduleName;
    console.log("🔍 Mapped module name:", moduleName, "->", dbName);
    
    const permission = userProfile.permissions.find(p => p.module_name.toLowerCase() === dbName.toLowerCase());
    console.log("🔍 Found permission:", permission);
    const result = permission ? permission.has_access : false;
    console.log("🔍 hasPermission result:", result);
    return result;
  }, [userProfile]);

  const refreshPermissions = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        setLoading(true);
        await loadUserProfile(user, session);
    }
  }, [session, loadUserProfile]);

  const value = {
    user: userProfile,
    userProfile,
    session,
    loading,
    initialized,
    signIn,
    signOut,
    hasPermission,
    refreshPermissions,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;