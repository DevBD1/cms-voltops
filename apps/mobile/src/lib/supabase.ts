import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: keyof NodeJS.ProcessEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required. Copy apps/mobile/.env.example to apps/mobile/.env.`);
  }

  return value;
}

const supabaseUrl = requiredEnv("EXPO_PUBLIC_SUPABASE_URL");
const supabasePublishableKey = requiredEnv("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: false,
    persistSession: true,
    storage: AsyncStorage,
  },
});
