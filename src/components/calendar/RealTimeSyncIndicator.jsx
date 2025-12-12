import React from 'react';
import { Wifi, WifiOff, RefreshCw, Clock } from 'lucide-react';

const RealTimeSyncIndicator = ({ 
  isConnected, 
  lastUpdate, 
  onForceSync, 
  connectionStatus = 'disconnected' 
}) => {
  const formatLastUpdate = (date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diffMs = now - new Date(date);
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    
    if (diffSeconds < 60) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    return new Date(date).toLocaleTimeString();
  };

  return (
    <div className="flex items-center space-x-3 bg-white rounded-lg p-3 shadow-md border">
      {/* Connection Status */}
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-bold ${
        isConnected 
          ? 'bg-green-100 text-green-800 border border-green-300'
          : 'bg-red-100 text-red-800 border border-red-300'
      }`}>
        {isConnected ? (
          <Wifi className="h-4 w-4" />
        ) : (
          <WifiOff className="h-4 w-4" />
        )}
        <span>Real-time: {connectionStatus.toUpperCase()}</span>
      </div>

      {/* Last Update */}
      {lastUpdate && (
        <div className="flex items-center space-x-1 text-sm text-gray-600">
          <Clock className="h-4 w-4" />
          <span>Updated: {formatLastUpdate(lastUpdate)}</span>
        </div>
      )}

      {/* Force Sync Button */}
      <button
        onClick={onForceSync}
        className="flex items-center space-x-1 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
        title="Force refresh data"
      >
        <RefreshCw className="h-4 w-4" />
        <span>Sync</span>
      </button>
    </div>
  );
};

export default RealTimeSyncIndicator;