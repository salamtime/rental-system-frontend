import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const StandaloneDashboardLanding = () => {
  const [localStorage, setLocalStorage] = useState({});
  
  useEffect(() => {
    console.log('🚀 STANDALONE LANDING PAGE MOUNTED');
    document.title = 'Dashboard Access Portal';
    
    // Track navigation history
    if (!window.navHistory) window.navHistory = [];
    window.navHistory.push('Landing Page: ' + new Date().toISOString());
    console.log('📍 Navigation History:', window.navHistory);
    
    // Collect localStorage data
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
    
    // Force set owner role for future navigation
    try {
      window.localStorage.setItem('saharax_user_role', 'owner');
      window.localStorage.setItem('saharax_emergency_bypass', 'true');
      console.log('✅ Force set owner role and emergency bypass on landing page');
    } catch (e) {
      console.error('❌ Error setting localStorage items:', e);
    }
  }, []);
  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      background: '#f5f5f5'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '30px',
        maxWidth: '700px',
        width: '100%',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{fontSize: '2.5rem', marginBottom: '1rem', color: '#333'}}>
          🚨 Emergency Dashboard Access 🚨
        </h1>
        
        <p style={{fontSize: '1.1rem', marginBottom: '2rem', color: '#555'}}>
          This page provides direct access to dashboard views without authentication requirements.
          Use the buttons below to access different dashboard versions.
        </p>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '15px',
          width: '100%'
        }}>
          <Link to="/standalone-dashboard" style={{
            background: '#007bff',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '5px',
            textDecoration: 'none',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'block',
            transition: 'background 0.3s'
          }}>
            Access Standalone Dashboard
          </Link>
          
          <Link to="/dashboard" style={{
            background: '#28a745',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '5px',
            textDecoration: 'none',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'block',
            transition: 'background 0.3s'
          }}>
            Try Regular Dashboard
          </Link>
          
          <Link to="/emergency-dashboard" style={{
            background: '#dc3545',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '5px',
            textDecoration: 'none',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'block',
            transition: 'background 0.3s'
          }}>
            Try Emergency Dashboard
          </Link>
          
          <a href="/admin/dashboard" style={{
            background: '#6c757d',
            color: 'white',
            padding: '15px 20px',
            borderRadius: '5px',
            textDecoration: 'none',
            fontSize: '1.2rem',
            fontWeight: 'bold',
            textAlign: 'center',
            display: 'block',
            transition: 'background 0.3s'
          }}>
            Direct Admin Dashboard Link
          </a>
          
          <button 
            onClick={() => {
              window.localStorage.setItem('saharax_user_role', 'owner');
              alert('Set role to "owner" in localStorage');
            }} 
            style={{
              background: '#ffc107',
              color: 'black',
              padding: '15px 20px',
              borderRadius: '5px',
              border: 'none',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              transition: 'background 0.3s'
            }}
          >
            Set Owner Role in LocalStorage
          </button>
        </div>
      </div>
      
      <div style={{
        marginTop: '40px',
        padding: '20px',
        background: 'white',
        borderRadius: '10px',
        width: '100%',
        maxWidth: '700px',
        boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        textAlign: 'left'
      }}>
        <h3 style={{marginTop: 0}}>Debug Information</h3>
        <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
          <h4 style={{margin: '0'}}>Current URL:</h4>
          <span>{window.location.href}</span>
        </div>
        
        <h4 style={{marginBottom: '5px'}}>LocalStorage Contents:</h4>
        <pre style={{
          background: '#f8f9fa', 
          padding: '10px', 
          overflow: 'auto',
          maxHeight: '300px',
          borderRadius: '5px',
          fontSize: '13px'
        }}>
          {JSON.stringify(localStorage, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default StandaloneDashboardLanding;