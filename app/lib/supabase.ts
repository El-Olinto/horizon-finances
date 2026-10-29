import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ikmklpiwrotrrywduslt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlrbWtscGl3cm90cnJ5d2R1c2x0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3NTg3NTQsImV4cCI6MjEwODMzNDc1NH0.Jaj8jLujqTI9tZifJzhv-daWsn3Cf9YRIpMR1UEfkPE';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);