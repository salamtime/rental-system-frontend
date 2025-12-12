import React, { useState, useEffect } from 'react';
import { useConnectionStatus } from '../../hooks/useConnectionStatus';
import { AlertCircle, X, Wifi } from 'lucide-react';

const OfflineNotification = () => {
  const { isConnected, isChecking } = useConnectionStatus();
  const [showNotification, setShowNotification] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isConnected && !isChecking && !dismissed) {
      setShowNotification(true);
    } else if (isConnected) {
      setShowNotification(false);
      setDismissed(false); // Reset dismissed state when connection is restored
    }
  }, [isConnected, isChecking, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setShowNotification(false);
  };

  if (!showNotification) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-orange-800">
              Database Disconnected
            </h3>
            <p className="text-sm text-orange-700 mt-1">
              Running in offline mode. Some features may be limited. The app will automatically reconnect when the database is available.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-orange-400 hover:text-orange-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineNotification;