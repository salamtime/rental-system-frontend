/**
 * QueryCachingService.js
 * Service for optimizing and caching Supabase queries
 */
class QueryCachingService {
  constructor() {
    this.cache = new Map();
    this.pendingQueries = new Map();
    this.defaultTTL = 60000; // 1 minute default TTL
    
    // Configuration for different entity types
    this.entityConfig = {
      settings: { ttl: 300000 }, // 5 minutes for settings
      tours: { ttl: 120000 }, // 2 minutes for tours
      bookings: { ttl: 60000 }, // 1 minute for bookings
      users: { ttl: 300000 }, // 5 minutes for users
    };
    
    // Debug mode for development
    this.debug = false;
  }
  
  /**
   * Get the TTL for a specific entity type
   */
  getTTL(entityType) {
    return (this.entityConfig[entityType]?.ttl) || this.defaultTTL;
  }
  
  /**
   * Generate a cache key from query parameters
   */
  generateCacheKey(entityType, queryParams) {
    const normalizedParams = queryParams ? JSON.stringify(queryParams) : '';
    return `${entityType}_${normalizedParams}`;
  }
  
  /**
   * Check if a query result is cached and still valid
   */
  isInCache(key) {
    if (!this.cache.has(key)) return false;
    
    const { timestamp, ttl } = this.cache.get(key);
    const now = Date.now();
    const isValid = (now - timestamp) < ttl;
    
    if (!isValid) {
      // Clean up expired cache entries
      this.cache.delete(key);
      return false;
    }
    
    return true;
  }
  
  /**
   * Get cached query result
   */
  getCachedResult(key) {
    if (!this.isInCache(key)) return null;
    
    const { data } = this.cache.get(key);
    return data;
  }
  
  /**
   * Set query result in cache
   */
  setCachedResult(key, data, entityType) {
    const ttl = this.getTTL(entityType);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
    
    if (this.debug) {
      console.log(`[QueryCache] Cached result for ${key} with TTL: ${ttl}ms`);
    }
  }
  
  /**
   * Execute a query with caching
   * @param {string} entityType - Type of entity (tours, bookings, etc.)
   * @param {Function} queryFn - Function that executes the actual query
   * @param {Object} queryParams - Parameters for the query (optional)
   * @param {Object} options - Additional options
   */
  async executeQuery(entityType, queryFn, queryParams = null, options = {}) {
    const { 
      forceFresh = false,
      ttl = null
    } = options;
    
    const cacheKey = this.generateCacheKey(entityType, queryParams);
    
    // Check if there's already a pending query for this key
    if (this.pendingQueries.has(cacheKey)) {
      if (this.debug) {
        console.log(`[QueryCache] Reusing pending query for ${cacheKey}`);
      }
      return this.pendingQueries.get(cacheKey);
    }
    
    // Return cached result if available and not forcing fresh data
    if (!forceFresh && this.isInCache(cacheKey)) {
      const cachedResult = this.getCachedResult(cacheKey);
      if (this.debug) {
        console.log(`[QueryCache] Cache hit for ${cacheKey}`);
      }
      return cachedResult;
    }
    
    // Create a promise for this query and store it
    const queryPromise = (async () => {
      try {
        if (this.debug) {
          console.log(`[QueryCache] Cache miss for ${cacheKey}, fetching fresh data`);
        }
        
        const result = await queryFn();
        
        // Only cache successful results
        if (!result.error && result.data !== undefined) {
          this.setCachedResult(cacheKey, result, entityType);
        }
        
        return result;
      } finally {
        // Clean up the pending query when done
        this.pendingQueries.delete(cacheKey);
      }
    })();
    
    // Store the promise so concurrent requests can reuse it
    this.pendingQueries.set(cacheKey, queryPromise);
    
    return queryPromise;
  }
  
  /**
   * Invalidate cache for a specific entity type
   */
  invalidateCache(entityType, queryParams = null) {
    if (queryParams) {
      // Invalidate specific query
      const cacheKey = this.generateCacheKey(entityType, queryParams);
      this.cache.delete(cacheKey);
      if (this.debug) {
        console.log(`[QueryCache] Invalidated cache for ${cacheKey}`);
      }
    } else {
      // Invalidate all queries for this entity type
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${entityType}_`)) {
          this.cache.delete(key);
        }
      }
      if (this.debug) {
        console.log(`[QueryCache] Invalidated all cache for ${entityType}`);
      }
    }
  }
  
  /**
   * Clear the entire cache
   */
  clearCache() {
    this.cache.clear();
    if (this.debug) {
      console.log('[QueryCache] Cleared entire cache');
    }
  }
  
  /**
   * Enable or disable debug mode
   */
  setDebugMode(enabled) {
    this.debug = enabled;
  }
}

// Create a singleton instance
const queryCachingService = new QueryCachingService();

export default queryCachingService;