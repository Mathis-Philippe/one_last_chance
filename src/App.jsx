import { useState, useEffect, useRef } from 'react';
import { Menu, X, Mail, Disc, ArrowRight, Plus, Minus, Trash2, Lock, ArrowLeft, Play, Pause, FileText, ExternalLink, MapPin, ShoppingBag, Check, Upload } from 'lucide-react';

// Importation des fichiers JSON locaux (valeurs par défaut si Supabase n'est pas connecté)
import initialDates from './data/concerts.json';
import initialMerch from './data/merch.json';

// Couche de données (Supabase) + détection de la configuration
import * as db from './lib/data';
import { isSupabaseConfigured } from './lib/supabase';

/* ============================================================
   UTILITAIRES & PETITS COMPOSANTS
   ============================================================ */

// Mois français -> index (0 = janvier) pour parser "20 JUIN 2026"
const FR_MONTHS = {
  JANVIER: 0, FEVRIER: 1, 'FÉVRIER': 1, MARS: 2, AVRIL: 3, MAI: 4, JUIN: 5,
  JUILLET: 6, AOUT: 7, 'AOÛT': 7, SEPTEMBRE: 8, OCTOBRE: 9, NOVEMBRE: 10,
  DECEMBRE: 11, 'DÉCEMBRE': 11,
};

function parseFrDate(str) {
  if (!str) return null;
  const parts = str.trim().split(/\s+/);
  if (parts.length < 3) return null;
  const day = parseInt(parts[0], 10);
  const month = FR_MONTHS[parts[1].toUpperCase()];
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || month === undefined || isNaN(year)) return null;
  return new Date(year, month, day, 20, 0, 0); // concert ~20h
}

// Renvoie le prochain concert à venir (date la plus proche dans le futur)
function getNextShow(dates) {
  const now = new Date();
  return dates
    .map((d) => ({ ...d, _dateObj: parseFrDate(d.date) }))
    .filter((d) => d._dateObj && d._dateObj >= now)
    .sort((a, b) => a._dateObj - b._dateObj)[0] || null;
}

// Met en forme un prix en centimes : 2500 -> "25,00 €"
function formatPrice(cents, currency = 'eur') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: (currency || 'eur').toUpperCase(),
  }).format((cents || 0) / 100);
}

