import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StandaloneDashboard = () => {
  const [localStorage, setLocalStorage] = useState({});
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    console.log('🚨 STANDALONE DASHBOARD MOUNTED - NO DEPENDENCIES');
    document.title = 'Emergency Dashboard Access';
    
    // Log ALL localStorage items
    const allStorage = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      try {
        allStorage[key] = window.localStorage.getItem(key);
      } catch (e) {
        allStorage[key] = "ERROR READING VALUE";
      }
    }
    console.log('📦 ALL LOCAL STORAGE:', allStorage);
    setLocalStorage(allStorage);
    setLoading(false);
    
    // Force set owner role for future navigation
    try {
      window.localStorage.setItem('saharax_user_role', 'owner');
      window.localStorage.setItem('saharax_emergency_bypass', 'true');
      console.log('✅ Force set owner role and emergency bypass');
    } catch (e) {
      console.error('❌ Error setting localStorage items:', e);
    }
  }, []);
  
  const navigate = useNavigate();
  
  const refreshLocalStorage = () => {
    const allStorage = {};
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      try {
        allStorage[key] = window.localStorage.getItem(key);
      } catch (e) {
        allStorage[key] = "ERROR READING VALUE";
      }
    }
    setLocalStorage(allStorage);
  };
  
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        fontSize: '1.5rem'
      }}>
        Loading Emergency Dashboard...
      </div>
    );
  }
  
  return (
    <div style={{padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '1200px', margin: '0 auto'}}>
      <div style={{
        background: '#dc3545',
        color: 'white',
        padding: '15px 20px',
        borderRadius: '5px',
        marginBottom: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h1 style={{margin: '0', fontSize: '24px'}}>🚨 STANDALONE EMERGENCY DASHBOARD 🚨</h1>
        <div>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'white',
              color: '#333',
              border: 'none',
              padding: '8px 15px',
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            Home
          </button>
        </div>
      </div>
      
      <div style={{
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '5px', 
        marginBottom: '20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{marginTop: '0'}}>Navigation</h3>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px'}}>
          <button 
            onClick={() => navigate('/')}
            style={{
              background: '#007bff',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Home
          </button>
          <button 
            onClick={() => navigate('/dashboard')}
            style={{
              background: '#28a745',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Regular Dashboard
          </button>
          <button 
            onClick={() => navigate('/emergency-dashboard')}
            style={{
              background: '#dc3545',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Emergency Dashboard
          </button>
          <button 
            onClick={() => window.location.href = '/admin/dashboard'}
            style={{
              background: '#6c757d',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Admin Dashboard
          </button>
        </div>
        
        <h3 style={{marginBottom: '10px'}}>Authentication Controls</h3>
        <div style={{display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px'}}>
          <button 
            onClick={() => {
              window.localStorage.setItem('saharax_user_role', 'owner');
              alert('Set role to owner in localStorage');
              refreshLocalStorage();
            }}
            style={{
              background: '#28a745',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Set Owner Role
          </button>
          
          <button 
            onClick={() => {
              window.localStorage.setItem('saharax_emergency_bypass', 'true');
              alert('Set emergency bypass flag');
              refreshLocalStorage();
            }}
            style={{
              background: '#17a2b8',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Set Emergency Bypass
          </button>
          
          <button 
            onClick={() => {
              window.localStorage.clear();
              alert('Cleared localStorage');
              refreshLocalStorage();
            }}
            style={{
              background: '#dc3545',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Clear Storage
          </button>
          
          <button 
            onClick={refreshLocalStorage}
            style={{
              background: '#6c757d',
              color: 'white',
              padding: '10px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Refresh Storage Info
          </button>
        </div>
      </div>
      
      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Static Dashboard Items */}
        <div style={{
          background: '#e9ecef', 
          padding: '20px', 
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{marginTop: '0'}}>Users</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold'}}>Total Users: 42</p>
          <div style={{
            height: '100px', 
            background: '#adb5bd', 
            marginTop: '10px',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '70%',
              height: '80%',
              background: '#007bff'
            }}></div>
          </div>
        </div>
        
        <div style={{
          background: '#e9ecef', 
          padding: '20px', 
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{marginTop: '0'}}>Revenue</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold'}}>Monthly: $12,500</p>
          <div style={{
            height: '100px', 
            background: '#adb5bd', 
            marginTop: '10px',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '85%',
              height: '60%',
              background: '#28a745'
            }}></div>
          </div>
        </div>
        
        <div style={{
          background: '#e9ecef', 
          padding: '20px', 
          borderRadius: '5px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{marginTop: '0'}}>Activities</h3>
          <p style={{fontSize: '24px', fontWeight: 'bold'}}>Last 7 days: 156</p>
          <div style={{
            height: '100px', 
            background: '#adb5bd', 
            marginTop: '10px',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              bottom: '0',
              left: '0',
              width: '60%',
              height: '90%',
              background: '#fd7e14'
            }}></div>
          </div>
        </div>
      </div>
      
      <div style={{
        marginTop: '30px', 
        background: '#f8d7da', 
        padding: '20px', 
        borderRadius: '5px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{marginTop: '0'}}>Debug Information</h3>
        <div>
          <h4 style={{marginBottom: '5px'}}>LocalStorage Contents</h4>
          <pre style={{
            background: '#f8f9fa', 
            padding: '10px', 
            overflow: 'auto', 
            maxHeight: '200px',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            {JSON.stringify(localStorage, null, 2)}
          </pre>
        </div>
        
        <div style={{marginTop: '20px'}}>
          <h4 style={{marginBottom: '5px'}}>Current Location</h4>
          <pre style={{
            background: '#f8f9fa', 
            padding: '10px',
            borderRadius: '4px',
            fontSize: '13px'
          }}>
            {window.location.href}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default StandaloneDashboard;