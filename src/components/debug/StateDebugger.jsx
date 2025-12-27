import React from 'react';
import { useSelector } from 'react-redux';
import { useAuth } from '../../contexts/AuthContext';

const StateDebugger = () => {
  const { user, userRoles, isAuthenticated } = useSelector(state => state.auth);
  const auth = useAuth();

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-90 text-white p-4 rounded-lg text-xs max-w-md">
      <h3 className="font-bold mb-2">🔍 Auth Debug (Dev Only)</h3>
      <div className="space-y-1">
        <div>Redux Auth: {isAuthenticated ? '✅' : '❌'}</div>
        <div>User Email: {auth.user?.email || 'none'}</div>
        <div>User Role: {auth.user?.role || 'none'}</div>
        <div>Metadata Role: {auth.user?.user_metadata?.role || 'none'}</div>
      </div>
    </div>
  );
};

export default StateDebugger;