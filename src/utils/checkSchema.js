import { supabase } from './supabaseClient';

async function checkSchema() {
  try {
    // Get information about our table
    const { data, error } = await supabase
      .rpc('schema_info')
      .eq('table_name', 'saharax_0u4w4d_vehicles')
      .select('*');
    
    if (error) {
      console.error("Error fetching schema:", error);
      return;
    }
    
    console.log("Schema information:", data);
  } catch (error) {
    console.error("Exception:", error);
  }
}

checkSchema();