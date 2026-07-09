import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

async function main() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.log("No Supabase credentials found in environment variables.");
    return;
  }
  
  console.log("Connecting to Supabase...");
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  
  const { data: projects, error } = await supabase.from('km_projects').select('*');
  if (error) {
    console.error("Error fetching projects:", error);
    return;
  }
  
  console.log("Projects in Supabase:", JSON.stringify(projects, null, 2));
}

main().catch(console.error);
