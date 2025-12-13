import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import Dashboard from './admin/Dashboard';

const EmergencyDashboard = () => {
  // Log EVERYTHING
  useEffect(() => {
    console.log('🚨 EMERGENCY: Dashboard Component Mounted');
    console.log('📂 localStorage contents:', {
      saharax_user_role: localStorage.getItem('saharax_user_role'),
      user: localStorage.getItem('user'),
      authState: localStorage.getItem('authState'),
      token: localStorage.getItem('supabase.auth.token'),
    });

    // FORCE set critical values
    try {
      localStorage.setItem('saharax_user_role', 'owner');
      console.log('✅ FORCE set owner role in localStorage');
    } catch (e) {
      console.error('❌ Failed to set owner role:', e);
    }
  }, []);

  const authState = useSelector(state => state.auth);
  const userState = useSelector(state => state.users);

  return (
    <div>
      <div style={{padding: '20px', background: '#f8d7da', color: '#721c24', border: '1px solid #f5c6cb', margin: '10px'}}>
        <h3>🚨 EMERGENCY DASHBOARD ACCESS MODE 🚨</h3>
        <div>
          <strong>Auth Debug Info:</strong>
          <pre style={{background: '#f8f9fa', padding: '10px', overflow: 'auto', maxHeight: '200px'}}>
            {JSON.stringify({
              localStorage: {
                saharax_user_role: localStorage.getItem('saharax_user_role'),
                user: localStorage.getItem('user'),
                token: localStorage.getItem('supabase.auth.token') ? "EXISTS" : "MISSING",
              },
              reduxAuth: authState,
              reduxUser: userState,
            }, null, 2)}
          </pre>
        </div>
        <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
          <button 
            onClick={() => {
              localStorage.setItem('saharax_user_role', 'owner');
              alert('Set role to owner in localStorage!');
              window.location.reload();
            }}
            style={{background: '#dc3545', color: 'white', padding: '10px', border: 'none', cursor: 'pointer'}}
          >
            FORCE OWNER ROLE
          </button>
          <button 
            onClick={() => {
              localStorage.setItem('saharax_emergency_bypass', 'true');
              alert('Emergency bypass activated!');
              window.location.reload();
            }}
            style={{background: '#007bff', color: 'white', padding: '10px', border: 'none', cursor: 'pointer'}}
          >
            ACTIVATE EMERGENCY BYPASS
          </button>
        </div>
      </div>
      
      {/* Render the actual dashboard without any protection */}
      <Dashboard />
    </div>
  );
};

export default EmergencyDashboard;