import { supabase } from '../lib/supabase';

class FuelTransactionService {
  constructor() {
    // Use only accessible tables
    this.fuelRefillsTable = 'fuel_refills'; // Tank refills
    this.vehicleFuelRefillsTable = 'vehicle_fuel_refills'; // Vehicle refills
    this.fuelWithdrawalsTable = 'fuel_withdrawals';
    this.vehiclesTable = 'saharax_0u4w4d_vehicles';
    
    // Hard-coded tank settings (no database access needed)
    this.defaultTankSettings = {
      id: 'default',
      name: 'Main Tank',
      capacity: 1000, // 1000L capacity
      initial_volume: 500, // Start with 500L
      created_at: new Date().toISOString()
    };
  }

  // Check if required tables exist (only accessible tables)
  async checkTablesExist() {
    try {
      console.log('🔍 Checking accessible fuel management tables...');
      
      const tables = [
        this.fuelRefillsTable,
        this.vehicleFuelRefillsTable,
        this.fuelWithdrawalsTable,
        this.vehiclesTable
      ];

      const results = {};
      
      for (const table of tables) {
        try {
          console.log(`📋 Testing access to table: ${table}`);
          
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
          
          if (error) {
            console.error(`❌ Error accessing table ${table}:`, error.message);
            results[table] = false;
          } else {
            console.log(`✅ Table ${table} exists and accessible, found ${data?.length || 0} records`);
            results[table] = true;
          }
        } catch (tableError) {
          console.error(`❌ Exception checking table ${table}:`, tableError.message);
          results[table] = false;
        }
      }

      const coreTablesExist = results[this.fuelRefillsTable] && results[this.vehicleFuelRefillsTable] && results[this.fuelWithdrawalsTable] && results[this.vehiclesTable];
      
      console.log('📊 Accessible table summary:', results);
      console.log(`🎯 Core tables accessible: ${coreTablesExist}`);

      return {
        fuelRefillsExists: results[this.fuelRefillsTable],
        vehicleFuelRefillsExists: results[this.vehicleFuelRefillsTable],
        fuelWithdrawalsExists: results[this.fuelWithdrawalsTable],
        vehiclesExists: results[this.vehiclesTable],
        allTablesExist: coreTablesExist
      };
    } catch (error) {
      console.error('❌ Error in checkTablesExist:', error);
      return {
        fuelRefillsExists: false,
        vehicleFuelRefillsExists: false,
        fuelWithdrawalsExists: false,
        vehiclesExists: false,
        allTablesExist: false
      };
    }
  }

  // Get default tank data (no database access - pure defaults)
  getFuelTankData() {
    console.log('🏗️ Using default tank configuration (no database access required)');
    return this.defaultTankSettings;
  }

  // Get tank refills from fuel_refills table (no vehicle_id)
  async getTankRefills() {
    try {
      console.log('⛽ Fetching tank refills from fuel_refills...');
      
      const { data: refillsData, error: refillsError } = await supabase
        .from(this.fuelRefillsTable)
        .select('*')
        .order('refill_date', { ascending: false });

      if (refillsError) {
        console.error('❌ Error fetching tank refills:', refillsError);
        return [];
      }

      console.log(`✅ Retrieved ${refillsData?.length || 0} tank refills`);
      return refillsData || [];

    } catch (error) {
      console.error('❌ Unexpected error fetching tank refills:', error);
      return [];
    }
  }

  // Get vehicle refills from vehicle_fuel_refills table (with vehicle joins)
  async getVehicleRefills() {
    try {
      console.log('🚗 Fetching vehicle refills from vehicle_fuel_refills...');
      
      const { data: vehicleRefillsData, error: vehicleRefillsError } = await supabase
        .from(this.vehicleFuelRefillsTable)
        .select(`
          *,
          ${this.vehiclesTable} (
            id,
            name,
            plate_number
          )
        `)
        .order('refill_date', { ascending: false });

      if (vehicleRefillsError) {
        console.error('❌ Error fetching vehicle refills:', vehicleRefillsError);
        return [];
      }

      console.log(`✅ Retrieved ${vehicleRefillsData?.length || 0} vehicle refills`);
      return vehicleRefillsData || [];

    } catch (error) {
      console.error('❌ Unexpected error fetching vehicle refills:', error);
      return [];
    }
  }

