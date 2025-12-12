import React, { useState, useEffect } from 'react';
import { Database, HardDrive, Package2, RefreshCw, Check, AlertTriangle, XCircle } from 'lucide-react';
import { usePricing } from '../../contexts/PricingContext';

/**
 * A component to display detailed pricing connection status
 * Can be included in key pages to help debug pricing issues
 */
const PricingConnectionStatus = () => {
  const { 
    settings, 
    loading, 
    error, 
    source, 
    online,
    reloadSettings 
  } = usePricing();

  const [expanded, setExpanded] = useState(false);

  const handleRefresh = async (e) => {
    if (e) {
      e.preventDefault();
      // Don't stop propagation as it may interfere with navigation
    }
    await reloadSettings();
  };

  const getStatusColor = () => {
    if (loading) return 'bg-gray-100 text-gray-700';
    if (error) return 'bg-red-100 text-red-700';
    
    switch(source) {
      case 'database':
        return 'bg-green-100 text-green-700';
      case 'cache':
        return 'bg-yellow-100 text-yellow-700';
      case 'default':
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusIcon = () => {
    if (loading) return <RefreshCw size={16} className="animate-spin" />;
    if (error) return <XCircle size={16} />;
    
    switch(source) {
      case 'database':
        return <Database size={16} />;
      case 'cache':
        return <HardDrive size={16} />;
      case 'default':
      default:
        return <Package2 size={16} />;
    }
  };

  const getStatusText = () => {
    if (loading) return 'Loading...';
    if (error) return 'Error';
    
    switch(source) {
      case 'database':
        return 'Database';
      case 'cache':
        return 'Cache';
      case 'default':
      default:
        return 'Default';
    }
  };

  const getStatusTitle = () => {
    if (loading) return 'Loading settings...';
    if (error) return `Error: ${error.message}`;
    
    switch(source) {
      case 'database':
        return 'Using live settings from database';
      case 'cache':
        return 'Using cached settings (database unavailable)';
      case 'default':
      default:
        return 'Using default settings (database and cache unavailable)';
    }
  };

  const getConnectivityStatus = () => {
    if (online) {
      return <span className="flex items-center gap-1 text-green-600"><Check size={14} /> Online</span>;
    } else {
      return <span className="flex items-center gap-1 text-red-600"><AlertTriangle size={14} /> Offline</span>;
    }
  };

  return (
    <div className="relative">
      <div 
        className={`rounded-lg px-3 py-2 text-xs flex items-center cursor-pointer ${getStatusColor()}`}
        onClick={() => setExpanded(!expanded)}
        title={getStatusTitle()}
      >
        <div className="flex items-center">
          {getStatusIcon()}
          <span className="ml-2 font-medium">
            Pricing: {getStatusText()}
          </span>
        </div>
        <button 
          className="ml-2 p-1 rounded-full hover:bg-white/20 transition-colors"
          onClick={handleRefresh}
          title="Refresh settings"
        >
          <RefreshCw size={12} />
        </button>
      </div>
      
      {expanded && (
        <div className="absolute top-full mt-1 right-0 w-64 bg-white border rounded-lg shadow-lg p-3 z-10">
          <div className="text-sm font-medium mb-2">Pricing Settings Status</div>
          
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-600">Source:</span>
              <span className="font-medium">{source}</span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-600">Network:</span>
              {getConnectivityStatus()}
            </div>
            
            {error && (
              <div className="mt-2 pt-2 border-t">
                <span className="text-red-600 font-medium block mb-1">Error Details:</span>
                <span className="text-red-600 break-words">{error.message}</span>
              </div>
            )}
            
            <div className="mt-2 pt-2 border-t">
              <div className="text-gray-700 font-medium mb-1">Current Settings:</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                <span className="text-gray-600">1h Rate:</span>
                <span>${settings.defaultRate1h}</span>
                
                <span className="text-gray-600">2h Rate:</span>
                <span>${settings.defaultRate2h}</span>
              </div>
            </div>
            
            <div className="mt-2 pt-2 border-t flex justify-end">
              <button
                onClick={handleRefresh}
                className="px-2 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 flex items-center"
              >
                <RefreshCw size={12} className="mr-1" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PricingConnectionStatus;