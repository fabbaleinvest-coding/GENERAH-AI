'use client';

import { createClient } from '@supabase/supabase-js';

// Credenziali PUBBLICHE del progetto GENERAH IT (Supabase). La anon key è
// pensata per stare nel client: l'accesso ai dati è protetto da Row Level
// Security (ogni utente vede solo la propria riga). La service_role key
// (segreta) NON è qui e non va mai esposta lato browser.
//
// Si possono comunque sovrascrivere via env su Vercel
// (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) senza toccare il codice.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kttrsfjqvrhiwqdghzps.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt0dHJzZmpxdnJoaXdxZGdoenBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDYzMjIsImV4cCI6MjA5ODMyMjMyMn0.yiOeCJ2er2lmO4vFKS21mcWWs79A1xecMRujQ_KiqIE';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

export const KB_BUCKET = 'kb';
// Bucket PUBBLICO per gli spot montati: serve un URL scaricabile da Meta
// (file_url) come creatività. Niente dati sensibili (sono annunci pubblicitari).
export const AD_SPOTS_BUCKET = 'ad-spots';
