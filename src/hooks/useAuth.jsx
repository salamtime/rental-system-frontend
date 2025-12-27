import { useState, useEffect, createContext, useContext } from 'react';
import { supabase } from '../utils/supabaseClient';

// Helper function to extract user role from Supabase metadata only
const extractUserRole = (user) => {
  if (!user) {
    console.log('❌ extractUserRole: No user provided');
    return null; // No default role - must come from metadata
  }
  
  console.log('🔍 extractUserRole - Processing user:', user.email);
  console.log('🔍 User metadata:', user.user_metadata);
  console.log('🔍 App metadata:', user.app_metadata);
  
  // Check user_metadata.role (primary location)
  if (user.user_metadata?.role) {
    console.log('✅ Role found in user_metadata.role:', user.user_metadata.role);
    return user.user_metadata.role;
  }
  
  // Check app_metadata.role (secondary location)
  if (user.app_metadata?.role) {
    console.log('✅ Role found in app_metadata.role:', user.app_metadata.role);
    return user.app_metadata.role;
  }
  
  // Check user_metadata.roles array and take first entry
  if (user.user_metadata?.roles && Array.isArray(user.user_metadata.roles) && user.user_metadata.roles.length > 0) {
    console.log('✅ Role found in user_metadata.roles[0]:', user.user_metadata.roles[0]);
    return user.user_metadata.roles[0];
  }
  
  // Check app_metadata.roles array and take first entry
  if (user.app_metadata?.roles && Array.isArray(user.app_metadata.roles) && user.app_metadata.roles.length > 0) {
    console.log('✅ Role found in app_metadata.roles[0]:', user.app_metadata.roles[0]);
    return user.app_metadata.roles[0];
  }
  
  // No role found in metadata - this should not happen in production
  console.warn('⚠️ No role found in user metadata - user needs role assignment');
  return 'customer'; // Safe default role with minimal permissions
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🔍 === AuthProvider initializing ===');
    
    let isComponentMounted = true;
    
    // Enhanced session restoration logic
    const initializeSession = async () => {
      try {
        console.log('🔍 Getting current Supabase session...');
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔐 Initial session from Supabase:', !!session);
        
        if (isComponentMounted) {
          if (session?.user) {
            const extractedRole = extractUserRole(session.user);
            setSession(session);
            setUser({
              ...session.user,
              role: extractedRole
            });
          } else {
            setSession(null);
            setUser(null);
          }
          setLoading(false);
        }
        
      } catch (error) {
        console.error('🚨 Error in session initialization:', error);
        if (isComponentMounted) {
          setLoading(false);
        }
      }
    };
    
    // Initialize session
    initializeSession();

    // Listen for auth changes with enhanced logging
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔍 === SUPABASE AUTH STATE CHANGE ===');
      console.log('🔍 Event:', event);
      console.log('🔍 Session available:', !!session);
      
      if (!isComponentMounted) return;
      
      if (session?.user) {
        console.log('✅ Valid Supabase session established');
        console.log('✅ Session user:', session.user?.email);
        
        // Extract and assign role
        const extractedRole = extractUserRole(session.user);
        console.log('✅ Extracted user role on auth change:', extractedRole);
        
        // Add role directly to user object
        const userWithRole = {
          ...session.user,
          role: extractedRole
        };
        
        setSession(session);
        setUser(userWithRole);
      } else {
        console.log('⚠️ No Supabase session available');
        setSession(null);
        setUser(null);
      }
      
      setLoading(false);
    });

    return () => {
      isComponentMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Real Supabase sign in
  const signIn = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) throw error;
      
      console.log('🔐 Sign in successful:', data);
      return { success: true, data };
    } catch (err) {
      console.error('🔐 Sign in error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Real Supabase sign up
  const signUp = async (email, password) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin
        }
      });
      if (error) throw error;
      console.log('🔐 Sign up successful:', data);
      return { success: true, data };
    } catch (err) {
      console.error('🔐 Sign up error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Real Supabase sign out
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      console.log('🔐 Sign out successful');
      return { success: true };
    } catch (err) {
      console.error('🔐 Sign out error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  // Real password reset
  const resetPassword = async (email) => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/reset-password',
      });
      if (error) throw error;
      console.log('🔐 Password reset email sent');
      return { success: true };
    } catch (err) {
      console.error('🔐 Password reset error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Real profile update
  const updateProfile = async (updates) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.updateUser(updates);
      if (error) throw error;
      setUser({
        ...data.user,
        role: extractUserRole(data.user)
      });
      console.log('🔐 Profile updated:', data);
      return { success: true, data };
    } catch (err) {
      console.error('🔐 Profile update error:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Extract user role from user object (set from metadata only)
  const userRole = user?.role || null;
  
  const value = {
    user,
    session,
    loading,
    error,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    userRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default useAuth;