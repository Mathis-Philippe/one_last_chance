import React, { useState, useEffect } from 'react';
import { Menu, X, Calendar, ShoppingBag, Music, Mail, Disc, ArrowRight, Plus, Trash2, Lock, ArrowLeft } from 'lucide-react';

// Importation des fichiers JSON locaux
import initialDates from './data/concerts.json';
import initialMerch from './data/merch.json';

export default function App() {
  // Détection automatique de la page via l'URL (ex: /admin)
  const [currentPage, setCurrentPage] = useState(() => {
    const path = window.location.pathname.replace('/', '');
    return path === 'admin' ? 'admin' : 'accueil';
  });

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // États dynamiques pour les données
  const [dates, setDates] = useState(() => {
    const saved = localStorage.getItem('olc_dates');
    return saved ? JSON.parse(saved) : initialDates;
  });
  
  const [merch, setMerch] = useState(() => {
    const saved = localStorage.getItem('olc_merch');
    return saved ? JSON.parse(saved) : initialMerch;
  });

  // Gestion de la page produit sélectionnée (Merch)
  const [selectedProduct, setSelectedProduct] = useState(null);

  // États formulaires
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);

  // Formulaires Admin (Ajout du champ ticketLink)
  const [newConcert, setNewConcert] = useState({ date: '', city: '', venue: '', ticketLink: '', status: 'Billets Disponibles' });
  const [newProduct, setNewProduct] = useState({ name: '', price: '', img: '', description: '' });

  // Écouter les changements d'URL du navigateur (boutons retour, etc.)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace('/', '');
      setCurrentPage(path === 'admin' ? 'admin' : 'accueil');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sauvegarde locale
  useEffect(() => { localStorage.setItem('olc_dates', JSON.stringify(dates)); }, [dates]);
  useEffect(() => { localStorage.setItem('olc_merch', JSON.stringify(merch)); }, [merch]);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email) { setSubscribed(true); setEmail(''); }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPassword === 'olc2026') { setIsAdminAuthenticated(true); } //
    else { alert('Mot de passe incorrect'); } //
  };

  const addConcert = (e) => {
    e.preventDefault();
    const item = { id: Date.now(), ...newConcert };
    setDates([...dates, item]); //
    setNewConcert({ date: '', city: '', venue: '', ticketLink: '', status: 'Billets Disponibles' });
  };

  const addProduct = (e) => {
    e.preventDefault();
    const item = { id: Date.now(), ...newProduct };
    setMerch([...merch, item]); //
    setNewProduct({ name: '', price: '', img: '', description: '' });
  };

  // Navigation personnalisée qui met à jour l'URL sans recharger
  const navigateTo = (page) => {
    setCurrentPage(page);
    setIsMenuOpen(false);
    setSelectedProduct(null);
    const newPath = page === 'accueil' ? '/' : `/${page}`;
    window.history.pushState({}, '', newPath);
    window.scrollTo(0, 0); //
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased selection:bg-white selection:text-black flex flex-col">
      
      {/* HEADER / NAVIGATION */}
      <nav className="fixed top-0 w-full z-50 bg-black/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          <button onClick={() => navigateTo('accueil')} className="flex items-center space-x-3 group focus:outline-none">
            <img src="/4.png" alt="logo_header" className="w-25 h-10 object-contain" />
          </button>
          
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

          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden text-white focus:outline-none">
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className="md:hidden fixed inset-0 top-20 bg-black/95 z-40 flex flex-col p-6 space-y-6 text-lg tracking-widest border-t border-white/5">
            {['accueil', 'musique', 'concerts', 'merch'].map((page) => (
              <button key={page} onClick={() => navigateTo(page)} className={`text-left py-2 border-b border-white/5 uppercase ${currentPage === page ? 'text-white font-bold' : 'text-neutral-400'}`}>{page}</button>
            ))}
          </div>
        )}
      </nav>

      {/* CONTENU PRINCIPAL */}
      <main className="flex-grow pt-20">
        
        {/* PAGE D'ACCUEIL */}
        {currentPage === 'accueil' && (
          <div className="animate-fade-in">
            <header className="h-[85vh] flex flex-col items-center justify-center text-center px-4 relative">
              <div className="w-full flex items-center justify-center px-4 min-h-[300px] sm:min-h-[400px]">
                <img 
                  src="/7.png" 
                  alt="logo_main" 
                  className="w-full max-w-[90vw] sm:max-w-[500px] h-auto object-contain filter grayscale transition-all duration-[2000ms] ease-out hover:scale-105 hover:grayscale-0 animate-[logoScreenZoom_2200ms_cubic-bezier(0.16,1,0.3,1)_forwards]" 
                />
              </div>
              <p className="text-xs sm:text-sm tracking-[0.4em] text-neutral-400 uppercase pt-4">— Site Officiel —</p>
              
              <button onClick={() => navigateTo('concerts')} className="absolute bottom-10 flex flex-col items-center space-y-2 text-xs tracking-[0.3em] text-neutral-500 hover:text-white transition-colors">
                <span>DÉCOUVRIR LES DATES</span>
                <div className="w-[1px] h-12 bg-neutral-800"></div>
              </button>
            </header>
          </div>
        )}

        {/* PAGE MUSIQUE */}
        {currentPage === 'musique' && (
          <section className="py-20 px-6 max-w-7xl mx-auto animate-fade-in">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-light tracking-[0.2em]">NOTRE MUSIQUE</h2>
              <p className="text-xs tracking-widest text-neutral-500 font-mono">ALBUMS & RELEASES</p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-12 md:gap-24 bg-neutral-950 p-8 md:p-12 border border-white/5">
              <div className="w-full md:w-1/2 aspect-square bg-neutral-900 border border-white/10 flex items-center justify-center relative group overflow-hidden">
                <Disc size={80} className="text-neutral-700 group-hover:rotate-45 transition-transform duration-700" />
                <div className="absolute inset-0 bg-black/60 opacity-100 flex items-center justify-center">
                  <span className="text-xs tracking-widest border border-white px-4 py-2 font-mono">SORTIE EN AUTOMNE 2026</span>
                </div>
              </div>
              <div className="w-full md:w-1/2 space-y-6">
                <h3 className="text-2xl font-light tracking-wide">ONE LAST CHANCE — LP</h3>
                <p className="text-neutral-400 leading-relaxed font-light text-sm">
                  Notre tout premier projet studio prend vie. 10 titres de pur rock alternatif indépendant.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* PAGE CONCERTS (Avec vrais boutons de billetterie cliquables) */}
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
                
                {/* Condition : Si un lien existe, on fait un bouton. Sinon, on affiche le statut textuel */}
                {item.ticketLink ? (
                  <a 
                    href={item.ticketLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-center text-xs bg-white text-black font-bold tracking-widest px-6 py-2.5 transition-colors uppercase font-mono hover:bg-neutral-200"
                  >
                    Réserver
                  </a>
                ) : (
                  <span className="text-xs text-neutral-400 tracking-widest uppercase font-mono border border-white/5 px-4 py-2 bg-black/20">
                    {item.status || "Bientôt disponible"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

        {/* PAGE MERCH */}
        {currentPage === 'merch' && !selectedProduct && (
          <section className="py-20 px-6 max-w-7xl mx-auto animate-fade-in">
            <div className="text-center space-y-4 mb-16">
              <h2 className="text-3xl font-light tracking-[0.2em]">BOUTIQUE</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
              {merch.map((product) => (
                <div 
                  key={product.id} 
                  onClick={() => setSelectedProduct(product)}
                  className="group bg-neutral-950 p-4 border border-white/5 cursor-pointer hover:border-white/20 transition-all"
                >
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

        {/* PAGE COMPOSANT : INTERFACE PRODUIT UNIQUE (Quand on clique sur un article) */}
        {currentPage === 'merch' && selectedProduct && (
          <section className="py-20 px-6 max-w-5xl mx-auto animate-fade-in">
            <button 
              onClick={() => setSelectedProduct(null)} 
              className="flex items-center gap-2 text-xs tracking-widest text-neutral-400 hover:text-white mb-12 transition-colors uppercase font-mono"
            >
              <ArrowLeft size={14} /> Retour à la boutique
            </button>
            
            <div className="flex flex-col md:flex-row gap-12 bg-neutral-950 p-6 md:p-10 border border-white/5">
              <div className="w-full md:w-1/2 aspect-[4/5] bg-neutral-900 border border-white/10">
                <img src={selectedProduct.img} alt={selectedProduct.name} className="w-full h-full object-cover filter grayscale" />
              </div>
              
              <div className="w-full md:w-1/2 flex flex-col justify-between py-2">
                <div className="space-y-6">
                  <h2 className="text-2xl md:text-3xl font-light tracking-wide">{selectedProduct.name}</h2>
                  <p className="text-xl font-mono text-neutral-300">{selectedProduct.price}</p>
                  <div className="w-12 h-[1px] bg-white/20"></div>
                  <p className="text-sm text-neutral-400 leading-relaxed font-light">
                    {selectedProduct.description || "Édition officielle signée ONE LAST CHANCE. Tissu lourd de qualité supérieure, sérigraphié localement."}
                  </p>
                </div>
                
                <button 
                  onClick={() => alert("Fonctionnalité d'achat ou formulaire de contact bientôt disponible !")}
                  className="w-full bg-white text-black text-xs font-bold tracking-[0.2em] py-4 uppercase hover:bg-neutral-200 transition-colors mt-8"
                >
                  Commander l'article
                </button>
              </div>
            </div>
          </section>
        )}

        {/* PAGE PANNEAU ADMIN SÉCURISÉ */}
        {currentPage === 'admin' && (
          <section className="py-20 px-6 max-w-4xl mx-auto animate-fade-in">
            {!isAdminAuthenticated ? (
              <div className="max-w-md mx-auto text-center space-y-6 bg-neutral-950 p-8 border border-white/10">
                <Lock className="mx-auto text-neutral-500" size={32} />
                <h2 className="text-xl font-light tracking-widest">ESPACE DE GESTION OLC</h2>
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <input 
                    type="password" 
                    placeholder="MOT DE PASSE ADMIN"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-black border border-white/20 px-4 py-3 text-xs tracking-widest rounded-none focus:border-white outline-none font-mono text-center"
                  />
                  <button type="submit" className="w-full bg-white text-black text-xs font-bold tracking-[0.2em] py-3 uppercase hover:bg-neutral-200 transition-colors">
                    Connexion
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-16">
                <div className="flex justify-between items-center border-b border-white/10 pb-4">
                  <h2 className="text-2xl font-light tracking-widest">CONSOLE D'ADMINISTRATION</h2>
                  <button onClick={() => setIsAdminAuthenticated(false)} className="text-xs border border-white/20 px-3 py-1.5 hover:border-white transition-colors">Déconnexion</button>
                </div>

                {/* GESTION DES CONCERTS */}
              <div className="space-y-6">
                <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">1. Gérer les Concerts</h3>
                <form onSubmit={addConcert} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-neutral-950 p-4 border border-white/5">
                  <input type="text" placeholder="DATE (ex: 20 JUIN)" required value={newConcert.date} onChange={e => setNewConcert({...newConcert, date: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs font-mono focus:border-white outline-none" />
                  <input type="text" placeholder="VILLE" required value={newConcert.city} onChange={e => setNewConcert({...newConcert, city: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                  <input type="text" placeholder="SALLE" required value={newConcert.venue} onChange={e => setNewConcert({...newConcert, venue: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                  <input type="text" placeholder="INFO SI PAS DE BILLET (ex: Gratuit, Complet...)" value={newConcert.status} onChange={e => setNewConcert({...newConcert, status: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                  <input type="url" placeholder="URL DE LA BILLETTERIE (Laisse vide si gratuit/indisponible)" value={newConcert.ticketLink} onChange={e => setNewConcert({...newConcert, ticketLink: e.target.value})} className="sm:col-span-2 bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                  <button type="submit" className="sm:col-span-2 bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter le concert</button>
                </form>

                <div className="divide-y divide-white/5 border border-white/5 bg-neutral-950/50">
                  {dates.map(item => (
                    <div key={item.id} className="p-4 flex justify-between items-center text-sm">
                      <span className="font-mono text-neutral-400 mr-4">{item.date}</span>
                      <span className="flex-1">
                        {item.city} — {item.venue} 
                        {item.ticketLink ? (
                          <span className="text-[9px] bg-emerald-950/50 text-emerald-400 border border-emerald-900 px-1.5 py-0.5 ml-2 font-mono">Lien configuré</span>
                        ) : (
                          <span className="text-[9px] bg-neutral-900 text-neutral-400 border border-white/5 px-1.5 py-0.5 ml-2 font-mono">Info : {item.status || 'Aucune'}</span>
                        )}
                      </span>
                      <button onClick={() => setDates(dates.filter(d => d.id !== item.id))} className="text-neutral-500 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
              </div>

                {/* GESTION DU MERCH */}
                <div className="space-y-6">
                  <h3 className="text-lg font-light tracking-wide border-l-2 border-white pl-3">2. Gérer le Merchandising</h3>
                  <form onSubmit={addProduct} className="grid grid-cols-1 gap-3 bg-neutral-950 p-4 border border-white/5">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input type="text" placeholder="NOM DU PRODUIT" required value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                      <input type="text" placeholder="PRIX (ex: 25€)" required value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs font-mono focus:border-white outline-none" />
                      <input type="text" placeholder="URL DE L'IMAGE" required value={newProduct.img} onChange={e => setNewProduct({...newProduct, img: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none" />
                    </div>
                    <textarea placeholder="DESCRIPTION DU PRODUIT" rows="2" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="bg-black border border-white/10 p-2.5 text-xs focus:border-white outline-none w-full" />
                    <button type="submit" className="bg-white text-black text-xs font-bold tracking-widest p-2.5 flex items-center justify-center gap-1 hover:bg-neutral-200 transition-colors uppercase"><Plus size={14}/> Ajouter l'article</button>
                  </form>

                  <div className="divide-y divide-white/5 border border-white/5 bg-neutral-950/50">
                    {merch.map(item => (
                      <div key={item.id} className="p-4 flex justify-between items-center text-sm">
                        <img src={item.img} alt="" className="w-8 h-8 object-cover border border-white/10 mr-4 filter grayscale" />
                        <span className="flex-1">{item.name} — <span className="font-mono text-neutral-400">{item.price}</span></span>
                        <button onClick={() => setMerch(merch.filter(m => m.id !== item.id))} className="text-neutral-500 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

      </main>

      {/* FOOTER (Bouton secret totalement effacé) */}
      <footer className="py-12 border-t border-white/5 bg-black text-center text-[10px] tracking-[0.3em] text-neutral-600 px-6">
        <p>© {new Date().getFullYear()} ONE LAST CHANCE. ALL RIGHTS RESERVED.</p>
      </footer>
    </div>
  );
}