// Met en forme une date JS en français : "04 JUILLET 2026 — 20:00"
function formatFrDateTime(d) {
  const datePart = d
    .toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    .toUpperCase();
  const timePart = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${datePart} — ${timePart}`;
}

// Détermine le compte à rebours actif selon la configuration admin.
// Mode "manuel" : date/événement choisis dans l'admin.
// Mode "auto" (par défaut) : prochain concert détecté automatiquement.
function getActiveCountdown(config, dates) {
  if (config && config.mode === 'manual' && config.targetDate) {
    const d = new Date(config.targetDate);
    if (!isNaN(d.getTime()) && d >= new Date()) {
      return {
        dateObj: d,
        city: config.title || 'Prochain événement',
        venue: config.venue || '',
        label: formatFrDateTime(d),
        ticketLink: config.ticketLink || '',
      };
    }
  }
  const ns = getNextShow(dates);
  if (ns) {
    return {
      dateObj: ns._dateObj,
      city: ns.city,
      venue: ns.venue,
      label: ns.date,
      ticketLink: ns.ticketLink || '',
    };
  }
  return null;
}

// Apparition au défilement via IntersectionObserver
function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.unobserve(el);
        }
      },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <Tag
      ref={ref}
      className={`reveal ${visible ? 'reveal-visible' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

// Horloge live : renvoie l'heure courante, mise à jour à intervalle régulier.
// On lit Date.now() dans un effet (pas pendant le rendu) pour rester "pur".
function useNow(intervalMs = 1000) {
  // Initialiseur paresseux : Date.now() n'est lu qu'une fois, à la création de l'état.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

// Compte à rebours live jusqu'au prochain concert
function Countdown({ target }) {
  const now = useNow(1000);
  const diff = now ? Math.max(0, target.getTime() - now) : 0;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  const units = [
    { v: days, l: 'JOURS' },
    { v: hours, l: 'HEURES' },
    { v: mins, l: 'MIN' },
    { v: secs, l: 'SEC' },
  ];
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-5">
      {units.map((u, i) => (
        <div key={u.l} className="flex items-center gap-3 sm:gap-5">
          <div className="flex flex-col items-center">
            <span className="text-3xl sm:text-5xl font-light font-mono tabular-nums text-white tracking-tight">
              {String(u.v).padStart(2, '0')}
            </span>
            <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.3em] text-neutral-500 uppercase mt-1">
              {u.l}
            </span>
          </div>
          {i < units.length - 1 && <span className="text-2xl sm:text-4xl font-light text-neutral-700 -mt-4">:</span>}
        </div>
      ))}
    </div>
  );
}

// Bandeau défilant infini
function Marquee({ text }) {
  const content = `${text} ✦ `;
  return (
    <div className="relative overflow-hidden border-y border-white/10 bg-black py-5 select-none">
      <div className="animate-marquee">
        {[0, 1].map((k) => (
          <span key={k} className="text-2xl sm:text-3xl font-light tracking-[0.3em] uppercase text-neutral-700 px-2">
            {content.repeat(4)}
          </span>
        ))}
      </div>
      {/* dégradés sur les bords pour un fondu propre */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-black to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-black to-transparent" />
    </div>
  );
}

// Zone d'upload d'image par glisser-déposer (ou clic). Téléverse sur Supabase Storage.
function ImageUploader({ value, onChange, heightClass = 'aspect-[4/5]' }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Choisis un fichier image.'); return; }
    setUploading(true);
    try {
      const url = await db.uploadImage(file);
      onChange(url);
    } catch (e) {
      alert("Échec de l'envoi de l'image : " + (e.message || e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
        className={`relative ${heightClass} w-full border border-dashed ${dragOver ? 'border-white bg-white/5' : 'border-white/20'} bg-black cursor-pointer flex items-center justify-center overflow-hidden transition-colors`}
      >
        {value ? (
          <img src={value} alt="" className="w-full h-full object-cover filter grayscale" />
        ) : (
          <div className="text-center px-4 pointer-events-none">
            <Upload size={18} className="mx-auto text-neutral-500" />
            <p className="text-[9px] font-mono text-neutral-500 uppercase tracking-widest mt-2 leading-relaxed">Glisse une image<br />ou clique</p>
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center text-[10px] font-mono tracking-widest uppercase text-white">Envoi…</div>
        )}
        {value && !uploading && (
          <div className="absolute bottom-0 inset-x-0 bg-black/70 text-center py-1 text-[9px] font-mono tracking-widest uppercase text-neutral-300">Changer</div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}

// Égaliseur animé (affiché quand un morceau "joue")
function Equalizer() {
  return (
    <div className="flex items-end gap-[2px] h-3">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="eq-bar w-[2px] h-full bg-white"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

export default function App() {
  // Détection automatique de la page via l'URL
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname.replace('/', '');
    return path === 'admin' ? 'admin' : 'accueil';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // États des données — initialisés avec les valeurs par défaut, puis remplacés
  // par les données Supabase au chargement (voir useEffect plus bas).
  const [dates, setDates] = useState(initialDates);
  const [merch, setMerch] = useState(initialMerch);

  const [musicInfo, setMusicInfo] = useState({
    title: "ONE LAST CHANCE — LP",
    description: "Notre tout premier projet studio prend vie. Un savant mélange d'énergies brutes, de riffs acérés et de mélodies mélancoliques. Enregistré et produit de manière totalement indépendante.",
    status: "SORTIE EN AUTOMNE 2026"
  });

  const [tracks, setTracks] = useState([
    { id: 1, number: "01", title: "Intro (Echoes of the Past)", duration: "1:42", lyrics: "" },
    { id: 2, number: "02", title: "One Last Chance", duration: "3:58", lyrics: "Screaming in the dark...\nThis is our one last chance\nTo break the chains of the past..." },
    { id: 3, number: "03", title: "Midnight Rebellion", duration: "4:12", lyrics: "Under the neon lights\nWe start the fight tonight..." },
    { id: 4, number: "04", title: "Shadows On the Wall", duration: "3:34", lyrics: "" }
  ]);

  const [streamingLinks, setStreamingLinks] = useState({
    spotify: "https://spotify.com",
    apple: "https://apple.com/music",
    youtube: "https://youtube.com"
  });

  // Configuration du compte à rebours (gérée depuis l'admin)
  const [countdownConfig, setCountdownConfig] = useState({
    mode: 'auto',        // 'auto' = prochain concert | 'manual' = date personnalisée
    targetDate: '',      // format datetime-local (ex: 2026-07-04T20:00)
    title: '',           // ex: "Release Party — Album"
    venue: '',           // ex: "La Boule Noire, Paris"
    ticketLink: ''
  });

  // Pagination de la boutique (page publique)
  const [merchPage, setMerchPage] = useState(1);
  const MERCH_PER_PAGE = 6;

  // Paramètre de retour Stripe, lu une seule fois au démarrage
  const checkoutParam = new URLSearchParams(window.location.search).get('checkout');

  // --- Panier (stocké dans le navigateur, normal pour un panier) ---
  const [cart, setCart] = useState(() => {
    if (checkoutParam === 'success') return []; // paiement réussi : on vide le panier
    try { return JSON.parse(localStorage.getItem('olc_cart')) || []; }
    catch { return []; }
  });
  const [isCartOpen, setIsCartOpen] = useState(checkoutParam === 'cancel'); // annulé : rouvrir le panier
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  // Statut au retour de Stripe : 'success' affiche la confirmation
  const [checkoutStatus, setCheckoutStatus] = useState(checkoutParam === 'success' ? 'success' : null);

  useEffect(() => { localStorage.setItem('olc_cart', JSON.stringify(cart)); }, [cart]);

  // Nettoie l'URL après lecture du paramètre de retour Stripe
  useEffect(() => {
    if (checkoutParam) window.history.replaceState({}, '', window.location.pathname);
  }, [checkoutParam]);

  const cartCount = cart.reduce((n, i) => n + i.qty, 0);
  const cartTotal = cart.reduce((n, i) => n + i.priceCents * i.qty, 0);

  // Gestion du morceau sélectionné pour afficher ses paroles
  const [activeTrackLyrics, setActiveTrackLyrics] = useState(tracks[0] || null);

  // Gestion de la lecture simulée
  const [playingTrackId, setPlayingTrackId] = useState(null);

  // Gestion de la page produit sélectionnée (Merch)
  const [selectedProduct, setSelectedProduct] = useState(null);

  // États formulaires pour la newsletter et l'admin
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [session, setSession] = useState(null);       // session Supabase Auth
  const isAdminAuthenticated = !!session;

  // États pour les formulaires d'ajout de l'admin
  const [newConcert, setNewConcert] = useState({ date: '', city: '', venue: '', ticketLink: '', status: 'Billets Disponibles' });
  const [newProduct, setNewProduct] = useState({ name: '', priceEuros: '', img: '', description: '' });
  const [newTrack, setNewTrack] = useState({ number: '', title: '', duration: '', lyrics: '' });

  // Écouter les changements d'URL
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '');
      setCurrentPage(path === 'admin' ? 'admin' : 'accueil');
      setIsMenuOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Chargement initial des données depuis Supabase (si configuré)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await db.fetchAllData();
        if (!active || !data) return;
        if (data.error) { console.error('Supabase:', data.error); return; }
        if (data.concerts) setDates(data.concerts);
        if (data.merch) setMerch(data.merch);
        if (data.tracks && data.tracks.length) {
          setTracks(data.tracks);
          setActiveTrackLyrics(data.tracks[0]);
        }
        if (data.album) setMusicInfo(data.album);
        if (data.streaming) setStreamingLinks(data.streaming);
        if (data.countdown) setCountdownConfig(data.countdown);
      } catch (err) {
        console.error('Erreur de chargement Supabase:', err);
      }
    })();
    return () => { active = false; };
  }, []);

  // Suivi de la session admin (Supabase Auth)
  useEffect(() => {
    db.getSession().then((s) => setSession(s));
    const unsub = db.onAuthChange((s) => setSession(s));
    return unsub;
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;
    try {
      await db.addSubscriber(email);
      setSubscribed(true);
      setEmail('');
    } catch (err) {
      alert('Inscription impossible : ' + err.message);
    }
  };

  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (!isSupabaseConfigured) {
      alert("Supabase n'est pas encore connecté. Ajoute tes clés dans le fichier .env pour activer l'administration.");
      return;
    }
    try {
      await db.signIn(adminEmail, adminPassword);
      setAdminPassword('');
    } catch (err) {
      alert('Connexion impossible : ' + (err.message || 'identifiants incorrects'));
    }
  };

  const handleAdminLogout = async () => {
    try { await db.signOut(); } catch (err) { console.error(err); }
  };

  const addConcert = async (e) => {
    e.preventDefault();
    try {
      const created = isSupabaseConfigured
        ? await db.insertConcert(newConcert)
        : { id: Date.now(), ...newConcert };
      setDates((prev) => [...prev, created]);
      setNewConcert({ date: '', city: '', venue: '', ticketLink: '', status: 'Billets Disponibles' });
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  // Convertit une saisie en euros ("25", "25,50", "25.5 €") en centimes
  const eurosToCents = (v) => {
    const n = parseFloat(String(v).replace(',', '.').replace(/[^0-9.]/g, ''));
    return isNaN(n) ? 0 : Math.round(n * 100);
  };

  const addProduct = async (e) => {
    e.preventDefault();
    try {
      const product = {
        name: newProduct.name,
        priceCents: eurosToCents(newProduct.priceEuros),
        currency: 'eur',
        img: newProduct.img,
        description: newProduct.description,
      };
      const created = isSupabaseConfigured ? await db.insertMerch(product) : { id: Date.now(), ...product };
      setMerch((prev) => [...prev, created]);
      setNewProduct({ name: '', priceEuros: '', img: '', description: '' });
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  const addTrack = async (e) => {
    e.preventDefault();
    try {
      const created = isSupabaseConfigured
        ? await db.insertTrack(newTrack)
        : { id: Date.now(), ...newTrack };
      setTracks((prev) => [...prev, created].sort((a, b) => String(a.number).localeCompare(String(b.number))));
      setNewTrack({ number: '', title: '', duration: '', lyrics: '' });
    } catch (err) { alert('Erreur : ' + err.message); }
  };

  // --- Modification en ligne : met à jour l'affichage immédiatement (état local) ---
  const updateConcert = (id, field, value) =>
    setDates((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  const updateProduct = (id, field, value) =>
    setMerch((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  const updateTrack = (id, field, value) =>
    setTracks((prev) => prev.map((t) => (t.id === id ? { ...t, [field]: value } : t)));

  // --- Enregistrement en base quand on quitte le champ (onBlur) ---
  const saveConcertRow = async (item) => {
    if (!isSupabaseConfigured) return;
    try { await db.saveConcert(item); } catch (err) { alert('Sauvegarde impossible : ' + err.message); }
  };
  const saveMerchRow = async (item) => {
    if (!isSupabaseConfigured) return;
    try { await db.saveMerch(item); } catch (err) { alert('Sauvegarde impossible : ' + err.message); }
  };
  // Enregistre l'image d'un article (après upload glisser-déposer)
  const setMerchImage = async (item, url) => {
    updateProduct(item.id, 'img', url);
    if (!isSupabaseConfigured) return;
    try { await db.saveMerch({ ...item, img: url }); } catch (err) { alert('Sauvegarde impossible : ' + err.message); }
  };
  // Enregistre la pochette de l'album (après upload)
  const setAlbumCover = (url) => {
    const updated = { ...musicInfo, cover: url };
    setMusicInfo(updated);
    saveSettingSafe('album', updated);
  };

  // Valide le prix saisi en euros (champ priceEuros) -> priceCents, puis sauvegarde
  const commitMerchPrice = async (item) => {
    const source = item.priceEuros !== undefined ? item.priceEuros : item.priceCents / 100;
    const cents = eurosToCents(source);
    updateProduct(item.id, 'priceCents', cents);
    if (!isSupabaseConfigured) return;
    try { await db.saveMerch({ ...item, priceCents: cents }); } catch (err) { alert('Sauvegarde impossible : ' + err.message); }
  };
  const saveTrackRow = async (item) => {
    if (!isSupabaseConfigured) return;
    try { await db.saveTrack(item); } catch (err) { alert('Sauvegarde impossible : ' + err.message); }
  };

  // --- Suppression ---
  const removeConcert = async (id) => {
    try { if (isSupabaseConfigured) await db.deleteConcert(id); setDates((p) => p.filter((d) => d.id !== id)); }
    catch (err) { alert('Erreur : ' + err.message); }
  };
  const removeMerch = async (id) => {
    try { if (isSupabaseConfigured) await db.deleteMerch(id); setMerch((p) => p.filter((m) => m.id !== id)); }
    catch (err) { alert('Erreur : ' + err.message); }
  };
  const removeTrack = async (id) => {
    try { if (isSupabaseConfigured) await db.deleteTrack(id); setTracks((p) => p.filter((t) => t.id !== id)); }
    catch (err) { alert('Erreur : ' + err.message); }
  };

  // Réordonne la tracklist par numéro de piste
  const sortTracks = () =>
    setTracks((prev) => [...prev].sort((a, b) => String(a.number).localeCompare(String(b.number))));

  // --- Réglages (album, streaming, compte à rebours) ---
  const saveSettingSafe = async (key, value) => {
    if (!isSupabaseConfigured) return;
    try { await db.saveSetting(key, value); } catch (err) { alert('Sauvegarde impossible : ' + err.message); }
  };
  // Le mode du compte à rebours est enregistré immédiatement (clic de bouton)
  const updateCountdown = (next) => { setCountdownConfig(next); saveSettingSafe('countdown', next); };

  const togglePlayTrack = (trackId) => {
    if (playingTrackId === trackId) { setPlayingTrackId(null); }
    else { setPlayingTrackId(trackId); }
  };

  const openProductPage = (product) => {
    setSelectedProduct(product);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  // --- Panier ---
  const addToCart = (product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) => (i.id === product.id ? { ...i, qty: Math.min(20, i.qty + qty) } : i));
      }
      return [...prev, {
        id: product.id, name: product.name, priceCents: product.priceCents,
        currency: product.currency || 'eur', img: product.img, qty,
      }];
    });
    setIsCartOpen(true);
  };
  const changeQty = (id, delta) =>
    setCart((prev) => prev
      .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0));
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!isSupabaseConfigured) {
      alert('Le paiement nécessite la connexion Supabase + la fonction Stripe (voir STRIPE_SETUP.md).');
      return;
    }
    setCheckoutLoading(true);
    try {
      const url = await db.createCheckout(cart.map((i) => ({ id: i.id, qty: i.qty })));
      window.location.href = url; // redirection vers la page de paiement Stripe
    } catch (err) {
      alert('Paiement indisponible : ' + (err.message || 'erreur inconnue'));
      setCheckoutLoading(false);
    }
  };

  // Prochain concert à venir (pour le badge "PROCHAIN" sur la liste des concerts)
  const nextShow = getNextShow(dates);
  // Compte à rebours actif : config manuelle de l'admin, sinon prochain concert
  const activeCountdown = getActiveCountdown(countdownConfig, dates);

  // Heure courante (pour l'affichage "J-X"), rafraîchie chaque minute
  const now = useNow(60000);

  // Classe commune pour les champs de l'admin
  const fieldClass = 'bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none w-full';

  // Navigation personnalisée qui met à jour l'URL sans recharger la page
  const navigateTo = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false); 
    setSelectedProduct(null);
    const newPath = page === 'accueil' ? '/' : `/${page}`;
    window.history.pushState({}, '', newPath);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white selection:text-black flex flex-col">
      
      {/* HEADER FIXE (z-50) */}
      <nav className="fixed top-0 inset-x-0 h-20 z-50 bg-black border-b border-white/10 flex items-center select-none">
        <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between relative">
          
          {/* Logo cliquable */}
          <button onClick={() => navigateTo('accueil')} className="flex items-center focus:outline-none py-2 relative z-50">
            <img src="/4.png" alt="logo_header" className="w-25 h-10 object-contain" />
          </button>
          
          {/* Menu bureau */}
          <div className="hidden md:flex items-center space-x-8 text-sm tracking-widest">
            {['accueil', 'musique', 'concerts', 'merch'].map((page) => (
              <button
                key={page}
                onClick={() => navigateTo(page)}
                className={`transition-colors py-2 uppercase ${currentPage === page ? 'text-white border-b border-white' : 'text-neutral-400 hover:text-white'}`}
              >
                {page}
              </button>
            ))}
            <button onClick={() => setIsCartOpen(true)} className="relative text-neutral-400 hover:text-white transition-colors py-2" aria-label="Panier">
              <ShoppingBag size={18} />
              {cartCount > 0 && <span className="absolute -top-1 -right-2 bg-white text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
            </button>
          </div>

          {/* PANIER MOBILE (à gauche du burger) */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="md:hidden text-white fixed top-5 right-[4.5rem] z-[100] p-2 bg-black border border-white/10"
            aria-label="Panier"
          >
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="absolute -top-1.5 -right-1.5 bg-white text-black text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">{cartCount}</span>}
          </button>

          {/* BOUTON BURGER PROBLÈME RÉSOLU : z-[100] pour passer DEVANT le zoom invisible du gros logo */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden text-white focus:outline-none fixed top-5 right-6 z-[100] p-2 bg-black border border-white/10"
            aria-label="Toggle Menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </nav>

      {/* PANNEAU DU MENU MOBILE (z-50) */}
      {isMenuOpen && (
        <div className="md:hidden fixed top-20 inset-x-0 bottom-0 bg-black z-50 flex flex-col p-8 border-t border-white/5 animate-fade-in shadow-2xl">
          <div className="flex flex-col space-y-4 w-full text-center pt-10">
            {['accueil', 'musique', 'concerts', 'merch'].map((page) => (
              <button 
                key={page} 
                onClick={() => navigateTo(page)} 
                className={`py-4 border-b border-white/5 uppercase text-lg tracking-[0.2em] transition-all ${currentPage === page ? 'text-white font-bold tracking-[0.25em]' : 'text-neutral-400'}`}
              >
                {page}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TIROIR PANIER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-[110]">
          {/* fond sombre */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setIsCartOpen(false)} />
          {/* panneau */}
          <div className="absolute top-0 right-0 h-full w-full max-w-md bg-neutral-950 border-l border-white/10 flex flex-col shadow-2xl animate-[slideInRight_400ms_cubic-bezier(0.16,1,0.3,1)]">
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <h3 className="text-sm font-light tracking-[0.2em] uppercase flex items-center gap-2"><ShoppingBag size={16} /> Panier {cartCount > 0 && `(${cartCount})`}</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-neutral-400 hover:text-white transition-colors"><X size={20} /></button>
            </div>

            {cart.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 p-8">
                <ShoppingBag size={40} className="text-neutral-700" />
                <p className="text-xs text-neutral-500 font-mono tracking-widest uppercase">Ton panier est vide</p>
                <button onClick={() => { setIsCartOpen(false); navigateTo('merch'); }} className="text-xs tracking-[0.2em] text-white border-b border-white pb-1 hover:text-neutral-400 hover:border-neutral-400 transition-colors uppercase font-mono">Voir la boutique</button>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto divide-y divide-white/5">
                  {cart.map((item) => (
                    <div key={item.id} className="p-4 flex gap-4 items-center">
                      <div className="w-16 h-20 bg-neutral-900 border border-white/10 shrink-0 overflow-hidden">
                        {item.img && <img src={item.img} alt="" className="w-full h-full object-cover filter grayscale" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-light truncate">{item.name}</p>
                        <p className="text-xs font-mono text-neutral-400 mt-1">{formatPrice(item.priceCents, item.currency)}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <button onClick={() => changeQty(item.id, -1)} className="w-6 h-6 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors"><Minus size={12} /></button>
                          <span className="text-xs font-mono w-6 text-center">{item.qty}</span>
                          <button onClick={() => changeQty(item.id, 1)} className="w-6 h-6 border border-white/10 flex items-center justify-center hover:bg-white hover:text-black transition-colors"><Plus size={12} /></button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="text-neutral-600 hover:text-red-500 transition-colors self-start"><Trash2 size={16} /></button>
                    </div>
                  ))}
                </div>
                <div className="p-6 border-t border-white/10 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-neutral-400 font-mono text-xs uppercase tracking-widest">Sous-total</span>
                    <span className="font-mono text-lg">{formatPrice(cartTotal, cart[0]?.currency)}</span>
                  </div>
                  <p className="text-[10px] text-neutral-600 font-mono">Livraison calculée à l'étape suivante.</p>
                  <button onClick={handleCheckout} disabled={checkoutLoading} className="w-full bg-white text-black text-xs font-bold tracking-[0.2em] py-4 uppercase hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                    {checkoutLoading ? 'Redirection…' : <>Payer <ArrowRight size={14} /></>}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* CONFIRMATION DE PAIEMENT */}
      {checkoutStatus === 'success' && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-fade-in" onClick={() => setCheckoutStatus(null)}>
          <div className="bg-neutral-950 border border-white/10 p-10 max-w-md w-full text-center space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full border border-white/20 flex items-center justify-center mx-auto"><Check size={28} className="text-white" /></div>
            <h3 className="text-lg font-light tracking-[0.15em] uppercase">Merci pour ta commande !</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-mono">Ton paiement a été confirmé. Tu vas recevoir un email de confirmation. On se voit en concert. 🤘</p>
            <button onClick={() => setCheckoutStatus(null)} className="text-xs tracking-[0.2em] text-white border-b border-white pb-1 hover:text-neutral-400 hover:border-neutral-400 transition-colors uppercase font-mono">Fermer</button>
          </div>
        </div>
      )}

      {/* CONTENU PRINCIPAL */}
      <main className="flex-grow pt-20">
        
        {/* PAGE D'ACCUEIL */}
        {currentPage === 'accueil' && (
          <div className="animate-fade-in">
            <header className="h-[85vh] flex flex-col items-center justify-center text-center px-4 relative">
              
              {/* CORRECTION DU LOGO CENTRAL : Ajout de pointer-events-none pour laisser passer les clics tactiles */}
              <div className="w-full flex items-center justify-center px-4 min-h-[300px] sm:min-h-[400px] pointer-events-none">
                <img 
                  src="/7.png" 
                  alt="logo_main" 
                  className="w-full max-w-[90vw] sm:max-w-[500px] h-auto object-contain filter grayscale transition-all duration-[2000ms] ease-out animate-[logoScreenZoom_2200ms_cubic-bezier(0.16,1,0.3,1)_forwards]" 
                />
              </div>
              <p className="text-xs sm:text-sm tracking-[0.4em] text-neutral-400 uppercase pt-4">— Site Officiel —</p>
              
              <button onClick={() => navigateTo('concerts')} className="absolute bottom-10 flex flex-col items-center space-y-2 text-xs tracking-[0.3em] text-neutral-500 hover:text-white transition-colors">
                <span>DÉCOUVRIR LES DATES</span>
                <div className="w-[1px] h-12 bg-neutral-800"></div>
              </button>
            </header>

            {/* COMPTE À REBOURS — PROCHAIN CONCERT / ÉVÉNEMENT */}
            {activeCountdown && (
              <section className="px-6 pb-4">
                <Reveal className="max-w-4xl mx-auto bg-gradient-to-b from-neutral-950 to-black border border-white/10 p-8 md:p-12 text-center space-y-8 relative overflow-hidden">
                  <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-white/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="relative space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <span className="w-2 h-2 bg-white rounded-full animate-live-pulse" />
                      <span className="text-[10px] font-mono tracking-[0.4em] text-neutral-400 uppercase">{countdownConfig.mode === 'manual' ? 'Compte à rebours' : 'Prochain concert'}</span>
                    </div>
                    <h3 className="text-2xl md:text-3xl font-light tracking-[0.15em] text-white pt-2">{activeCountdown.city}</h3>
                    {activeCountdown.venue && (
                      <p className="text-xs font-mono text-neutral-500 tracking-widest uppercase flex items-center justify-center gap-2">
                        <MapPin size={12} /> {activeCountdown.venue}{activeCountdown.label ? ` — ${activeCountdown.label}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="relative">
                    <Countdown target={activeCountdown.dateObj} />
                  </div>
                  <div className="relative">
                    {activeCountdown.ticketLink ? (
                      <a href={activeCountdown.ticketLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-white text-black text-xs font-bold tracking-[0.2em] px-8 py-3.5 uppercase font-mono hover:bg-neutral-200 transition-colors">
                        Réserver ma place <ArrowRight size={14} />
                      </a>
                    ) : (
                      <button onClick={() => navigateTo('concerts')} className="inline-flex items-center gap-2 border border-white/30 text-white text-xs font-bold tracking-[0.2em] px-8 py-3.5 uppercase font-mono hover:bg-white hover:text-black transition-colors">
                        Voir toutes les dates <ArrowRight size={14} />
                      </button>
                    )}
                  </div>
                </Reveal>
              </section>
            )}

            {/* SECTION DATES SUR L'ACCUEIL */}
            <section className="py-24 px-6 max-w-6xl mx-auto border-t border-white/10 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                <div className="space-y-4 lg:sticky lg:top-32">
                  <span className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">Sur Scène</span>
                  <h2 className="text-3xl md:text-4xl font-light tracking-[0.15em] leading-tight text-white">PROCHAINES <br />DATES</h2>
                  <div className="w-12 h-[1px] bg-white pt-2"></div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  {dates.slice(0, 3).map((item, idx) => (
                    <Reveal key={item.id} delay={idx * 120} className="bg-neutral-950/40 border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-neutral-900/50 hover:border-white/20 transition-all duration-300 group">
                      <div className="flex gap-6 items-center">
                        <div className="border-r border-white/10 pr-6 min-w-[140px] shrink-0 flex flex-col justify-center">
                          <p className="text-base font-mono tracking-tighter font-bold text-white leading-none">{item.date.split(' ')[0]}</p>
                          <p className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mt-1.5 whitespace-nowrap">{item.date.split(' ').slice(1).join(' ')}</p>
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-lg font-light tracking-wide text-white group-hover:translate-x-1 transition-transform duration-300">{item.city}</h4>
                          <p className="text-xs font-light text-neutral-400">{item.venue}</p>
                        </div>
                      </div>
                      <div>
                        {item.ticketLink ? (
                          <a href={item.ticketLink} target="_blank" rel="noopener noreferrer" className="inline-block text-center text-[11px] bg-white text-black font-bold tracking-[0.2em] px-5 py-2.5 transition-colors uppercase font-mono hover:bg-neutral-200">Tickets</a>
                        ) : (
                          <span className="text-[10px] text-neutral-400 tracking-widest uppercase font-mono bg-black px-3 py-1.5 border border-white/5">{item.status || "Bientôt"}</span>
                        )}
                      </div>
                    </Reveal>
                  ))}
                </div>
              </div>
            </section>

            {/* BANDEAU DÉFILANT */}
            <Marquee text="ONE LAST CHANCE  ✦  LIVE 2026  ✦  NO TURNING BACK" />

            {/* SECTION MUSIQUE SUR L'ACCUEIL */}
            <section className="py-24 px-6 max-w-6xl mx-auto border-t border-white/10 animate-fade-in">
              <div className="bg-gradient-to-r from-neutral-950 to-neutral-900 border border-white/5 p-8 md:p-16 flex flex-col md:flex-row gap-12 items-center relative overflow-hidden group">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-white/5 rounded-full filter blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>
                <div className="w-full md:w-2/5 flex justify-center relative">
                  <div className="w-48 h-48 md:w-64 md:h-64 bg-black border-2 border-white/10 rounded-full flex items-center justify-center relative shadow-2xl group-hover:rotate-12 transition-transform duration-1000 ease-out">
                    <Disc size={60} className="text-neutral-800" />
                    <div className="absolute w-16 h-16 bg-neutral-900 rounded-full border border-white/5 flex items-center justify-center">
                      <div className="w-3 h-3 bg-black rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="w-full md:w-3/5 space-y-6 text-center md:text-left">
                  <span className="text-[10px] font-mono tracking-[0.4em] bg-white/5 border border-white/10 px-3 py-1 text-neutral-400 uppercase">{musicInfo.status}</span>
                  <h3 className="text-3xl font-light tracking-wide text-white">{musicInfo.title}</h3>
                  <p className="text-neutral-400 font-light text-sm leading-relaxed max-w-xl">{musicInfo.description}</p>
                  <div className="pt-2">
                    <button onClick={() => navigateTo('musique')} className="text-xs tracking-[0.2em] text-white border-b border-white pb-1 hover:text-neutral-400 hover:border-neutral-400 transition-colors uppercase font-mono inline-flex items-center gap-2">Écouter les extraits <ArrowRight size={12} /></button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* PAGE MUSIQUE COMPLÈTE */}
        {currentPage === 'musique' && (
          <section className="py-20 px-6 max-w-6xl mx-auto animate-fade-in space-y-20">
            <div className="text-center space-y-4">
              <h2 className="text-3xl font-light tracking-[0.2em]">NOTRE MUSIQUE</h2>
              <p className="text-xs tracking-widest text-neutral-500 font-mono">ALBUMS & PLATEFORMES</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-neutral-950 p-6 md:p-10 border border-white/5">
              <div className="md:col-span-1 aspect-square bg-neutral-900 border border-white/10 flex items-center justify-center relative overflow-hidden">
                {musicInfo.cover ? (
                  <img src={musicInfo.cover} alt={musicInfo.title} className="w-full h-full object-cover filter grayscale" />
                ) : (
                  <Disc size={60} className={`text-neutral-800 ${playingTrackId ? 'animate-spin [animation-duration:5s]' : ''}`} />
                )}
                <div className="absolute top-4 left-4 bg-black/80 border border-white/10 px-2 py-1 text-[9px] font-mono tracking-widest uppercase">{musicInfo.status}</div>
              </div>
              <div className="md:col-span-2 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <h3 className="text-2xl font-light tracking-wide">{musicInfo.title}</h3>
                  <p className="text-neutral-400 font-light text-sm leading-relaxed">{musicInfo.description}</p>
                </div>
                <div className="space-y-3 pt-4 border-t border-white/5">
                  <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">Écouter sur vos plateformes :</p>
                  <div className="flex flex-wrap gap-3">
                    <a href={streamingLinks.spotify} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs border border-white/10 px-4 py-2 hover:bg-white hover:text-black transition-all font-mono">Spotify <ExternalLink size={12}/></a>
                    <a href={streamingLinks.apple} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs border border-white/10 px-4 py-2 hover:bg-white hover:text-black transition-all font-mono">Apple Music <ExternalLink size={12}/></a>
                    <a href={streamingLinks.youtube} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs border border-white/10 px-4 py-2 hover:bg-white hover:text-black transition-all font-mono">YouTube <ExternalLink size={12}/></a>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
              <div className="space-y-4">
                <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-[0.2em] border-b border-white/10 pb-2">Sélectionner une piste</h4>
                <div className="divide-y divide-white/5 border border-white/5 bg-neutral-950/40 font-mono">
                  {tracks.map((track) => (
                    <div key={track.id} className={`p-4 flex items-center justify-between transition-colors cursor-pointer ${activeTrackLyrics?.id === track.id ? 'bg-white/[0.03]' : 'hover:bg-neutral-900/30'}`} onClick={() => setActiveTrackLyrics(track)}>
                      <div className="flex items-center space-x-4">
                        <button onClick={(e) => { e.stopPropagation(); togglePlayTrack(track.id); }} className="w-7 h-7 rounded-full border border-white/10 flex items-center justify-center hover:bg-white hover:text-black text-neutral-400 transition-all">
                          {playingTrackId === track.id ? <Pause size={10} fill="currentColor"/> : <Play size={10} className="ml-0.5" />}
                        </button>
                        <span className="text-xs text-neutral-600">{track.number}</span>
                        <span className={`text-sm tracking-wide ${activeTrackLyrics?.id === track.id ? 'text-white font-medium' : 'text-neutral-400'}`}>{track.title}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        {playingTrackId === track.id && <Equalizer />}
                        <span className="text-xs text-neutral-600">{track.duration}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-neutral-950/60 border border-white/5 p-6 md:p-8 space-y-6">
                <div className="flex items-center gap-2 text-neutral-400 border-b border-white/10 pb-3 font-mono text-xs">
                  <FileText size={14} />
                  <span>DÉTAILS — PISTE {activeTrackLyrics?.number || "00"}</span>
                </div>
                {activeTrackLyrics ? (
                  <div className="space-y-4">
                    <h5 className="text-lg font-light tracking-wide text-white">{activeTrackLyrics.title}</h5>
                    {activeTrackLyrics.lyrics && activeTrackLyrics.lyrics.trim() !== "" ? (
                      <p className="text-sm text-neutral-400 font-light leading-relaxed whitespace-pre-line font-serif italic">{activeTrackLyrics.lyrics}</p>
                    ) : (
                      <div className="py-12 text-center space-y-2">
                        <span className="text-xs text-neutral-500 font-mono tracking-widest uppercase bg-white/5 border border-white/5 px-4 py-2">[ Morceau Instrumental ]</span>
                        <p className="text-[11px] text-neutral-600 font-mono pt-2">Aucune parole requise pour ce titre.</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-600 font-mono italic text-center py-10">Sélectionnez un titre pour charger ses détails.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* PAGE CONCERTS MAIN */}
        {currentPage === 'concerts' && (
          <section className="py-20 px-6 max-w-4xl mx-auto animate-fade-in">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-light tracking-[0.2em]">CONCERTS 2026</h2>
              <p className="text-xs tracking-widest text-neutral-500 font-mono uppercase">{dates.length} dates — on vous attend</p>
            </div>

            {/* Compte à rebours du prochain concert / événement */}
            {activeCountdown && (
              <Reveal className="mb-12 bg-gradient-to-b from-neutral-950 to-black border border-white/10 p-8 text-center space-y-6">
                <div className="flex items-center justify-center gap-2">
                  <span className="w-2 h-2 bg-white rounded-full animate-live-pulse" />
                  <span className="text-[10px] font-mono tracking-[0.4em] text-neutral-400 uppercase">{now ? `J-${Math.max(0, Math.ceil((activeCountdown.dateObj - now) / 86400000))} — ` : ''}{activeCountdown.city}</span>
                </div>
                <Countdown target={activeCountdown.dateObj} />
              </Reveal>
            )}

            <div className="border border-white/5 bg-neutral-950 divide-y divide-white/5">
              {dates.map((item, idx) => {
                const isNext = nextShow && item.id === nextShow.id;
                return (
                  <Reveal key={item.id} delay={idx * 80} className={`py-6 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors hover:bg-neutral-900/40 ${isNext ? 'bg-white/[0.03] border-l-2 border-l-white' : ''}`}>
                    <div className="space-y-1">
                      <p className="text-xs font-mono text-neutral-500 flex items-center gap-2">
                        {item.date}
                        {isNext && <span className="text-[9px] bg-white text-black font-bold px-2 py-0.5 tracking-widest uppercase">Prochain</span>}
                      </p>
                      <p className="text-base font-medium">{item.city} — <span className="text-neutral-400 font-light text-sm">{item.venue}</span></p>
                    </div>
                    {item.ticketLink ? (
                      <a href={item.ticketLink} target="_blank" rel="noopener noreferrer" className="text-center text-xs bg-white text-black font-bold tracking-widest px-6 py-2.5 transition-colors uppercase font-mono hover:bg-neutral-200">Réserver</a>
                    ) : (
                      <span className="text-xs text-neutral-400 tracking-widest uppercase font-mono border border-white/5 px-4 py-2 bg-black/20">{item.status || "Bientôt disponible"}</span>
                    )}
                  </Reveal>
                );
              })}
            </div>
          </section>
        )}

        {/* PAGE MERCH - CATALOGUE */}
        {currentPage === 'merch' && !selectedProduct && (() => {
          const totalPages = Math.max(1, Math.ceil(merch.length / MERCH_PER_PAGE));
          const page = Math.min(merchPage, totalPages);
          const start = (page - 1) * MERCH_PER_PAGE;
          const pageItems = merch.slice(start, start + MERCH_PER_PAGE);
          return (
          <section className="py-20 px-6 max-w-7xl mx-auto animate-fade-in">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-light tracking-[0.2em]">BOUTIQUE</h2>
              <p className="text-xs tracking-widest text-neutral-500 font-mono uppercase">{merch.length} article{merch.length > 1 ? 's' : ''}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
              {pageItems.map((product, idx) => (
                <Reveal as="div" delay={idx * 80} key={product.id}>
                  <div className="group bg-neutral-950 p-4 border border-white/5 hover:border-white/20 transition-all h-full flex flex-col">
                    <div onClick={() => openProductPage(product)} className="aspect-[4/5] bg-neutral-900 overflow-hidden border border-white/10 cursor-pointer">
                      <img src={product.img} alt={product.name} className="w-full h-full object-cover filter grayscale opacity-70 group-hover:scale-102 transition-all duration-500" />
                    </div>
                    <div className="flex justify-between items-center pt-4 px-2">
                      <div onClick={() => openProductPage(product)} className="cursor-pointer">
                        <h3 className="text-sm font-light tracking-wide">{product.name}</h3>
                        <p className="text-sm text-neutral-400 font-mono mt-1">{formatPrice(product.priceCents, product.currency)}</p>
                      </div>
                    </div>
                    <button onClick={() => addToCart(product)} className="mt-4 w-full border border-white/15 text-xs font-bold tracking-[0.15em] py-2.5 uppercase font-mono hover:bg-white hover:text-black transition-colors flex items-center justify-center gap-2">
                      <ShoppingBag size={13} /> Ajouter au panier
                    </button>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* PAGINATION NUMÉROTÉE */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-16">
                <button
                  onClick={() => setMerchPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-2 text-xs font-mono border border-white/10 text-neutral-400 hover:border-white hover:text-white transition-colors disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-neutral-400"
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setMerchPage(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    className={`w-10 h-10 text-xs font-mono border transition-colors ${p === page ? 'bg-white text-black border-white font-bold' : 'border-white/10 text-neutral-400 hover:border-white hover:text-white'}`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  onClick={() => setMerchPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-2 text-xs font-mono border border-white/10 text-neutral-400 hover:border-white hover:text-white transition-colors disabled:opacity-30 disabled:hover:border-white/10 disabled:hover:text-neutral-400"
                >
                  →
                </button>
              </div>
            )}
          </section>
          );
        })()}

        {/* PAGE MERCH - PRODUIT UNIQUE */}
        {currentPage === 'merch' && selectedProduct && (
          <section className="py-20 px-6 max-w-5xl mx-auto animate-fade-in">
            <button onClick={() => { setSelectedProduct(null); window.scrollTo({ top: 0 }); }} className="flex items-center gap-2 text-xs tracking-widest text-neutral-400 hover:text-white mb-12 transition-colors uppercase font-mono"><ArrowLeft size={14} /> Retour à la boutique</button>
            <div className="flex flex-col md:flex-row gap-12 bg-neutral-950 p-6 md:p-10 border border-white/5">
              <div className="w-full md:w-1/2 aspect-[4/5] bg-neutral-900 border border-white/10">
                <img src={selectedProduct.img} alt={selectedProduct.name} className="w-full h-full object-cover filter grayscale" />
              </div>
              <div className="w-full md:w-1/2 flex flex-col justify-between py-2">
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-light tracking-wide">{selectedProduct.name}</h2>
                  <p className="text-xl font-mono text-neutral-300">{formatPrice(selectedProduct.priceCents, selectedProduct.currency)}</p>
                  <div className="w-12 h-[1px] bg-white/20"></div>
                  <p className="text-sm text-neutral-400 leading-relaxed font-light">{selectedProduct.description || "Édition officielle signée ONE LAST CHANCE."}</p>
                </div>
                <button onClick={() => addToCart(selectedProduct)} className="w-full bg-white text-black text-xs font-bold tracking-[0.2em] py-4 uppercase hover:bg-neutral-200 transition-colors mt-8 flex items-center justify-center gap-2"><ShoppingBag size={14} /> Ajouter au panier</button>
              </div>
            </div>
          </section>
        )}

        {/* CONSOLE D'ADMINISTRATION SECRÈTE */}
        {currentPage === 'admin' && (
          <section className="py-20 px-6 max-w-4xl mx-auto animate-fade-in">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto text-center space-y-6 bg-neutral-950 p-8 border border-white/10">
                <Lock className="mx-auto text-neutral-500" size={32} />
                <h2 className="text-xl font-light tracking-widest">ESPACE DE GESTION OLC</h2>
                {!isSupabaseConfigured && (
                  <p className="text-[11px] text-amber-400/80 font-mono leading-relaxed border border-amber-400/20 bg-amber-400/5 p-3">
                    ⚠ Supabase n'est pas encore connecté. Ajoute tes clés dans le fichier <span className="text-white">.env</span> (voir le guide) pour activer la connexion et la sauvegarde en ligne.
                  </p>
                )}
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="email" placeholder="EMAIL ADMIN" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} autoComplete="username" className="w-full bg-black border border-white/20 px-4 py-3 text-xs tracking-widest text-center font-mono rounded-none focus:border-white outline-none" />
                  <input type="password" placeholder="MOT DE PASSE" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} autoComplete="current-password" className="w-full bg-black border border-white/20 px-4 py-3 text-xs tracking-widest text-center font-mono rounded-none focus:border-white outline-none" />
                  <button type="submit" className="w-full bg-white text-black text-xs font-bold tracking-[0.2em] py-3 uppercase hover:bg-neutral-200 transition-colors">Connexion</button>
                </form>
              </div>
            ) : (
              <div className="space-y-16">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-light tracking-widest">CONSOLE D'ADMINISTRATION</h2>
                  <button onClick={handleAdminLogout} className="text-xs border border-white/20 px-3 py-1.5 hover:border-white transition-colors">Déconnexion</button>
                </div>

                {/* NOTE : fonctionnement de la sauvegarde */}
                <div className="bg-white/[0.03] border border-white/10 p-4 text-[11px] text-neutral-400 leading-relaxed font-mono space-y-1">
                  <p>✓ Connecté en tant que <span className="text-white">{session?.user?.email}</span>.</p>
                  <p>Chaque modification est enregistrée en ligne (Supabase) et visible immédiatement par tous les visiteurs. Les champs texte sont sauvegardés quand tu cliques en dehors du champ.</p>
                </div>

                {/* BLOC 1 : CONCERTS */}
                <div className="space-y-6">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">1. Gérer les Concerts</h3>
                  <form onSubmit={addConcert} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950 p-4 border border-white/5">
                    <input type="text" placeholder="DATE (ex: 20 JUIN 2026)" required value={newConcert.date} onChange={e => setNewConcert({...newConcert, date: e.target.value})} className={`font-mono ${fieldClass}`} />
                    <input type="text" placeholder="VILLE" required value={newConcert.city} onChange={e => setNewConcert({...newConcert, city: e.target.value})} className={fieldClass} />
                    <input type="text" placeholder="SALLE" required value={newConcert.venue} onChange={e => setNewConcert({...newConcert, venue: e.target.value})} className={fieldClass} />
                    <input type="text" placeholder="INFO SI PAS DE BILLET" value={newConcert.status} onChange={e => setNewConcert({...newConcert, status: e.target.value})} className={fieldClass} />
                    <input type="url" placeholder="URL DE LA BILLETTERIE" value={newConcert.ticketLink} onChange={e => setNewConcert({...newConcert, ticketLink: e.target.value})} className={`sm:col-span-2 ${fieldClass}`} />
                    <button type="submit" className="sm:col-span-2 bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter le concert</button>
                  </form>

                  {/* Liste éditable des concerts */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{dates.length} concert{dates.length > 1 ? 's' : ''} — modifie les champs directement</p>
                    {dates.length === 0 && <p className="text-xs text-neutral-600 font-mono italic">Aucun concert pour le moment.</p>}
                    {dates.map(item => (
                      <div key={item.id} className="bg-neutral-950/50 border border-white/5 p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{item.city || 'Nouveau concert'}</span>
                          <button onClick={() => removeConcert(item.id)} className="text-neutral-500 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] uppercase font-mono"><Trash2 size={14}/> Supprimer</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input type="text" placeholder="DATE" value={item.date} onChange={e => updateConcert(item.id, 'date', e.target.value)} onBlur={() => saveConcertRow(item)} className={`font-mono ${fieldClass}`} />
                          <input type="text" placeholder="VILLE" value={item.city} onChange={e => updateConcert(item.id, 'city', e.target.value)} onBlur={() => saveConcertRow(item)} className={fieldClass} />
                          <input type="text" placeholder="SALLE" value={item.venue} onChange={e => updateConcert(item.id, 'venue', e.target.value)} onBlur={() => saveConcertRow(item)} className={fieldClass} />
                          <input type="text" placeholder="INFO SI PAS DE BILLET" value={item.status || ''} onChange={e => updateConcert(item.id, 'status', e.target.value)} onBlur={() => saveConcertRow(item)} className={fieldClass} />
                          <input type="url" placeholder="URL DE LA BILLETTERIE" value={item.ticketLink || ''} onChange={e => updateConcert(item.id, 'ticketLink', e.target.value)} onBlur={() => saveConcertRow(item)} className={`sm:col-span-2 font-mono ${fieldClass}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BLOC 2 : COMPTE À REBOURS */}
                <div className="space-y-6 pt-6 border-t border-white/10">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">2. Compte à rebours</h3>
                  <div className="bg-neutral-950 p-6 border border-white/5 space-y-5">
                    {/* Choix du mode */}
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button onClick={() => updateCountdown({ ...countdownConfig, mode: 'auto' })} className={`flex-1 p-3 text-xs uppercase tracking-widest border transition-colors ${countdownConfig.mode === 'auto' ? 'bg-white text-black border-white font-bold' : 'border-white/10 text-neutral-400 hover:border-white'}`}>
                        Automatique (prochain concert)
                      </button>
                      <button onClick={() => updateCountdown({ ...countdownConfig, mode: 'manual' })} className={`flex-1 p-3 text-xs uppercase tracking-widest border transition-colors ${countdownConfig.mode === 'manual' ? 'bg-white text-black border-white font-bold' : 'border-white/10 text-neutral-400 hover:border-white'}`}>
                        Date personnalisée
                      </button>
                    </div>

                    {countdownConfig.mode === 'auto' ? (
                      <p className="text-[11px] text-neutral-500 font-mono leading-relaxed">
                        Le compte à rebours pointe automatiquement vers la date de concert la plus proche.
                        {activeCountdown ? ` Actuellement : ${activeCountdown.city} — ${activeCountdown.label}.` : ' Aucun concert à venir détecté.'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-neutral-500 uppercase">Date & heure cible</label>
                            <input type="datetime-local" value={countdownConfig.targetDate} onChange={e => setCountdownConfig({ ...countdownConfig, targetDate: e.target.value })} onBlur={() => saveSettingSafe('countdown', countdownConfig)} className={`font-mono [color-scheme:dark] ${fieldClass}`} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-neutral-500 uppercase">Titre de l'événement</label>
                            <input type="text" placeholder="Ex: Release Party — Album" value={countdownConfig.title} onChange={e => setCountdownConfig({ ...countdownConfig, title: e.target.value })} onBlur={() => saveSettingSafe('countdown', countdownConfig)} className={fieldClass} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-neutral-500 uppercase">Lieu / sous-titre</label>
                            <input type="text" placeholder="Ex: La Boule Noire, Paris" value={countdownConfig.venue} onChange={e => setCountdownConfig({ ...countdownConfig, venue: e.target.value })} onBlur={() => saveSettingSafe('countdown', countdownConfig)} className={fieldClass} />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-mono text-neutral-500 uppercase">Lien (billetterie / pré-save)</label>
                            <input type="url" placeholder="https://..." value={countdownConfig.ticketLink} onChange={e => setCountdownConfig({ ...countdownConfig, ticketLink: e.target.value })} onBlur={() => saveSettingSafe('countdown', countdownConfig)} className={`font-mono ${fieldClass}`} />
                          </div>
                        </div>
                        {countdownConfig.targetDate && new Date(countdownConfig.targetDate) < new Date() && (
                          <p className="text-[11px] text-red-400 font-mono">⚠ Cette date est dans le passé : le site repassera automatiquement sur le prochain concert.</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* BLOC 3 : MERCHANDISING */}
                <div className="space-y-6 pt-6 border-t border-white/10">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">3. Gérer la Boutique</h3>
                  <form onSubmit={addProduct} className="grid grid-cols-1 gap-3 bg-neutral-950 p-4 border border-white/5">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="w-full sm:w-32 shrink-0">
                        <ImageUploader value={newProduct.img} onChange={(url) => setNewProduct({ ...newProduct, img: url })} heightClass="h-40" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <input type="text" placeholder="NOM" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className={fieldClass} />
                        <input type="text" inputMode="decimal" placeholder="PRIX EN € (ex: 25)" required value={newProduct.priceEuros} onChange={e => setNewProduct({...newProduct, priceEuros: e.target.value})} className={`font-mono ${fieldClass}`} />
                        <textarea placeholder="DESCRIPTION" rows="3" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className={fieldClass} />
                      </div>
                    </div>
                    <button type="submit" className="bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter l'article</button>
                  </form>

                  {/* Liste éditable des articles */}
                  <div className="space-y-3">
                    <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{merch.length} article{merch.length > 1 ? 's' : ''} — {Math.max(1, Math.ceil(merch.length / MERCH_PER_PAGE))} page(s) en boutique</p>
                    {merch.map(item => (
                      <div key={item.id} className="bg-neutral-950/50 border border-white/5 p-4 flex gap-4">
                        <div className="w-24 shrink-0">
                          <ImageUploader value={item.img} onChange={(url) => setMerchImage(item, url)} heightClass="aspect-[4/5]" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">{item.name || 'Nouvel article'}</span>
                            <button onClick={() => removeMerch(item.id)} className="text-neutral-500 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] uppercase font-mono"><Trash2 size={14}/> Supprimer</button>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input type="text" placeholder="NOM" value={item.name} onChange={e => updateProduct(item.id, 'name', e.target.value)} onBlur={() => saveMerchRow(item)} className={fieldClass} />
                            <input type="text" inputMode="decimal" placeholder="PRIX EN €" value={item.priceEuros !== undefined ? item.priceEuros : item.priceCents / 100} onChange={e => updateProduct(item.id, 'priceEuros', e.target.value)} onBlur={() => commitMerchPrice(item)} className={`font-mono ${fieldClass}`} />
                          </div>
                          <textarea placeholder="DESCRIPTION" rows="2" value={item.description || ''} onChange={e => updateProduct(item.id, 'description', e.target.value)} onBlur={() => saveMerchRow(item)} className={fieldClass} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BLOC 4 : ALBUM, PLATEFORMES & TRACKLIST */}
                <div className="space-y-6 pt-6 border-t border-white/10">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">4. Album, Plateformes & Tracklist</h3>

                  <div className="bg-neutral-950 p-4 border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase">Lien Spotify</label>
                      <input type="text" value={streamingLinks.spotify} onChange={e => setStreamingLinks({...streamingLinks, spotify: e.target.value})} onBlur={() => saveSettingSafe('streaming', streamingLinks)} className={`font-mono p-2 ${fieldClass}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase">Lien Apple Music</label>
                      <input type="text" value={streamingLinks.apple} onChange={e => setStreamingLinks({...streamingLinks, apple: e.target.value})} onBlur={() => saveSettingSafe('streaming', streamingLinks)} className={`font-mono p-2 ${fieldClass}`} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase">Lien YouTube</label>
                      <input type="text" value={streamingLinks.youtube} onChange={e => setStreamingLinks({...streamingLinks, youtube: e.target.value})} onBlur={() => saveSettingSafe('streaming', streamingLinks)} className={`font-mono p-2 ${fieldClass}`} />
                    </div>
                  </div>

                  <div className="bg-neutral-950 p-6 border border-white/5 flex flex-col sm:flex-row gap-4">
                    <div className="w-full sm:w-40 shrink-0 space-y-1">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase">Pochette</label>
                      <ImageUploader value={musicInfo.cover} onChange={setAlbumCover} heightClass="aspect-square" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <input type="text" placeholder="Titre de l'album" value={musicInfo.title} onChange={e => setMusicInfo({...musicInfo, title: e.target.value})} onBlur={() => saveSettingSafe('album', musicInfo)} className={fieldClass} />
                      <input type="text" placeholder="Statut (ex: SORTIE EN AUTOMNE 2026)" value={musicInfo.status} onChange={e => setMusicInfo({...musicInfo, status: e.target.value})} onBlur={() => saveSettingSafe('album', musicInfo)} className={`font-mono ${fieldClass}`} />
                      <textarea rows="3" placeholder="Description" value={musicInfo.description} onChange={e => setMusicInfo({...musicInfo, description: e.target.value})} onBlur={() => saveSettingSafe('album', musicInfo)} className={`leading-relaxed ${fieldClass}`} />
                    </div>
                  </div>

                  {/* Ajout d'un morceau */}
                  <div className="bg-neutral-950 p-6 border border-white/5 space-y-4">
                    <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Ajouter un morceau (laisse les paroles vides si instrumental)</h4>
                    <form onSubmit={addTrack} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" placeholder="N° Piste (ex: 05)" required value={newTrack.number} onChange={e => setNewTrack({...newTrack, number: e.target.value})} className={`font-mono ${fieldClass}`} />
                        <input type="text" placeholder="TITRE" required value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className={fieldClass} />
                        <input type="text" placeholder="DURÉE (ex: 3:45)" required value={newTrack.duration} onChange={e => setNewTrack({...newTrack, duration: e.target.value})} className={`font-mono ${fieldClass}`} />
                      </div>
                      <textarea placeholder="PAROLES" rows="4" value={newTrack.lyrics} onChange={e => setNewTrack({...newTrack, lyrics: e.target.value})} className={`font-sans ${fieldClass}`} />
                      <button type="submit" className="w-full bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter à la tracklist</button>
                    </form>
                  </div>

                  {/* Liste éditable des morceaux */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-mono text-neutral-500 uppercase tracking-widest">{tracks.length} morceau{tracks.length > 1 ? 'x' : ''}</p>
                      <button onClick={sortTracks} className="text-[10px] uppercase font-mono border border-white/10 px-3 py-1.5 text-neutral-400 hover:border-white hover:text-white transition-colors">Trier par n°</button>
                    </div>
                    {tracks.map(track => (
                      <div key={track.id} className="bg-neutral-950/50 border border-white/5 p-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">Piste {track.number || '—'}</span>
                          <button onClick={() => removeTrack(track.id)} className="text-neutral-500 hover:text-red-500 transition-colors flex items-center gap-1 text-[10px] uppercase font-mono"><Trash2 size={14}/> Supprimer</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <input type="text" placeholder="N°" value={track.number} onChange={e => updateTrack(track.id, 'number', e.target.value)} onBlur={() => saveTrackRow(track)} className={`font-mono ${fieldClass}`} />
                          <input type="text" placeholder="TITRE" value={track.title} onChange={e => updateTrack(track.id, 'title', e.target.value)} onBlur={() => saveTrackRow(track)} className={`sm:col-span-1 ${fieldClass}`} />
                          <input type="text" placeholder="DURÉE" value={track.duration} onChange={e => updateTrack(track.id, 'duration', e.target.value)} onBlur={() => saveTrackRow(track)} className={`font-mono ${fieldClass}`} />
                        </div>
                        <textarea placeholder="PAROLES (vide = instrumental)" rows="3" value={track.lyrics || ''} onChange={e => updateTrack(track.id, 'lyrics', e.target.value)} onBlur={() => saveTrackRow(track)} className={fieldClass} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* BLOC 5 : ÉTAT DE LA CONNEXION */}
                <div className="space-y-6 pt-6 border-t border-white/10">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">5. État du système</h3>
                  <div className="bg-neutral-950 p-6 border border-white/5 space-y-3 text-[11px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-neutral-300">Base de données Supabase connectée</span>
                    </div>
                    <p className="text-neutral-500 leading-relaxed">
                      Tout le contenu est stocké en ligne et synchronisé pour l'ensemble des visiteurs, sur tous les appareils.
                      Les inscriptions newsletter sont collectées dans la table <span className="text-white">subscribers</span>.
                    </p>
                  </div>
                </div>

              </div>
            )}
          </section>
        )}

        {/* PAGES LÉGALES */}
        {['mentions', 'cgv', 'confidentialite'].includes(currentPage) && (
          <section className="py-20 px-6 max-w-3xl mx-auto animate-fade-in">
            <button onClick={() => navigateTo('accueil')} className="flex items-center gap-2 text-xs tracking-widest text-neutral-400 hover:text-white mb-10 transition-colors uppercase font-mono"><ArrowLeft size={14} /> Retour</button>

            {currentPage === 'mentions' && (
              <div className="space-y-6 text-sm text-neutral-400 font-light leading-relaxed legal-content">
                <h1 className="text-2xl font-light tracking-[0.15em] text-white uppercase">Mentions légales</h1>
                <p className="text-[11px] text-amber-400/70 font-mono border border-amber-400/20 bg-amber-400/5 p-3">Modèle à compléter avec tes informations réelles, puis à faire relire. Les champs entre [crochets] sont à remplir.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Éditeur du site</h2>
                <p>Le site <strong className="text-neutral-200">One Last Chance</strong> est édité par&nbsp;:<br />
                  [Nom / Raison sociale — ex. association, auto-entreprise, ou nom des membres]<br />
                  Statut juridique&nbsp;: [association loi 1901 / micro-entreprise / …]<br />
                  Adresse&nbsp;: [adresse postale]<br />
                  Email&nbsp;: [email de contact]<br />
                  [Le cas échéant] SIRET&nbsp;: [numéro] — TVA intracommunautaire&nbsp;: [numéro ou « non applicable, TVA non applicable art. 293 B du CGI »]</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Directeur de la publication</h2>
                <p>[Nom du responsable de la publication]</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Hébergement</h2>
                <p>Site hébergé par&nbsp;: [nom de l'hébergeur — ex. Vercel, Netlify, OVH] — [adresse / site web de l'hébergeur].<br />
                  Base de données et stockage&nbsp;: Supabase Inc.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Propriété intellectuelle</h2>
                <p>L'ensemble des contenus (musiques, visuels, logos, textes) est la propriété de One Last Chance, sauf mention contraire. Toute reproduction sans autorisation est interdite.</p>
              </div>
            )}

            {currentPage === 'cgv' && (
              <div className="space-y-6 text-sm text-neutral-400 font-light leading-relaxed legal-content">
                <h1 className="text-2xl font-light tracking-[0.15em] text-white uppercase">Conditions Générales de Vente</h1>
                <p className="text-[11px] text-amber-400/70 font-mono border border-amber-400/20 bg-amber-400/5 p-3">Modèle à adapter (frais et délais de livraison, identité du vendeur…) puis à faire relire. La loi impose notamment d'informer clairement sur le droit de rétractation.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">1. Vendeur</h2>
                <p>Les produits sont vendus par [Nom / Raison sociale], [adresse], [email]. [SIRET le cas échéant].</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">2. Produits et prix</h2>
                <p>Les articles proposés sont décrits sur la boutique. Les prix sont indiqués en euros toutes taxes comprises (TTC). Les frais de livraison éventuels sont indiqués avant la validation de la commande.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">3. Commande et paiement</h2>
                <p>Le paiement s'effectue en ligne par carte bancaire via notre prestataire sécurisé <strong className="text-neutral-200">Stripe</strong>. Aucune donnée bancaire n'est stockée par One Last Chance. La commande est confirmée par l'envoi d'un email récapitulatif (facture).</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">4. Livraison</h2>
                <p>Zones livrées&nbsp;: [pays]. Délai estimé&nbsp;: [X à Y jours ouvrés]. Frais de livraison&nbsp;: [montant ou « offerts »]. En cas de retard, le client est informé par email.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">5. Droit de rétractation</h2>
                <p>Conformément aux articles L221-18 et suivants du Code de la consommation, le client dispose d'un délai de <strong className="text-neutral-200">14 jours</strong> à compter de la réception pour se rétracter, sans avoir à se justifier. Les frais de retour sont à la charge de [client / vendeur]. Le remboursement intervient sous 14 jours après réception du retour. [Exceptions éventuelles&nbsp;: produits personnalisés…]</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">6. Garanties</h2>
                <p>Les produits bénéficient des garanties légales de conformité et contre les vices cachés (articles L217-4 et suivants du Code de la consommation, articles 1641 et suivants du Code civil).</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">7. Service client & litiges</h2>
                <p>Pour toute question&nbsp;: [email]. En cas de litige, le client peut recourir gratuitement à un médiateur de la consommation, ou à la plateforme européenne de règlement des litiges&nbsp;: ec.europa.eu/consumers/odr.</p>
              </div>
            )}

            {currentPage === 'confidentialite' && (
              <div className="space-y-6 text-sm text-neutral-400 font-light leading-relaxed legal-content">
                <h1 className="text-2xl font-light tracking-[0.15em] text-white uppercase">Politique de confidentialité</h1>
                <p className="text-[11px] text-amber-400/70 font-mono border border-amber-400/20 bg-amber-400/5 p-3">Modèle RGPD à compléter (identité du responsable, contact) puis à faire relire.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Responsable du traitement</h2>
                <p>[Nom / Raison sociale], [email de contact].</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Données collectées et finalités</h2>
                <p>— <strong className="text-neutral-200">Newsletter</strong>&nbsp;: ton adresse email, pour t'envoyer les annonces de concerts et de merch (avec ton consentement).<br />
                  — <strong className="text-neutral-200">Commandes</strong>&nbsp;: nom, adresse de livraison, email et téléphone, traités par Stripe pour exécuter ta commande.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Destinataires</h2>
                <p>Tes données sont traitées par nos sous-traitants techniques&nbsp;: <strong className="text-neutral-200">Supabase</strong> (base de données / stockage) et <strong className="text-neutral-200">Stripe</strong> (paiement). Elles ne sont jamais revendues.</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Durée de conservation</h2>
                <p>Les emails newsletter sont conservés jusqu'à ta désinscription. Les données de commande sont conservées le temps légal (facturation).</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Tes droits</h2>
                <p>Tu disposes d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité de tes données. Pour les exercer&nbsp;: [email]. Tu peux aussi saisir la CNIL (cnil.fr).</p>
                <h2 className="text-white text-sm tracking-widest uppercase pt-4">Cookies</h2>
                <p>Ce site n'utilise pas de cookies publicitaires ni de traceurs. Seul un stockage technique local (panier, session admin) est utilisé pour le bon fonctionnement du site.</p>
              </div>
            )}
          </section>
        )}

      </main>

      {/* SECTION NEWSLETTER */}
      {!['admin', 'mentions', 'cgv', 'confidentialite'].includes(currentPage) && (
        <section id="newsletter" className="py-20 bg-neutral-950 border-t border-white/10 px-6 mt-20">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            <Mail size={24} className="mx-auto text-neutral-500" />
            <div className="space-y-2">
              <h2 className="text-xl font-light tracking-[0.2em]">NEWSLETTER</h2>
              <p className="text-xs text-neutral-400 max-w-sm mx-auto leading-relaxed">Inscris-toi pour les annonces de concerts et les drops de merch exclusifs.</p>
            </div>
            {subscribed ? (
              <div className="p-4 bg-white/5 border border-white/20 text-xs tracking-wider text-white font-mono">INSCRIPTION CONFIRMÉE. BIENVENUE CHEZ OLC.</div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto pt-2">
                <input type="email" required placeholder="TON ADRESSE EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} className="flex-1 bg-black border border-white/10 px-4 py-2.5 text-xs tracking-wider focus:outline-none focus:border-white transition-colors text-white placeholder:text-neutral-700 rounded-none font-mono" />
                <button type="submit" className="bg-white text-black text-xs font-bold tracking-[0.2em] px-6 py-2.5 hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 uppercase rounded-none">S'inscrire <ArrowRight size={12} /></button>
              </form>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="py-12 border-t border-white/5 bg-black text-center px-6 space-y-5">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] tracking-[0.25em] text-neutral-500 uppercase font-mono">
          <button onClick={() => navigateTo('mentions')} className="hover:text-white transition-colors">Mentions légales</button>
          <button onClick={() => navigateTo('cgv')} className="hover:text-white transition-colors">CGV</button>
          <button onClick={() => navigateTo('confidentialite')} className="hover:text-white transition-colors">Confidentialité</button>
        </div>
        <p className="text-[10px] tracking-[0.3em] text-neutral-600">© {new Date().getFullYear()} ONE LAST CHANCE. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}