import cacheService from '../services/CacheService';
import CachedVehicleService from '../services/CachedVehicleService';
import CachedBookingService from '../services/CachedBookingService';
import CachedRentalService from '../services/CachedRentalService';
import CachedToursService from '../services/CachedToursService';
import CachedPricingService from '../services/CachedPricingService';

/**
 * Cache Preloader - Preloads frequently accessed data
 */
class CachePreloader {
  
  /**
   * Preload essential data on application startup
   */
  static async preloadEssentialData() {
    console.log('🚀 Starting cache preload for essential data...');
    
    const preloadConfig = [
      // Vehicle data
      {
        service: 'vehicles',
        method: 'getAllVehicles',
        queryFn: () => CachedVehicleService.getAllVehicles(),
        ttl: 5 * 60 * 1000
      },
      {
        service: 'vehicles',
        method: 'getAvailableVehicles',
        queryFn: () => CachedVehicleService.getAvailableVehicles(),
        ttl: 2 * 60 * 1000
      },
      
      // Pricing data
      {
        service: 'pricing',
        method: 'getAllPricing',
        queryFn: () => CachedPricingService.getAllPricing(),
        ttl: 15 * 60 * 1000
      },
      {
        service: 'pricing',
        method: 'getPricingRules',
        queryFn: () => CachedPricingService.getPricingRules(),
        ttl: 30 * 60 * 1000
      },
      
      // Tours data
      {
        service: 'tours',
        method: 'getPopularTours',
        queryFn: () => CachedToursService.getPopularTours(),
        ttl: 30 * 60 * 1000
      },
      
      // Active rentals and bookings
      {
        service: 'rentals',
        method: 'getActiveRentals',
        queryFn: () => CachedRentalService.getActiveRentals(),
        ttl: 1 * 60 * 1000
      },
      {
        service: 'bookings',
        method: 'getUpcomingBookings',
        queryFn: () => CachedBookingService.getUpcomingBookings(),
        ttl: 1 * 60 * 1000
      }
    ];

    await cacheService.preloadCache(preloadConfig);
    console.log('✅ Essential data preload completed');
  }

  /**
   * Preload dashboard data
   */
  static async preloadDashboardData() {
    console.log('📊 Preloading dashboard data...');
    
    const dashboardConfig = [
      {
        service: 'vehicles',
        method: 'getVehicleStatistics',
        queryFn: () => CachedVehicleService.getVehicleStatistics(),
        ttl: 10 * 60 * 1000
      },
      {
        service: 'bookings',
        method: 'getBookingStatistics',
        queryFn: () => CachedBookingService.getBookingStatistics(),
        ttl: 10 * 60 * 1000
      },
      {
        service: 'rentals',
        method: 'getRentalStatistics',
        queryFn: () => CachedRentalService.getRentalStatistics(),
        ttl: 10 * 60 * 1000
      },
      {
        service: 'tours',
        method: 'getTourStatistics',
        queryFn: () => CachedToursService.getTourStatistics(),
        ttl: 15 * 60 * 1000
      }
    ];

    await cacheService.preloadCache(dashboardConfig);
    console.log('✅ Dashboard data preload completed');
  }

  /**
   * Preload data based on user role
   */
  static async preloadUserRoleData(userRole) {
    console.log(`👤 Preloading data for user role: ${userRole}`);
    
    const roleConfigs = {
      admin: [
        {
          service: 'vehicles',
          method: 'getAllVehicles',
          queryFn: () => CachedVehicleService.getAllVehicles(),
          ttl: 5 * 60 * 1000
        },
        {
          service: 'bookings',
          method: 'getAllBookings',
          queryFn: () => CachedBookingService.getAllBookings(),
          ttl: 2 * 60 * 1000
        },
        {
          service: 'rentals',
          method: 'getAllRentals',
          queryFn: () => CachedRentalService.getAllRentals(),
          ttl: 2 * 60 * 1000
        }
      ],
      manager: [
        {
          service: 'vehicles',
          method: 'getAvailableVehicles',
          queryFn: () => CachedVehicleService.getAvailableVehicles(),
          ttl: 2 * 60 * 1000
        },
        {
          service: 'bookings',
          method: 'getUpcomingBookings',
          queryFn: () => CachedBookingService.getUpcomingBookings(20),
          ttl: 1 * 60 * 1000
        }
      ],
      customer: [
        {
          service: 'tours',
          method: 'getAllTours',
          queryFn: () => CachedToursService.getAllTours(),
          ttl: 10 * 60 * 1000
        },
        {
          service: 'vehicles',
          method: 'getAvailableVehicles',
          queryFn: () => CachedVehicleService.getAvailableVehicles(),
          ttl: 2 * 60 * 1000
        }
      ]
    };

    const config = roleConfigs[userRole] || roleConfigs.customer;
    await cacheService.preloadCache(config);
    console.log(`✅ User role data preload completed for: ${userRole}`);
  }

  /**
   * Warm up cache with frequently accessed data patterns
   */
  static async warmUpCache() {
    console.log('🔥 Warming up cache with frequent access patterns...');
    
    try {
      // Warm up with current date data
      const today = new Date().toISOString().split('T')[0];
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      await Promise.all([
        CachedToursService.getAvailableTours(today),
        CachedToursService.getAvailableTours(tomorrow),
        CachedBookingService.getBookingsByDateRange(today, tomorrow),
        CachedVehicleService.getAvailableVehicles({ date: today }),
        CachedPricingService.getSeasonalPricing(today)
      ]);
      
      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.error('❌ Cache warm-up failed:', error);
    }
  }

  /**
   * Schedule periodic cache refresh
   */
  static schedulePeriodicRefresh() {
    console.log('⏰ Scheduling periodic cache refresh...');
    
    // Refresh essential data every 5 minutes
    setInterval(async () => {
      try {
        await this.preloadEssentialData();
        console.log('🔄 Periodic cache refresh completed');
      } catch (error) {
        console.error('❌ Periodic cache refresh failed:', error);
      }
    }, 5 * 60 * 1000);

    // Refresh dashboard data every 10 minutes
    setInterval(async () => {
      try {
        await this.preloadDashboardData();
        console.log('📊 Dashboard cache refresh completed');
      } catch (error) {
        console.error('❌ Dashboard cache refresh failed:', error);
      }
    }, 10 * 60 * 1000);
  }

  /**
   * Initialize cache system
   */
  static async initialize(userRole = 'customer') {
    console.log('🎯 Initializing cache system...');
    
    try {
      // Clear any stale cache
      cacheService.clear();
      
      // Preload essential data
      await this.preloadEssentialData();
      
      // Preload role-specific data
      await this.preloadUserRoleData(userRole);
      
      // Warm up cache
      await this.warmUpCache();
      
      // Schedule periodic refresh
      this.schedulePeriodicRefresh();
      
      console.log('✅ Cache system initialization completed');
      
      // Log initial cache stats
      const stats = cacheService.getStats();
      console.log('📈 Initial cache stats:', stats);
      
    } catch (error) {
      console.error('❌ Cache system initialization failed:', error);
    }
  }
}

export default CachePreloader;