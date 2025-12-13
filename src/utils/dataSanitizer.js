// 🧹 ULTRA-MINIMAL DATA SANITIZER WITH SNAKE_CASE MAPPING
export const sanitizeRentalData = (data, isUpdate = false) => {
  console.log('🧹 Sanitizing rental data with snake_case mapping:', data);
  
  // 🎯 ULTRA-MINIMAL: Only 5 fields with proper snake_case mapping
  const ultraMinimalData = {
    customer_name: data.customerName,
    vehicle_id: parseInt(data.vehicleId),
    start_date: data.startDate,
    end_date: data.endDate,
    total_amount: parseFloat(data.totalAmount)
  };
  
  console.log('🧹 ULTRA-MINIMAL sanitized data (snake_case):', ultraMinimalData);
  console.log('✅ Database fields being sent:', Object.keys(ultraMinimalData));
  console.log('🚫 Removed problematic fields: customerAddress, customerEmail, customerPhone, vehicleModel, rentalType, rental_status, created_at');
  
  return ultraMinimalData;
};

// Enhanced validation function
export const validateRentalData = (data) => {
  const errors = [];
  
  if (!data.customerName?.trim()) {
    errors.push('Customer name is required');
  }
  
  if (!data.vehicleId || isNaN(parseInt(data.vehicleId))) {
    errors.push('Valid vehicle ID is required');
  }
  
  if (!data.startDate) {
    errors.push('Start date is required');
  }
  
  if (!data.endDate) {
    errors.push('End date is required');
  }
  
  if (!data.totalAmount || isNaN(parseFloat(data.totalAmount)) || parseFloat(data.totalAmount) <= 0) {
    errors.push('Valid total amount is required');
  }
  
  // Date validation
  if (data.startDate && data.endDate) {
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    
    if (endDate <= startDate) {
      errors.push('End date must be after start date');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Map database errors to specific fields
export const mapDatabaseErrorToField = (error) => {
  console.log('🔍 Mapping database error:', error);
  
  if (!error || !error.message) {
    return { field: 'general', message: 'Unknown database error' };
  }
  
  const message = error.message.toLowerCase();
  
  // Column not found errors (PGRST204)
  if (error.code === 'PGRST204' || message.includes('could not find') || message.includes('column')) {
    const columnMatch = error.message.match(/'([^']+)'/);
    const columnName = columnMatch ? columnMatch[1] : 'unknown';
    return {
      field: 'schema',
      message: `Database column "${columnName}" does not exist. Using ultra-minimal approach with snake_case mapping.`
    };
  }
  
  // Foreign key constraint errors
  if (message.includes('foreign key') || message.includes('violates')) {
    return {
      field: 'vehicleId',
      message: 'Invalid vehicle ID. Please select a valid vehicle.'
    };
  }
  
  // Not null constraint errors
  if (message.includes('null value') || message.includes('not-null')) {
    const fieldMatch = message.match(/column "([^"]+)"/);
    const fieldName = fieldMatch ? fieldMatch[1] : 'unknown';
    return {
      field: fieldName,
      message: `${fieldName} is required and cannot be empty.`
    };
  }
  
  // Default mapping
  return {
    field: 'general',
    message: error.message || 'Database operation failed'
  };
};

// Discover actual database schema (for investigation)
export const discoverDatabaseSchema = async (supabase, tableName) => {
  try {
    console.log('🔍 Discovering database schema for table:', tableName);
    
    // Try to get existing records to see what columns are available
    const { data: existingRecords, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (existingRecords && existingRecords.length > 0) {
      const availableColumns = Object.keys(existingRecords[0]);
      console.log('✅ Discovered database columns:', availableColumns);
      
      return {
        columns: availableColumns,
        message: `Found ${availableColumns.length} columns in ${tableName} table`,
        success: true
      };
    } else {
      console.log('⚠️ No existing records found for schema discovery');
      
      return {
        columns: [],
        message: 'No existing data found for schema discovery',
        success: false
      };
    }
  } catch (error) {
    console.error('❌ Schema discovery failed:', error);
    return {
      columns: [],
      message: `Schema discovery error: ${error.message}`,
      success: false,
      error
    };
  }
};