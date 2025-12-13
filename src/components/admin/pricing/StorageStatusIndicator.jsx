import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Wifi, WifiOff, Database, HardDrive, RefreshCw, AlertTriangle } from 'lucide-react';
import VehicleModelsService from '../../../services/VehicleModelsService';
import LocalStorageService from '../../../services/LocalStorageService';

const StorageStatusIndicator = () => {
  const [storageStatus, setStorageStatus] = useState({
    mode: 'localStorage',
    isOnline: false,
    hasData: false
  });
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    updateStorageStatus();
  }, []);

  const updateStorageStatus = () => {
    const status = VehicleModelsService.getStorageStatus();
    setStorageStatus(status);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Try to fetch data to test connection
      await VehicleModelsService.getVehicleModels();
      updateStorageStatus();
    } catch (error) {
      console.log('Refresh failed, staying in offline mode');
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = () => {
    if (isRefreshing) {
      return <RefreshCw className="h-4 w-4 animate-spin" />;
    }
    
    switch (storageStatus.mode) {
      case 'supabase':
        return <Wifi className="h-4 w-4" />;
      case 'localStorage':
        return <HardDrive className="h-4 w-4" />;
      default:
        return <WifiOff className="h-4 w-4" />;
    }
  };

  const getStatusColor = () => {
    switch (storageStatus.mode) {
      case 'supabase':
        return 'bg-green-500';
      case 'localStorage':
        return 'bg-blue-500';
      default:
        return 'bg-red-500';
    }
  };

  const getStatusText = () => {
    switch (storageStatus.mode) {
      case 'supabase':
        return 'Online (Supabase)';
      case 'localStorage':
        return 'Offline (Local Storage)';
      default:
        return 'Disconnected';
    }
  };

  const getStatusDescription = () => {
    switch (storageStatus.mode) {
      case 'supabase':
        return 'Connected to Supabase database. All changes are synced.';
      case 'localStorage':
        return 'Using local storage due to database access issues. Data is saved locally.';
      default:
        return 'No storage available.';
    }
  };

  return (
    <Card className="mb-4 border-l-4" style={{ borderLeftColor: storageStatus.mode === 'supabase' ? '#10b981' : '#3b82f6' }}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-full ${getStatusColor()} text-white`}>
              {getStatusIcon()}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-medium text-sm">{getStatusText()}</h3>
                <Badge variant={storageStatus.mode === 'supabase' ? 'default' : 'secondary'}>
                  {storageStatus.mode === 'supabase' ? 'ONLINE' : 'OFFLINE'}
                </Badge>
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {getStatusDescription()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {storageStatus.mode === 'localStorage' && (
              <div className="flex items-center space-x-1 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Local Mode</span>
              </div>
            )}
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
              title="Test connection"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        {storageStatus.hasData && (
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex items-center space-x-4 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Database className="h-3 w-3" />
                <span>
                  {LocalStorageService.getVehicleModels().length} models, {LocalStorageService.getPricingData().length} pricing entries
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StorageStatusIndicator;