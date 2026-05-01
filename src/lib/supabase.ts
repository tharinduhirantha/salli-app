import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL = 'https://kpriuxasejnlbdhpxwsu.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtwcml1eGFzZWpubGJkaHB4d3N1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0MzA1MDEsImV4cCI6MjA5MzAwNjUwMX0.9wvX6it71-5vEo_hAaZFg2DCC51j-cYvoiS5SmfLfOk';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
