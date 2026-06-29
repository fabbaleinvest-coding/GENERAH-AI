import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Client Supabase lato SERVER che agisce *come l'utente* (RLS) usando il suo
// access token. Nessuna service_role key: l'isolamento per-utente è garantito
// dalle policy Row Level Security. URL + anon key sono pubblici (fallback al
// progetto GENERAH IT, sovrascrivibili via env su Vercel).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kttrsfjqvrhiwqdghzps.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dHJzZmpxdnJoaXdxZGdoenBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDYzMjIsImV4cCI6MjA5ODMyMjMyMn0.yiOeCJ2er2lmO4vFKS21mcWWs79A1xecMRujQ_KiqIE';

export function userClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
