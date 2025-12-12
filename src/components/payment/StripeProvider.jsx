import React from 'react';

// Completely disabled Stripe provider - no initialization, no errors, no logging
const StripeProvider = ({ children }) => {
  // Simply render children without any Stripe functionality
  return <>{children}</>;
};

export default StripeProvider;