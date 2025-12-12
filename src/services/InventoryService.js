import { supabase } from '../utils/supabaseClient';

class InventoryService {
  constructor() {
    this.itemsTable = 'saharax_0u4w4d_inventory_items';
    this.movementsTable = 'saharax_0u4w4d_inventory_movements';
    this.purchasesTable = 'saharax_0u4w4d_inventory_purchases';
    this.purchaseLinesTable = 'saharax_0u4w4d_inventory_purchase_lines';
  }

  sanitizeItemData(itemData) {
    const sanitized = { ...itemData };
    const numericFields = [
      'stock_on_hand', 
      'reorder_level', 
      'max_stock_level', 
      'price_mad',
      'cost_mad'
    ];
    
    numericFields.forEach(field => {
      if (sanitized[field] === '' || sanitized[field] === null || sanitized[field] === undefined) {
        sanitized[field] = null;
      } else if (typeof sanitized[field] === 'string') {
        const numValue = parseFloat(sanitized[field]);
        sanitized[field] = isNaN(numValue) ? null : numValue;
      }
    });
    
    console.log('🔍 SANITIZED ITEM DATA:', sanitized);
    return sanitized;
  }

  async getItems(filters = {}) {
    try {
      let query = supabase
        .from(this.itemsTable)
        .select('*')
        .order('name', { ascending: true });

      if (filters.category) query = query.eq('category', filters.category);
      if (filters.active !== undefined) query = query.eq('active', filters.active);
      if (filters.searchTerm) query = query.or(`name.ilike.%${filters.searchTerm}%,sku.ilike.%${filters.searchTerm}%`);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting items:', error);
      return [];
    }
  }

  async getItemById(id) {
    try {
      const { data: item, error } = await supabase
        .from(this.itemsTable)
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return item;
    } catch (error) {
      console.error('Error getting item:', error);
      throw error;
    }
  }

  async getItem(id) { return this.getItemById(id); }
  async getInventoryItems(filters = {}) { return this.getItems(filters); }
  async getInventoryItemById(id) { return this.getItemById(id); }

