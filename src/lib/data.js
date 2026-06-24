import { supabase, isSupabaseConfigured } from './supabase';

/* ============================================================
   COUCHE DE DONNÉES
   - Si Supabase est configuré : tout passe par la base en ligne.
   - Sinon : le site affiche les données locales par défaut (lecture seule).
   On convertit ici les noms de colonnes (snake_case en base) <-> (camelCase dans l'app).
   ============================================================ */

// ---- Convertisseurs CONCERTS ----
const concertFromDb = (r) => ({
  id: r.id, date: r.date, city: r.city, venue: r.venue,
  status: r.status || '', ticketLink: r.ticket_link || '',
});
const concertToDb = (c) => ({
  date: c.date, city: c.city, venue: c.venue,
  status: c.status || '', ticket_link: c.ticketLink || null,
});

// ---- Convertisseurs MERCH ----
const merchFromDb = (r) => ({
  id: r.id, name: r.name,
  priceCents: r.price_cents || 0,
  currency: r.currency || 'eur',
  img: r.img, description: r.description || '',
});
const merchToDb = (m) => ({
  name: m.name,
  price_cents: m.priceCents || 0,
  currency: m.currency || 'eur',
  img: m.img, description: m.description || '',
});

// ---- Convertisseurs TRACKS ----
const trackFromDb = (r) => ({
  id: r.id, number: r.number, title: r.title, duration: r.duration, lyrics: r.lyrics || '',
});
const trackToDb = (t) => ({
  number: t.number, title: t.title, duration: t.duration, lyrics: t.lyrics || '',
});

/* ---------- LECTURE GLOBALE (au chargement du site) ---------- */
export async function fetchAllData() {
  if (!isSupabaseConfigured) return null;

  const [concertsRes, merchRes, tracksRes, settingsRes] = await Promise.all([
    supabase.from('concerts').select('*').order('created_at', { ascending: true }),
    supabase.from('merch').select('*').order('created_at', { ascending: true }),
    supabase.from('tracks').select('*').order('number', { ascending: true }),
    supabase.from('settings').select('*'),
  ]);

  const settings = {};
  (settingsRes.data || []).forEach((row) => { settings[row.key] = row.value; });

  return {
    concerts: (concertsRes.data || []).map(concertFromDb),
    merch: (merchRes.data || []).map(merchFromDb),
    tracks: (tracksRes.data || []).map(trackFromDb),
    album: settings.album || null,
    streaming: settings.streaming || null,
    countdown: settings.countdown || null,
    error: concertsRes.error || merchRes.error || tracksRes.error || settingsRes.error || null,
  };
}

/* ---------- CONCERTS ---------- */
export async function insertConcert(concert) {
  const { data, error } = await supabase.from('concerts').insert(concertToDb(concert)).select().single();
  if (error) throw error;
  return concertFromDb(data);
}
export async function saveConcert(concert) {
  const { error } = await supabase.from('concerts').update(concertToDb(concert)).eq('id', concert.id);
  if (error) throw error;
}
export async function deleteConcert(id) {
  const { error } = await supabase.from('concerts').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- MERCH ---------- */
export async function insertMerch(product) {
  const { data, error } = await supabase.from('merch').insert(merchToDb(product)).select().single();
  if (error) throw error;
  return merchFromDb(data);
}
export async function saveMerch(product) {
  const { error } = await supabase.from('merch').update(merchToDb(product)).eq('id', product.id);
  if (error) throw error;
}
export async function deleteMerch(id) {
  const { error } = await supabase.from('merch').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- TRACKS ---------- */
export async function insertTrack(track) {
  const { data, error } = await supabase.from('tracks').insert(trackToDb(track)).select().single();
  if (error) throw error;
  return trackFromDb(data);
}
export async function saveTrack(track) {
  const { error } = await supabase.from('tracks').update(trackToDb(track)).eq('id', track.id);
  if (error) throw error;
}
export async function deleteTrack(id) {
  const { error } = await supabase.from('tracks').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- RÉGLAGES (album / streaming / compte à rebours) ---------- */
export async function saveSetting(key, value) {
  const { error } = await supabase.from('settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) throw error;
}

/* ---------- NEWSLETTER ---------- */
export async function addSubscriber(email) {
  if (!isSupabaseConfigured) return; // pas de base : on ne fait rien (le formulaire affiche quand même la confirmation)
  const { error } = await supabase.from('subscribers').insert({ email });
  // 23505 = email déjà inscrit : on ignore silencieusement
  if (error && error.code !== '23505') throw error;
}

/* ---------- UPLOAD D'IMAGES (Supabase Storage) ---------- */
// Téléverse un fichier image dans le bucket "media" et renvoie son URL publique.
export async function uploadImage(file) {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré.');
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('media').upload(path, file, {
    cacheControl: '3600',
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw error;
  const { data } = supabase.storage.from('media').getPublicUrl(path);
  return data.publicUrl;
}

/* ---------- PAIEMENT (Stripe Checkout via Edge Function) ---------- */
// items = [{ id, qty }]. La fonction serveur revalide les prix depuis la base.
export async function createCheckout(items) {
  if (!isSupabaseConfigured) throw new Error('Supabase non configuré.');
  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: { items, origin: window.location.origin },
  });
  if (error) throw error;
  if (!data || !data.url) throw new Error(data?.error || 'Réponse de paiement invalide.');
  return data.url;
}

/* ---------- AUTHENTIFICATION ADMIN ---------- */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}
export async function signOut() {
  await supabase.auth.signOut();
}
export async function getSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}
export function onAuthChange(callback) {
  if (!isSupabaseConfigured) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
