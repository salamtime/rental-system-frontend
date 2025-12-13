// Debug and setup script for rental alerts
import { supabase } from './lib/supabase';

const debugAndSetupRentals = async () => {
  console.log('🔍 Debugging rental alerts setup...');
  
  // Get current time in Africa/Casablanca timezone
  const getCasablancaTime = () => {
    return new Date(new Date().toLocaleString("en-US", {timeZone: "Africa/Casablanca"}));
  };
  
  const now = getCasablancaTime();
  console.log('Current time (Casablanca):', now.toISOString());
  
  try {
    // 1. Check if rentals table exists and get structure
    console.log('📊 Checking rentals table structure...');
    const { data: tableInfo, error: tableError } = await supabase
      .from('app_4c3a7a6153_rentals')
      .select('*')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Rentals table error:', tableError);
      
      // Try to create the table if it doesn't exist
      console.log('🛠️ Creating rentals table...');
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS app_4c3a7a6153_rentals (
          id SERIAL PRIMARY KEY,
          customer_name VARCHAR(255) NOT NULL,
          customer_email VARCHAR(255),
          customer_phone VARCHAR(50),
          rental_start_date TIMESTAMP WITH TIME ZONE NOT NULL,
          rental_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
          rental_status VARCHAR(50) DEFAULT 'active',
          total_amount DECIMAL(10,2) DEFAULT 0,
          expected_total DECIMAL(10,2) DEFAULT 0,
          paid_amount DECIMAL(10,2) DEFAULT 0,
          vehicle_id INTEGER,
          returned_at TIMESTAMP WITH TIME ZONE NULL,
          pickup_location VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE app_4c3a7a6153_rentals ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow read access
        CREATE POLICY "allow_read_rentals" ON app_4c3a7a6153_rentals FOR SELECT USING (true);
        CREATE POLICY "allow_insert_rentals" ON app_4c3a7a6153_rentals FOR INSERT WITH CHECK (true);
        CREATE POLICY "allow_update_rentals" ON app_4c3a7a6153_rentals FOR UPDATE USING (true);
      `;
      
      const { error: createError } = await supabase.rpc('exec_sql', { sql: createTableSQL });
      if (createError) {
        console.error('❌ Error creating table:', createError);
      } else {
        console.log('✅ Rentals table created successfully');
      }
    } else {
      console.log('✅ Rentals table exists');
    }
    
    // 2. Check vehicle table exists
    console.log('🚗 Checking vehicles table...');
    const { data: vehicleCheck, error: vehicleError } = await supabase
      .from('saharax_0u4w4d_vehicles')
      .select('id, name, model, plate_number')
      .limit(3);
    
    if (vehicleError) {
      console.error('❌ Vehicles table error:', vehicleError);
      
      // Create basic vehicles for testing
      console.log('🛠️ Creating vehicles table...');
      const createVehiclesSQL = `
        CREATE TABLE IF NOT EXISTS saharax_0u4w4d_vehicles (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255),
          model VARCHAR(255),
          plate_number VARCHAR(50),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Enable RLS
        ALTER TABLE saharax_0u4w4d_vehicles ENABLE ROW LEVEL SECURITY;
        
        -- Create policy to allow read access
        CREATE POLICY "allow_read_vehicles" ON saharax_0u4w4d_vehicles FOR SELECT USING (true);
        CREATE POLICY "allow_insert_vehicles" ON saharax_0u4w4d_vehicles FOR INSERT WITH CHECK (true);
        
        -- Insert test vehicles
        INSERT INTO saharax_0u4w4d_vehicles (name, model, plate_number) VALUES
        ('SEGWAY AT5', 'SEGWAY', 'AT5-41888'),
        ('SEGWAY AT6', 'SEGWAY', 'AT6-41111'),
        ('SEGWAY AT7', 'SEGWAY', 'AT7-45555')
        ON CONFLICT DO NOTHING;
      `;
      
      const { error: createVehicleError } = await supabase.rpc('exec_sql', { sql: createVehiclesSQL });
      if (createVehicleError) {
        console.error('❌ Error creating vehicles table:', createVehicleError);
      } else {
        console.log('✅ Vehicles table created successfully');
      }
    } else {
      console.log('✅ Vehicles table exists with', vehicleCheck?.length, 'vehicles');
      console.log('Sample vehicles:', vehicleCheck);
    }
    
    // 3. Create test rental data with the specific timing mentioned
    console.log('🧪 Creating test rental data...');
    
    // Calculate dates for ~86.7h and ~135h from now
    const rental1DueDate = new Date(now.getTime() + (86.7 * 60 * 60 * 1000)); // ~86.7h from now
    const rental2DueDate = new Date(now.getTime() + (135 * 60 * 60 * 1000)); // ~135h from now
    
    console.log('Rental 1 due date (86.7h):', rental1DueDate.toISOString());
    console.log('Rental 2 due date (135h):', rental2DueDate.toISOString());
    
    const testRentals = [
      {
        customer_name: 'Ahmed Hassan',
        customer_email: 'ahmed@example.com',
        customer_phone: '+212600000001',
        rental_start_date: new Date(now.getTime() - (24 * 60 * 60 * 1000)).toISOString(),
        rental_end_date: rental1DueDate.toISOString(),
        rental_status: 'active',
        total_amount: 450.00,
        expected_total: 450.00,
        paid_amount: 200.00,
        vehicle_id: 1, // AT5-41888
        returned_at: null,
        pickup_location: 'Casablanca Airport'
      },
      {
        customer_name: 'Fatima Benali',
        customer_email: 'fatima@example.com',
        customer_phone: '+212600000002',
        rental_start_date: new Date(now.getTime() - (12 * 60 * 60 * 1000)).toISOString(),
        rental_end_date: rental2DueDate.toISOString(),
        rental_status: 'active',
        total_amount: 680.00,
        expected_total: 680.00,
        paid_amount: 680.00,
        vehicle_id: 2, // AT6-41111
        returned_at: null,
        pickup_location: 'Rabat Center'
      }
    ];
    
    // First, clear any existing test data
    await supabase
      .from('app_4c3a7a6153_rentals')
      .delete()
      .in('customer_email', ['ahmed@example.com', 'fatima@example.com']);
    
    // Insert new test data
    const { data: insertedRentals, error: insertError } = await supabase
      .from('app_4c3a7a6153_rentals')
      .insert(testRentals)
      .select();
    
    if (insertError) {
      console.error('❌ Error creating test rentals:', insertError);
    } else {
      console.log('✅ Created test rentals:', insertedRentals);
    }
    
    // 4. Verify the data is accessible
    console.log('🔍 Verifying rental data access...');
    const { data: verifyRentals, error: verifyError } = await supabase
      .from('app_4c3a7a6153_rentals')
      .select(`
        id,
        customer_name,
        rental_end_date,
        rental_status,
        total_amount,
        paid_amount,
        expected_total,
        returned_at,
        vehicle_id,
        vehicle:saharax_0u4w4d_vehicles(name, model, plate_number)
      `)
      .is('returned_at', null)
      .neq('rental_status', 'cancelled');
    
    if (verifyError) {
      console.error('❌ Error verifying rentals:', verifyError);
    } else {
      console.log('✅ Verified rental data:', verifyRentals);
      
      // Calculate hours until due for each rental
      verifyRentals?.forEach(rental => {
        const dueDate = new Date(rental.rental_end_date);
        const hoursUntilDue = Math.round((dueDate - now) / (1000 * 60 * 60));
        const plateNumber = rental.vehicle?.plate_number || 'N/A';
        
        console.log(`📋 Rental ${rental.id}: plate=${plateNumber}, due_at=${dueDate.toLocaleString('en-US', {timeZone: 'Africa/Casablanca'})}, hours_until_due=${hoursUntilDue}h`);
      });
    }
    
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
};

// Export for use
export { debugAndSetupRentals };

// Auto-run when imported
debugAndSetupRentals();