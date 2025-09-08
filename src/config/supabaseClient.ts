import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl: string = 'https://mzffseigmlwuhhawlngi.supabase.co';
const supabaseAnonKey: string = import.meta.env
    .VITE_SUPABASE_ANON_KEY as string;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key:', supabaseAnonKey);

export const supabase: SupabaseClient = createClient(
    supabaseUrl,
    supabaseAnonKey
);
