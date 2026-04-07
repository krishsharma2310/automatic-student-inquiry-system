import { createClient } from '@supabase/supabase-js';

// Use provided Supabase configuration
let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hlostzdyjvqsegxdrqil.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhsb3N0emR5anZxc2VneGRycWlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMjk1NDgsImV4cCI6MjA4OTgwNTU0OH0.DL2QMQF_FuI-CN324YE2Y66n_9nq0ecaLhdUASICsXE';

// Clean up URL (remove trailing slash if present)
if (supabaseUrl && supabaseUrl.endsWith('/')) {
  supabaseUrl = supabaseUrl.slice(0, -1);
}

// Check for common misconfigurations
const isDatabaseUrl = supabaseUrl && supabaseUrl.startsWith('postgresql://');
const isMissingProtocol = supabaseUrl && !supabaseUrl.startsWith('http');
const isPlaceholder = !supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('your-project-id') || supabaseUrl.includes('placeholder');

if (isPlaceholder) {
  console.error('Supabase credentials missing or invalid. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in the Secrets panel.');
}

if (isDatabaseUrl) {
  console.error('CRITICAL: VITE_SUPABASE_URL is set to a PostgreSQL connection string. It must be the Project URL (e.g. https://xyz.supabase.co).');
}

if (isMissingProtocol) {
  console.error('CRITICAL: VITE_SUPABASE_URL is missing "https://". Please add it.');
}

// Special check for localhost (common mistake in AI Studio)
if (supabaseUrl && (supabaseUrl.includes('localhost') || supabaseUrl.includes('127.0.0.1'))) {
  console.warn('Supabase URL is set to localhost. This will NOT work in the browser unless you are running Supabase locally and have configured CORS correctly.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    },
    global: {
      headers: { 'x-application-name': 'krmu-portal' }
    }
  }
);
