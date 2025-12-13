import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Button } from './ui/button';
import AppSettingsService from '../services/AppSettingsService';
import { TestTube, Save, Trash2, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';

/**
 * TransportFeesTest - Test component to verify transport fees functionality
 */
const TransportFeesTest = () => {
  const [fees, setFees] = useState({ pickup_fee: 0, dropoff_fee: 0 });
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCurrentFees();
  }, []);

  const loadCurrentFees = async () => {
    try {
      const currentFees = await AppSettingsService.getTransportFees();
      setFees(currentFees);
      addTestResult('✅ Load Fees', 'SUCCESS', `Loaded: ${JSON.stringify(currentFees)}`);
    } catch (err) {
      addTestResult('❌ Load Fees', 'ERROR', err.message);
      setError(err.message);
    }
  };

  const addTestResult = (test, status, message) => {
    const result = {
      id: Date.now(),
      test,
      status,
      message,
      timestamp: new Date().toLocaleTimeString()
    };
    setTestResults(prev => [result, ...prev.slice(0, 9)]); // Keep last 10 results
  };

  const testLocalStorage = async () => {
    setLoading(true);
    try {
      const isWorking = AppSettingsService.testLocalStorage();
      if (isWorking) {
        addTestResult('✅ localStorage Test', 'SUCCESS', 'localStorage is working correctly');
      } else {
        addTestResult('❌ localStorage Test', 'ERROR', 'localStorage test failed');
      }
    } catch (err) {
      addTestResult('❌ localStorage Test', 'ERROR', err.message);
    } finally {
      setLoading(false);
    }
  };

  const testSaveFees = async () => {
    setLoading(true);
    try {
      const testFees = {
        pickup_fee: Math.floor(Math.random() * 100) + 10,
        dropoff_fee: Math.floor(Math.random() * 100) + 10
      };

      console.log('🧪 Testing save with fees:', testFees);
      
      const savedFees = await AppSettingsService.saveTransportFees(testFees);
      setFees(savedFees);
      
      addTestResult('✅ Save Test', 'SUCCESS', `Saved: ${JSON.stringify(savedFees)}`);
      
      // Verify by loading again
      const verifyFees = await AppSettingsService.getTransportFees();
      if (verifyFees.pickup_fee === testFees.pickup_fee && verifyFees.dropoff_fee === testFees.dropoff_fee) {
        addTestResult('✅ Verify Save', 'SUCCESS', `Verified: ${JSON.stringify(verifyFees)}`);
      } else {
        addTestResult('❌ Verify Save', 'ERROR', `Mismatch: expected ${JSON.stringify(testFees)}, got ${JSON.stringify(verifyFees)}`);
      }
    } catch (err) {
      addTestResult('❌ Save Test', 'ERROR', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const clearFees = async () => {
    setLoading(true);
    try {
      const cleared = AppSettingsService.clearTransportFees();
      if (cleared) {
        setFees({ pickup_fee: 0, dropoff_fee: 0 });
        addTestResult('✅ Clear Fees', 'SUCCESS', 'Transport fees cleared');
        
        // Reload to verify
        await loadCurrentFees();
      } else {
        addTestResult('❌ Clear Fees', 'ERROR', 'Failed to clear fees');
      }
    } catch (err) {
      addTestResult('❌ Clear Fees', 'ERROR', err.message);
    } finally {
      setLoading(false);
    }
  };

  const runFullTest = async () => {
    setLoading(true);
    setTestResults([]);
    setError(null);

    try {
      // Test 1: localStorage functionality
      await testLocalStorage();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 2: Load current fees
      await loadCurrentFees();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 3: Save new fees
      await testSaveFees();
      await new Promise(resolve => setTimeout(resolve, 500));

      // Test 4: Load again to verify persistence
      await loadCurrentFees();

      addTestResult('🎉 Full Test', 'SUCCESS', 'All tests completed successfully');
    } catch (err) {
      addTestResult('❌ Full Test', 'ERROR', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFees(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }));
  };

  const saveCurrentFees = async () => {
    setLoading(true);
    try {
      const savedFees = await AppSettingsService.saveTransportFees(fees);
      addTestResult('✅ Manual Save', 'SUCCESS', `Saved: ${JSON.stringify(savedFees)}`);
      setError(null);
    } catch (err) {
      addTestResult('❌ Manual Save', 'ERROR', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-blue-600" />
            Transport Fees Testing Dashboard
          </CardTitle>
          <p className="text-sm text-gray-600">
            Test and debug transport fees localStorage functionality
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Fees Display */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Current Transport Fees</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pickup Fee (MAD)
                </label>
                <input
                  type="number"
                  name="pickup_fee"
                  value={fees.pickup_fee}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dropoff Fee (MAD)
                </label>
                <input
                  type="number"
                  name="dropoff_fee"
                  value={fees.dropoff_fee}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <p className="text-red-800 text-sm font-medium">Error: {error}</p>
              </div>
            </div>
          )}

          {/* Test Controls */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button
              onClick={runFullTest}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
              Full Test
            </Button>
            
            <Button
              onClick={saveCurrentFees}
              disabled={loading}
              variant="outline"
            >
              <Save className="w-4 h-4" />
              Save Fees
            </Button>
            
            <Button
              onClick={loadCurrentFees}
              disabled={loading}
              variant="outline"
            >
              <RefreshCw className="w-4 h-4" />
              Reload
            </Button>
            
            <Button
              onClick={clearFees}
              disabled={loading}
              variant="outline"
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </Button>
          </div>

          {/* Test Results */}
          {testResults.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Test Results</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testResults.map((result) => (
                  <div
                    key={result.id}
                    className={`p-3 rounded-lg text-sm ${
                      result.status === 'SUCCESS' 
                        ? 'bg-green-50 border border-green-200' 
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.status === 'SUCCESS' ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600" />
                        )}
                        <span className="font-medium">{result.test}</span>
                      </div>
                      <span className="text-xs text-gray-500">{result.timestamp}</span>
                    </div>
                    <p className={`mt-1 ${
                      result.status === 'SUCCESS' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* localStorage Inspector */}
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-2">localStorage Inspector</h3>
            <p className="text-sm text-gray-600 mb-2">
              Key: <code className="bg-gray-200 px-1 rounded">mgx_transport_fees_settings</code>
            </p>
            <div className="bg-white p-3 rounded border text-xs font-mono">
              {localStorage.getItem('mgx_transport_fees_settings') || 'No data found'}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TransportFeesTest;