  // Get all refills (combine tank and vehicle refills)
  async getAllRefills() {
    try {
      console.log('⛽ Fetching all refills (tank + vehicle)...');
      
      const [tankRefills, vehicleRefills] = await Promise.all([
        this.getTankRefills(),
        this.getVehicleRefills()
      ]);

      // Mark tank refills with transaction type
      const tankRefillsWithType = tankRefills.map(refill => ({
        ...refill,
        transaction_type: 'tank_refill',
        saharax_0u4w4d_vehicles: null // Tank refills don't have vehicles
      }));

      // Mark vehicle refills with transaction type
      const vehicleRefillsWithType = vehicleRefills.map(refill => ({
        ...refill,
        transaction_type: 'vehicle_refill'
      }));

      // Combine all refills
      const allRefills = [...tankRefillsWithType, ...vehicleRefillsWithType];
      
      // Sort by refill_date (newest first)
      allRefills.sort((a, b) => new Date(b.refill_date) - new Date(a.refill_date));

      console.log(`✅ Combined ${tankRefills.length} tank refills + ${vehicleRefills.length} vehicle refills = ${allRefills.length} total refills`);
      
      return allRefills;

    } catch (error) {
      console.error('❌ Unexpected error fetching all refills:', error);
      return [];
    }
  }

  // Get all withdrawals
  async getAllWithdrawals() {
    try {
      console.log('🚗 Fetching all withdrawals...');
      const { data, error } = await supabase
        .from(this.fuelWithdrawalsTable)
        .select(`
          *,
          vehicle:${this.vehiclesTable} (
            id,
            name,
            plate_number
          )
        `)
        .order('withdrawal_date', { ascending: false });

      if (error) {
        console.error('❌ Error fetching withdrawals:', error);
        return [];
      }

      console.log(`✅ Retrieved ${data?.length || 0} withdrawals`);
      return data || [];
    } catch (error) {
      console.error('❌ Unexpected error fetching withdrawals:', error);
      return [];
    }
  }

  // Unified method to get all fuel data (no database calls for tank data)
  async getUnifiedFuelData() {
    try {
      console.log('🔄 Starting unified fuel data retrieval...');
      
      // Get tank data synchronously (no database call)
      const tankData = this.getFuelTankData();
      
      // Get refills and withdrawals from database
      const [refills, withdrawals] = await Promise.all([
        this.getAllRefills(),
        this.getAllWithdrawals()
      ]);

      const result = {
        tank: tankData,
        refills: refills || [],
        withdrawals: withdrawals || []
      };

      console.log('📊 Unified fuel data summary:', {
        tankCapacity: tankData.capacity,
        tankInitialVolume: tankData.initial_volume,
        refillsCount: result.refills.length,
        withdrawalsCount: result.withdrawals.length
      });

      // Log refill details for debugging
      if (result.refills.length > 0) {
        console.log('⛽ Refills found:', result.refills.map(r => ({
          id: r.id,
          type: r.transaction_type,
          liters: r.liters_added,
          date: r.refill_date,
          refilled_by: r.refilled_by,
          vehicle_id: r.vehicle_id
        })));
      }

      return result;
    } catch (error) {
      console.error('❌ Error getting unified fuel data:', error);
      return {
        tank: this.defaultTankSettings,
        refills: [],
        withdrawals: []
      };
    }
  }

  // Calculate current tank volume - only tank refills affect tank volume
  calculateCurrentVolume(tankData, refills, withdrawals) {
    const initialVolume = parseFloat(tankData?.initial_volume) || 500;
    
    // Sum ONLY tank refills (transaction_type === 'tank_refill')
    const tankRefillsTotal = refills
      .filter(refill => refill.transaction_type === 'tank_refill')
      .reduce((sum, refill) => sum + (parseFloat(refill.liters_added) || 0), 0);

    // Sum all withdrawals (they come from tank)
    const withdrawalsTotal = withdrawals
      .reduce((sum, withdrawal) => sum + (parseFloat(withdrawal.liters_taken) || 0), 0);

    const currentVolume = initialVolume + tankRefillsTotal - withdrawalsTotal;
    
    console.log('🧮 Volume calculation:', {
      initialVolume,
      tankRefillsTotal,
      withdrawalsTotal,
      currentVolume,
      note: 'Vehicle refills do not affect tank volume'
    });

    return Math.max(0, currentVolume); // Ensure non-negative
  }