  async createMovement(movementData) {
    try {
      console.log('🔍 INVENTORY: Creating movement:', movementData);
      const { item_id, quantity, movement_type, reference_type, reference_id, notes, unit_cost } = movementData;
      
      const currentItem = await this.getItemById(item_id);
      if (!currentItem) throw new Error(`Item with ID ${item_id} not found`);
      
      const currentStock = currentItem.stock_on_hand || 0;
      console.log(`🔍 STOCK: Current stock for item ${item_id}: ${currentStock}`);
      
      let newStock;
      if (movement_type === 'in') {
        newStock = currentStock + quantity;
      } else if (movement_type === 'out') {
        newStock = currentStock - quantity;
        if (newStock < 0) console.warn(`⚠️ WARNING: Stock will go negative for item ${item_id}: ${newStock}`);
      } else {
        throw new Error(`Invalid movement type: ${movement_type}`);
      }
      
      const itemUnitCost = unit_cost || currentItem.cost_mad || 0;
      
      const { data: movement, error: movementError } = await supabase
        .from(this.movementsTable)
        .insert({
          item_id: parseInt(item_id),
          quantity: quantity,
          unit_cost: itemUnitCost,
          movement_type: movement_type,
          reference_type: reference_type || null,
          reference_id: reference_id || null,
          notes: notes || '',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (movementError) throw movementError;
      console.log('✅ Movement record created:', movement);
      
      const { data: updatedItem, error: updateError } = await supabase
        .from(this.itemsTable)
        .update({
          stock_on_hand: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', item_id)
        .select()
        .single();
      
      if (updateError) throw updateError;
      console.log(`✅ STOCK UPDATED: Item ${item_id} stock changed from ${currentStock} to ${newStock}`);
      
      return { movement, updatedItem, previousStock: currentStock, newStock: newStock };
    } catch (error) {
      console.error('❌ CRITICAL ERROR in createMovement:', error);
      throw error;
    }
  }

  async getMovementsByItem(itemId) {
    try {
      const { data, error } = await supabase
        .from(this.movementsTable)
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting movements:', error);
      return [];
    }
  }

  async getStockMovements(filters = {}) {
    try {
      let query = supabase
        .from(this.movementsTable)
        .select(`*, item:${this.itemsTable}(id, name, sku)`)
        .order('created_at', { ascending: false });

      if (filters.itemId) query = query.eq('item_id', filters.itemId);
      if (filters.movementType) query = query.eq('movement_type', filters.movementType);
      if (filters.dateFrom) query = query.gte('created_at', filters.dateFrom);
      if (filters.dateTo) query = query.lte('created_at', filters.dateTo);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting stock movements:', error);
      return [];
    }
  }

  async createItem(itemData) {
    try {
      const sanitizedData = this.sanitizeItemData(itemData);
      const { data, error } = await supabase
        .from(this.itemsTable)
        .insert({ ...sanitizedData, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  async updateItem(id, itemData) {
    try {
      const sanitizedData = this.sanitizeItemData(itemData);
      const { data, error } = await supabase
        .from(this.itemsTable)
        .update({ ...sanitizedData, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  }

  async createOrUpdateItem(itemData) {
    return itemData.id ? this.updateItem(itemData.id, itemData) : this.createItem(itemData);
  }

  async deleteItem(id) {
    try {
      const { error } = await supabase.from(this.itemsTable).delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  }

  async getCategories() {
    try {
      const { data, error } = await supabase.from(this.itemsTable).select('category').not('category', 'is', null);
      if (error) throw error;
      return [...new Set(data.map(item => item.category))].filter(Boolean);
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  async getAllCategories() { return this.getCategories(); }

  async adjustStock(itemId, qty, reason, unitCost = 0) {
    try {
      const movementType = qty > 0 ? 'in' : 'out';
      return await this.createMovement({
        item_id: itemId,
        quantity: Math.abs(qty),
        unit_cost: unitCost,
        movement_type: movementType,
        notes: reason || `Stock adjustment`
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }

  async getLowStockItems() {
    try {
      const { data, error } = await supabase
        .from(this.itemsTable)
        .select('*')
        .eq('active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).filter(item => (item.stock_on_hand || 0) < (item.reorder_level || 0) && (item.reorder_level || 0) > 0);
    } catch (error) {
      console.error('Error getting low stock items:', error);
      return [];
    }
  }

  // FIXED: A comprehensive dashboard data fetcher
  async getDashboardStats(filters = {}) {
    try {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

        // Fetch all data in parallel
        const [
            items,
            lowStockItems,
            recentMovements,
            recentPurchases
        ] = await Promise.all([
            this.getItems({ active: true, ...filters }),
            this.getLowStockItems(),
            this.getStockMovements({ dateFrom: thirtyDaysAgo }),
            this.getPurchases({ dateFrom: thirtyDaysAgo })
        ]);

        const stats = {
            totalItems: items.length,
            lowStockCount: lowStockItems.length,
            lowStockItems: lowStockItems.slice(0, 5), // Return top 5 for the dashboard widget
            recentMovements: recentMovements || [],
            recentPurchases: recentPurchases || [],
            outOfStockCount: items.filter(item => (item.stock_on_hand || 0) === 0).length,
            totalValue: items.reduce((sum, item) => {
                const stock = item.stock_on_hand || 0;
                const cost = item.cost_mad || 0;
                return sum + (stock * cost);
            }, 0)
        };

        return stats;
    } catch (error) {
        console.error('Error getting dashboard stats:', error);
        return {
            totalItems: 0,
            lowStockCount: 0,
            lowStockItems: [],
            recentMovements: [],
            recentPurchases: [],
            outOfStockCount: 0,
            totalValue: 0
        };
    }
  }

  async getDashboardData(filters = {}) { return this.getDashboardStats(filters); }

  async consumePartsForMaintenance(partsUsed, maintenanceId) {
    try {
      console.log('🔧 CONSUMING PARTS FOR MAINTENANCE:', maintenanceId, partsUsed);
      const results = [];
      for (const part of partsUsed) {
        const { item_id, quantity, notes } = part;
        const result = await this.createMovement({
          item_id: item_id,
          quantity: Math.abs(quantity),
          movement_type: 'out',
          reference_type: 'maintenance',
          reference_id: maintenanceId,
          notes: notes || `Used in maintenance #${maintenanceId}`
        });
        results.push(result);
      }
      return results;
    } catch (error) {
      console.error('❌ ERROR consuming parts for maintenance:', error);
      throw error;
    }
  }

  async getPurchases(filters = {}) {
    try {
      let query = supabase
        .from(this.purchasesTable)
        .select(`*, lines:${this.purchaseLinesTable}(*, item:${this.itemsTable}(id, name, sku))`)
        .order('purchase_date', { ascending: false });

      if (filters.status) query = query.eq('status', filters.status);
      if (filters.supplier) query = query.ilike('supplier_name', `%${filters.supplier}%`);
      if (filters.dateFrom) query = query.gte('purchase_date', filters.dateFrom);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting purchases:', error);
      return [];
    }
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MAD', minimumFractionDigits: 2 }).format(amount || 0);
  }

  formatDate(dateString) {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }
}

export default new InventoryService();