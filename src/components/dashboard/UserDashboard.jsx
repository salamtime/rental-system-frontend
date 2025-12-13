import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Star, 
  TrendingUp, 
  Users, 
  CreditCard,
  Bell,
  Settings,
  ChevronRight,
  Plus,
  Filter,
  Download
} from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchAllBookings } from '../../store/slices/bookingsSlice';
import { fetchRentals } from '../../store/slices/rentalsSlice';
import CacheService from '../../services/CacheService';
import PerformanceMonitor from '../../utils/PerformanceMonitor';
import NotificationCenter from '../notifications/NotificationCenter';

const UserDashboard = ({ userId }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  
  // Redux state
  const { items: bookings, loading: bookingsLoading } = useSelector(state => state.bookings);
  const { items: rentals, loading: rentalsLoading } = useSelector(state => state.rentals);
  
  // Local state
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState('30'); // days
  const [recommendations, setRecommendations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const cache = useMemo(() => new CacheService('user_dashboard'), []);

  useEffect(() => {
    loadDashboardData();
  }, [dispatch, userId, dateRange]);

  const loadDashboardData = async () => {
    const startTime = performance.now();
    setIsLoading(true);
    
    try {
      // Load user's bookings and rentals
      await Promise.all([
        dispatch(fetchAllBookings({ userId })),
        dispatch(fetchRentals({ userId }))
      ]);
      
      // Generate personalized recommendations
      await generateRecommendations();
      
      PerformanceMonitor.recordUserInteraction({
        type: 'dashboard_load',
        element: 'user_dashboard',
        duration: performance.now() - startTime,
        success: true
      });
      
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      
      PerformanceMonitor.recordError({
        type: 'dashboard',
        message: error.message,
        context: { userId, dateRange },
        severity: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      // Check cache first
      const cacheKey = `recommendations_${userId}_${dateRange}`;
      const cached = await cache.get(cacheKey);
      
      if (cached) {
        setRecommendations(cached);
        return;
      }

      // Generate recommendations based on user history
      const userBookings = bookings.filter(b => b.user_id === userId);
      const userRentals = rentals.filter(r => r.user_id === userId);
      
      const newRecommendations = [];
      
      // Recommend based on popular tours
      if (userBookings.length > 0) {
        const lastTourType = userBookings[0]?.tour_type;
        if (lastTourType === 'desert_adventure') {
          newRecommendations.push({
            id: 'mountain_trail',
            type: 'tour',
            title: t('recommendations.tryMountainTrail', 'Try Mountain Trail'),
            description: t('recommendations.mountainTrailDesc', 'Experience scenic mountain views'),
            image: '/images/mountain-tour.jpg',
            priority: 'high'
          });
        }
      }
      
      // Recommend seasonal tours
      const currentMonth = new Date().getMonth();
      if (currentMonth >= 5 && currentMonth <= 8) { // Summer
        newRecommendations.push({
          id: 'sunset_tour',
          type: 'tour',
          title: t('recommendations.sunsetTour', 'Perfect for Summer Evenings'),
          description: t('recommendations.sunsetTourDesc', 'Beat the heat with our sunset tours'),
          image: '/images/sunset-tour.jpg',
          priority: 'medium'
        });
      }
      
      // Recommend group discounts
      if (userBookings.some(b => b.group_size > 4)) {
        newRecommendations.push({
          id: 'group_discount',
          type: 'promotion',
          title: t('recommendations.groupDiscount', 'Group Discount Available'),
          description: t('recommendations.groupDiscountDesc', '15% off for groups of 6 or more'),
          priority: 'low'
        });
      }
      
      // Cache recommendations
      await cache.set(cacheKey, newRecommendations, 24 * 60 * 60 * 1000); // 24 hours
      setRecommendations(newRecommendations);
      
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  };

  // Calculate dashboard statistics
  const stats = useMemo(() => {
    const userBookings = bookings.filter(b => b.user_id === userId);
    const userRentals = rentals.filter(r => r.user_id === userId);
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));
    
    const recentBookings = userBookings.filter(b => 
      new Date(b.created_at) >= cutoffDate
    );
    const recentRentals = userRentals.filter(r => 
      new Date(r.created_at) >= cutoffDate
    );
    
    const upcomingBookings = userBookings.filter(b => 
      new Date(b.start_date) > new Date() && b.status !== 'cancelled'
    );
    
    const totalSpent = [...recentBookings, ...recentRentals].reduce((sum, item) => 
      sum + (parseFloat(item.total_amount) || 0), 0
    );
    
    return {
      totalBookings: recentBookings.length,
      totalRentals: recentRentals.length,
      upcomingBookings: upcomingBookings.length,
      totalSpent,
      completedTours: userBookings.filter(b => b.status === 'completed').length,
      favoriteActivity: getMostFrequentActivity(userBookings)
    };
  }, [bookings, rentals, userId, dateRange]);

  const getMostFrequentActivity = (userBookings) => {
    const activities = userBookings.reduce((acc, booking) => {
      acc[booking.tour_type] = (acc[booking.tour_type] || 0) + 1;
      return acc;
    }, {});
    
    const mostFrequent = Object.entries(activities).sort(([,a], [,b]) => b - a)[0];
    return mostFrequent ? mostFrequent[0] : null;
  };

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(b => b.user_id === userId && new Date(b.start_date) > new Date() && b.status !== 'cancelled')
      .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
      .slice(0, 3);
  }, [bookings, userId]);

  const recentActivity = useMemo(() => {
    const allActivities = [
      ...bookings.filter(b => b.user_id === userId).map(b => ({ ...b, type: 'booking' })),
      ...rentals.filter(r => r.user_id === userId).map(r => ({ ...r, type: 'rental' }))
    ];
    
    return allActivities
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);
  }, [bookings, rentals, userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading', 'Loading your dashboard...')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl font-bold text-gray-900">
                  {t('dashboard.welcome', 'Welcome back!')}
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  {t('dashboard.subtitle', 'Here\'s what\'s happening with your adventures')}
                </p>
              </div>
              
              <div className="flex items-center space-x-4">
                {/* Date Range Filter */}
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="7">{t('dashboard.last7days', 'Last 7 days')}</option>
                  <option value="30">{t('dashboard.last30days', 'Last 30 days')}</option>
                  <option value="90">{t('dashboard.last90days', 'Last 90 days')}</option>
                  <option value="365">{t('dashboard.lastYear', 'Last year')}</option>
                </select>
                
                {/* Notifications */}
                <NotificationCenter />
                
                {/* Settings */}
                <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors rounded-lg">
                  <Settings className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title={t('dashboard.totalBookings', 'Total Bookings')}
            value={stats.totalBookings}
            icon={Calendar}
            color="blue"
            change="+12%"
          />
          <StatCard
            title={t('dashboard.totalRentals', 'Total Rentals')}
            value={stats.totalRentals}
            icon={Clock}
            color="green"
            change="+8%"
          />
          <StatCard
            title={t('dashboard.upcomingBookings', 'Upcoming')}
            value={stats.upcomingBookings}
            icon={Bell}
            color="yellow"
          />
          <StatCard
            title={t('dashboard.totalSpent', 'Total Spent')}
            value={`$${stats.totalSpent.toFixed(2)}`}
            icon={CreditCard}
            color="purple"
            change="+15%"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Upcoming Bookings */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    {t('dashboard.upcomingBookings', 'Upcoming Bookings')}
                  </h2>
                  <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                    {t('common.viewAll', 'View All')}
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {upcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">
                      {t('dashboard.noUpcomingBookings', 'No upcoming bookings')}
                    </p>
                    <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('dashboard.bookNow', 'Book Now')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <BookingCard key={booking.id} booking={booking} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.recentActivity', 'Recent Activity')}
                </h2>
              </div>
              
              <div className="p-6">
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <ActivityItem key={`${activity.type}-${activity.id}`} activity={activity} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.quickActions', 'Quick Actions')}
                </h2>
              </div>
              
              <div className="p-6 space-y-3">
                <QuickActionButton
                  icon={Plus}
                  label={t('dashboard.newBooking', 'New Booking')}
                  onClick={() => {/* Handle new booking */}}
                />
                <QuickActionButton
                  icon={Calendar}
                  label={t('dashboard.viewCalendar', 'View Calendar')}
                  onClick={() => {/* Handle view calendar */}}
                />
                <QuickActionButton
                  icon={Download}
                  label={t('dashboard.downloadHistory', 'Download History')}
                  onClick={() => {/* Handle download */}}
                />
                <QuickActionButton
                  icon={Settings}
                  label={t('dashboard.preferences', 'Preferences')}
                  onClick={() => {/* Handle preferences */}}
                />
              </div>
            </div>

            {/* Recommendations */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.recommendations', 'Recommended for You')}
                </h2>
              </div>
              
              <div className="p-6">
                {recommendations.length === 0 ? (
                  <div className="text-center py-4">
                    <Star className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">
                      {t('dashboard.noRecommendations', 'No recommendations yet')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recommendations.map((recommendation) => (
                      <RecommendationCard 
                        key={recommendation.id} 
                        recommendation={recommendation} 
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Performance Insights */}
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('dashboard.insights', 'Your Adventure Stats')}
                </h2>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {t('dashboard.completedTours', 'Completed Tours')}
                  </span>
                  <span className="font-semibold">{stats.completedTours}</span>
                </div>
                
                {stats.favoriteActivity && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      {t('dashboard.favoriteActivity', 'Favorite Activity')}
                    </span>
                    <span className="font-semibold capitalize">
                      {stats.favoriteActivity.replace('_', ' ')}
                    </span>
                  </div>
                )}
                
                <div className="pt-4 border-t">
                  <div className="flex items-center text-sm text-green-600">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    {t('dashboard.adventureLevel', 'Adventure Level: Explorer')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component: Stat Card
const StatCard = ({ title, value, icon: Icon, color, change }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border p-6"
    >
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-center">
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {change && (
              <span className="ml-2 text-sm text-green-600 font-medium">
                {change}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Component: Booking Card
const BookingCard = ({ booking }) => {
  const { t } = useTranslation();
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">
            {booking.tour_type?.replace('_', ' ') || 'Tour'}
          </h3>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <Calendar className="h-4 w-4 mr-1" />
            {new Date(booking.start_date).toLocaleDateString()}
            <Clock className="h-4 w-4 ml-3 mr-1" />
            {booking.start_time}
          </div>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <Users className="h-4 w-4 mr-1" />
            {booking.group_size} people
            <MapPin className="h-4 w-4 ml-3 mr-1" />
            {booking.location || 'Main Location'}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-gray-400" />
      </div>
    </motion.div>
  );
};

// Component: Activity Item
const ActivityItem = ({ activity }) => {
  const { t } = useTranslation();
  
  const getActivityIcon = (type) => {
    switch (type) {
      case 'booking': return Calendar;
      case 'rental': return Clock;
      default: return Calendar;
    }
  };
  
  const Icon = getActivityIcon(activity.type);
  
  return (
    <div className="flex items-center space-x-3">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-gray-600" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">
          {activity.type === 'booking' ? 'Tour Booking' : 'Vehicle Rental'}
        </p>
        <p className="text-sm text-gray-500">
          {new Date(activity.created_at).toLocaleDateString()}
        </p>
      </div>
      <div className="text-sm text-gray-900 font-medium">
        ${activity.total_amount || '0.00'}
      </div>
    </div>
  );
};

// Component: Quick Action Button
const QuickActionButton = ({ icon: Icon, label, onClick }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="flex items-center">
        <Icon className="h-5 w-5 text-gray-600 mr-3" />
        <span className="text-sm font-medium text-gray-900">{label}</span>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </motion.button>
  );
};

// Component: Recommendation Card
const RecommendationCard = ({ recommendation }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-medium text-gray-900 text-sm">{recommendation.title}</h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
          {recommendation.priority}
        </span>
      </div>
      <p className="text-sm text-gray-600">{recommendation.description}</p>
    </motion.div>
  );
};

export default UserDashboard;