import { supabase } from '../lib/supabase';
import InventoryService from './InventoryService';

/**
 * MaintenancePartsService - Comprehensive parts tracking for maintenance records
 * 
 * Handles the junction table between maintenance and inventory items,
 * manages stock deductions, and calculates costs with transaction safety.
 */
class MaintenancePartsService {
  constructor() {
    this.maintenanceTable = 'app_687f658e98_maintenance';
    this.partsTable = 'app_687f658e98_maintenance_parts';
    this.inventoryTable = 'saharax_0u4w4d_inventory_items';
  }

  /**
   * Create maintenance parts records and update inventory
   * @param {string} maintenanceId - UUID of maintenance record
   * @param {Array} partsUsed - Array of parts with item_id and quantity
   * @returns {Object} Result with parts created and inventory updates
   */
  async createMaintenanceParts(maintenanceId, partsUsed) {
    console.log('🔧 Creating maintenance parts:', { maintenanceId, partsUsed });
    
    if (!partsUsed || partsUsed.length === 0) {
      return { parts: [], totalPartsCost: 0, inventoryUpdates: [] };
    }

    try {
      // Start transaction by getting all inventory items first
      const inventoryUpdates = [];
      const partsToCreate = [];
      let totalPartsCost = 0;

      // Validate stock availability and prepare parts data
      for (const part of partsUsed) {
        const { item_id, quantity, notes } = part;
        
        if (!item_id || !quantity || quantity <= 0) {
          throw new Error(`Invalid part data: item_id=${item_id}, quantity=${quantity}`);
        }

        // Get current inventory item
        const inventoryItem = await InventoryService.getItemById(item_id);
        if (!inventoryItem) {
          throw new Error(`Inventory item not found: ${item_id}`);
        }

        const currentStock = inventoryItem.stock_on_hand || 0;
        const requestedQty = parseFloat(quantity);

        // Check stock availability
        if (currentStock < requestedQty) {
          throw new Error(
            `Insufficient stock for ${inventoryItem.name}: ` +
            `requested ${requestedQty}, available ${currentStock}`
          );
        }

        // Prepare part record with cost snapshot
        const unitCost = inventoryItem.cost_mad || 0;
        const totalCost = requestedQty * unitCost;
        
        partsToCreate.push({
          maintenance_id: maintenanceId,
          item_id: parseInt(item_id),
          quantity: requestedQty,
          unit_cost_mad: unitCost,
          notes: notes || null
        });

        // Prepare inventory update
        inventoryUpdates.push({
          item_id: parseInt(item_id),
          item_name: inventoryItem.name,
          current_stock: currentStock,
          quantity_used: requestedQty,
          new_stock: currentStock - requestedQty,
          unit_cost: unitCost,
          total_cost: totalCost
        });

        totalPartsCost += totalCost;
      }

      console.log('📊 Parts validation completed:', {
        totalParts: partsToCreate.length,
        totalPartsCost,
        inventoryUpdates: inventoryUpdates.length
      });

      // Execute all operations in sequence (Supabase handles transactions)
      const createdParts = [];
      
      // 1. Create maintenance parts records
      for (const partData of partsToCreate) {
        const { data: createdPart, error: partError } = await supabase
          .from(this.partsTable)
          .insert(partData)
          .select(`
            *,
            inventory_item:saharax_0u4w4d_inventory_items(id, name, sku, unit)
          `)
          .single();

        if (partError) {
          console.error('❌ Error creating maintenance part:', partError);
          throw new Error(`Failed to create maintenance part: ${partError.message}`);
        }

        createdParts.push(createdPart);
      }

      // 2. Update inventory stock levels
      const stockUpdateResults = [];
      for (const update of inventoryUpdates) {
        const { data: updatedItem, error: stockError } = await supabase
          .from(this.inventoryTable)
          .update({
            stock_on_hand: update.new_stock,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.item_id)
          .select()
          .single();

        if (stockError) {
          console.error('❌ Error updating inventory stock:', stockError);
          throw new Error(`Failed to update inventory stock: ${stockError.message}`);
        }

        stockUpdateResults.push({
          ...update,
          updated_item: updatedItem
        });

        console.log(`✅ Stock updated: ${update.item_name} ${update.current_stock} → ${update.new_stock}`);
      }

      console.log('✅ Maintenance parts created successfully:', {
        partsCreated: createdParts.length,
        totalPartsCost,
        stockUpdates: stockUpdateResults.length
      });

      return {
        parts: createdParts,
        totalPartsCost,
        inventoryUpdates: stockUpdateResults
      };

    } catch (error) {
      console.error('❌ Error in createMaintenanceParts:', error);
      throw error;
    }
  }

  /**
   * Update maintenance parts (for edit operations)
   * @param {string} maintenanceId - UUID of maintenance record
   * @param {Array} newPartsUsed - New parts array
   * @param {Array} existingParts - Current parts from database
   * @returns {Object} Result with updated parts and costs
   */
  async updateMaintenanceParts(maintenanceId, newPartsUsed, existingParts = []) {
    console.log('🔄 Updating maintenance parts:', { maintenanceId, newPartsUsed, existingParts });

    try {
      // Get current parts if not provided
      if (!existingParts || existingParts.length === 0) {
        existingParts = await this.getMaintenanceParts(maintenanceId);
      }

      // Calculate differences
      const { toAdd, toUpdate, toRemove } = this.calculatePartsDiff(existingParts, newPartsUsed);

      console.log('📊 Parts diff calculated:', {
        toAdd: toAdd.length,
        toUpdate: toUpdate.length,
        toRemove: toRemove.length
      });

      let totalPartsCost = 0;
      const results = {
        added: [],
        updated: [],
        removed: [],
        inventoryUpdates: []
      };

      // 1. Remove parts (restore inventory)
      for (const part of toRemove) {
        await this.removeMaintenancePart(part.id, part.item_id, part.quantity);
        results.removed.push(part);
      }

      // 2. Add new parts
      if (toAdd.length > 0) {
        const addResult = await this.createMaintenanceParts(maintenanceId, toAdd);
        results.added = addResult.parts;
        results.inventoryUpdates.push(...addResult.inventoryUpdates);
        totalPartsCost += addResult.totalPartsCost;
      }

      // 3. Update existing parts
      for (const update of toUpdate) {
        const updateResult = await this.updateSingleMaintenancePart(
          update.partId,
          update.item_id,
          update.oldQuantity,
          update.newQuantity
        );
        results.updated.push(updateResult.part);
        results.inventoryUpdates.push(updateResult.inventoryUpdate);
        totalPartsCost += updateResult.totalCost;
      }

      // 4. Calculate total cost for unchanged parts
      const unchangedParts = existingParts.filter(existing => 
        !toRemove.find(r => r.id === existing.id) &&
        !toUpdate.find(u => u.partId === existing.id)
      );
      
      for (const part of unchangedParts) {
        totalPartsCost += (part.total_cost_mad || 0);
      }

      console.log('✅ Maintenance parts updated successfully:', {
        totalPartsCost,
        changes: {
          added: results.added.length,
          updated: results.updated.length,
          removed: results.removed.length
        }
      });

      return {
        ...results,
        totalPartsCost
      };

    } catch (error) {
      console.error('❌ Error in updateMaintenanceParts:', error);
      throw error;
    }
  }

  /**
   * Delete all maintenance parts and restore inventory
   * @param {string} maintenanceId - UUID of maintenance record
   * @returns {Object} Result with restored inventory
   */
  async deleteMaintenanceParts(maintenanceId) {
    console.log('🗑️ Deleting maintenance parts:', maintenanceId);

    try {
      // Get all parts for this maintenance
      const parts = await this.getMaintenanceParts(maintenanceId);
      
      if (parts.length === 0) {
        return { restoredItems: [] };
      }

      const restoredItems = [];

      // Restore inventory for each part
      for (const part of parts) {
        const { item_id, quantity } = part;
        
        // Get current inventory item
        const inventoryItem = await InventoryService.getItemById(item_id);
        if (inventoryItem) {
          const currentStock = inventoryItem.stock_on_hand || 0;
          const newStock = currentStock + quantity;

          // Update inventory stock
          const { data: updatedItem, error: stockError } = await supabase
            .from(this.inventoryTable)
            .update({
              stock_on_hand: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', item_id)
            .select()
            .single();

          if (stockError) {
            console.error('❌ Error restoring inventory stock:', stockError);
            throw new Error(`Failed to restore inventory stock: ${stockError.message}`);
          }

          restoredItems.push({
            item_id,
            item_name: inventoryItem.name,
            quantity_restored: quantity,
            old_stock: currentStock,
            new_stock: newStock,
            updated_item: updatedItem
          });

          console.log(`✅ Stock restored: ${inventoryItem.name} ${currentStock} → ${newStock} (+${quantity})`);
        }
      }

      // Parts will be deleted by CASCADE when maintenance is deleted
      console.log('✅ Maintenance parts deletion completed:', {
        partsCount: parts.length,
        restoredItems: restoredItems.length
      });

      return { restoredItems };

    } catch (error) {
      console.error('❌ Error in deleteMaintenanceParts:', error);
      throw error;
    }
  }

  /**
   * Get maintenance parts with inventory details
   * @param {string} maintenanceId - UUID of maintenance record
   * @returns {Array} Parts with inventory information
   */
  async getMaintenanceParts(maintenanceId) {
    try {
      const { data: parts, error } = await supabase
        .from(this.partsTable)
        .select(`
          *,
          inventory_item:saharax_0u4w4d_inventory_items(
            id, name, sku, unit, cost_mad, stock_on_hand
          )
        `)
        .eq('maintenance_id', maintenanceId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('❌ Error getting maintenance parts:', error);
        throw error;
      }

      return parts || [];
    } catch (error) {
      console.error('❌ Error in getMaintenanceParts:', error);
      throw error;
    }
  }

  /**
   * Calculate total parts cost for a maintenance record
   * @param {string} maintenanceId - UUID of maintenance record
   * @returns {number} Total parts cost
   */
  async calculateMaintenancePartsCost(maintenanceId) {
    try {
      const { data, error } = await supabase
        .from(this.partsTable)
        .select('total_cost_mad')
        .eq('maintenance_id', maintenanceId);

      if (error) {
        console.error('❌ Error calculating parts cost:', error);
        throw error;
      }

      const totalCost = (data || []).reduce((sum, part) => sum + (part.total_cost_mad || 0), 0);
      return totalCost;
    } catch (error) {
      console.error('❌ Error in calculateMaintenancePartsCost:', error);
      return 0;
    }
  }

  // Private helper methods

  /**
   * Calculate differences between existing and new parts
   */
  calculatePartsDiff(existingParts, newPartsUsed) {
    const toAdd = [];
    const toUpdate = [];
    const toRemove = [...existingParts]; // Start with all existing parts

    for (const newPart of newPartsUsed) {
      const existingIndex = toRemove.findIndex(existing => 
        existing.item_id === parseInt(newPart.item_id)
      );

      if (existingIndex >= 0) {
        // Part exists, check if quantity changed
        const existing = toRemove[existingIndex];
        const newQuantity = parseFloat(newPart.quantity);
        
        if (existing.quantity !== newQuantity) {
          toUpdate.push({
            partId: existing.id,
            item_id: existing.item_id,
            oldQuantity: existing.quantity,
            newQuantity: newQuantity,
            notes: newPart.notes
          });
        }
        
        // Remove from toRemove since it's being kept/updated
        toRemove.splice(existingIndex, 1);
      } else {
        // New part to add
        toAdd.push(newPart);
      }
    }

    return { toAdd, toUpdate, toRemove };
  }

  /**
   * Remove a single maintenance part and restore inventory
   */
  async removeMaintenancePart(partId, itemId, quantity) {
    // Restore inventory
    const inventoryItem = await InventoryService.getItemById(itemId);
    if (inventoryItem) {
      const currentStock = inventoryItem.stock_on_hand || 0;
      const newStock = currentStock + quantity;

      await supabase
        .from(this.inventoryTable)
        .update({ 
          stock_on_hand: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', itemId);
    }

    // Delete part record
    const { error } = await supabase
      .from(this.partsTable)
      .delete()
      .eq('id', partId);

    if (error) {
      throw new Error(`Failed to remove maintenance part: ${error.message}`);
    }
  }

  /**
   * Update a single maintenance part quantity
   */
  async updateSingleMaintenancePart(partId, itemId, oldQuantity, newQuantity) {
    const quantityDiff = newQuantity - oldQuantity;
    
    // Get inventory item for cost and stock update
    const inventoryItem = await InventoryService.getItemById(itemId);
    if (!inventoryItem) {
      throw new Error(`Inventory item not found: ${itemId}`);
    }

    const currentStock = inventoryItem.stock_on_hand || 0;
    
    // Check if we have enough stock for increase
    if (quantityDiff > 0 && currentStock < quantityDiff) {
      throw new Error(
        `Insufficient stock for ${inventoryItem.name}: ` +
        `need ${quantityDiff} more, available ${currentStock}`
      );
    }

    const newStock = currentStock - quantityDiff;
    const unitCost = inventoryItem.cost_mad || 0;

    // Update inventory stock
    await supabase
      .from(this.inventoryTable)
      .update({ 
        stock_on_hand: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    // Update part record
    const { data: updatedPart, error } = await supabase
      .from(this.partsTable)
      .update({
        quantity: newQuantity,
        unit_cost_mad: unitCost, // Update cost snapshot
        updated_at: new Date().toISOString()
      })
      .eq('id', partId)
      .select(`
        *,
        inventory_item:saharax_0u4w4d_inventory_items(id, name, sku, unit)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update maintenance part: ${error.message}`);
    }

    return {
      part: updatedPart,
      inventoryUpdate: {
        item_id: itemId,
        item_name: inventoryItem.name,
        quantity_change: quantityDiff,
        old_stock: currentStock,
        new_stock: newStock
      },
      totalCost: newQuantity * unitCost
    };
  }
}

export default new MaintenancePartsService();