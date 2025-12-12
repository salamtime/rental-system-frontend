import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { runMaintenancePartsMigration, checkMaintenancePartsMigration } from '../../utils/runMaintenancePartsMigration';
import MaintenanceTrackingService from '../../services/MaintenanceTrackingService';
import MaintenancePartsService from '../../services/MaintenancePartsService';

/**
 * MaintenancePartsTest - Test component for maintenance parts functionality
 * This component helps verify the new parts tracking system is working correctly
 */
const MaintenancePartsTest = () => {
  const [migrationStatus, setMigrationStatus] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const runMigration = async () => {
    setLoading(true);
    try {
      const result = await runMaintenancePartsMigration();
      setMigrationStatus(result);
    } catch (error) {
      setMigrationStatus({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const checkMigration = async () => {
    setLoading(true);
    try {
      const result = await checkMaintenancePartsMigration();
      setMigrationStatus(result.exists ? 
        { success: true, message: 'Migration table exists' } : 
        { success: false, message: 'Migration table does not exist' }
      );
    } catch (error) {
      setMigrationStatus({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const testMaintenanceCreation = async () => {
    setLoading(true);
    const results = [];
    
    try {
      // Test data for maintenance creation
      const testMaintenanceData = {
        vehicle_id: 1, // Assuming vehicle ID 1 exists
        maintenance_type: 'Oil Change',
        status: 'completed',
        scheduled_date: new Date().toISOString().split('T')[0],
        labor_rate_mad: 150,
        parts_cost_mad: 0, // Will be calculated
        external_cost_mad: 0,
        tax_mad: 15,
        notes: 'Test maintenance record with parts tracking',
        technician_name: 'Test Technician',
        parts_used: [
          {
            item_id: '1', // Assuming inventory item ID 1 exists
            quantity: 2,
            notes: 'Test part usage'
          }
        ]
      };

      results.push({ step: 'Creating test maintenance record...', status: 'running' });
      setTestResults([...results]);

      const createResult = await MaintenanceTrackingService.createMaintenanceRecord(testMaintenanceData);
      
      results[results.length - 1] = { 
        step: 'Maintenance record created', 
        status: 'success',
        data: {
          maintenanceId: createResult.maintenance.id,
          totalCost: createResult.maintenance.total_cost_mad,
          partsCost: createResult.maintenance.parts_cost_mad,
          partsCount: createResult.parts.length
        }
      };

      // Test getting the maintenance record with parts
      results.push({ step: 'Retrieving maintenance record with parts...', status: 'running' });
      setTestResults([...results]);

      const retrievedRecord = await MaintenanceTrackingService.getMaintenanceById(createResult.maintenance.id);
      
      results[results.length - 1] = {
        step: 'Maintenance record retrieved',
        status: 'success',
        data: {
          hasPartsUsed: retrievedRecord.parts_used && retrievedRecord.parts_used.length > 0,
          partsCount: retrievedRecord.parts_used ? retrievedRecord.parts_used.length : 0
        }
      };

      // Test updating the maintenance record
      results.push({ step: 'Testing maintenance update...', status: 'running' });
      setTestResults([...results]);

      const updateData = {
        ...testMaintenanceData,
        notes: 'Updated test maintenance record',
        parts_used: [
          {
            item_id: '1',
            quantity: 1, // Reduced quantity
            notes: 'Updated part usage'
          }
        ]
      };

      const updateResult = await MaintenanceTrackingService.updateMaintenanceRecord(
        createResult.maintenance.id, 
        updateData
      );

      results[results.length - 1] = {
        step: 'Maintenance record updated',
        status: 'success',
        data: {
          newTotalCost: updateResult.maintenance.total_cost_mad,
          newPartsCost: updateResult.maintenance.parts_cost_mad,
          partsChanges: {
            added: updateResult.partsChanges.added.length,
            updated: updateResult.partsChanges.updated.length,
            removed: updateResult.partsChanges.removed.length
          }
        }
      };

      // Clean up - delete the test record
      results.push({ step: 'Cleaning up test record...', status: 'running' });
      setTestResults([...results]);

      const deleteResult = await MaintenanceTrackingService.deleteMaintenanceRecord(createResult.maintenance.id);

      results[results.length - 1] = {
        step: 'Test record cleaned up',
        status: 'success',
        data: {
          restoredItems: deleteResult.restoredInventory.length
        }
      };

      results.push({ step: 'All tests completed successfully!', status: 'success' });
      setTestResults([...results]);

    } catch (error) {
      results.push({ 
        step: 'Test failed', 
        status: 'error', 
        error: error.message 
      });
      setTestResults([...results]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>🔧 Maintenance Parts System Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button 
              onClick={checkMigration} 
              disabled={loading}
              variant="outline"
            >
              Check Migration Status
            </Button>
            <Button 
              onClick={runMigration} 
              disabled={loading}
            >
              Run Migration
            </Button>
            <Button 
              onClick={testMaintenanceCreation} 
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              Test Parts Tracking
            </Button>
          </div>

          {migrationStatus && (
            <div className={`p-4 rounded-lg ${
              migrationStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              <h3 className="font-semibold">Migration Status:</h3>
              <p>{migrationStatus.message || migrationStatus.error}</p>
            </div>
          )}

          {testResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Test Results:</h3>
              {testResults.map((result, index) => (
                <div 
                  key={index} 
                  className={`p-3 rounded-lg ${
                    result.status === 'success' ? 'bg-green-50 text-green-800' :
                    result.status === 'error' ? 'bg-red-50 text-red-800' :
                    'bg-blue-50 text-blue-800'
                  }`}
                >
                  <div className="font-medium">{result.step}</div>
                  {result.data && (
                    <pre className="text-xs mt-1 opacity-75">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  )}
                  {result.error && (
                    <div className="text-sm mt-1">Error: {result.error}</div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2">System Overview:</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✅ Junction table: app_687f658e98_maintenance_parts</li>
              <li>✅ Inventory integration with stock deduction</li>
              <li>✅ Cost calculation with parts rollup</li>
              <li>✅ Transaction safety for all operations</li>
              <li>✅ Edit reconciliation (diff old vs new parts)</li>
              <li>✅ Delete with inventory restoration</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MaintenancePartsTest;