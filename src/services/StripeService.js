import { supabase } from '../utils/supabaseClient';

// Safe Stripe connectivity test - handles blocked requests gracefully
export const testStripeConnectivity = async () => {
  try {
    // Don't directly call api.stripe.com - use Stripe.js library instead
    if (typeof window !== 'undefined' && window.Stripe) {
      const stripe = window.Stripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) {
        throw new Error('Invalid Stripe configuration');
      }
      return { connected: true };
    } else {
      console.warn('Stripe.js not loaded - payment functionality may be limited');
      return { connected: false, error: 'Stripe.js not available' };
    }
  } catch (error) {
    console.warn('Stripe connectivity test failed:', error.message);
    return { connected: false, error: error.message };
  }
};

// Safe payment intent creation with error handling
export const createPaymentIntent = async (amount, currency = 'usd') => {
  try {
    // Use edge function instead of direct API calls
    const { data, error } = await supabase.functions.invoke('create-payment-intent', {
      body: { amount, currency }
    });
    
    if (error) throw error;
    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Payment service blocked by browser security settings');
    }
    console.error('Payment intent creation failed:', error);
    throw new Error('Payment service temporarily unavailable');
  }
};

// Handle Stripe errors gracefully
export const handleStripeError = (error) => {
  console.warn('Stripe operation failed:', error);
  
  if (error.message?.includes('blocked') || error.message?.includes('ERR_BLOCKED_BY_CLIENT')) {
    return {
      type: 'blocked',
      message: 'Payment service is blocked by browser security settings. Please disable ad blockers for this site.'
    };
  }
  
  if (error.message?.includes('network') || error.message?.includes('fetch')) {
    return {
      type: 'network',
      message: 'Unable to connect to payment service. Please check your internet connection.'
    };
  }
  
  return {
    type: 'unknown',
    message: 'Payment service temporarily unavailable. Please try again later.'
  };
};

export default {
  testStripeConnectivity,
  createPaymentIntent,
  handleStripeError
};