# Activer le paiement de la boutique — Stripe Checkout

> 🔄 **Mise à jour (email de confirmation)** — La fonction `create-checkout` envoie désormais
> automatiquement une **facture par email** à l'acheteur (preuve d'achat). Si tu l'avais déjà
> déployée, **redéploie-la** pour activer cette nouveauté :
> `supabase functions deploy create-checkout --no-verify-jwt`
> Vérifie aussi dans Stripe → **Settings → Customer emails** que « Successful payments » et
> « Invoices » sont activés.


Une fois ces étapes faites, un visiteur peut **ajouter au panier → payer par carte** sur une
page sécurisée Stripe, avec saisie de l'adresse de livraison. Les prix sont **revalidés côté
serveur** (impossible de trafiquer le prix depuis le navigateur).

Architecture : navigateur → **Supabase Edge Function** `create-checkout` (garde la clé secrète Stripe) → Stripe.

---

## Étape 1 — Mettre la base à jour (prix en centimes)

1. Supabase → **SQL Editor** → **New query**.
2. Copie-colle tout le contenu de **`supabase/migrations/phase2_stripe.sql`**, puis **Run**.
   - Cela ajoute les colonnes `price_cents` / `currency` à `merch`, convertit tes prix
     existants ("25€" → 2500), et crée la table `orders` (historique des ventes).
3. Va sur `/admin` → section **Boutique** : vérifie que les prix s'affichent bien
   (ex. 25,00 €). Le champ prix se saisit désormais **en euros** (ex. `25` ou `25,50`).

---

## Étape 2 — Créer un compte Stripe et récupérer la clé secrète

1. Crée un compte sur **https://stripe.com**.
2. Reste en **mode Test** (interrupteur en haut à droite) pour les essais.
3. Menu **Developers → API keys** → copie la **Secret key** (commence par `sk_test_...`).
   ⚠️ La clé secrète ne doit JAMAIS être mise dans le site / le `.env` du front. Elle va
   uniquement dans Supabase (étape 4).

---

## Étape 3 — Installer l'outil Supabase (CLI) et relier le projet

Dans un terminal, dans le dossier `olc/` :

```bash
npm install -g supabase          # installe l'outil en ligne de commande
supabase login                   # ouvre le navigateur pour t'authentifier
supabase link --project-ref vbsdsnuzoeiqaedxbiqj
```

> `vbsdsnuzoeiqaedxbiqj` = la référence de ton projet (déjà repérée dans ton URL Supabase).
> Le CLI te demandera le mot de passe de la base (celui choisi à la création du projet).

---

## Étape 4 — Donner la clé secrète Stripe à Supabase

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
```

(Les variables `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies automatiquement
aux fonctions, rien à faire pour elles.)

---

## Étape 5 — Déployer la fonction de paiement

```bash
supabase functions deploy create-checkout --no-verify-jwt
```

`--no-verify-jwt` est nécessaire : les clients ne sont pas connectés quand ils paient.

✅ La boutique est maintenant fonctionnelle. Teste un achat :
- `npm run dev`, va sur la boutique, ajoute un article, clique **Payer**.
- Sur la page Stripe, utilise la **carte de test** : `4242 4242 4242 4242`, une date future,
  n'importe quel CVC et code postal.
- Après paiement, retour sur le site avec le message de confirmation.

---

## Étape 6 (optionnelle) — Enregistrer les commandes dans Supabase

Sans ça, tu vois déjà chaque commande (articles, email, adresse) dans le **tableau de bord
Stripe → Payments**. Si tu veux EN PLUS un historique dans Supabase (table `orders`) :

1. Déploie le webhook :
   ```bash
   supabase functions deploy stripe-webhook --no-verify-jwt
   ```
2. Dans Stripe → **Developers → Webhooks → Add endpoint** :
   - URL : `https://vbsdsnuzoeiqaedxbiqj.supabase.co/functions/v1/stripe-webhook`
   - Événement à écouter : **`checkout.session.completed`**
   - Crée l'endpoint, puis copie son **Signing secret** (`whsec_...`).
3. Donne ce secret à Supabase :
   ```bash
   supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxx
   ```
4. Les prochaines commandes payées apparaîtront dans la table `orders` (lisible uniquement
   par l'admin connecté).

---

## Étape 7 — Passer en production (vrais paiements)

1. Dans Stripe, active ton compte (infos légales/bancaires) et bascule en **mode Live**.
2. Récupère la **Secret key live** (`sk_live_...`) et refais l'étape 4 avec :
   ```bash
   supabase secrets set STRIPE_SECRET_KEY=sk_live_xxxxx
   ```
3. Si tu utilises le webhook, recrée-le en mode Live (nouveau `whsec_...`) et refais l'étape 6.3.
4. Au déploiement du site, pense toujours à définir `VITE_SUPABASE_URL` et
   `VITE_SUPABASE_ANON_KEY` chez l'hébergeur.

---

## Réglages utiles (à ajuster si besoin)

Dans `supabase/functions/create-checkout/index.ts` :
- **Pays de livraison** : liste `allowed_countries` (actuellement FR, BE, CH, LU, DE, NL, ES, IT, GB, PT, IE, AT).
- **Frais de port** : non facturés pour l'instant. Pour ajouter un tarif, on créera un
  « shipping_rate » Stripe (dis-le moi, je te le branche).
- **Collecte du téléphone** : activée.
