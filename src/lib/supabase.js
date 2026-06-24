import { createClient } from '@supabase/supabase-js';

// Les clés viennent du fichier .env (voir .env.example).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Le site fonctionne même sans Supabase (mode "données locales par défaut").
// Dès que les clés sont présentes, tout passe en base de données en ligne.
export const isSupabaseConfigured = Boolean(url && anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(url, anonKey)
  : null;
