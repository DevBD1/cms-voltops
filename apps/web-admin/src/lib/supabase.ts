import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client for the web admin.
 * Used exclusively for authentication — all business data goes through the Express API.
 */

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishableKey) {
  console.error(
    '[VoltOps] Missing Supabase env vars. ' +
      'Copy apps/web-admin/.env.example to apps/web-admin/.env and fill in the values.',
  );
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // session is managed in localStorage via our own AUTH_KEY
    detectSessionInUrl: false,
  },
});
