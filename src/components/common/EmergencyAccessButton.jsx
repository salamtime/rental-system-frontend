import React from 'react';

// Emergency access button removed - production security
const EmergencyAccessButton = () => {
  return (
    <div className="text-xs text-gray-500 mt-2">
      Emergency access disabled in production
    </div>
  );
};

export default EmergencyAccessButton;