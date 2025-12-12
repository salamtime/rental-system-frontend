import { supabase } from '../lib/supabase';

export class SeasonalPricingService {
  // Get all seasonal pricing rules
  static async getSeasonalRules() {
    try {
      const { data, error } = await supabase
        .from('seasonal_pricing_rules')
        .select(`
          *,
          saharax_0u4w4d_vehicle_models!inner(id, make, model, vehicle_type)
        `)
        .eq('active', true)
        .order('start_date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching seasonal rules:', error);
      throw error;
    }
  }

  // Create or update seasonal pricing rule
  static async upsertSeasonalRule(ruleData) {
    try {
      const { data, error } = await supabase
        .from('seasonal_pricing_rules')
        .upsert({
          vehicle_model_id: ruleData.vehicle_model_id,
          season_name: ruleData.season_name,
          multiplier: parseFloat(ruleData.multiplier),
          start_date: ruleData.start_date,
          end_date: ruleData.end_date,
          active: true,
          description: ruleData.description
        })
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error upserting seasonal rule:', error);
      throw error;
    }
  }

  // Get discount rules
  static async getDiscountRules() {
    try {
      const { data, error } = await supabase
        .from('discount_rules')
        .select(`
          *,
          saharax_0u4w4d_vehicle_models(id, make, model, vehicle_type)
        `)
        .eq('active', true)
        .order('discount_type');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching discount rules:', error);
      throw error;
    }
  }

  // Create or update discount rule
  static async upsertDiscountRule(ruleData) {
    try {
      const { data, error } = await supabase
        .from('discount_rules')
        .upsert({
          vehicle_model_id: ruleData.vehicle_model_id,
          discount_type: ruleData.discount_type,
          discount_value: parseFloat(ruleData.discount_value),
          discount_unit: ruleData.discount_unit, // 'percentage' or 'fixed'
          min_days: ruleData.min_days ? parseInt(ruleData.min_days) : null,
          max_days: ruleData.max_days ? parseInt(ruleData.max_days) : null,
          min_advance_booking: ruleData.min_advance_booking ? parseInt(ruleData.min_advance_booking) : null,
          max_advance_booking: ruleData.max_advance_booking ? parseInt(ruleData.max_advance_booking) : null,
          valid_from: ruleData.valid_from,
          valid_to: ruleData.valid_to,
          active: true,
          description: ruleData.description
        })
        .select();

      if (error) throw error;
      return data?.[0];
    } catch (error) {
      console.error('Error upserting discount rule:', error);
      throw error;
    }
  }

  // Calculate dynamic pricing with all factors
  static async calculateDynamicPrice(vehicleModelId, startDate, endDate, customerType = 'regular') {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const advanceBookingDays = Math.ceil((start - new Date()) / (1000 * 60 * 60 * 24));

      // Get base price from existing service
      const { PricingService } = await import('./PricingService');
      const baseCalculation = await PricingService.calculateRentalPrice(vehicleModelId, startDate, endDate);
      
      let finalPrice = baseCalculation.totalPrice;
      let appliedModifiers = [];

      // Apply seasonal multipliers
      const seasonalRules = await this.getSeasonalRules();
      const applicableSeasonalRule = seasonalRules.find(rule => {
        const ruleStart = new Date(rule.start_date);
        const ruleEnd = new Date(rule.end_date);
        return rule.vehicle_model_id === vehicleModelId && 
               start >= ruleStart && end <= ruleEnd;
      });

      if (applicableSeasonalRule) {
        finalPrice *= applicableSeasonalRule.multiplier;
        appliedModifiers.push({
          type: 'seasonal',
          name: applicableSeasonalRule.season_name,
          multiplier: applicableSeasonalRule.multiplier,
          description: applicableSeasonalRule.description
        });
      }

      // Apply discount rules
      const discountRules = await this.getDiscountRules();
      const applicableDiscounts = discountRules.filter(rule => {
        if (rule.vehicle_model_id && rule.vehicle_model_id !== vehicleModelId) return false;
        if (rule.min_days && diffDays < rule.min_days) return false;
        if (rule.max_days && diffDays > rule.max_days) return false;
        if (rule.min_advance_booking && advanceBookingDays < rule.min_advance_booking) return false;
        if (rule.max_advance_booking && advanceBookingDays > rule.max_advance_booking) return false;
        if (rule.valid_from && start < new Date(rule.valid_from)) return false;
        if (rule.valid_to && end > new Date(rule.valid_to)) return false;
        return true;
      });

      // Apply best discount (highest value)
      let bestDiscount = null;
      let maxDiscountValue = 0;

      applicableDiscounts.forEach(discount => {
        let discountValue = 0;
        if (discount.discount_unit === 'percentage') {
          discountValue = finalPrice * (discount.discount_value / 100);
        } else {
          discountValue = discount.discount_value;
        }

        if (discountValue > maxDiscountValue) {
          maxDiscountValue = discountValue;
          bestDiscount = discount;
        }
      });

      if (bestDiscount) {
        finalPrice -= maxDiscountValue;
        appliedModifiers.push({
          type: 'discount',
          name: bestDiscount.discount_type,
          value: maxDiscountValue,
          unit: bestDiscount.discount_unit,
          description: bestDiscount.description
        });
      }

      // Customer type multipliers
      const customerMultipliers = {
        'loyalty': 0.9,
        'corporate': 0.85,
        'regular': 1.0
      };

      if (customerType !== 'regular') {
        const multiplier = customerMultipliers[customerType] || 1.0;
        finalPrice *= multiplier;
        appliedModifiers.push({
          type: 'customer',
          name: customerType,
          multiplier: multiplier,
          description: `${customerType} customer discount`
        });
      }

      return {
        basePrice: baseCalculation.totalPrice,
        finalPrice: Math.max(finalPrice, 0), // Ensure non-negative
        savings: baseCalculation.totalPrice - finalPrice,
        days: diffDays,
        pricePerDay: finalPrice / diffDays,
        appliedModifiers,
        calculation: baseCalculation
      };
    } catch (error) {
      console.error('Error calculating dynamic price:', error);
      throw error;
    }
  }

  // Get pricing analytics
  static async getPricingAnalytics(startDate, endDate) {
    try {
      const { data, error } = await supabase
        .from('pricing_analytics')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching pricing analytics:', error);
      throw error;
    }
  }

  // Get revenue metrics
  static async getRevenueMetrics(period = '30d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      const { data, error } = await supabase
        .from('revenue_metrics')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
      throw error;
    }
  }

  // Delete seasonal rule
  static async deleteSeasonalRule(id) {
    try {
      const { error } = await supabase
        .from('seasonal_pricing_rules')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting seasonal rule:', error);
      throw error;
    }
  }

  // Delete discount rule
  static async deleteDiscountRule(id) {
    try {
      const { error } = await supabase
        .from('discount_rules')
        .update({ active: false })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting discount rule:', error);
      throw error;
    }
  }
}

export default SeasonalPricingService;