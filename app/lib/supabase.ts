import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://svqcrdicakwkrtgemwsm.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN2cWNyZGljYWt3a3J0Z2Vtd3NtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyNjQ4MTQsImV4cCI6MjEwODg0MDgxNH0.eueLW-dm-q3Ro2e5_wUzSzR3TVmi6Eh611f-mV9-NL8';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);