  // Get unified transaction list for display
  async getAllTransactions(options = {}) {
    try {
      const {
        limit = 50,
        offset = 0,
        search = '',
        vehicleId = '',
        transactionType = '',
        fuelType = '',
        startDate = '',
        endDate = '',
        fuelStation = '',
        location = ''
      } = options;

      console.log('📋 Getting all transactions with options:', options);

      const fuelData = await this.getUnifiedFuelData();
      const { refills, withdrawals } = fuelData;

      console.log(`📊 Processing ${refills.length} refills and ${withdrawals.length} withdrawals`);

      // Convert refills to unified transaction format
      const refillTransactions = refills.map(refill => ({
        id: `refill-${refill.id}`,
        transaction_date: refill.refill_date,
        transaction_type: refill.transaction_type, // 'tank_refill' or 'vehicle_refill'
        fuel_type: refill.fuel_type || 'gasoline',
        amount: parseFloat(refill.liters) || parseFloat(refill.liters_added) || 0,
        cost: this.calculateCost(refill),
        unit_price: parseFloat(refill.unit_price) || 0,
        fuel_station: this.assignFuelStation(refill, 'refill'),
        location: refill.location || '',
        odometer_reading: refill.odometer_reading || null,
        notes: refill.notes || '',
        filled_by: refill.refilled_by || refill.filled_by || '', // Support both field names
        vehicle_id: refill.vehicle_id,
        saharax_0u4w4d_vehicles: refill.saharax_0u4w4d_vehicles || null,
        created_at: refill.created_at,
        source_table: refill.transaction_type === 'tank_refill' ? 'fuel_refills' : 'vehicle_fuel_refills',
        invoice_image: refill.invoice_image || null
      }));

      // Convert withdrawals to unified transaction format
      const withdrawalTransactions = withdrawals.map(withdrawal => ({
        id: `withdrawal-${withdrawal.id}`,
        transaction_date: withdrawal.withdrawal_date,
        transaction_type: 'withdrawal',
        fuel_type: 'gasoline',
        amount: parseFloat(withdrawal.liters_taken) || 0,
        cost: 0, // Withdrawals don't have cost
        unit_price: 0,
        fuel_station: 'Main Tank',
        location: '',
        odometer_reading: withdrawal.odometer_reading || null,
        notes: withdrawal.notes || '',
        filled_by: withdrawal.filled_by || '',
        vehicle_id: withdrawal.vehicle_id,
        saharax_0u4w4d_vehicles: withdrawal.vehicle || null,
        created_at: withdrawal.created_at,
        source_table: 'fuel_withdrawals',
        invoice_image: null
      }));

      // Combine and sort all transactions
      let allTransactions = [...refillTransactions, ...withdrawalTransactions];
      
      // Sort by transaction date (newest first)
      allTransactions.sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

      // Apply filters
      if (search) {
        const searchLower = search.toLowerCase();
        allTransactions = allTransactions.filter(transaction => 
          (transaction.fuel_station && transaction.fuel_station.toLowerCase().includes(searchLower)) ||
          (transaction.location && transaction.location.toLowerCase().includes(searchLower)) ||
          (transaction.notes && transaction.notes.toLowerCase().includes(searchLower)) ||
          (transaction.filled_by && transaction.filled_by.toLowerCase().includes(searchLower)) ||
          (transaction.saharax_0u4w4d_vehicles?.name && transaction.saharax_0u4w4d_vehicles.name.toLowerCase().includes(searchLower))
        );
      }

      if (vehicleId) {
        allTransactions = allTransactions.filter(transaction => 
          transaction.vehicle_id === vehicleId
        );
      }

      if (transactionType) {
        allTransactions = allTransactions.filter(transaction => 
          transaction.transaction_type === transactionType
        );
      }

      if (fuelType) {
        allTransactions = allTransactions.filter(transaction => 
          transaction.fuel_type === fuelType
        );
      }

      if (startDate) {
        allTransactions = allTransactions.filter(transaction => 
          new Date(transaction.transaction_date) >= new Date(startDate)
        );
      }

      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        allTransactions = allTransactions.filter(transaction => 
          new Date(transaction.transaction_date) <= endDateTime
        );
      }

      if (fuelStation) {
        allTransactions = allTransactions.filter(transaction => 
          transaction.fuel_station && transaction.fuel_station.toLowerCase().includes(fuelStation.toLowerCase())
        );
      }

      if (location) {
        allTransactions = allTransactions.filter(transaction => 
          transaction.location && transaction.location.toLowerCase().includes(location.toLowerCase())
        );
      }

      // Apply pagination
      const totalCount = allTransactions.length;
      const paginatedTransactions = allTransactions.slice(offset, offset + limit);

      console.log(`✅ Returning ${paginatedTransactions.length} of ${totalCount} transactions`);

      return {
        success: true,
        transactions: paginatedTransactions,
        totalCount
      };

    } catch (error) {
      console.error('❌ Error getting unified transactions:', error);
      return {
        success: false,
        error: error.message,
        transactions: [],
        totalCount: 0
      };
    }
  }

  // Calculate cost with data repair logic
  calculateCost(refill) {
    // If total_cost exists, use it
    if (refill.total_cost && parseFloat(refill.total_cost) > 0) {
      return parseFloat(refill.total_cost);
    }

    // Calculate from liters and unit price
    const liters = parseFloat(refill.liters_added) || parseFloat(refill.liters) || 0;
    const unitPrice = parseFloat(refill.unit_price) || parseFloat(refill.price_per_liter) || 0;
    
    if (liters > 0 && unitPrice > 0) {
      return liters * unitPrice;
    }

    return 0;
  }

  // Assign fuel station with data repair logic
  assignFuelStation(refill, type) {
    // If fuel_station exists, use it
    if (refill.fuel_station) {
      return refill.fuel_station;
    }

    // Apply data repair logic based on transaction type
    if (refill.transaction_type === 'vehicle_refill') {
      return 'Direct Fill'; // Vehicle refill
    } else {
      return 'Main Station'; // Tank refill
    }
  }

  // Create a new transaction - route to correct table based on type (NO FINANCE RECORDS)
  async createTransaction(transactionData) {
    try {
      console.log('💾 Creating new transaction (no finance integration):', transactionData);
      
      const { transaction_type } = transactionData;

      if (transaction_type === 'withdrawal') {
        // Insert into fuel_withdrawals table
        const withdrawalData = {
          vehicle_id: transactionData.vehicle_id,
          liters_taken: parseFloat(transactionData.amount),
          withdrawal_date: transactionData.transaction_date,
          odometer_reading: transactionData.odometer_reading ? parseInt(transactionData.odometer_reading) : null,
          filled_by: transactionData.filled_by || 'System',
          notes: transactionData.notes || null
        };

        console.log('💾 Inserting withdrawal:', withdrawalData);

        const { data, error } = await supabase
          .from(this.fuelWithdrawalsTable)
          .insert([withdrawalData])
          .select(`
            *,
            vehicle:${this.vehiclesTable} (
              id,
              name,
              plate_number
            )
          `)
          .single();

        if (error) {
          console.error('❌ Error creating withdrawal:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ Withdrawal created successfully (no finance record):', data);
        return { success: true, transaction: data };

      } else if (transaction_type === 'tank_refill') {
        // Insert into fuel_refills table (tank refills)
        const refillData = {
          liters_added: parseFloat(transactionData.amount),
          total_cost: transactionData.cost ? parseFloat(transactionData.cost) : null,
          unit_price: transactionData.cost && transactionData.amount ? 
            parseFloat(transactionData.cost) / parseFloat(transactionData.amount) : null,
          fuel_type: transactionData.fuel_type || 'gasoline',
          refill_date: transactionData.transaction_date,
          fuel_station: transactionData.fuel_station || 'Main Station',
          location: transactionData.location || '',
          refilled_by: transactionData.filled_by || 'System',
          notes: transactionData.notes || null,
          invoice_image: transactionData.invoice_image || null
        };

        console.log('💾 Inserting tank refill:', refillData);

        const { data, error } = await supabase
          .from(this.fuelRefillsTable)
          .insert([refillData])
          .select('*')
          .single();

        if (error) {
          console.error('❌ Error creating tank refill:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ Tank refill created successfully (no finance record):', data);
        return { success: true, transaction: data };

      } else if (transaction_type === 'vehicle_refill') {
        // Insert into vehicle_fuel_refills table (vehicle refills)
        const vehicleRefillData = {
          vehicle_id: transactionData.vehicle_id,
          liters_added: parseFloat(transactionData.amount),
          total_cost: transactionData.cost ? parseFloat(transactionData.cost) : null,
          unit_price: transactionData.cost && transactionData.amount ? 
            parseFloat(transactionData.cost) / parseFloat(transactionData.amount) : null,
          fuel_type: transactionData.fuel_type || 'gasoline',
          refill_date: transactionData.transaction_date,
          fuel_station: transactionData.fuel_station || 'Direct Fill',
          location: transactionData.location || '',
          odometer_reading: transactionData.odometer_reading ? parseInt(transactionData.odometer_reading) : null,
          refilled_by: transactionData.filled_by || 'System',
          notes: transactionData.notes || null,
          invoice_image: transactionData.invoice_image || null
        };

        console.log('💾 Inserting vehicle refill:', vehicleRefillData);

        const { data, error } = await supabase
          .from(this.vehicleFuelRefillsTable)
          .insert([vehicleRefillData])
          .select(`
            *,
            ${this.vehiclesTable} (
              id,
              name,
              plate_number
            )
          `)
          .single();

        if (error) {
          console.error('❌ Error creating vehicle refill:', error);
          return { success: false, error: error.message };
        }

        console.log('✅ Vehicle refill created successfully (no finance record):', data);
        return { success: true, transaction: data };
      }

      return { success: false, error: 'Invalid transaction type' };

    } catch (error) {
      console.error('❌ Unexpected error creating transaction:', error);
      return { success: false, error: error.message };
    }
  }

  // Export transactions to CSV
  async exportToCSV(filters = {}) {
    try {
      const result = await this.getAllTransactions({
        ...filters,
        limit: 10000,
        offset: 0
      });

      if (!result.success) {
        return { success: false, error: result.error };
      }

      const transactions = result.transactions;
      
      const headers = [
        'Date',
        'Type',
        'Vehicle',
        'Plate Number',
        'Amount (L)',
        'Cost (MAD)',
        'Cost per Liter (MAD)',
        'Fuel Station',
        'Location',
        'Odometer Reading (km)',
        'Filled By',
        'Notes'
      ];

      const rows = transactions.map(transaction => {
        const vehicleInfo = transaction.saharax_0u4w4d_vehicles || {};
        const typeLabel = this.getTransactionTypeLabel(transaction.transaction_type);
        const costPerLiter = transaction.amount > 0 && transaction.cost > 0 
          ? (transaction.cost / transaction.amount).toFixed(2)
          : '';

        return [
          new Date(transaction.transaction_date).toLocaleDateString('en-US', { 
            timeZone: 'Africa/Casablanca' 
          }),
          typeLabel,
          vehicleInfo.name || '—',
          vehicleInfo.plate_number || '—',
          transaction.amount || '',
          transaction.cost || '',
          costPerLiter,
          transaction.fuel_station || '',
          transaction.location || '',
          transaction.odometer_reading || '',
          transaction.filled_by || '',
          transaction.notes || ''
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(field => `"${field}"`).join(','))
      ].join('\n');

      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `fuel_transactions_${timestamp}.csv`;

      return {
        success: true,
        csvContent,
        filename
      };

    } catch (error) {
      console.error('❌ Error exporting to CSV:', error);
      return { success: false, error: error.message };
    }
  }

  // Helper method to get transaction type label
  getTransactionTypeLabel(type) {
    switch (type) {
      case 'tank_refill':
        return 'Tank Refill';
      case 'vehicle_refill':
        return 'Vehicle Refill';
      case 'withdrawal':
        return 'Withdrawal';
      default:
        return type;
    }
  }

  // Subscribe to real-time changes for accessible tables only
  subscribeToChanges(callback) {
    const tankRefillsSubscription = supabase
      .channel('fuel_refills_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.fuelRefillsTable
        },
        callback
      )
      .subscribe();

    const vehicleRefillsSubscription = supabase
      .channel('vehicle_fuel_refills_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.vehicleFuelRefillsTable
        },
        callback
      )
      .subscribe();

    const withdrawalsSubscription = supabase
      .channel('fuel_withdrawals_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: this.fuelWithdrawalsTable
        },
        callback
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tankRefillsSubscription);
      supabase.removeChannel(vehicleRefillsSubscription);
      supabase.removeChannel(withdrawalsSubscription);
    };
  }
}

export default new FuelTransactionService();