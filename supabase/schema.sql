-- ============================================================
--  ONE LAST CHANCE — Schéma de base de données Supabase
--  À exécuter dans : Supabase > ton projet > SQL Editor > New query
--  (copie-colle tout, puis "Run")
-- ============================================================

-- ---------- TABLES ----------

create table if not exists concerts (
  id          uuid primary key default gen_random_uuid(),
  date        text not null,
  city        text not null,
  venue       text not null,
  status      text default '',
  ticket_link text,
  created_at  timestamptz default now()
);

create table if not exists merch (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  price       text not null,
  img         text not null,
  description text default '',
  created_at  timestamptz default now()
);

create table if not exists tracks (
  id         uuid primary key default gen_random_uuid(),
  number     text not null,
  title      text not null,
  duration   text not null,
  lyrics     text default '',
  created_at timestamptz default now()
);

-- Réglages du site (album, plateformes de streaming, compte à rebours)
create table if not exists settings (
  key   text primary key,
  value jsonb not null
);

-- Inscriptions newsletter
create table if not exists subscribers (
  id         uuid primary key default gen_random_uuid(),
  email      text unique not null,
  created_at timestamptz default now()
);

-- ---------- SÉCURITÉ (Row Level Security) ----------
-- Lecture publique pour le contenu du site ; écriture réservée aux comptes connectés (admin).

alter table concerts   enable row level security;
alter table merch       enable row level security;
alter table tracks      enable row level security;
alter table settings    enable row level security;
alter table subscribers enable row level security;

-- Contenu public : tout le monde peut LIRE
create policy "Lecture publique concerts" on concerts for select using (true);
create policy "Lecture publique merch"    on merch    for select using (true);
create policy "Lecture publique tracks"   on tracks   for select using (true);
create policy "Lecture publique settings" on settings for select using (true);

-- Contenu : seuls les comptes connectés peuvent ÉCRIRE
create policy "Ecriture admin concerts" on concerts for all to authenticated using (true) with check (true);
create policy "Ecriture admin merch"    on merch    for all to authenticated using (true) with check (true);
create policy "Ecriture admin tracks"   on tracks   for all to authenticated using (true) with check (true);
create policy "Ecriture admin settings" on settings for all to authenticated using (true) with check (true);

-- Newsletter : n'importe qui peut S'INSCRIRE, seul l'admin peut consulter la liste
create policy "Inscription publique"      on subscribers for insert with check (true);
create policy "Lecture admin subscribers" on subscribers for select to authenticated using (true);

-- ---------- DONNÉES DE DÉPART (seed) ----------

insert into concerts (date, city, venue, status, ticket_link) values
  ('20 JUIN 2026',    'Lille',     'Le Splendid',        '', null),
  ('04 JUILLET 2026', 'Paris',     'La Boule Noire',     '', null),
  ('18 JUILLET 2026', 'Bruxelles', 'Ancienne Belgique',  '', null);

insert into merch (name, price, img, description) values
  ('T-Shirt Classique OLC', '25€', 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500', ''),
  ('Hoodie Logo ''One Last Chance''', '45€', 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?w=500', '');

insert into tracks (number, title, duration, lyrics) values
  ('01', 'Intro (Echoes of the Past)', '1:42', ''),
  ('02', 'One Last Chance', '3:58', E'Screaming in the dark...\nThis is our one last chance\nTo break the chains of the past...'),
  ('03', 'Midnight Rebellion', '4:12', E'Under the neon lights\nWe start the fight tonight...'),
  ('04', 'Shadows On the Wall', '3:34', '');

insert into settings (key, value) values
  ('album', '{"title":"ONE LAST CHANCE — LP","description":"Notre tout premier projet studio prend vie. Un savant mélange d''énergies brutes, de riffs acérés et de mélodies mélancoliques. Enregistré et produit de manière totalement indépendante.","status":"SORTIE EN AUTOMNE 2026"}'),
  ('streaming', '{"spotify":"https://spotify.com","apple":"https://apple.com/music","youtube":"https://youtube.com"}'),
  ('countdown', '{"mode":"auto","targetDate":"","title":"","venue":"","ticketLink":""}');
