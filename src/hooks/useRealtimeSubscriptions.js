import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { subscribeToRentals } from '../store/slices/rentalsSlice';
import { subscribeToAlerts } from '../store/slices/alertsSlice';
import { subscribeToActivityLogs } from '../store/slices/activityLogSlice';

export const useRealtimeSubscriptions = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    console.log('🔄 Setting up all realtime subscriptions...');
    
    let subscriptions = [];
    
    try {
      // Set up all subscriptions with error handling
      const rentalsSubscription = dispatch(subscribeToRentals());
      if (rentalsSubscription) {
        subscriptions.push(rentalsSubscription);
      }
      
      const alertsSubscription = dispatch(subscribeToAlerts());
      if (alertsSubscription) {
        subscriptions.push(alertsSubscription);
      }
      
      const activityLogSubscription = dispatch(subscribeToActivityLogs());
      if (activityLogSubscription) {
        subscriptions.push(activityLogSubscription);
      }
      
      console.log(`✅ Set up ${subscriptions.length} realtime subscriptions`);
    } catch (error) {
      console.warn('⚠️ Error setting up realtime subscriptions:', error);
    }

    // Cleanup function
    return () => {
      console.log('🔄 Cleaning up realtime subscriptions...');
      
      subscriptions.forEach((subscription, index) => {
        try {
          if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
            console.log(`✅ Unsubscribed from subscription ${index + 1}`);
          } else if (subscription && typeof subscription === 'function') {
            subscription();
            console.log(`✅ Called cleanup function for subscription ${index + 1}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error cleaning up subscription ${index + 1}:`, error);
        }
      });
    };
  }, [dispatch]);
};

export default useRealtimeSubscriptions;