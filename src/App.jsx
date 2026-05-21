import React, { useState, useEffect } from 'react';
import { Menu, X, Calendar, ShoppingBag, Music, Mail, Disc, ArrowRight, Plus, Trash2, Lock, ArrowLeft, Play, Pause, FileText, ExternalLink } from 'lucide-react';

// Importation des fichiers JSON locaux
import initialDates from './data/concerts.json';
import initialMerch from './data/merch.json';

export default function App() {
  // Détection automatique de la page via l'URL
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname.replace('/', '');
    return path === 'admin' ? 'admin' : 'accueil';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // États dynamiques pour les données (Concerts et Merch)
  const [dates, setDates] = useState(() => {
    const saved = localStorage.getItem('olc_dates');
    return saved ? JSON.parse(saved) : initialDates;
  });
  
  const [merch, setMerch] = useState(() => {
    const saved = localStorage.getItem('olc_merch');
    return saved ? JSON.parse(saved) : initialMerch;
  });

  // État dynamique pour l'album principal
  const [musicInfo, setMusicInfo] = useState(() => {
    const saved = localStorage.getItem('olc_music_info');
    return saved ? JSON.parse(saved) : {
      title: "ONE LAST CHANCE — LP",
      description: "Notre tout premier projet studio prend vie. Un savant mélange d'énergies brutes, de riffs acérés et de mélodies mélancoliques. Enregistré et produit de manière totalement indépendante.",
      status: "SORTIE EN AUTOMNE 2026"
    };
  });

  // État dynamique pour la liste des morceaux (Tracklist avec paroles optionnelles)
  const [tracks, setTracks] = useState(() => {
    const saved = localStorage.getItem('olc_tracks');
    return saved ? JSON.parse(saved) : [
      { id: 1, number: "01", title: "Intro (Echoes of the Past)", duration: "1:42", lyrics: "" },
      { id: 2, number: "02", title: "One Last Chance", duration: "3:58", lyrics: "Screaming in the dark...\nThis is our one last chance\nTo break the chains of the past..." },
      { id: 3, number: "03", title: "Midnight Rebellion", duration: "4:12", lyrics: "Under the neon lights\nWe start the fight tonight..." },
      { id: 4, number: "04", title: "Shadows On the Wall", duration: "3:34", lyrics: "" }
    ];
  });

  // Liens des plateformes de streaming
  const [streamingLinks, setStreamingLinks] = useState(() => {
    const saved = localStorage.getItem('olc_streaming');
    return saved ? JSON.parse(saved) : {
      spotify: "https://spotify.com",
      apple: "https://apple.com/music",
      youtube: "https://youtube.com"
    };
  });

  // Gestion du morceau sélectionné pour afficher ses paroles
  const [activeTrackLyrics, setActiveTrackLyrics] = useState(tracks[0] || null);

  // Gestion de la lecture simulée
  const [playingTrackId, setPlayingTrackId] = useState(null);

  // Gestion de la page produit sélectionnée (Merch)
  const [selectedProduct, setSelectedProduct] = useState(null);

  // États formulaires pour la newsletter et l'admin
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // États pour les formulaires d'ajout de l'admin
  const [newConcert, setNewConcert] = useState({ date: '', city: '', venue: '', ticketLink: '', status: 'Billets Disponibles' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', img: '', description: '' });
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

  // Sauvegardes locales
  useEffect(() => { localStorage.setItem('olc_dates', JSON.stringify(dates)); }, [dates]);
  useEffect(() => { localStorage.setItem('olc_merch', JSON.stringify(merch)); }, [merch]);
  useEffect(() => { localStorage.setItem('olc_music_info', JSON.stringify(musicInfo)); }, [musicInfo]);
  useEffect(() => { localStorage.setItem('olc_tracks', JSON.stringify(tracks)); }, [tracks]);
  useEffect(() => { localStorage.setItem('olc_streaming', JSON.stringify(streamingLinks)); }, [streamingLinks]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(''); }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'olc2026') { setIsAdminAuthenticated(true); }
    else { alert('Mot de passe incorrect'); }
  };

  const addConcert = (e) => {
    e.preventDefault();
    const item = { id: Date.now(), ...newConcert };
    setDates([...dates, item]);
    setNewConcert({ date: '', city: '', venue: '', ticketLink: '', status: 'Billets Disponibles' });
  };

  const addProduct = (e) => {
    e.preventDefault();
    const item = { id: Date.now(), ...newProduct };
    setMerch([...merch, item]);
    setNewProduct({ name: '', price: '', img: '', description: '' });
  };

  const addTrack = (e) => {
    e.preventDefault();
    const item = { id: Date.now(), ...newTrack };
    const updated = [...tracks, item].sort((a, b) => a.number.localeCompare(b.number));
    setTracks(updated);
    setNewTrack({ number: '', title: '', duration: '', lyrics: '' });
  };

  const togglePlayTrack = (trackId) => {
    if (playingTrackId === trackId) { setPlayingTrackId(null); }
    else { setPlayingTrackId(trackId); }
  };

  const openProductPage = (product) => {
    setSelectedProduct(product);
    setIsMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

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
          </div>

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

            {/* SECTION DATES SUR L'ACCUEIL */}
            <section className="py-24 px-6 max-w-6xl mx-auto border-t border-white/10 animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
                <div className="space-y-4 lg:sticky lg:top-32">
                  <span className="text-xs font-mono text-neutral-500 tracking-[0.3em] uppercase">Sur Scène</span>
                  <h2 className="text-3xl md:text-4xl font-light tracking-[0.15em] leading-tight text-white">PROCHAINES <br />DATES</h2>
                  <div className="w-12 h-[1px] bg-white pt-2"></div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  {dates.slice(0, 3).map((item) => (
                    <div key={item.id} className="bg-neutral-950/40 border border-white/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-neutral-900/50 hover:border-white/20 transition-all duration-300 group">
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
                    </div>
                  ))}
                </div>
              </div>
            </section>

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
                <Disc size={60} className={`text-neutral-800 ${playingTrackId ? 'animate-spin [animation-duration:5s]' : ''}`} />
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
                      <span className="text-xs text-neutral-600">{track.duration}</span>
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
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-light tracking-[0.2em]">CONCERTS 2026</h2>
            </div>
            <div className="border border-white/5 bg-neutral-950 divide-y divide-white/5">
              {dates.map((item) => (
                <div key={item.id} className="py-6 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-mono text-neutral-500">{item.date}</p>
                    <p className="text-base font-medium">{item.city} — <span className="text-neutral-400 font-light text-sm">{item.venue}</span></p>
                  </div>
                  {item.ticketLink ? (
                    <a href={item.ticketLink} target="_blank" rel="noopener noreferrer" className="text-center text-xs bg-white text-black font-bold tracking-widest px-6 py-2.5 transition-colors uppercase font-mono hover:bg-neutral-200">Réserver</a>
                  ) : (
                    <span className="text-xs text-neutral-400 tracking-widest uppercase font-mono border border-white/5 px-4 py-2 bg-black/20">{item.status || "Bientôt disponible"}</span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* PAGE MERCH - CATALOGUE */}
        {currentPage === 'merch' && !selectedProduct && (
          <section className="py-20 px-6 max-w-7xl mx-auto animate-fade-in">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-light tracking-[0.2em]">BOUTIQUE</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              {merch.map((product) => (
                <div key={product.id} onClick={() => openProductPage(product)} className="group bg-neutral-950 p-4 border border-white/5 cursor-pointer hover:border-white/20 transition-all">
                  <div className="aspect-[4/5] bg-neutral-900 overflow-hidden border border-white/10">
                    <img src={product.img} alt={product.name} className="w-full h-full object-cover filter grayscale opacity-70 group-hover:scale-102 transition-all duration-500" />
                  </div>
                  <div className="flex justify-between items-center pt-4 px-2">
                    <div>
                      <h3 className="text-sm font-light tracking-wide">{product.name}</h3>
                      <p className="text-sm text-neutral-400 font-mono mt-1">{product.price}</p>
                    </div>
                    <span className="text-xs tracking-widest text-neutral-500 group-hover:text-white transition-colors font-light">VOIR l'ARTICLE →</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

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
                  <p className="text-xl font-mono text-neutral-300">{selectedProduct.price}</p>
                  <div className="w-12 h-[1px] bg-white/20"></div>
                  <p className="text-sm text-neutral-400 leading-relaxed font-light">{selectedProduct.description || "Édition officielle signée ONE LAST CHANCE."}</p>
                </div>
                <button onClick={() => alert("Formulaire de commande bientôt disponible !")} className="w-full bg-white text-black text-xs font-bold tracking-[0.2em] py-4 uppercase hover:bg-neutral-200 transition-colors mt-8">Commander l'article</button>
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
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input type="password" placeholder="MOT DE PASSE ADMIN" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} className="w-full bg-black border border-white/20 px-4 py-3 text-xs tracking-widest text-center font-mono rounded-none focus:border-white outline-none" />
                  <button type="submit" className="w-full bg-white text-black text-xs font-bold tracking-[0.2em] py-3 uppercase hover:bg-neutral-200 transition-colors">Connexion</button>
                </form>
              </div>
            ) : (
              <div className="space-y-16">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-light tracking-widest">CONSOLE D'ADMINISTRATION</h2>
                  <button onClick={() => setIsAdminAuthenticated(false)} className="text-xs border border-white/20 px-3 py-1.5 hover:border-white transition-colors">Déconnexion</button>
                </div>

                {/* BLOC 1 : CONCERTS */}
                <div className="space-y-6">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">1. Gérer les Concerts</h3>
                  <form onSubmit={addConcert} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950 p-4 border border-white/5">
                    <input type="text" placeholder="DATE (ex: 20 JUIN 2026)" required value={newConcert.date} onChange={e => setNewConcert({...newConcert, date: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs font-mono focus:border-white outline-none" />
                    <input type="text" placeholder="VILLE" required value={newConcert.city} onChange={e => setNewConcert({...newConcert, city: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                    <input type="text" placeholder="SALLE" required value={newConcert.venue} onChange={e => setNewConcert({...newConcert, venue: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                    <input type="text" placeholder="INFO SI PAS DE BILLET" value={newConcert.status} onChange={e => setNewConcert({...newConcert, status: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                    <input type="url" placeholder="URL DE LA BILLETTERIE" value={newConcert.ticketLink} onChange={e => setNewConcert({...newConcert, ticketLink: e.target.value})} className="sm:col-span-2 bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                    <button type="submit" className="sm:col-span-2 bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter le concert</button>
                  </form>
                  <div className="divide-y divide-white/5 border border-white/5 bg-neutral-950/50">
                    {dates.map(item => (
                      <div key={item.id} className="p-4 flex justify-between items-center text-sm">
                        <span className="font-mono text-neutral-400 mr-4">{item.date}</span>
                        <span className="flex-1">{item.city} — {item.venue}</span>
                        <button onClick={() => setDates(dates.filter(d => d.id !== item.id))} className="text-neutral-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BLOC 2 : MERCHANDISING */}
                <div className="space-y-6">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">2. Gérer le Merchandising</h3>
                  <form onSubmit={addProduct} className="grid grid-cols-1 gap-3 bg-neutral-950 p-4 border border-white/5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" placeholder="NOM" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                      <input type="text" placeholder="PRIX" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs font-mono focus:border-white outline-none" />
                      <input type="text" placeholder="URL IMAGE" required value={newProduct.img} onChange={e => setNewProduct({...newProduct, img: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                    </div>
                    <textarea placeholder="DESCRIPTION" rows="2" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none w-full" />
                    <button type="submit" className="bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter l'article</button>
                  </form>
                  <div className="divide-y divide-white/5 border border-white/5 bg-neutral-950/50">
                    {merch.map(item => (
                      <div key={item.id} className="p-4 flex justify-between items-center text-sm">
                        <span className="flex-1">{item.name} — <span className="font-mono text-neutral-400">{item.price}</span></span>
                        <button onClick={() => setMerch(merch.filter(m => m.id !== item.id))} className="text-neutral-500 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* BLOC 3 : TRACKLIST */}
                <div className="space-y-6 pt-6 border-t border-white/10">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">3. Configurer l'Album, Tracklist & Paroles</h3>
                  
                  <div className="bg-neutral-950 p-4 border border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase">Lien Spotify</label>
                      <input type="text" value={streamingLinks.spotify} onChange={e => setStreamingLinks({...streamingLinks, spotify: e.target.value})} className="w-full bg-black border border-white/10 p-2 text-xs font-mono outline-none focus:border-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase">Lien Apple Music</label>
                      <input type="text" value={streamingLinks.apple} onChange={e => setStreamingLinks({...streamingLinks, apple: e.target.value})} className="w-full bg-black border border-white/10 p-2 text-xs font-mono outline-none focus:border-white" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-mono text-neutral-500 uppercase">Lien YouTube</label>
                      <input type="text" value={streamingLinks.youtube} onChange={e => setStreamingLinks({...streamingLinks, youtube: e.target.value})} className="w-full bg-black border border-white/10 p-2 text-xs font-mono outline-none focus:border-white" />
                    </div>
                  </div>

                  <div className="bg-neutral-950 p-6 border border-white/5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input type="text" placeholder="Titre" value={musicInfo.title} onChange={e => setMusicInfo({...musicInfo, title: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs outline-none focus:border-white" />
                      <input type="text" placeholder="Statut" value={musicInfo.status} onChange={e => setMusicInfo({...musicInfo, status: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs font-mono outline-none focus:border-white" />
                    </div>
                    <textarea rows="2" placeholder="Description" value={musicInfo.description} onChange={e => setMusicInfo({...musicInfo, description: e.target.value})} className="w-full bg-black border border-white/10 p-2.5 text-xs outline-none focus:border-white leading-relaxed" />
                  </div>

                  <div className="bg-neutral-950 p-6 border border-white/5 space-y-4">
                    <h4 className="text-xs font-mono text-neutral-400 uppercase tracking-widest">Ajouter un morceau (Laisse vide si sans paroles / Instrumental)</h4>
                    <form onSubmit={addTrack} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input type="text" placeholder="N° Piste (ex: 05)" required value={newTrack.number} onChange={e => setNewTrack({...newTrack, number: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs font-mono focus:border-white outline-none" />
                        <input type="text" placeholder="TITRE" required value={newTrack.title} onChange={e => setNewTrack({...newTrack, title: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                        <input type="text" placeholder="DURÉE (ex: 3:45)" required value={newTrack.duration} onChange={e => setNewTrack({...newTrack, duration: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs font-mono focus:border-white outline-none" />
                      </div>
                      <textarea placeholder="PAROLES" rows="4" value={newTrack.lyrics} onChange={e => setNewTrack({...newTrack, lyrics: e.target.value})} className="w-full bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none font-sans" />
                      <button type="submit" className="w-full bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter à la tracklist</button>
                    </form>

                    <div className="border border-white/5 bg-black divide-y divide-white/5 font-mono text-xs">
                      {tracks.map(track => (
                        <div key={track.id} className="p-3 flex justify-between items-center">
                          <span className="text-neutral-400 mr-2">{track.number} — {track.title} ({track.duration})</span>
                          <button onClick={() => setTracks(tracks.filter(t => t.id !== track.id))} className="text-neutral-500 hover:text-red-500 transition-colors ml-auto"><Trash2 size={14}/></button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </section>
        )}

      </main>

      {/* SECTION NEWSLETTER */}
      {currentPage !== 'admin' && (
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
      <footer className="py-12 border-t border-white/5 bg-black text-center text-[10px] tracking-[0.3em] text-neutral-600 px-6">
        <p>© {new Date().getFullYear()} ONE LAST CHANCE. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}