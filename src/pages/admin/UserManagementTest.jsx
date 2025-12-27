import React, { useState, useEffect } from 'react';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../contexts/AuthContext';

// Minimal test component to isolate the issue
const UserManagementTest = () => {
  const { user, session } = useAuth();
  const [testUsers, setTestUsers] = useState([]);
  const [testModal, setTestModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState('');
  const [authDebugInfo, setAuthDebugInfo] = useState('');

  // Comprehensive authentication debugging
  const debugAuthentication = async () => {
    console.log('🔍 === AUTHENTICATION DEBUG START ===');
    
    try {
      let authInfo = [];
      
      // Check current user from hook
      console.log('🔍 Hook user:', user);
      console.log('🔍 Hook session:', session);
      authInfo.push(`Hook User: ${user ? 'Present' : 'Missing'}`);
      authInfo.push(`Hook Session: ${session ? 'Present' : 'Missing'}`);
      
      if (user) {
        authInfo.push(`User ID: ${user.id}`);
        authInfo.push(`User Email: ${user.email}`);
        authInfo.push(`User Role: ${user.role || 'No role'}`);
        authInfo.push(`User Metadata: ${JSON.stringify(user.user_metadata || {})}`);
      }
      
      // Check Supabase auth directly
      const { data: authUser, error: authError } = await supabase.auth.getUser();
      console.log('🔍 Supabase auth user:', authUser, authError);
      authInfo.push(`Supabase User: ${authUser?.user ? 'Present' : 'Missing'}`);
      
      if (authUser?.user) {
        authInfo.push(`Supabase ID: ${authUser.user.id}`);
        authInfo.push(`Supabase Email: ${authUser.user.email}`);
      }
      
      // Check session directly
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('🔍 Supabase session:', sessionData, sessionError);
      authInfo.push(`Supabase Session: ${sessionData?.session ? 'Present' : 'Missing'}`);
      
      if (sessionData?.session) {
        authInfo.push(`Session Access Token: ${sessionData.session.access_token ? 'Present' : 'Missing'}`);
        authInfo.push(`Session Expires: ${sessionData.session.expires_at}`);
      }
      
      // Test database access with current user
      if (authUser?.user) {
        const { data: userRecord, error: userError } = await supabase
          .from('app_b30c02e74da644baad4668e3587d86b1_users')
          .select('*')
          .eq('id', authUser.user.id)
          .single();
        
        console.log('🔍 User record from DB:', userRecord, userError);
        authInfo.push(`User Record: ${userRecord ? 'Found' : 'Not Found'}`);
        
        if (userRecord) {
          authInfo.push(`DB Role: ${userRecord.role}`);
          authInfo.push(`DB Active: ${userRecord.is_active}`);
        }
      }
      
      setAuthDebugInfo(authInfo.join('\n'));
      
    } catch (error) {
      console.error('🔍 Auth debug error:', error);
      setAuthDebugInfo(`Auth Debug Error: ${error.message}`);
    }
  };

  // Simple data fetch test with enhanced debugging
  const fetchTestUsers = async () => {
    console.log('🔍 === TEST COMPONENT FETCH START ===');
    
    try {
      setLoading(true);
      setDebugInfo('Starting fetch...');
      
      // First test: Check if we can access the table at all
      console.log('🔍 Testing table access...');
      const { data: tableTest, error: tableError } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_users')
        .select('count', { count: 'exact', head: true });
      
      console.log('🔍 Table count test:', { tableTest, tableError });
      
      if (tableError) {
        setDebugInfo(`Table Access Error: ${tableError.message} (Code: ${tableError.code})`);
        console.error('🔍 Cannot access table:', tableError);
        return;
      }
      
      // Second test: Try to fetch actual data
      const { data, error } = await supabase
        .from('app_b30c02e74da644baad4668e3587d86b1_users')
        .select('*')
        .limit(10);
      
      console.log('🔍 Data fetch result:', { data, error });
      
      if (error) {
        console.error('🔍 Data fetch error:', error);
        setDebugInfo(`Data Fetch Error: ${error.message} (Code: ${error.code})`);
        setTestUsers([]);
      } else {
        console.log('🔍 Data fetch success, count:', data?.length);
        setDebugInfo(`Success: ${data?.length || 0} users fetched from table`);
        setTestUsers(data || []);
      }
      
    } catch (err) {
      console.error('🔍 Fetch exception:', err);
      setDebugInfo(`Fetch Exception: ${err.message}`);
      setTestUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('🔍 Test component mounted');
    debugAuthentication();
  }, [user, session]);

  useEffect(() => {
    if (user && session) {
      console.log('🔍 User and session available, fetching data...');
      fetchTestUsers();
    } else {
      console.log('🔍 Waiting for authentication...');
      setDebugInfo('Waiting for authentication...');
    }
  }, [user, session]);

  // Test button handler
  const handleTestButton = (e) => {
    console.log('🔍 TEST BUTTON CLICKED!');
    console.log('🔍 Event:', e);
    console.log('🔍 Current modal state:', testModal);
    
    setTestModal(!testModal);
    alert(`Button works! Modal state: ${!testModal}`);
  };

  console.log('🔍 Test component rendering with:', {
    testUsers: testUsers?.length,
    testModal,
    loading,
    debugInfo
  });

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-red-600 mb-4">
          🧪 USER MANAGEMENT TEST COMPONENT
        </h1>
        
        <div className="mb-6 p-4 bg-yellow-100 rounded">
          <h3 className="font-bold">Component Debug Information:</h3>
          <p>Loading: {loading.toString()}</p>
          <p>Users Count: {testUsers?.length || 0}</p>
          <p>Users Type: {typeof testUsers}</p>
          <p>Is Array: {Array.isArray(testUsers).toString()}</p>
          <p>Modal State: {testModal.toString()}</p>
          <p>Debug Info: {debugInfo}</p>
        </div>

        <div className="mb-6 p-4 bg-red-100 rounded">
          <h3 className="font-bold">Authentication Debug Information:</h3>
          <pre className="text-sm whitespace-pre-wrap">{authDebugInfo}</pre>
        </div>

        <div className="mb-6">
          <button
            onClick={handleTestButton}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded mr-4"
          >
            🧪 TEST BUTTON (Modal: {testModal.toString()})
          </button>
          
          <button
            onClick={() => {
              console.log('🔍 Refresh button clicked');
              fetchTestUsers();
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mr-4"
          >
            🔄 REFRESH DATA
          </button>
          
          <button
            onClick={() => {
              console.log('🔍 Auth debug refresh clicked');
              debugAuthentication();
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded mr-4"
          >
            🔍 DEBUG AUTH
          </button>
          
          <button
            onClick={() => {
              console.log('🔍 Force render button clicked');
              setTestUsers([...testUsers]); // Force re-render
            }}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            🔄 FORCE RENDER
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-lg">Loading test data...</p>
          </div>
        ) : (
          <div>
            <h2 className="text-xl font-bold mb-4">
              Users Data ({testUsers?.length || 0} total):
            </h2>
            
            {testUsers && testUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-4 py-2 border">ID</th>
                      <th className="px-4 py-2 border">Name</th>
                      <th className="px-4 py-2 border">Email</th>
                      <th className="px-4 py-2 border">Role</th>
                      <th className="px-4 py-2 border">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {testUsers.map((user, index) => (
                      <tr key={user.id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-2 border">{user.id}</td>
                        <td className="px-4 py-2 border">{user.name}</td>
                        <td className="px-4 py-2 border">{user.email}</td>
                        <td className="px-4 py-2 border">{user.role}</td>
                        <td className="px-4 py-2 border">
                          {user.is_active ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 bg-red-50 rounded">
                <p className="text-lg text-red-600">❌ NO USERS FOUND</p>
                <p>This indicates the data fetching issue</p>
              </div>
            )}
          </div>
        )}

        {testModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg">
              <h3 className="text-lg font-bold mb-4">🎉 TEST MODAL WORKS!</h3>
              <p>If you can see this, the button event system is working.</p>
              <button
                onClick={() => setTestModal(false)}
                className="mt-4 bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close Modal
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementTest;