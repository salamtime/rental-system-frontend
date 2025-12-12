// Global error handlers for common third-party service failures

// List of extension-related patterns to silently ignore
const SILENT_EXTENSION_PATTERNS = [
  'cloudflareinsights',
  'beacon.min.js',
  'chrome-extension://',
  'extension://',
  'chrome.runtime',
  'moz-extension://',
  'ERR_BLOCKED_BY_CLIENT',
  'ERR_EXTENSION',
  'browser-extension'
];

// Handle Cloudflare analytics blocking and browser extensions
export const setupAnalyticsErrorHandler = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      // Early return for null events
      if (!event || !event.filename) return;
      
      // Check if error is from a known extension or analytics script
      const shouldSilentlyIgnore = SILENT_EXTENSION_PATTERNS.some(pattern => 
        event.filename && event.filename.includes(pattern)
      );
      
      if (shouldSilentlyIgnore) {
        // Silently handle - no console output
        event.preventDefault();
        return true;
      }
    });

    // Handle unhandled promise rejections from blocked scripts
    window.addEventListener('unhandledrejection', (event) => {
      // Early return for null events
      if (!event || !event.reason) return;
      
      const reasonStr = typeof event.reason === 'string' 
        ? event.reason 
        : event.reason?.message || '';
      
      // Check against extension patterns
      const shouldSilentlyIgnore = SILENT_EXTENSION_PATTERNS.some(pattern => 
        reasonStr.includes(pattern)
      );
      
      if (shouldSilentlyIgnore) {
        // Silently handle - no console output
        event.preventDefault();
        return true;
      }
    });
  }
};

// Handle Stripe-specific errors
export const setupStripeErrorHandler = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      // Early return for null events
      if (!event || !event.filename) return;
      
      if (event.filename && (
        event.filename.includes('stripe.com') ||
        event.filename.includes('r.stripe.com')
      )) {
        // Only log this warning in development mode
        if (process.env.NODE_ENV === 'development') {
          console.warn('Stripe service blocked - payment functionality may be limited');
        }
        event.preventDefault();
        return true;
      }
    });
  }
};

// Filter console logs for common extension errors
export const setupConsoleFilter = () => {
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
    // Store original console methods
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Extension error patterns to filter
    const extensionPatterns = [
      'chrome-extension://',
      'extension://',
      'moz-extension://',
      'browser-extension',
      'ERR_BLOCKED_BY_CLIENT',
      'chrome.runtime',
      'The above error occurred in the'
    ];
    
    // Override console.error
    console.error = function(...args) {
      // Check if any argument contains extension-related strings
      const isExtensionError = args.some(arg => {
        if (typeof arg === 'string') {
          return extensionPatterns.some(pattern => arg.includes(pattern));
        }
        return false;
      });
      
      // Only pass through non-extension errors
      if (!isExtensionError) {
        originalConsoleError.apply(console, args);
      }
    };
    
    // Override console.warn with similar logic
    console.warn = function(...args) {
      const isExtensionWarning = args.some(arg => {
        if (typeof arg === 'string') {
          return extensionPatterns.some(pattern => arg.includes(pattern));
        }
        return false;
      });
      
      if (!isExtensionWarning) {
        originalConsoleWarn.apply(console, args);
      }
    };
  }
};

// Setup all error handlers
export const initializeErrorHandlers = () => {
  setupAnalyticsErrorHandler();
  setupStripeErrorHandler();
  setupConsoleFilter();
  
  // Only log initialization in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log('Error handlers initialized for third-party services');
  }
};

export default {
  setupAnalyticsErrorHandler,
  setupStripeErrorHandler,
  initializeErrorHandlers
};