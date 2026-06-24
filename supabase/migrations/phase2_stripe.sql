-- ============================================================
--  PHASE 2 — Paiement Stripe
--  À exécuter UNE FOIS dans : Supabase > SQL Editor > New query
--  (après avoir déjà exécuté schema.sql en Phase 1)
-- ============================================================

-- 1) Prix en centimes (source de vérité pour Stripe) + devise
alter table merch add column if not exists price_cents integer not null default 0;
alter table merch add column if not exists currency    text    not null default 'eur';

-- 2) Convertit les anciens prix texte ("25€") en centimes, si besoin
update merch
set price_cents = coalesce(
  round(nullif(regexp_replace(price, '[^0-9.,]', '', 'g'), '')::numeric * 100)::int,
  0
)
where price_cents = 0 and price is not null;

-- 3) L'ancienne colonne texte n'est plus obligatoire (l'app utilise price_cents)
alter table merch alter column price drop not null;

-- 4) (Optionnel mais recommandé) Table des commandes, remplie par le webhook Stripe.
--    Permet de garder un historique des ventes dans Supabase.
create table if not exists orders (
  id                  uuid primary key default gen_random_uuid(),
  stripe_session_id   text unique,
  email               text,
  amount_total        integer,
  currency            text,
  items               jsonb,
  shipping            jsonb,
  status              text default 'paid',
  created_at          timestamptz default now()
);

alter table orders enable row level security;
-- Seul l'admin connecté peut consulter les commandes ; l'insertion se fait via le
-- webhook (clé service_role, qui contourne la RLS) — donc aucune policy d'insert publique.
create policy "Lecture admin orders" on orders for select to authenticated using (true);
