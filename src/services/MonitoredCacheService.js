import cacheService from './CacheService';
import performanceMonitor from '../utils/PerformanceMonitor';

/**
 * Enhanced Cache Service with Performance Monitoring
 * Wraps the existing cache service to add performance tracking
 */
class MonitoredCacheService {
  constructor() {
    this.originalCacheService = cacheService;
  }

  /**
   * Enhanced cached query with performance monitoring
   */
  async cachedQuery(service, method, queryFn, params = {}, ttl = null) {
    const startTime = performance.now();
    const cacheKey = this.originalCacheService.generateCacheKey(service, method, params);
    
    try {
      // Check cache first
      const cached = this.originalCacheService.get(cacheKey);
      const wasCached = cached !== null;
      
      let result;
      if (wasCached) {
        result = cached;
      } else {
        // Execute query
        result = await queryFn();
        // Cache the result
        this.originalCacheService.set(cacheKey, result, ttl);
      }
      
      const duration = performance.now() - startTime;
      
      // Record performance metrics
      performanceMonitor.recordQuery({
        service,
        method,
        duration,
        success: true,
        cached: wasCached,
        recordCount: Array.isArray(result) ? result.length : (result ? 1 : 0),
        cacheKey
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Record failed query
      performanceMonitor.recordQuery({
        service,
        method,
        duration,
        success: false,
        cached: false,
        error: error.message,
        cacheKey
      });
      
      // Record error
      performanceMonitor.recordError({
        type: 'query',
        message: error.message,
        stack: error.stack,
        context: { service, method, params },
        severity: 'error'
      });
      
      throw error;
    }
  }

  /**
   * Monitor cache operations
   */
  get(key) {
    const startTime = performance.now();
    const result = this.originalCacheService.get(key);
    const duration = performance.now() - startTime;
    
    // Record cache access
    performanceMonitor.recordQuery({
      service: 'cache',
      method: 'get',
      duration,
      success: true,
      cached: result !== null,
      recordCount: result ? 1 : 0
    });
    
    return result;
  }

  /**
   * Monitor cache set operations
   */
  set(key, data, ttl = null) {
    const startTime = performance.now();
    const result = this.originalCacheService.set(key, data, ttl);
    const duration = performance.now() - startTime;
    
    performanceMonitor.recordQuery({
      service: 'cache',
      method: 'set',
      duration,
      success: true,
      cached: false,
      recordCount: 1
    });
    
    return result;
  }

  /**
   * Monitor cache invalidation
   */
  invalidate(pattern) {
    const startTime = performance.now();
    const invalidatedCount = this.originalCacheService.invalidate(pattern);
    const duration = performance.now() - startTime;
    
    performanceMonitor.recordQuery({
      service: 'cache',
      method: 'invalidate',
      duration,
      success: true,
      cached: false,
      recordCount: invalidatedCount
    });
    
    return invalidatedCount;
  }

  /**
   * Monitor cache invalidation by relation
   */
  invalidateRelated(service) {
    const startTime = performance.now();
    const invalidatedCount = this.originalCacheService.invalidateRelated(service);
    const duration = performance.now() - startTime;
    
    performanceMonitor.recordQuery({
      service: 'cache',
      method: 'invalidateRelated',
      duration,
      success: true,
      cached: false,
      recordCount: invalidatedCount
    });
    
    return invalidatedCount;
  }

  /**
   * Get enhanced cache statistics with performance data
   */
  getEnhancedStats() {
    const cacheStats = this.originalCacheService.getStats();
    const performanceStats = performanceMonitor.getStats();
    
    return {
      cache: cacheStats,
      performance: {
        queries: performanceStats.queries,
        cacheOperations: performanceStats.queries.count || 0,
        averageQueryTime: performanceStats.queries.averageDuration || 0,
        cacheHitRate: cacheStats.hitRate
      },
      recommendations: this.generateCacheRecommendations(cacheStats, performanceStats)
    };
  }

  /**
   * Generate cache-specific recommendations
   */
  generateCacheRecommendations(cacheStats, performanceStats) {
    const recommendations = [];
    const hitRate = parseFloat(cacheStats.hitRate || 0);
    const avgQueryTime = performanceStats.queries.averageDuration || 0;
    
    if (hitRate < 30) {
      recommendations.push({
        type: 'cache_hit_rate',
        priority: 'high',
        message: `Low cache hit rate (${cacheStats.hitRate}). Consider increasing TTL values or preloading data.`
      });
    }
    
    if (avgQueryTime > 500) {
      recommendations.push({
        type: 'query_performance',
        priority: 'medium',
        message: `Average query time is ${avgQueryTime}ms. Consider optimizing slow queries or adding more caching.`
      });
    }
    
    if (cacheStats.cacheSize > 1000) {
      recommendations.push({
        type: 'cache_size',
        priority: 'low',
        message: `Large cache size (${cacheStats.cacheSize} entries). Consider implementing LRU eviction.`
      });
    }
    
    return recommendations;
  }

  // Delegate all other methods to original cache service
  generateCacheKey(...args) {
    return this.originalCacheService.generateCacheKey(...args);
  }

  clear() {
    const startTime = performance.now();
    const result = this.originalCacheService.clear();
    const duration = performance.now() - startTime;
    
    performanceMonitor.recordQuery({
      service: 'cache',
      method: 'clear',
      duration,
      success: true,
      cached: false,
      recordCount: result
    });
    
    return result;
  }

  getStats() {
    return this.originalCacheService.getStats();
  }

  getCacheByService(service) {
    return this.originalCacheService.getCacheByService(service);
  }

  getHealthReport() {
    const cacheHealth = this.originalCacheService.getHealthReport();
    const performanceStats = performanceMonitor.getStats();
    
    return {
      ...cacheHealth,
      performance: {
        totalQueries: performanceStats.overall.totalQueries,
        averageQueryTime: performanceStats.queries.averageDuration || 0,
        slowQueryRate: performanceStats.queries.slowQueryRate || '0.00',
        errorRate: performanceStats.errors.count > 0 ? 
          ((performanceStats.errors.count / performanceStats.overall.totalQueries) * 100).toFixed(2) : '0.00'
      }
    };
  }

  preloadCache(preloadConfig) {
    return this.originalCacheService.preloadCache(preloadConfig);
  }
}

// Create singleton instance
const monitoredCacheService = new MonitoredCacheService();

export default monitoredCacheService;