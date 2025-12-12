import { v5 as uuidv5 } from 'uuid';

/**
 * UUID Utility for deterministic UUID generation from integer IDs
 * 
 * This utility provides a consistent way to convert integer vehicle IDs
 * to UUIDs using UUID v5 with a fixed namespace, ensuring the same
 * integer always generates the same UUID.
 */

// Fixed namespace for vehicle ID to UUID conversion
// This ensures consistent UUID generation across the application
const VEHICLE_UUID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * Convert integer vehicle ID to deterministic UUID
 * @param {number|string} vehicleId - The integer vehicle ID
 * @returns {string} - Deterministic UUID for the vehicle ID
 */
export function vehicleIdToUUID(vehicleId) {
  if (!vehicleId) {
    throw new Error('Vehicle ID is required for UUID conversion');
  }
  
  // Ensure we have a string representation of the integer
  const vehicleIdString = vehicleId.toString();
  
  // Generate deterministic UUID using v5 (namespace + name)
  const uuid = uuidv5(vehicleIdString, VEHICLE_UUID_NAMESPACE);
  
  console.log(`🔄 UUID Mapping: Vehicle ID ${vehicleId} → UUID ${uuid}`);
  return uuid;
}

/**
 * Convert UUID back to integer vehicle ID (reverse mapping)
 * Note: This requires maintaining a mapping table or using a different approach
 * For now, we'll extract from the deterministic pattern
 * @param {string} uuid - The UUID to convert back
 * @returns {number|null} - The original vehicle ID or null if not found
 */
export function uuidToVehicleId(uuid) {
  // For deterministic reverse mapping, we'd need to test common vehicle IDs
  // This is a simplified approach - in production, consider maintaining a mapping table
  
  for (let i = 1; i <= 100; i++) { // Test common vehicle ID range
    if (vehicleIdToUUID(i) === uuid) {
      return i;
    }
  }
  
  console.warn(`⚠️ Could not reverse map UUID ${uuid} to vehicle ID`);
  return null;
}

/**
 * Validate if a string is a valid UUID format
 * @param {string} uuid - String to validate
 * @returns {boolean} - True if valid UUID format
 */
export function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Batch convert multiple vehicle IDs to UUIDs
 * @param {Array<number|string>} vehicleIds - Array of vehicle IDs
 * @returns {Array<string>} - Array of corresponding UUIDs
 */
export function batchVehicleIdsToUUIDs(vehicleIds) {
  if (!Array.isArray(vehicleIds)) {
    throw new Error('Vehicle IDs must be provided as an array');
  }
  
  return vehicleIds.map(id => vehicleIdToUUID(id));
}

/**
 * Create a mapping object from vehicle IDs to UUIDs
 * @param {Array<number|string>} vehicleIds - Array of vehicle IDs
 * @returns {Object} - Mapping object { vehicleId: uuid, ... }
 */
export function createVehicleIdUUIDMapping(vehicleIds) {
  const mapping = {};
  
  vehicleIds.forEach(id => {
    mapping[id] = vehicleIdToUUID(id);
  });
  
  return mapping;
}

export default {
  vehicleIdToUUID,
  uuidToVehicleId,
  isValidUUID,
  batchVehicleIdsToUUIDs,
  createVehicleIdUUIDMapping
};